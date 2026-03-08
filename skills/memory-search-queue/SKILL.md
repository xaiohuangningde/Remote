# Memory Search Queue Skill

> 批量记忆搜索队列，基于 stream-queue
> 创建时间：2026-03-06

---

## 功能

- 🔍 **批量搜索** - 多个搜索请求自动排队
- ⚡ **异步处理** - 不阻塞主线程
- 📬 **事件通知** - 搜索进度实时通知
- 🛡️ **错误隔离** - 单个失败不影响其他

---

## 使用方式

### 基础用法

```typescript
import { createMemorySearchQueue } from 'skills/memory-search-queue/src/index.ts'

// 创建搜索队列（传入实际搜索函数）
const searchQueue = createMemorySearchQueue(
  async (query, limit, minScore) => {
    // 这里调用实际的 memory_search
    return await memory_search(query, limit, minScore)
  }
)

// 单个搜索
const result = await searchQueue.search({
  query: '用户偏好',
  limit: 10,
})

console.log(`找到 ${result.totalCount} 条结果`)
```

### 批量搜索

```typescript
// 批量搜索，自动排队执行
const results = await searchQueue.searchBatch([
  { query: '用户偏好', limit: 5 },
  { query: '待办事项', limit: 5 },
  { query: '项目进度', limit: 5 },
  { query: '会议记录', limit: 5 },
])

results.forEach((r, i) => {
  console.log(`查询 ${i + 1}: ${r.totalCount} 条结果`)
})
```

### 监听事件

```typescript
const queue = searchQueue.queue

// 监听搜索开始
queue.onHandlerEvent('search-processing', (requestId, query) => {
  console.log(`开始搜索：${query}`)
})

// 监听搜索完成
queue.onHandlerEvent('search-complete', (requestId, results) => {
  console.log(`搜索完成：${results.length} 条结果`)
})

// 监听错误
queue.on('error', (payload, error) => {
  console.error(`搜索失败 [${payload.requestId}]:`, error)
})

// 监听队列清空
queue.on('drain', () => {
  console.log('所有搜索完成')
})
```

### 队列管理

```typescript
// 查看队列长度
console.log('待处理搜索:', searchQueue.getQueueLength())

// 清空队列（取消所有待处理搜索）
searchQueue.clearQueue()
```

---

## API 参考

### `createMemorySearchQueue(searchFn)`

创建搜索队列。

**参数**:
- `searchFn(query, limit, minScore)` - 实际搜索函数

**返回**: `MemorySearchQueue` 实例

### `MemorySearchQueue` 方法

| 方法 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `search(request)` | SearchRequest | Promise<SearchResult> | 单个搜索 |
| `searchBatch(requests)` | SearchRequest[] | Promise<SearchResult[]> | 批量搜索 |
| `getQueueLength()` | - | number | 队列长度 |
| `clearQueue()` | - | void | 清空队列 |

### 事件

| 事件 | 回调参数 | 说明 |
|------|----------|------|
| `search-validated` | requestId | 请求已验证 |
| `search-processing` | requestId, query | 开始搜索 |
| `search-complete` | requestId, results, query | 搜索完成 |
| `search-error` | requestId, error | 搜索失败 |

---

## 整合到 OpenClaw

### 在 agent 中使用

```typescript
// 在 agent 代码中
import { createMemorySearchQueue } from 'skills/memory-search-queue/src/index.ts'

// 假设 memory_search 是 OpenClaw 提供的工具
const searchQueue = createMemorySearchQueue(memory_search)

// 批量搜索记忆
const results = await searchQueue.searchBatch([
  { query: '用户偏好', limit: 5 },
  { query: '待办事项', limit: 5 },
])

// 合并结果
const allMemories = results.flatMap(r => r.results)
```

### 在 heartbeat 中使用

```typescript
// HEARTBEAT.md 或 heartbeat 脚本中
const searchQueue = createMemorySearchQueue(memory_search)

// 每次 heartbeat 自动搜索关键信息
const [todos, progress, mentions] = await searchQueue.searchBatch([
  { query: '待办事项', limit: 10 },
  { query: '项目进度', limit: 5 },
  { query: '@mention', limit: 5 },
])

// 根据结果决定是否需要汇报
if (todos.totalCount > 0 || progress.totalCount > 0) {
  // 有待办或进度更新
  sendUpdate()
} else {
  // 无事发生
  reply('HEARTBEAT_OK')
}
```

---

## 性能优化

### 1. 并发控制

stream-queue 默认串行处理，如需并发：

```typescript
const searchQueue = createMemorySearchQueue(searchFn)

// 修改队列实现支持并发
// （需要自定义 createQueue 实现）
```

### 2. 结果缓存

```typescript
const cache = new Map<string, SearchResult>()

const searchQueue = createMemorySearchQueue(async (query, limit) => {
  const key = `${query}:${limit}`
  if (cache.has(key)) {
    return cache.get(key)
  }
  const results = await memory_search(query, limit)
  cache.set(key, results)
  return results
})
```

### 3. 优先级队列

```typescript
// 高优先级搜索插队
const urgentQueue = createMemorySearchQueue(searchFn)
const normalQueue = createMemorySearchQueue(searchFn)

// 先处理紧急队列
await urgentQueue.search({ query: '紧急事项' })
await normalQueue.search({ query: '普通事项' })
```

---

## 测试用例

```typescript
import { createMemorySearchQueue } from './src/index.ts'

// Mock 搜索函数
const mockSearch = async (query, limit) => [
  { path: 'MEMORY.md', content: `关于${query}的内容` }
]

const queue = createMemorySearchQueue(mockSearch)

// 测试搜索
const result = await queue.search({ query: '测试', limit: 5 })
console.assert(result.totalCount === 1)

// 测试批量
const results = await queue.searchBatch([
  { query: '测试 1' },
  { query: '测试 2' },
])
console.assert(results.length === 2)

console.log('✅ 测试通过')
```

---

## 与 stream-queue 关系

```
memory-search-queue
    ↓ 依赖
stream-queue
    ↓ 提供
事件驱动队列
```

**memory-search-queue** 是 **stream-queue** 的封装，专门用于记忆搜索场景。

---

## 注意事项

1. **搜索函数**: 需要传入实际的 memory_search 函数
2. **错误处理**: 单个搜索失败不会影响其他搜索
3. **内存**: 大量搜索时注意清理缓存
4. **并发**: 默认串行处理，需要并发需自定义实现

---

## 未来扩展

- [ ] 支持优先级队列
- [ ] 支持并发搜索
- [ ] 内置结果缓存
- [ ] 搜索结果去重
- [ ] 搜索历史记录

---

**创建者**: xiaoxiaohuang 🐤
**时间**: 2026-03-06
**依赖**: stream-queue
