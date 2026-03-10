/**
 * API Cache - API 响应缓存
 * 基于 duckdb-memory，减少重复请求
 */

import { DuckDBMemory } from '../../duckdb-memory/src/index.ts'

export interface CacheEntry {
  key: string
  endpoint: string
  response: any
  timestamp: number
  ttl: number  // 过期时间戳
  hits: number
}

export class ApiCache {
  private db: DuckDBMemory
  private defaultTTL: number = 3600000  // 1 小时

  constructor(defaultTTL?: number) {
    this.db = new DuckDBMemory()
    if (defaultTTL) this.defaultTTL = defaultTTL
  }

  async init(): Promise<void> {
    await this.db.init()
    await this.db.createTable('api_cache', {
      key: 'VARCHAR PRIMARY KEY',
      endpoint: 'VARCHAR',
      response: 'VARCHAR',
      timestamp: 'BIGINT',
      ttl: 'BIGINT',
      hits: 'INTEGER',
    })
    console.log('[ApiCache] 初始化完成')
  }

  /**
   * 生成缓存键
   */
  generateKey(endpoint: string, params?: Record<string, any>): string {
    const paramsStr = params ? JSON.stringify(params) : ''
    return `${endpoint}:${paramsStr}`
  }

  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<T | null> {
    const result = await this.db.select('api_cache', { key })
    
    if (result.rowCount === 0) {
      return null
    }

    const row = result.rows[0]
    const ttl = row[4]
    
    // 检查是否过期
    if (ttl < Date.now()) {
      await this.delete(key)
      return null
    }

    // 增加命中计数
    const hits = (row[5] || 0) + 1
    await this.db.exec(`UPDATE api_cache SET hits = ${hits} WHERE key = '${key}'`)

    return JSON.parse(row[2])
  }

  /**
   * 设置缓存
   */
  async set(key: string, endpoint: string, response: any, ttl?: number): Promise<void> {
    const now = Date.now()
    const expireAt = now + (ttl || this.defaultTTL)

    await this.db.insert('api_cache', {
      key,
      endpoint,
      response: JSON.stringify(response),
      timestamp: now,
      ttl: expireAt,
      hits: 0,
    })
  }

  /**
   * 获取或设置（缓存穿透保护）
   */
  async getOrSet<T>(
    key: string,
    endpoint: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // 先尝试获取缓存
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // 缓存未命中，获取新数据
    const fresh = await fetchFn()
    await this.set(key, endpoint, fresh, ttl)
    return fresh
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void> {
    await this.db.exec(`DELETE FROM api_cache WHERE key = '${key}'`)
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    await this.db.exec('DELETE FROM api_cache')
  }

  /**
   * 清理过期缓存
   */
  async cleanup(): Promise<number> {
    const now = Date.now()
    const result = await this.db.query(`
      SELECT key FROM api_cache WHERE ttl < ${now}
    `)
    const count = result.rowCount
    
    await this.db.exec(`DELETE FROM api_cache WHERE ttl < ${now}`)
    
    return count
  }

  /**
   * 获取缓存统计
   */
  async getStats(): Promise<{
    total: number
    hits: number
    endpoints: Array<{ endpoint: string; count: number }>
  }> {
    const total = await this.db.query('SELECT COUNT(*) FROM api_cache')
    const hits = await this.db.query('SELECT SUM(hits) FROM api_cache')
    const endpoints = await this.db.query(`
      SELECT endpoint, COUNT(*) as count 
      FROM api_cache 
      GROUP BY endpoint
    `)

    return {
      total: total.rows[0]?.[0] || 0,
      hits: hits.rows[0]?.[0] || 0,
      endpoints: endpoints.rows.map(r => ({ endpoint: r[0], count: r[1] })),
    }
  }

  /**
   * 获取所有缓存键
   */
  async keys(): Promise<string[]> {
    const result = await this.db.query('SELECT key FROM api_cache')
    return result.rows.map(r => r[0])
  }

  /**
   * 检查键是否存在
   */
  async has(key: string): Promise<boolean> {
    const cached = await this.get(key)
    return cached !== null
  }

  /**
   * 关闭数据库
   */
  async close(): Promise<void> {
    await this.db.close()
  }
}

// 导出工厂函数
export function createApiCache(defaultTTL?: number): ApiCache {
  return new ApiCache(defaultTTL)
}
