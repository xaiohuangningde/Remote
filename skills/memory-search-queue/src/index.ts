/**
 * Memory Search Queue - 批量记忆搜索队列
 * 整合 stream-queue 进行异步批量搜索
 */

import { createQueue } from '../../stream-queue/src/queue.ts'

export interface SearchRequest {
  query: string
  limit?: number
  minScore?: number
  requestId: string
}

export interface SearchResult {
  query: string
  results: Array<{ path: string; line?: number; content: string; score?: number }>
  totalCount: number
}

export class MemorySearchQueue {
  private queue: ReturnType<typeof createQueue<SearchRequest>>
  private pendingResults: Map<string, { resolve: (r: SearchResult) => void; reject: (e: Error) => void }> = new Map()

  constructor(
    private searchFn: (query: string, limit: number, minScore?: number) => Promise<any[]>
  ) {
    this.queue = createQueue<SearchRequest>({
      handlers: [
        // 处理器 1: 验证请求
        async (ctx) => {
          if (!ctx.data.query || ctx.data.query.trim().length === 0) {
            throw new Error('Empty query')
          }
          ctx.emit('search-validated', ctx.data.requestId)
        },
        // 处理器 2: 执行搜索
        async (ctx) => {
          ctx.emit('search-processing', ctx.data.requestId, ctx.data.query)
          
          try {
            const results = await this.searchFn(
              ctx.data.query,
              ctx.data.limit || 10,
              ctx.data.minScore
            )
            
            ctx.emit('search-complete', ctx.data.requestId, results)
            return results
          } catch (error) {
            ctx.emit('search-error', ctx.data.requestId, error)
            throw error
          }
        },
      ],
    })

    this.setupEventListeners()
  }

  private setupEventListeners() {
    this.queue.onHandlerEvent('search-validated', (requestId) => {
      console.log(`[MemorySearch] 请求 ${requestId} 已验证`)
    })

    this.queue.onHandlerEvent('search-processing', (requestId, query) => {
      console.log(`[MemorySearch] 搜索 "${query}" (${requestId})`)
    })

    this.queue.onHandlerEvent('search-complete', (requestId, results) => {
      console.log(`[MemorySearch] 完成 ${requestId}, 找到 ${results.length} 条结果`)
      this.resolveRequest(requestId, {
        query: results[0]?.query || '',
        results: results.map(r => ({ path: r.path, line: r.line, content: r.content, score: r.score })),
        totalCount: results.length,
      })
    })

    this.queue.onHandlerEvent('search-error', (requestId, error) => {
      console.error(`[MemorySearch] 失败 ${requestId}:`, error)
      this.rejectRequest(requestId, error instanceof Error ? error : new Error(String(error)))
    })

    this.queue.on('error', (payload, error) => {
      console.error(`[MemorySearch 队列] 处理失败 [${payload.requestId}]:`, error)
    })
  }

  private resolveRequest(requestId: string, result: SearchResult) {
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
   * 添加搜索请求到队列
   */
  async search(request: Omit<SearchRequest, 'requestId'>): Promise<SearchResult> {
    const requestId = crypto.randomUUID()
    
    return new Promise<SearchResult>((resolve, reject) => {
      this.pendingResults.set(requestId, { resolve, reject })
      this.queue.enqueue({ ...request, requestId })
    })
  }

  /**
   * 批量搜索
   */
  async searchBatch(requests: Array<Omit<SearchRequest, 'requestId'>>): Promise<SearchResult[]> {
    const promises = requests.map(req => this.search(req))
    return Promise.all(promises)
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.queue.length()
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
export function createMemorySearchQueue(
  searchFn: (query: string, limit: number, minScore?: number) => Promise<any[]>
): MemorySearchQueue {
  return new MemorySearchQueue(searchFn)
}
