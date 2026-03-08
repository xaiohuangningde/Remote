# OpenClaw 核心整合计划

> 不再提取新模块，而是把已有技能整合到 OpenClaw 核心流程中
> 执行者：xiaoxiaohuang 🐤
> 开始时间：2026-03-06 14:10

---

## 可以立即整合的

### 1. memory_search 批量优化 ⭐⭐⭐⭐⭐

**当前问题**: 多个搜索请求同步等待

**整合方案**: 使用 stream-queue 进行异步批量处理

```typescript
// skills/memory-search-queue.ts
import { createQueue } from './stream-queue/src/queue.ts'

const searchQueue = createQueue<{ query: string; limit: number }>({
  handlers: [
    async (ctx) => {
      // 执行实际搜索
      const results = await performMemorySearch(ctx.data.query, ctx.data.limit)
      ctx.emit('search-complete', ctx.data.query, results)
      return results
    }
  ]
})

// 批量搜索，自动排队
const promises = [
  searchQueue.enqueue({ query: '用户偏好', limit: 5 }),
  searchQueue.enqueue({ query: '待办事项', limit: 5 }),
  searchQueue.enqueue({ query: '项目进度', limit: 5 }),
]
```

**收益**: 
- 并发搜索不阻塞
- 错误自动隔离
- 结果事件通知

---

### 2. subagent 任务调度 ⭐⭐⭐⭐⭐

**当前问题**: subagent 直接 spawn，无优先级管理

**整合方案**: 使用 stream-queue 管理 subagent 任务

```typescript
// skills/subagent-queue.ts
import { createQueue } from './stream-queue/src/queue.ts'
import { sessions_spawn } from 'openclaw'

const agentQueue = createQueue<{ task: string; priority?: number }>({
  handlers: [
    async (ctx) => {
      const result = await sessions_spawn({
        task: ctx.data.task,
        mode: 'run',
      })
      ctx.emit('agent-complete', ctx.data.task, result)
      return result
    }
  ]
})

// 批量任务，自动排队执行
agentQueue.enqueue({ task: '研究 X 项目' })
agentQueue.enqueue({ task: '分析 Y 代码' })
```

**收益**:
- 任务有序执行
- 可追踪进度
- 错误不中断其他任务

---

### 3. 对话历史存储 ⭐⭐⭐⭐

**当前问题**: 对话历史没有结构化存储

**整合方案**: 使用 duckdb-memory 存储对话

```typescript
// skills/conversation-history.ts
import { DuckDBMemory } from './duckdb-memory/src/index.ts'

const history = new DuckDBMemory()
await history.init()

await history.createTable('conversations', {
  id: 'VARCHAR PRIMARY KEY',
  role: 'VARCHAR',  // user/assistant
  content: 'VARCHAR',
  timestamp: 'BIGINT',
  session_id: 'VARCHAR',
  tags: 'VARCHAR',  // JSON array
})

// 存储对话
await history.insert('conversations', {
  id: crypto.randomUUID(),
  role: 'user',
  content: '你好',
  timestamp: Date.now(),
  session_id: 'session-001',
  tags: JSON.stringify(['greeting']),
})

// 搜索历史对话
const results = await history.query(`
  SELECT * FROM conversations 
  WHERE content LIKE '%你好%'
  ORDER BY timestamp DESC
  LIMIT 10
`)
```

**收益**:
- 结构化存储
- SQL 查询能力
- 可按标签/时间筛选

---

### 4. API 响应缓存 ⭐⭐⭐⭐

**当前问题**: 重复 API 请求浪费 token 和时间

**整合方案**: 使用 duckdb-memory 缓存 API 响应

```typescript
// skills/api-cache.ts
import { DuckDBMemory } from './duckdb-memory/src/index.ts'

const cache = new DuckDBMemory()
await cache.init()

await cache.createTable('api_cache', {
  key: 'VARCHAR PRIMARY KEY',  // 请求 hash
  endpoint: 'VARCHAR',
  response: 'VARCHAR',  // JSON 字符串
  timestamp: 'BIGINT',
  ttl: 'BIGINT',  // 过期时间
})

// 缓存写入
async function cacheSet(key: string, endpoint: string, response: any, ttlMs: number) {
  await cache.insert('api_cache', {
    key,
    endpoint,
    response: JSON.stringify(response),
    timestamp: Date.now(),
    ttl: Date.now() + ttlMs,
  })
}

// 缓存读取
async function cacheGet(key: string) {
  const result = await cache.select('api_cache', { key })
  const row = result.rows[0]
  if (row && row[4] > Date.now()) {
    return JSON.parse(row[2])
  }
  return null  // 过期或不存在
}

// 使用示例
const cached = await cacheGet('weather-beijing')
if (cached) {
  return cached  // 命中缓存
} else {
  const data = await fetchWeather('beijing')
  await cacheSet('weather-beijing', 'weather', data, 3600000)  // 1 小时缓存
  return data
}
```

**收益**:
- 减少重复请求
- 节省 token
- 加快响应速度

---

### 5. 待办事项管理 ⭐⭐⭐⭐⭐

**当前问题**: 待办事项散落在各处

**整合方案**: duckdb-memory + stream-queue

```typescript
// skills/todo-manager.ts
import { DuckDBMemory } from './duckdb-memory/src/index.ts'
import { createQueue } from './stream-queue/src/queue.ts'

class TodoManager {
  private db = new DuckDBMemory()
  private queue = createQueue({
    handlers: [async (ctx) => this.executeTask(ctx.data)]
  })

  async init() {
    await this.db.init()
    await this.db.createTable('todos', {
      id: 'VARCHAR PRIMARY KEY',
      title: 'VARCHAR',
      status: 'VARCHAR',  // pending/running/done/blocked
      priority: 'INTEGER',
      created_at: 'BIGINT',
      updated_at: 'BIGINT',
      metadata: 'VARCHAR',  // JSON
    })
  }

  async addTodo(todo: { title: string; priority?: number }) {
    const id = crypto.randomUUID()
    await this.db.insert('todos', {
      id,
      title: todo.title,
      status: 'pending',
      priority: todo.priority || 0,
      created_at: Date.now(),
      updated_at: Date.now(),
      metadata: '{}',
    })
    this.queue.enqueue({ id, ...todo })
    return id
  }

  async getPendingTodos() {
    return this.db.query(`
      SELECT * FROM todos 
      WHERE status = 'pending'
      ORDER BY priority DESC, created_at ASC
    `)
  }

  private async executeTask(todo: any) {
    // 自动执行待办
    console.log('执行待办:', todo.title)
  }
}
```

---

## 整合优先级

| 整合 | 价值 | 难度 | 优先级 |
|------|------|------|--------|
| memory_search 批量 | ⭐⭐⭐⭐⭐ | 低 | 立即 |
| subagent 调度 | ⭐⭐⭐⭐⭐ | 低 | 立即 |
| 待办事项管理 | ⭐⭐⭐⭐⭐ | 中 | 今天 |
| API 缓存 | ⭐⭐⭐⭐ | 低 | 今天 |
| 对话历史 | ⭐⭐⭐⭐ | 中 | 本周 |

---

## 开始执行

不再等待，直接整合！
