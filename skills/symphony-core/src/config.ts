/**
 * 配置层
 * 
 * 提供类型化配置 getters + 环境变量解析 + 验证
 */

import type { 
  SymphonyConfig, 
  TrackerConfig,
  PollingConfig,
  WorkspaceConfig,
  HooksConfig,
  AgentConfig,
  CodexConfig,
  ValidationResult,
} from './types.ts'

export class ConfigLayer {
  private rawConfig: Record<string, unknown>

  constructor(rawConfig: Record<string, unknown>) {
    this.rawConfig = rawConfig
  }

  /**
   * 获取 tracker 配置
   */
  getTracker(): TrackerConfig {
    const tracker = this.rawConfig.tracker as Record<string, unknown> ?? {}
    
    return {
      kind: (tracker.kind as 'github' | 'linear') ?? 'github',
      endpoint: this.resolveEnv(tracker.endpoint as string) ?? 'https://api.github.com/graphql',
      api_key: this.resolveEnv(tracker.api_key as string) ?? process.env.GITHUB_TOKEN ?? '',
      project_slug: this.resolveEnv(tracker.project_slug as string) ?? '',
      active_states: this.parseStates(tracker.active_states) ?? ['open'],
      terminal_states: this.parseStates(tracker.terminal_states) ?? ['closed'],
    }
  }

  /**
   * 获取轮询配置
   */
  getPolling(): PollingConfig {
    const polling = this.rawConfig.polling as Record<string, unknown> ?? {}
    
    return {
      interval_ms: this.parseNumber(polling.interval_ms) ?? 30000,
    }
  }

  /**
   * 获取工作空间配置
   */
  getWorkspace(): WorkspaceConfig {
    const workspace = this.rawConfig.workspace as Record<string, unknown> ?? {}
    
    return {
      root: this.resolvePath(workspace.root as string) ?? './symphony_workspaces',
    }
  }

  /**
   * 获取钩子配置
   */
  getHooks(): HooksConfig {
    const hooks = this.rawConfig.hooks as Record<string, unknown> ?? {}
    
    return {
      after_create: (hooks.after_create as string) ?? null,
      before_run: (hooks.before_run as string) ?? null,
      after_run: (hooks.after_run as string) ?? null,
      before_remove: (hooks.before_remove as string) ?? null,
      timeout_ms: this.parseNumber(hooks.timeout_ms) ?? 60000,
    }
  }

  /**
   * 获取智能体配置
   */
  getAgent(): AgentConfig {
    const agent = this.rawConfig.agent as Record<string, unknown> ?? {}
    
    return {
      max_concurrent_agents: this.parseNumber(agent.max_concurrent_agents) ?? 10,
      max_turns: this.parseNumber(agent.max_turns) ?? 20,
      max_retry_backoff_ms: this.parseNumber(agent.max_retry_backoff_ms) ?? 300000,
      max_concurrent_agents_by_state: this.parseStateConcurrency(
        agent.max_concurrent_agents_by_state as Record<string, unknown>
      ) ?? {},
    }
  }

  /**
   * 获取 Codex 配置
   */
  getCodex(): CodexConfig {
    const codex = this.rawConfig.codex as Record<string, unknown> ?? {}
    
    return {
      command: this.resolveEnv(codex.command as string) ?? 'openclaw subagent run',
      approval_policy: (codex.approval_policy as string) ?? 'auto',
      turn_timeout_ms: this.parseNumber(codex.turn_timeout_ms) ?? 3600000,
      stall_timeout_ms: this.parseNumber(codex.stall_timeout_ms) ?? 300000,
    }
  }

  /**
   * 获取完整配置
   */
  getFullConfig(): SymphonyConfig {
    return {
      tracker: this.getTracker(),
      polling: this.getPolling(),
      workspace: this.getWorkspace(),
      hooks: this.getHooks(),
      agent: this.getAgent(),
      codex: this.getCodex(),
    }
  }

  /**
   * 验证配置
   */
  validate(): ValidationResult {
    const tracker = this.getTracker()
    
    // 必填字段检查
    if (!tracker.kind) {
      return { ok: false, error: 'tracker.kind is required' }
    }
    
    if (!tracker.api_key) {
      return { ok: false, error: 'tracker.api_key is required (set $GITHUB_TOKEN or LINEAR_API_KEY)' }
    }
    
    if (!tracker.project_slug) {
      return { ok: false, error: 'tracker.project_slug is required' }
    }
    
    const codex = this.getCodex()
    if (!codex.command) {
      return { ok: false, error: 'codex.command is required' }
    }

    return { ok: true }
  }

  // ============================================================================
  // 工具方法
  // ============================================================================

  /**
   * 解析环境变量
   */
  private resolveEnv(value: string | undefined): string | undefined {
    if (!value) return undefined
    
    // 支持 $VAR_NAME 语法
    if (value.startsWith('$')) {
      const varName = value.slice(1)
      return process.env[varName]
    }
    
    return value
  }

  /**
   * 解析路径（支持 ~ 展开）
   */
  private resolvePath(value: string | undefined): string | undefined {
    if (!value) return undefined
    
    // 展开 ~
    if (value.startsWith('~')) {
      const home = process.env.HOME ?? process.env.USERPROFILE ?? ''
      return home + value.slice(1)
    }
    
    return value
  }

  /**
   * 解析数字
   */
  private parseNumber(value: unknown): number | undefined {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const num = parseInt(value, 10)
      return isNaN(num) ? undefined : num
    }
    return undefined
  }

  /**
   * 解析状态列表（支持字符串或数组）
   */
  private parseStates(value: unknown): string[] | undefined {
    if (Array.isArray(value)) {
      return value.map(s => String(s).trim().toLowerCase())
    }
    if (typeof value === 'string') {
      return value.split(',').map(s => s.trim().toLowerCase())
    }
    return undefined
  }

  /**
   * 解析按状态并发配置
   */
  private parseStateConcurrency(value: unknown): Record<string, number> | undefined {
    if (!value || typeof value !== 'object') return undefined
    
    const result: Record<string, number> = {}
    for (const [key, val] of Object.entries(value)) {
      const num = this.parseNumber(val)
      if (num && num > 0) {
        result[key.trim().toLowerCase()] = num
      }
    }
    
    return Object.keys(result).length > 0 ? result : undefined
  }

  /**
   * 获取轮询间隔（快捷方法）
   */
  getPollInterval(): number {
    return this.getPolling().interval_ms
  }

  /**
   * 获取最大并发数（快捷方法）
   */
  getMaxConcurrentAgents(): number {
    return this.getAgent().max_concurrent_agents
  }
}
