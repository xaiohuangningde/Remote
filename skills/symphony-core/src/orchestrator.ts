/**
 * Orchestrator - 核心编排器
 * 
 * 负责任务轮询、分发、重试、协调
 * 维护单一权威运行时状态
 */

// 注意：sessions_spawn 和 sessions_send 需要从 OpenClaw 运行时导入
// 这里使用类型声明，实际调用时通过全局作用域或参数传入
declare const sessions_spawn: any
declare const sessions_send: any

import { ConfigLayer } from './config.ts'
import { createGitHubAdapter } from '../../symphony-github/src/index.ts'
import { createWorkspaceManager } from '../../symphony-workspace/src/index.ts'
import type { 
  Issue, 
  RunningEntry, 
  RetryEntry, 
  RuntimeSnapshot,
  ValidationResult,
} from './types.ts'

export class Orchestrator {
  private config: ConfigLayer
  private github: ReturnType<typeof createGitHubAdapter> | null = null
  private workspaceManager: ReturnType<typeof createWorkspaceManager> | null = null
  
  // 运行时状态
  private running = new Map<string, RunningEntry>()
  private claimed = new Set<string>()
  private retryAttempts = new Map<string, RetryEntry>()
  private completed = new Set<string>()
  
  // 指标
  private codexTotals = {
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    seconds_running: 0,
  }
  
  // 轮询控制
  private pollIntervalId: ReturnType<typeof setInterval> | null = null
  private retryTimers = new Map<string, ReturnType<typeof setTimeout>>()

  constructor(config: ConfigLayer) {
    this.config = config
  }

  /**
   * 初始化（延迟初始化 GitHub 和 Workspace）
   */
  async initialize(): Promise<void> {
    const tracker = this.config.getTracker()
    const workspace = this.config.getWorkspace()
    
    // 初始化 GitHub 适配器
    if (tracker.kind === 'github') {
      this.github = await createGitHubAdapter({
        token: tracker.api_key,
        repo: tracker.project_slug,
      })
      console.log('[Orchestrator] GitHub adapter initialized')
    }
    
    // 初始化工作空间管理器
    this.workspaceManager = await createWorkspaceManager({
      root: workspace.root,
      hooks: this.config.getHooks(),
    })
    console.log('[Orchestrator] Workspace manager initialized')
  }

  /**
   * 验证配置
   */
  async validate(): Promise<ValidationResult> {
    return this.config.validate()
  }

  /**
   * 执行一个 tick（轮询周期）
   */
  async tick(): Promise<void> {
    const start = Date.now()
    
    try {
      // 1. Reconciliation（协调运行中任务）
      await this.reconcile()
      
      // 2. 验证配置
      const validation = this.config.validate()
      if (!validation.ok) {
        console.error(`[Orchestrator] Dispatch skipped: ${validation.error}`)
        return
      }
      
      // 3. 获取候选任务
      const candidates = await this.fetchCandidateIssues()
      
      // 4. 排序（优先级 + 创建时间）
      candidates.sort(this.sortByPriority)
      
      // 5. 分发
      const availableSlots = this.getAvailableSlots()
      const toDispatch = candidates.slice(0, availableSlots)
      
      for (const issue of toDispatch) {
        await this.dispatch(issue)
      }
      
      // 6. 处理重试队列
      await this.processRetryQueue()
      
    } catch (err) {
      console.error('[Orchestrator] Tick failed:', err)
    }
  }

  /**
   * Reconciliation - 协调运行中任务
   */
  private async reconcile(): Promise<void> {
    const now = Date.now()
    const stallTimeout = this.config.getCodex().stall_timeout_ms
    
    // Part A: Stall detection（停滞检测）
    for (const [issueId, entry] of this.running) {
      const lastEvent = entry.last_event_at ?? entry.started_at
      const elapsed = now - lastEvent
      
      if (elapsed > stallTimeout && stallTimeout > 0) {
        console.log(`[Orchestrator] Stall detected for ${entry.issue_identifier}`)
        await this.terminateWorker(issueId, 'stalled')
        this.scheduleRetry(issueId, 'stalled')
      }
    }
    
    // Part B: Tracker state refresh（任务状态刷新）
    const issueIds = Array.from(this.running.keys())
    if (issueIds.length > 0) {
      const states = await this.fetchIssueStates(issueIds)
      
      for (const [issueId, state] of states) {
        const entry = this.running.get(issueId)
        if (!entry) continue
        
        const tracker = this.config.getTracker()
        
        if (tracker.terminal_states.includes(state.toLowerCase())) {
          // 终端状态 - 终止并清理
          console.log(`[Orchestrator] Issue ${entry.issue_identifier} is terminal (${state})`)
          await this.terminateWorker(issueId, 'canceled_by_reconciliation')
          await this.cleanupWorkspace(issueId)
        } else if (!tracker.active_states.includes(state.toLowerCase())) {
          // 非活跃非终端 - 终止但不清理
          console.log(`[Orchestrator] Issue ${entry.issue_identifier} is inactive (${state})`)
          await this.terminateWorker(issueId, 'canceled_by_reconciliation')
        }
      }
    }
  }

