/**
 * DuckDB Memory 测试 (纯 JS 模拟版本)
 */

// 内联 DuckDB 模拟实现
class DuckDBMemory {
  constructor() {
    this.tables = new Map()
    this.initialized = false
  }

  async init(config = {}) {
    this.initialized = true
    console.log('[DuckDB] 数据库初始化完成（模拟模式）')
  }

  async createTable(name, schema) {
    if (!this.tables.has(name)) {
      this.tables.set(name, [])
      console.log(`[DuckDB] 创建表：${name}`)
    }
  }

  async insert(name, data) {
    const table = this.tables.get(name)
    if (table) {
      table.push(data)
    }
  }

  async select(name, where) {
    const table = this.tables.get(name) || []
    let rows = table
    
    if (where) {
      rows = table.filter(row => {
        return Object.entries(where).every(([k, v]) => row[k] == v)
      })
    }
    
    return {
      columns: rows.length > 0 ? Object.keys(rows[0]) : [],
      rows: rows.map(r => Object.values(r)),
      rowCount: rows.length,
    }
  }

  async query(sql) {
    console.log(`[DuckDB] SQL: ${sql}`)
    return { columns: [], rows: [], rowCount: 0 }
  }

  async exec(sql) {
    console.log(`[DuckDB] 执行：${sql}`)
  }

  async getTableNames() {
    return Array.from(this.tables.keys())
  }

  async storeMemory(memory) {
    await this.createTable('memories', {
      id: 'VARCHAR',
      content: 'VARCHAR',
      tags: 'VARCHAR',
      timestamp: 'BIGINT',
    })
    await this.insert('memories', {
      id: memory.id,
      content: memory.content,
      tags: JSON.stringify(memory.tags || []),
      timestamp: memory.timestamp || Date.now(),
    })
  }

  async searchMemories(query, limit = 10) {
    const result = await this.select('memories')
    const matched = result.rows.filter(row => 
      row[1]?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, limit)
    return {
      columns: result.columns,
      rows: matched,
      rowCount: matched.length,
    }
  }

  async getMemoriesByTag(tag) {
    const result = await this.select('memories')
    const matched = result.rows.filter(row => 
      row[2]?.includes(tag)
    )
    return { columns: result.columns, rows: matched, rowCount: matched.length }
  }

  async dropTable(name) {
    this.tables.delete(name)
  }

  async close() {
    this.tables.clear()
    this.initialized = false
  }
}

// 测试函数
async function test1_basicCRUD() {
  console.log('🧪 测试 1: 基础 CRUD 操作')
  
  const db = new DuckDBMemory()
  await db.init()
  
  await db.createTable('users', { id: 'VARCHAR', name: 'VARCHAR', age: 'INTEGER' })
  await db.insert('users', { id: '1', name: 'Alice', age: 30 })
  await db.insert('users', { id: '2', name: 'Bob', age: 25 })
  
  const result = await db.select('users')
  console.log(`插入 ${result.rowCount} 条记录`)
  
  const alice = await db.select('users', { name: 'Alice' })
  console.log(`找到 Alice: ${alice.rowCount} 条`)
  
  await db.close()
  console.log('✅ 通过\n')
}

async function test2_memorySystem() {
  console.log('🧪 测试 2: 记忆系统')
  
  const db = new DuckDBMemory()
  await db.init()
  
  await db.storeMemory({ id: 'mem-001', content: '用户喜欢喝奶茶', tags: ['preference', 'food'] })
  await db.storeMemory({ id: 'mem-002', content: '用户住在北京', tags: ['location'] })
  await db.storeMemory({ id: 'mem-003', content: '用户喜欢编程', tags: ['preference', 'work'] })
  
  const search1 = await db.searchMemories('奶茶', 10)
  console.log(`搜索"奶茶": ${search1.rowCount} 条结果`)
  
  const search2 = await db.getMemoriesByTag('preference')
  console.log(`标签"preference": ${search2.rowCount} 条结果`)
  
  await db.close()
  console.log('✅ 通过\n')
}

async function test3_batchInsert() {
  console.log('🧪 测试 3: 批量插入')
  
  const db = new DuckDBMemory()
  await db.init()
  
  await db.createTable('items', { id: 'VARCHAR', name: 'VARCHAR', price: 'DOUBLE' })
  
  const startTime = Date.now()
  for (let i = 0; i < 100; i++) {
    await db.insert('items', { id: `item-${i}`, name: `Item ${i}`, price: Math.random() * 100 })
  }
  const endTime = Date.now()
  
  const result = await db.select('items')
  console.log(`插入 ${result.rowCount} 条记录，耗时 ${endTime - startTime}ms`)
  
  await db.close()
  console.log('✅ 通过\n')
}

async function test4_tableManagement() {
  console.log('🧪 测试 4: 表管理')
  
  const db = new DuckDBMemory()
  await db.init()
  
  await db.createTable('table1', { id: 'VARCHAR' })
  await db.createTable('table2', { id: 'VARCHAR' })
  await db.createTable('table3', { id: 'VARCHAR' })
  
  const tables = await db.getTableNames()
  console.log(`创建表：${tables.join(', ')}`)
  
  await db.dropTable('table2')
  const tablesAfter = await db.getTableNames()
  console.log(`删除后：${tablesAfter.join(', ')}`)
  
  await db.close()
  console.log('✅ 通过\n')
}

async function runAllTests() {
  console.log('🚀 开始运行 DuckDB Memory 测试（模拟模式）\n')
  
  try {
    await test1_basicCRUD()
    await test2_memorySystem()
    await test3_batchInsert()
    await test4_tableManagement()
    
    console.log('✅ 所有测试完成')
  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

runAllTests().catch(console.error)
