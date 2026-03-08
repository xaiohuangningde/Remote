# Subagent Queue Skill

> 子代理任务调度队列，基于 stream-queue
> 创建时间：2026-03-06

---

## 功能

- 🤖 **子代理管理** - 批量任务自动排队
- 📊 **优先级支持** - 高优先级任务优先
- ⏱️ **进度追踪** - 实时查看运行中任务
- 🛡️ **错误隔离** - 单个失败不影响其他

---

## 使用方式

### 基础用法

```typescript
import { createSubagentQueue } from 'skills/subagent-queue/src/index.ts'

// 创建队列（传入 sessions_spawn 包装函数）
const agentQueue = createSubagentQueue(
  async (task, options) => {
    return await sessions_spawn({
      task,
      mode: 'run',
      timeoutSeconds: options?.timeout,
      label: options?.label,
    })
  }
)

// 单个任务
const result = await agentQueue.spawn({
  task: '研究 X 项目',
  priority: 5,
  timeout: 300,  // 5 分钟
})

console.log(`完成：${result.output}`)
```

### 批量任务

```typescript
// 批量分发任务，自动按顺序执行
const results = await agentQueue.spawnBatch([
  { task: '研究 React 最新特性', priority: 8 },
  { task: '分析 Vue 3 性能优化', priority: 5 },
  { task: '对比 Svelte 架构', priority: 3 },
])

results.forEach((r, i) => {
  console.log(`任务 ${i + 1}: ${r.duration.toFixed(1)}s - ${r.output.substring(0, 50)}`)
})
```

### 监听事件

```typescript
const queue = agentQueue.queue

// 任务开始
queue.onHandlerEvent('task-started', (requestId, task) => {
  console.log(`开始：${task}`)
})

// 任务完成
queue.onHandlerEvent('task-complete', (requestId, result, duration) => {
  console.log(`完成 [${duration.toFixed(1)}s]: ${result}`)
})

// 任务失败
queue.onHandlerEvent('task-error', (requestId, error, duration) => {
  console.error(`失败 [${duration.toFixed(1)}s]:`, error)
})

// 所有任务完成
queue.on('drain', () => {
  console.log('所有任务完成')
})
```

### 进度追踪

```typescript
// 查看队列状态
console.log('待处理:', agentQueue.getQueueLength())
console.log('运行中:', agentQueue.getRunningCount())

// 获取运行中任务详情
const running = agentQueue.getRunningTasks()
running.forEach(task => {
  console.log(`[${task.requestId}] ${task.task} (${task.duration.toFixed(1)}s)`)
})
```

---

## API 参考

### `createSubagentQueue(spawnFn)`

创建子代理队列。

**参数**:
- `spawnFn(task, options)` - sessions_spawn 包装函数

**返回**: `SubagentQueue` 实例

### `SubagentQueue` 方法

| 方法 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `spawn(request)` | AgentTask | Promise<AgentResult> | 单个任务 |
| `spawnBatch(requests)` | AgentTask[] | Promise<AgentResult[]> | 批量任务 |
| `getQueueLength()` | - | number | 队列长度 |
| `getRunningCount()` | - | number | 运行中任务数 |
| `getRunningTasks()` | - | RunningTask[] | 运行中任务详情 |
| `clearQueue()` | - | void | 清空队列 |

### 事件

| 事件 | 回调参数 | 说明 |
|------|----------|------|
| `task-validated` | requestId, task | 任务已验证 |
| `task-started` | requestId, task | 任务开始 |
| `task-complete` | requestId, result, duration | 任务完成 |
| `task-error` | requestId, error, duration | 任务失败 |

---

## 整合到 OpenClaw

### 在 heartbeat 中使用

```typescript
import { createSubagentQueue } from 'skills/subagent-queue/src/index.ts'

const agentQueue = createSubagentQueue(sessions_spawn)

// 批量分发后台任务
await agentQueue.spawnBatch([
  { task: '检查邮件', priority: 5 },
  { task: '检查日历', priority: 5 },
  { task: '检查项目状态', priority: 8 },
])

// 等待完成后汇报
agentQueue.queue.on('drain', () => {
  sendUpdate('后台任务完成')
})
```

### 在复杂任务中使用

```typescript
// 分解大任务为多个子任务
const results = await agentQueue.spawnBatch([
  { task: '研究 A 项目架构', priority: 10 },
  { task: '分析 B 项目代码', priority: 8 },
  { task: '对比 C 技术方案', priority: 6 },
  { task: '编写综合报告', priority: 10, timeout: 600 },
])

// 合并结果
const finalReport = results.map(r => r.output).join('\n\n')
```

---

## 优先级策略

| 优先级 | 说明 | 使用场景 |
|--------|------|----------|
| 10 | 紧急 | 阻塞性任务 |
| 8-9 | 高 | 重要任务 |
| 5-7 | 中 | 常规任务 |
| 1-4 | 低 | 后台任务 |

---

## 测试用例

```typescript
import { createSubagentQueue } from './src/index.ts'

// Mock spawn
const mockSpawn = async (task) => `完成：${task}`
const queue = createSubagentQueue(mockSpawn)

// 测试单个任务
const result = await queue.spawn({ task: '测试任务' })
console.assert(result.success === true)

// 测试批量
const results = await queue.spawnBatch([
  { task: '任务 1' },
  { task: '任务 2' },
])
console.assert(results.length === 2)

console.log('✅ 测试通过')
```

---

## 注意事项

1. **串行执行**: 默认按顺序执行，如需并发需自定义实现
2. **超时控制**: 建议为长时间任务设置 timeout
3. **错误处理**: 单个任务失败不会影响队列继续
4. **内存管理**: 大量任务时注意清理已完成任务

---

## 未来扩展

- [ ] 支持并发执行（可配置并发数）
- [ ] 支持任务取消
- [ ] 支持任务依赖
- [ ] 支持任务重试
- [ ] 支持优先级抢占

---

**创建者**: xiaoxiaohuang 🐤
**时间**: 2026-03-06
**依赖**: stream-queue