  /**
   * 分发任务
   */
  private async dispatch(issue: Issue): Promise<void> {
    // 检查是否已分发
    if (this.running.has(issue.id) || this.claimed.has(issue.id)) {
      console.log(`[Orchestrator] Issue ${issue.identifier} already claimed`)
      return
    }
    
    // Claim 任务
    this.claimed.add(issue.id)
    
    try {
      // 准备工作空间
      const workspacePath = await this.ensureWorkspace(issue)
      
      // 构建 prompt
      const prompt = await this.buildPrompt(issue)
      
      // 启动 subagent
      const sessionKey = await this.launchAgent(issue, prompt, workspacePath)
      
      // 记录运行状态
      const entry: RunningEntry = {
        issue_id: issue.id,
        issue_identifier: issue.identifier,
        workspace_path: workspacePath,
        session_key: sessionKey,
        started_at: Date.now(),
        status: 'running',
        last_event_at: Date.now(),
        turn_count: 0,
      }
      
      this.running.set(issue.id, entry)
      
      console.log(`[Orchestrator] Dispatched ${issue.identifier} → ${sessionKey}`)
      
    } catch (err) {
      console.error(`[Orchestrator] Dispatch failed for ${issue.identifier}:`, err)
      this.claimed.delete(issue.id)
      this.scheduleRetry(issue.id, `dispatch_failed: ${err}`)
    }
  }

  /**
   * 启动 subagent
   */
  private async launchAgent(
    issue: Issue,
    prompt: string,
    workspacePath: string
  ): Promise<string> {
    const result = await sessions_spawn({
      task: prompt,
      mode: 'session',
      runtime: 'subagent',
      label: issue.identifier,
      cwd: workspacePath,
    })
    
    return result.sessionKey
  }

  /**
   * 准备工作空间
   */
  private async ensureWorkspace(issue: Issue): Promise<string> {
    if (!this.workspaceManager) {
      throw new Error('Workspace manager not initialized')
    }
    
    const workspace = await this.workspaceManager.ensureWorkspace({
      identifier: issue.identifier,
    })
    
    console.log(`[Orchestrator] Workspace ready: ${workspace.path} (created: ${workspace.created_now})`)
    
    return workspace.path
  }

  /**
   * 构建 prompt
   */
  private async buildPrompt(issue: Issue): Promise<string> {
    // TODO: 使用 WorkflowLoader 加载 prompt template
    // 使用 Liquid 风格渲染变量
    // {{ issue.identifier }}, {{ issue.title }}, etc.
    
    return `你正在处理 GitHub issue ${issue.identifier}。\n\n标题：${issue.title}\n\n描述：${issue.description ?? '无'}`
  }

  /**
   * 终止工作线程
   */
  private async terminateWorker(
    issueId: string,
    reason: string
  ): Promise<void> {
    const entry = this.running.get(issueId)
    if (!entry) return
    
    // TODO: 停止 subagent 会话
    // await sessions_kill(entry.session_key)
    
    this.running.delete(issueId)
    this.claimed.delete(issueId)
    
    console.log(`[Orchestrator] Terminated ${entry.issue_identifier}: ${reason}`)
  }

  /**
   * 清理工作空间
   */
  private async cleanupWorkspace(issueId: string): Promise<void> {
    if (!this.workspaceManager) {
      throw new Error('Workspace manager not initialized')
    }
    
    // 用 issue identifier 清理
    const entry = this.running.get(issueId)
    if (entry) {
      await this.workspaceManager.cleanupWorkspace(entry.issue_identifier)
    }
  }

  /**
   * 安排重试（使用定时器）
   */
  private scheduleRetry(issueId: string, error: string): void {
    const entry = this.retryAttempts.get(issueId)
    const attempt = entry ? entry.attempt + 1 : 1
    
    const backoff = this.calculateBackoff(attempt)
    const dueAt = Date.now() + backoff
    
    // 取消旧的定时器
    const oldTimer = this.retryTimers.get(issueId)
    if (oldTimer) {
      clearTimeout(oldTimer)
    }
    
    const retryEntry: RetryEntry = {
      issue_id: issueId,
      identifier: entry?.identifier ?? issueId,
      attempt,
      due_at_ms: dueAt,
      error,
    }
    
    this.retryAttempts.set(issueId, retryEntry)
    
    // 设置定时器
    const timer = setTimeout(() => {
      this.onRetryTimerFired(issueId)
    }, backoff)
    
    this.retryTimers.set(issueId, timer)
    
    console.log(`[Orchestrator] Scheduled retry for ${issueId} (attempt ${attempt}, in ${backoff/1000}s)`)
  }

  /**
   * 重试定时器触发
   */
  private async onRetryTimerFired(issueId: string): Promise<void> {
    const retryEntry = this.retryAttempts.get(issueId)
    if (!retryEntry) return
    
    // 移除重试记录
    this.retryAttempts.delete(issueId)
    this.retryTimers.delete(issueId)
    
    console.log(`[Orchestrator] Retry timer fired for ${retryEntry.identifier} (attempt ${retryEntry.attempt})`)
    
    // 尝试重新分发
    // 注意：这里不直接 dispatch，而是等待下一个 poll tick
    // 这样可以保证 reconciliation 先运行
  }

