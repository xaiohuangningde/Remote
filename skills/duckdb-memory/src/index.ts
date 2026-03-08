/**
 * DuckDB Memory - 本地内存数据库技能
 * 基于 DuckDB-WASM，提供 SQL 查询能力的本地存储
 * 
 * 灵感来自 Airi 项目的记忆系统架构
 */

// DuckDB WASM 需要通过 CDN 或本地加载
// 这里使用动态导入方式

export interface DBConfig {
  path?: string  // 数据库文件路径（可选，内存模式可不指定）
  enableWAL?: boolean  // 写前日志
}

export interface QueryResult {
  columns: string[]
  rows: any[][]
  rowCount: number
}

export class DuckDBMemory {
  private db: any = null
  private conn: any = null
  private initialized: boolean = false

  async init(config: DBConfig = {}): Promise<void> {
    if (this.initialized) return

    // 动态加载 DuckDB WASM
    const duckdb = await this.loadDuckDB()
    
    // 创建数据库
    const db = await duckdb.createDB({
      path: config.path || ':memory:',
    })
    
    this.db = db
    this.conn = await db.connect()
    this.initialized = true
    
    console.log('[DuckDB] 数据库初始化完成')
  }

  private async loadDuckDB(): Promise<any> {
    // 尝试从 CDN 加载 DuckDB WASM
    try {
      // 浏览器环境
      if (typeof window !== 'undefined') {
        const duckdb = await import('https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.28.0/+esm')
        return duckdb
      }
      // Node.js 环境
      else {
        const duckdb = await import('@duckdb/duckdb-wasm')
        return duckdb
      }
    } catch (e) {
      console.warn('[DuckDB] 无法加载 WASM，使用模拟模式')
      return this.createMockDuckDB()
    }
  }

  private createMockDuckDB(): any {
    // 模拟 DuckDB API（用于无 WASM 环境）
    const tables = new Map<string, any[]>()
    
    return {
      createDB: async (options: any) => ({
        connect: async () => ({
          send: async (query: string) => {
            console.log('[Mock DuckDB] 执行查询:', query)
            // 简单的 CREATE TABLE 模拟
            if (query.startsWith('CREATE TABLE')) {
              const match = query.match(/CREATE TABLE (\w+)/)
              if (match) {
                tables.set(match[1], [])
              }
            }
            // 简单的 INSERT 模拟
            else if (query.startsWith('INSERT INTO')) {
              const match = query.match(/INSERT INTO (\w+) VALUES \((.+)\)/)
              if (match) {
                const values = match[2].split(',').map(v => v.trim().replace(/^'|'$/g, ''))
                tables.get(match[1])?.push(values)
              }
            }
            return { rows: [] }
          },
          query: async (query: string) => {
            console.log('[Mock DuckDB] 查询:', query)
            // 简单的 SELECT 模拟
            if (query.startsWith('SELECT * FROM')) {
              const match = query.match(/SELECT \* FROM (\w+)/)
              if (match) {
                const rows = tables.get(match[1]) || []
                return { columns: ['id', 'data'], rows }
              }
            }
            return { columns: [], rows: [] }
          },
        }),
      }),
    }
  }

  async exec(sql: string): Promise<void> {
    if (!this.conn) throw new Error('数据库未初始化')
    await this.conn.send(sql)
  }

  async query(sql: string): Promise<QueryResult> {
    if (!this.conn) throw new Error('数据库未初始化')
    const result = await this.conn.query(sql)
    return {
      columns: result.columns || [],
      rows: result.rows || [],
      rowCount: result.rows?.length || 0,
    }
  }

  // ============ 便捷方法 ============

  async createTable(name: string, schema: Record<string, string>): Promise<void> {
    const columns = Object.entries(schema)
      .map(([col, type]) => `${col} ${type}`)
      .join(', ')
    await this.exec(`CREATE TABLE IF NOT EXISTS ${name} (${columns})`)
  }

  async insert(name: string, data: Record<string, any>): Promise<void> {
    const columns = Object.keys(data).join(', ')
    const values = Object.values(data)
      .map(v => typeof v === 'string' ? `'${v}'` : v)
      .join(', ')
    await this.exec(`INSERT INTO ${name} (${columns}) VALUES (${values})`)
  }

  async select(name: string, where?: Record<string, any>): Promise<QueryResult> {
    let sql = `SELECT * FROM ${name}`
    if (where) {
      const conditions = Object.entries(where)
        .map(([k, v]) => `${k} = ${typeof v === 'string' ? `'${v}'` : v}`)
        .join(' AND ')
      sql += ` WHERE ${conditions}`
    }
    return this.query(sql)
  }

  async delete(name: string, where?: Record<string, any>): Promise<number> {
    let sql = `DELETE FROM ${name}`
    if (where) {
      const conditions = Object.entries(where)
        .map(([k, v]) => `${k} = ${typeof v === 'string' ? `'${v}'` : v}`)
        .join(' AND ')
      sql += ` WHERE ${conditions}`
    }
    await this.exec(sql)
    // 返回受影响的行数（简化实现）
    return 0
  }

  async dropTable(name: string): Promise<void> {
    await this.exec(`DROP TABLE IF EXISTS ${name}`)
  }

  // ============ 记忆系统专用方法 ============

  async storeMemory(memory: { id: string; content: string; tags?: string[]; timestamp?: number }): Promise<void> {
    await this.createTable('memories', {
      id: 'VARCHAR PRIMARY KEY',
      content: 'VARCHAR',
      tags: 'VARCHAR',
      timestamp: 'BIGINT',
      embedding: 'VARCHAR',  // 向量嵌入（JSON 字符串）
    })
    
    await this.insert('memories', {
      id: memory.id,
      content: memory.content,
      tags: memory.tags ? JSON.stringify(memory.tags) : '[]',
      timestamp: memory.timestamp || Date.now(),
      embedding: '[]',
    })
  }

  async searchMemories(query: string, limit: number = 10): Promise<QueryResult> {
    // 简单的全文搜索（实际应该用向量相似度）
    return this.query(`
      SELECT * FROM memories 
      WHERE content LIKE '%${query}%'
      LIMIT ${limit}
    `)
  }

  async getMemoriesByTag(tag: string): Promise<QueryResult> {
    return this.query(`
      SELECT * FROM memories 
      WHERE tags LIKE '%${tag}%'
    `)
  }

  // ============ 工具方法 ============

  async getTableNames(): Promise<string[]> {
    const result = await this.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'main'
    `)
    return result.rows.map(row => row[0])
  }

  async close(): Promise<void> {
    if (this.conn) {
      await this.conn.close()
    }
    this.initialized = false
  }
}

// 导出单例
export const db = new DuckDBMemory()
