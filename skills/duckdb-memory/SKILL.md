# DuckDB Memory Skill

> 本地内存数据库，基于 DuckDB-WASM
> 灵感来自 Airi 项目的记忆系统架构
> 创建时间：2026-03-06

---

## 功能

- 📦 **本地存储** - 内存或文件持久化
- 🔍 **SQL 查询** - 完整 SQL 支持
- 🧠 **记忆系统** - 内置记忆存储和搜索
- ⚡ **高性能** - WASM 加速，列式存储

---

## 使用方式

### 基础用法

```typescript
import { DuckDBMemory } from 'skills/duckdb-memory/src/index.ts'

const db = new DuckDBMemory()

// 初始化（内存模式）
await db.init()

// 创建表
await db.createTable('users', {
  id: 'VARCHAR PRIMARY KEY',
  name: 'VARCHAR',
  age: 'INTEGER',
})

// 插入数据
await db.insert('users', { id: '1', name: 'Alice', age: 30 })
await db.insert('users', { id: '2', name: 'Bob', age: 25 })

// 查询
const result = await db.select('users')
console.log(result.rows) // [['1', 'Alice', 30], ['2', 'Bob', 25]]

// 条件查询
const alice = await db.select('users', { name: 'Alice' })

// 直接执行 SQL
await db.exec('UPDATE users SET age = 31 WHERE id = 1')
const updated = await db.query('SELECT * FROM users')
```

### 记忆系统

```typescript
// 存储记忆
await db.storeMemory({
  id: 'mem-001',
  content: '用户喜欢喝奶茶',
  tags: ['preference', 'food'],
  timestamp: Date.now(),
})

await db.storeMemory({
  id: 'mem-002',
  content: '用户住在北京',
  tags: ['location'],
})

// 搜索记忆
const results = await db.searchMemories('奶茶', 10)
console.log(results.rows)

// 按标签获取
const prefs = await db.getMemoriesByTag('preference')
```

### 批量操作

```typescript
// 事务（需要 DuckDB 完整支持）
await db.exec('BEGIN TRANSACTION')
try {
  await db.insert('users', { id: '3', name: 'Charlie', age: 35 })
  await db.insert('users', { id: '4', name: 'Diana', age: 28 })
  await db.exec('COMMIT')
} catch (e) {
  await db.exec('ROLLBACK')
}

// 批量插入
const users = [
  { id: '5', name: 'Eve', age: 22 },
  { id: '6', name: 'Frank', age: 40 },
]
for (const user of users) {
  await db.insert('users', user)
}
```

---

## API 参考

### 核心方法

| 方法 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `init(config)` | DBConfig | Promise<void> | 初始化数据库 |
| `exec(sql)` | string | Promise<void> | 执行 SQL |
| `query(sql)` | string | Promise<QueryResult> | 查询 SQL |
| `close()` | - | Promise<void> | 关闭数据库 |

### 便捷方法

| 方法 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `createTable(name, schema)` | string, Record<string,string> | Promise<void> | 创建表 |
| `insert(name, data)` | string, Record<string,any> | Promise<void> | 插入数据 |
| `select(name, where?)` | string, Record? | Promise<QueryResult> | 查询表 |
| `delete(name, where?)` | string, Record? | Promise<number> | 删除数据 |
| `dropTable(name)` | string | Promise<void> | 删除表 |

### 记忆系统方法

| 方法 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `storeMemory(memory)` | Memory | Promise<void> | 存储记忆 |
| `searchMemories(query, limit)` | string, number | Promise<QueryResult> | 搜索记忆 |
| `getMemoriesByTag(tag)` | string | Promise<QueryResult> | 按标签获取 |

---

## 配置选项

```typescript
interface DBConfig {
  path?: string  // 数据库文件路径（可选）
  enableWAL?: boolean  // 写前日志（默认 false）
}
```

### 模式

**内存模式**（默认）:
```typescript
await db.init()  // 使用 :memory:
```

**文件模式**（持久化）:
```typescript
await db.init({ path: './data/mydb.duckdb' })
```

---

## 数据类型

DuckDB 支持丰富的数据类型：

| 类型 | 说明 | 示例 |
|------|------|------|
| VARCHAR | 字符串 | `'hello'` |
| INTEGER | 整数 | `42` |
| BIGINT | 大整数 | `9223372036854775807` |
| FLOAT / DOUBLE | 浮点数 | `3.14` |
| BOOLEAN | 布尔值 | `true` |
| DATE | 日期 | `'2026-03-06'` |
| TIMESTAMP | 时间戳 | `'2026-03-06 13:00:00'` |
| JSON | JSON 对象 | `'{"key": "value"}'` |
| BLOB | 二进制数据 | - |

---

## 性能优化

### 1. 使用预处理语句

```typescript
// 批量插入时，预编译语句
const stmt = await db.conn.prepare('INSERT INTO users VALUES (?, ?, ?)')
for (const user of users) {
  await stmt.run(user.id, user.name, user.age)
}
```

### 2. 索引优化

```typescript
// 为常用查询字段创建索引
await db.exec('CREATE INDEX idx_users_name ON users(name)')
await db.exec('CREATE INDEX idx_memories_tags ON memories(tags)')
```

### 3. 批量操作

```typescript
// 使用事务批量插入
await db.exec('BEGIN TRANSACTION')
for (const item of items) {
  await db.insert('items', item)
}
await db.exec('COMMIT')
```

---

## 与 Airi 架构对比

| 特性 | Airi | OpenClaw 整合版 |
|------|------|-----------------|
| DuckDB WASM | ✅ | ✅ |
| Drizzle ORM | ✅ | ❌ (直接用 SQL) |
| 记忆系统 | ✅ | ✅ |
| 向量搜索 | ✅ | ⚠️ (待实现) |
| 文件持久化 | ✅ | ✅ |

---

## 依赖

**运行时依赖**:
- DuckDB WASM (通过 CDN 或 npm 加载)
- 或 模拟模式（无依赖，功能简化）

**可选依赖**:
```json
{
  "@duckdb/duckdb-wasm": "^1.28.0"
}
```

---

## 测试用例

```typescript
import { DuckDBMemory } from './src/index.ts'

async function test() {
  const db = new DuckDBMemory()
  await db.init()
  
  // 测试创建表
  await db.createTable('test', { id: 'VARCHAR', value: 'INTEGER' })
  
  // 测试插入
  await db.insert('test', { id: '1', value: 100 })
  
  // 测试查询
  const result = await db.select('test')
  console.assert(result.rowCount === 1)
  
  // 测试记忆
  await db.storeMemory({ id: 'm1', content: 'test memory' })
  const memories = await db.searchMemories('test')
  console.assert(memories.rowCount === 1)
  
  console.log('✅ 所有测试通过')
}

test().catch(console.error)
```

---

## 注意事项

1. **WASM 加载**: 首次加载需要下载 WASM 文件（~2MB）
2. **浏览器兼容**: 需要支持 WebAssembly 的现代浏览器
3. **内存限制**: 内存模式受浏览器内存限制
4. **并发**: DuckDB WASM 是单线程的

---

## 未来扩展

- [ ] 向量相似度搜索（集成 ONNX Runtime）
- [ ] Drizzle ORM 集成
- [ ] 自动迁移支持
- [ ] 数据备份/恢复
- [ ] 多数据库实例

---

**整合者**: xiaoxiaohuang 🐤
**时间**: 2026-03-06
**灵感来源**: Airi 项目记忆系统架构