  /**
   * 计算退避时间
   */
  private calculateBackoff(attempt: number): number {
    const baseDelay = 10000  // 10 秒
    const maxBackoff = this.config.getAgent().max_retry_backoff_ms
    
    return Math.min(baseDelay * Math.pow(2, attempt - 1), maxBackoff)
  }

  /**
   * 处理重试队列（使用定时器后简化）
   */
  private async processRetryQueue(): Promise<void> {
    // 使用定时器后，这里只需要统计即可
    const retryCount = this.retryAttempts.size
    if (retryCount > 0) {
      console.log(`[Orchestrator] Retry queue: ${retryCount} issues scheduled`)
    }
  }

  /**
   * 获取可用槽位
   */
  private getAvailableSlots(state?: string): number {
    const agent = this.config.getAgent()
    const runningCount = this.running.size
    
    // 全局限制
    let availableSlots = Math.max(agent.max_concurrent_agents - runningCount, 0)
    
    // 按状态限制（如果配置了）
    if (state) {
      const normalizedState = state.toLowerCase()
      const stateLimit = agent.max_concurrent_agents_by_state[normalizedState]
      
      if (stateLimit !== undefined) {
        // 计算该状态已运行的数量
        const stateRunning = Array.from(this.running.values()).filter(entry => {
          // TODO: 需要记录每个 issue 的状态
          return false  // 简化处理，暂时不检查
        }).length
        
        availableSlots = Math.min(availableSlots, stateLimit - stateRunning)
      }
    }
    
    return Math.max(availableSlots, 0)
  }

  /**
   * 获取候选任务（从 GitHub）
   */
  private async fetchCandidateIssues(): Promise<Issue[]> {
    if (!this.github) {
      throw new Error('GitHub adapter not initialized')
    }
    
    const tracker = this.config.getTracker()
    const agent = this.config.getAgent()
    
    // 获取候选 issues
    const issues = await this.github.fetchCandidateIssues({
      states: tracker.active_states.map(s => s.toUpperCase()),
      limit: agent.max_concurrent_agents * 2,  // 多获取一些用于排序
    })
    
    console.log(`[Orchestrator] Fetched ${issues.length} candidate issues`)
    
    return issues
  }

  /**
   * 获取任务状态
   */
  private async fetchIssueStates(issueIds: string[]): Promise<Map<string, string>> {
    if (!this.github) {
      throw new Error('GitHub adapter not initialized')
    }
    
    const stateMap = await this.github.fetchIssueStates(issueIds)
    
    // 转换为 Symphony 状态格式（小写）
    const normalized = new Map<string, string>()
    for (const [id, state] of stateMap) {
      normalized.set(id, state.toLowerCase())
    }
    
    return normalized
  }

  /**
   * 按优先级排序
   */
  private sortByPriority(a: Issue, b: Issue): number {
    // 优先级高的在前（数字小的优先）
    const priorityDiff = (a.priority ?? 999) - (b.priority ?? 999)
    if (priorityDiff !== 0) return priorityDiff
    
    // 创建时间早的在前
    const createdDiff = (a.created_at ?? '').localeCompare(b.created_at ?? '')
    if (createdDiff !== 0) return createdDiff
    
    // identifier 字典序
    return a.identifier.localeCompare(b.identifier)
  }

  /**
   * Sanitize workspace key
   */
  private sanitizeWorkspaceKey(identifier: string): string {
    return identifier.replace(/[^A-Za-z0-9._-]/g, '_')
  }

  /**
   * 等待运行中任务完成
   */
  async waitForRunningTasks(): Promise<void> {
    console.log('[Orchestrator] Waiting for running tasks to complete...')
    
    // 清理所有重试定时器
    for (const [issueId, timer] of this.retryTimers) {
      clearTimeout(timer)
    }
    this.retryTimers.clear()
    
    // TODO: 等待所有 running sessions 完成
    // 目前简化处理，直接返回
  }

  /**
   * 获取运行时快照
   */
  getSnapshot(): RuntimeSnapshot {
    const now = new Date().toISOString()
    
    return {
      generated_at: now,
      counts: {
        running: this.running.size,
        retrying: this.retryAttempts.size,
      },
      running: Array.from(this.running.values()).map(entry => ({
        issue_id: entry.issue_id,
        issue_identifier: entry.issue_identifier,
        state: 'running',
        session_key: entry.session_key,
        turn_count: entry.turn_count,
        started_at: new Date(entry.started_at).toISOString(),
        last_event_at: entry.last_event_at 
          ? new Date(entry.last_event_at).toISOString() 
          : null,
        tokens: {
          input_tokens: 0,
          output_tokens: 0,
          total_tokens: 0,
        },
      })),
      retrying: Array.from(this.retryAttempts.values()).map(entry => ({
        issue_id: entry.issue_id,
        identifier: entry.identifier,
        attempt: entry.attempt,
        due_at: new Date(entry.due_at_ms).toISOString(),
        error: entry.error,
      })),
      codex_totals: this.codexTotals,
    }
  }
}
