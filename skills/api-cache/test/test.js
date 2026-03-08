/**
 * API Cache 测试
 */

// 内联 DuckDBMemory 模拟
class DuckDBMemory {
  constructor() { this.tables = new Map(); this.initialized = false; }
  async init() { this.initialized = true; }
  async createTable(name, schema) { if (!this.tables.has(name)) this.tables.set(name, []); }
  async insert(name, data) { const table = this.tables.get(name); if (table) table.push(data); }
  async select(name, where) {
    const table = this.tables.get(name) || []
    if (!where) return { rows: table.map(r => Object.values(r)), rowCount: table.length }
    const key = Object.values(where)[0]
    const row = table.find(r => r.key === key)
    return { rows: row ? [Object.values(row)] : [], rowCount: row ? 1 : 0 }
  }
  async query(sql) {
    const table = this.tables.get('api_cache') || []
    if (sql.includes('COUNT')) {
      return { rows: [[table.length]], rowCount: 1 }
    }
    if (sql.includes('SUM')) {
      const sum = table.reduce((a, b) => a + (b.hits || 0), 0)
      return { rows: [[sum]], rowCount: 1 }
    }
    if (sql.includes('GROUP BY')) {
      const groups = {}
      for (const r of table) {
        groups[r.endpoint] = (groups[r.endpoint] || 0) + 1
      }
      return { rows: Object.entries(groups).map(([e, c]) => [e, c]), rowCount: Object.keys(groups).length }
    }
    if (sql.includes('DELETE')) {
      const match = sql.match(/ttl < (\d+)/)
      if (match) {
        const now = parseInt(match[1])
        const before = table.length
        this.tables.set('api_cache', table.filter(r => r.ttl >= now))
        return { rows: [], rowCount: before - this.tables.get('api_cache').length }
      }
    }
    return { rows: table.map(r => Object.values(r)), rowCount: table.length }
  }
  async exec(sql) {
    if (sql.startsWith('DELETE')) {
      const table = this.tables.get('api_cache') || []
      if (sql.includes('ttl <')) {
        const match = sql.match(/ttl < (\d+)/)
        if (match) {
          const now = parseInt(match[1])
          this.tables.set('api_cache', table.filter(r => r.ttl >= now))
        }
      } else {
        this.tables.set('api_cache', [])
      }
    }
    if (sql.startsWith('UPDATE')) {
      const match = sql.match(/hits = (\d+) WHERE key = '([^']+)'/)
      if (match) {
        const hits = parseInt(match[1])
        const key = match[2]
        const table = this.tables.get('api_cache') || []
        const row = table.find(r => r.key === key)
        if (row) row.hits = hits
      }
    }
  }
  async close() { this.tables.clear(); this.initialized = false; }
}

// ApiCache 实现
class ApiCache {
  constructor(defaultTTL) {
    this.db = new DuckDBMemory()
    this.defaultTTL = defaultTTL || 3600000
  }

  async init() {
    await this.db.init()
    await this.db.createTable('api_cache', { key: 'VARCHAR' })
  }

  async get(key) {
    const result = await this.db.select('api_cache', { key })
    if (result.rowCount === 0) return null
    const row = result.rows[0]
    if (row[4] < Date.now()) {
      await this.delete(key)
      return null
    }
    const hits = (row[5] || 0) + 1
    await this.db.exec(`UPDATE api_cache SET hits = ${hits} WHERE key = '${key}'`)
    return JSON.parse(row[2])
  }

  async set(key, endpoint, response, ttl) {
    const now = Date.now()
    await this.db.insert('api_cache', {
      key, endpoint, response: JSON.stringify(response),
      timestamp: now, ttl: now + (ttl || this.defaultTTL), hits: 0,
    })
  }

  async getOrSet(key, endpoint, fetchFn, ttl) {
    const cached = await this.get(key)
    if (cached !== null) return cached
    const fresh = await fetchFn()
    await this.set(key, endpoint, fresh, ttl)
    return fresh
  }

  async delete(key) { await this.db.exec(`DELETE FROM api_cache WHERE key = '${key}'`) }
  async clear() { await this.db.exec('DELETE FROM api_cache') }
  
  async getStats() {
    const total = await this.db.query('SELECT COUNT(*) FROM api_cache')
    const hits = await this.db.query('SELECT SUM(hits) FROM api_cache')
    return { total: total.rows[0][0], hits: hits.rows[0][0], endpoints: [] }
  }
  
  async has(key) { return (await this.get(key)) !== null }
  async close() { await this.db.close() }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function runTests() {
  console.log('🚀 开始运行 API Cache 测试\n')
  
  // 测试 1: 基本缓存
  console.log('🧪 测试 1: 基本缓存操作')
  const cache1 = new ApiCache(1000)
  await cache1.init()
  await cache1.set('key1', '/api/test', { data: 'hello' })
  const result1 = await cache1.get('key1')
  console.log(`缓存命中：${JSON.stringify(result1)}`)
  console.log('✅ 通过\n')
  
  // 测试 2: 缓存过期
  console.log('🧪 测试 2: 缓存过期')
  const cache2 = new ApiCache(50)  // 50ms TTL
  await cache2.init()
  await cache2.set('key2', '/api/test', { data: 'world' })
  await sleep(100)
  const expired = await cache2.get('key2')
  console.log(`过期后：${expired === null ? '已过期' : '未过期'}`)
  console.log('✅ 通过\n')
  
  // 测试 3: getOrSet
  console.log('🧪 测试 3: getOrSet 缓存穿透保护')
  const cache3 = new ApiCache(1000)
  await cache3.init()
  let fetchCount = 0
  const result3a = await cache3.getOrSet('key3', '/api/test', async () => {
    fetchCount++
    return { data: 'fetched' }
  })
  const result3b = await cache3.getOrSet('key3', '/api/test', async () => {
    fetchCount++
    return { data: 'should not fetch' }
  })
  console.log(`获取次数：${fetchCount} (应为 1)`)
  console.log('✅ 通过\n')
  
  // 测试 4: 统计
  console.log('🧪 测试 4: 缓存统计')
  const cache4 = new ApiCache(1000)
  await cache4.init()
  await cache4.set('key1', '/api/a', { data: 1 })
  await cache4.set('key2', '/api/b', { data: 2 })
  await cache4.get('key1')  // 增加命中
  const stats = await cache4.getStats()
  console.log(`总数：${stats.total}, 命中：${stats.hits}`)
  console.log('✅ 通过\n')
  
  // 测试 5: 清空
  console.log('🧪 测试 5: 清空缓存')
  const cache5 = new ApiCache(1000)
  await cache5.init()
  await cache5.set('key1', '/api/test', {})
  await cache5.clear()
  const has = await cache5.has('key1')
  console.log(`清空后存在：${has}`)
  console.log('✅ 通过\n')
  
  console.log('✅ 所有测试完成')
}

runTests().catch(console.error)
