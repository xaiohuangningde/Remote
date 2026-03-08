/**
 * Subagent Queue - 子代理任务调度队列
 * 基于 stream-queue，管理 sessions_spawn 任务
 */

import { createQueue } from '../../stream-queue/src/queue.ts'

export interface AgentTask {
  task: string
  priority?: number  // 1-10, 10 最高
  timeout?: number   // 秒
  label?: string
  requestId: string
}

export interface AgentResult {
  requestId: string
  task: string
  success: boolean
  output?: string
  error?: string
  duration?: number
}

export class SubagentQueue {
  private queue: ReturnType<typeof createQueue<AgentTask>>
  private pendingResults: Map<string, { resolve: (r: AgentResult) => void; reject: (e: Error) => void }> = new Map()
  private runningTasks: Map<string, { startTime: number; task: string }> = new Map()

  constructor(
    private spawnFn: (task: string, options?: { timeout?: number; label?: string }) => Promise<any>
  ) {
    this.queue = createQueue<AgentTask>({
      handlers: [
        // 处理器 1: 验证任务
        async (ctx) => {
          if (!ctx.data.task || ctx.data.task.trim().length === 0) {
            throw new Error('Empty task')
          }
          ctx.emit('task-validated', ctx.data.requestId, ctx.data.task)
        },
        // 处理器 2: 执行子代理
        async (ctx) => {
          const startTime = Date.now()
          this.runningTasks.set(ctx.data.requestId, {
            startTime,
            task: ctx.data.task,
          })
          
          ctx.emit('task-started', ctx.data.requestId, ctx.data.task)
          
          try {
            const result = await this.spawnFn(ctx.data.task, {
              timeout: ctx.data.timeout,
              label: ctx.data.label,
            })
            
            const duration = (Date.now() - startTime) / 1000
            this.runningTasks.delete(ctx.data.requestId)
            
            ctx.emit('task-complete', ctx.data.requestId, result, duration)
            return { success: true, result, duration }
          } catch (error) {
            const duration = (Date.now() - startTime) / 1000
            this.runningTasks.delete(ctx.data.requestId)
            
            ctx.emit('task-error', ctx.data.requestId, error, duration)
            throw error
          }
        },
      ],
    })

    this.setupEventListeners()
  }

  private setupEventListeners() {
    this.queue.onHandlerEvent('task-validated', (requestId, task) => {
      console.log(`[Subagent] 任务已验证 [${requestId}]: ${task.substring(0, 50)}...`)
    })

    this.queue.onHandlerEvent('task-started', (requestId, task) => {
      console.log(`[Subagent] 任务开始 [${requestId}]: ${task.substring(0, 50)}...`)
    })

    this.queue.onHandlerEvent('task-complete', (requestId, result, duration) => {
      console.log(`[Subagent] 任务完成 [${requestId}] (${duration.toFixed(1)}s)`)
      this.resolveRequest(requestId, {
        requestId,
        task: this.getTaskLabel(requestId),
        success: true,
        output: typeof result === 'string' ? result : JSON.stringify(result),
        duration,
      })
    })

    this.queue.onHandlerEvent('task-error', (requestId, error, duration) => {
      console.error(`[Subagent] 任务失败 [${requestId}] (${duration.toFixed(1)}s):`, error)
      this.rejectRequest(requestId, error instanceof Error ? error : new Error(String(error)))
    })

    this.queue.on('error', (payload, error) => {
      console.error(`[Subagent 队列] 处理失败 [${payload.requestId}]:`, error)
    })

    this.queue.on('drain', () => {
      console.log('[Subagent] 所有任务完成')
    })
  }

  private getTaskLabel(requestId: string): string {
    return this.runningTasks.get(requestId)?.task || 'Unknown'
  }

  private resolveRequest(requestId: string, result: AgentResult) {
    const pending = this.pendingResults.get(requestId)
    if (pending) {
      pending.resolve(result)
      this.pendingResults.delete(requestId)
    }
  }

  private rejectRequest(requestId: string, error: Error) {
    const pending = this.pendingResults.get(requestId)
    if (pending) {
      pending.reject(error)
      this.pendingResults.delete(requestId)
    }
  }

  /**
   * 添加子代理任务到队列
   */
  async spawn(request: Omit<AgentTask, 'requestId'>): Promise<AgentResult> {
    const requestId = `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    return new Promise<AgentResult>((resolve, reject) => {
      this.pendingResults.set(requestId, { resolve, reject })
      this.queue.enqueue({ ...request, requestId })
    })
  }

  /**
   * 批量添加任务
   */
  async spawnBatch(requests: Array<Omit<AgentTask, 'requestId'>>): Promise<AgentResult[]> {
    const promises = requests.map(req => this.spawn(req))
    return Promise.all(promises)
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.queue.length()
  }

  /**
   * 获取运行中任务数
   */
  getRunningCount(): number {
    return this.runningTasks.size
  }

  /**
   * 获取所有运行中任务
   */
  getRunningTasks(): Array<{ requestId: string; task: string; duration: number }> {
    const now = Date.now()
    return Array.from(this.runningTasks.entries()).map(([id, info]) => ({
      requestId: id,
      task: info.task,
      duration: (now - info.startTime) / 1000,
    }))
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    this.queue.clear()
    for (const [requestId, pending] of this.pendingResults.entries()) {
      pending.reject(new Error('Queue cleared'))
      this.pendingResults.delete(requestId)
    }
  }
}

// 导出工厂函数
export function createSubagentQueue(
  spawnFn: (task: string, options?: { timeout?: number; label?: string }) => Promise<any>
): SubagentQueue {
  return new SubagentQueue(spawnFn)
}
