# Todo Manager Skill

> 待办事项管理器，整合 duckdb-memory + stream-queue
> 创建时间：2026-03-06

---

## 功能

- ✅ **待办管理** - 增删改查 CRUD
- 🤖 **自动执行** - pending 任务自动入队
- 📊 **优先级排序** - 高优先级优先
- 🏷️ **标签分类** - 支持标签筛选
- 📈 **统计面板** - 实时查看各状态数量

---

## 使用方式

### 基础用法

```typescript
import { createTodoManager } from 'skills/todo-manager/src/index.ts'

// 创建管理器（传入执行函数）
const todoManager = createTodoManager(
  async (todo) => {
    // 这里实现具体的任务执行逻辑
    console.log('执行待办:', todo.title)
    return '任务完成'
  }
)

// 初始化
await todoManager.init()

// 添加待办
const id = await todoManager.addTodo({
  title: '研究 React 19 新特性',
  description: '调研 React 19 的编译时优化',
  status: 'pending',
  priority: 8,
  tags: ['research', 'frontend'],
})

// 获取所有待办
const todos = await todoManager.getTodos()

// 获取待处理
const pending = await todoManager.getTodos({ status: 'pending' })

// 按标签筛选
const research = await todoManager.getTodos({ tag: 'research' })
```

### 批量添加

```typescript
// 批量添加待办
await todoManager.addTodos([
  { title: '写周报', status: 'pending', priority: 5, tags: ['work'] },
  { title: '买咖啡', status: 'pending', priority: 3, tags: ['personal'] },
  { title: '代码审查', status: 'pending', priority: 8, tags: ['work'] },
])
```

### 统计面板

```typescript
// 获取统计
const stats = await todoManager.getCount()
console.log(`
总计：${stats.total}
待处理：${stats.pending}
进行中：${stats.running}
已完成：${stats.done}
已阻塞：${stats.blocked}
`)
```

### 更新待办

```typescript
// 更新状态
await todoManager.updateTodo(id, { status: 'done' })

// 更新优先级
await todoManager.updateTodo(id, { priority: 10 })

// 添加标签
await todoManager.updateTodo(id, { tags: ['urgent', 'work'] })
```

### 删除待办

```typescript
// 删除单个
await todoManager.deleteTodo(id)

// 清空已完成
const cleared = await todoManager.clearDone()
console.log(`清空了 ${cleared} 个已完成任务`)
```

### 自动执行

```typescript
// pending 状态的任务会自动加入执行队列
await todoManager.addTodo({
  title: '自动执行的任务',
  status: 'pending',  // 自动入队
  priority: 5,
})

// 查看队列长度
console.log('队列中:', todoManager.getQueueLength())

// 清空队列（不删除数据库记录）
todoManager.clearQueue()
```

---

## API 参考

### `createTodoManager(executeFn)`

创建待办管理器。

**参数**:
- `executeFn(todo)` - 任务执行函数，返回 Promise<string>

**返回**: `TodoManager` 实例

### `TodoManager` 方法

| 方法 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `init()` | - | Promise<void> | 初始化数据库 |
| `addTodo(todo)` | Todo | Promise<string> | 添加待办 |
| `addTodos(todos)` | Todo[] | Promise<string[]> | 批量添加 |
| `getTodos(filter?)` | Filter | Promise<Todo[]> | 获取列表 |
| `getCount()` | - | Promise<Stats> | 统计数据 |
| `updateTodo(id, updates)` | string, Partial<Todo> | Promise<void> | 更新 |
| `deleteTodo(id)` | string | Promise<void> | 删除 |
| `clearDone()` | - | Promise<number> | 清空已完成 |
| `getQueueLength()` | - | number | 队列长度 |
| `clearQueue()` | - | void | 清空队列 |
| `close()` | - | Promise<void> | 关闭 |

---

## 数据结构

### Todo

```typescript
interface Todo {
  id?: string           // 自动生成
  title: string         // 标题（必填）
  description?: string  // 描述
  status: 'pending' | 'running' | 'done' | 'blocked'
  priority: number      // 1-10, 10 最高
  tags?: string[]       // 标签
  created_at?: number   // 创建时间戳
  updated_at?: number   // 更新时间戳
  metadata?: Record<string, any>  // 扩展元数据
}
```

### Stats

```typescript
interface Stats {
  total: number
  pending: number
  running: number
  done: number
  blocked: number
}
```

---

## 整合示例

### 在 heartbeat 中使用

```typescript
import { createTodoManager } from 'skills/todo-manager/src/index.ts'

const todoManager = createTodoManager(async (todo) => {
  // 根据标签路由到不同执行器
  if (todo.tags?.includes('research')) {
    return await runResearch(todo.title)
  } else if (todo.tags?.includes('check')) {
    return await runCheck(todo.title)
  }
  return '未知任务类型'
})

await todoManager.init()

// heartbeat 时检查
const stats = await todoManager.getCount()
if (stats.pending > 0) {
  sendUpdate(`有 ${stats.pending} 个待办事项`)
} else {
  reply('HEARTBEAT_OK')
}
```

### 整合 subagent-queue

```typescript
import { createTodoManager } from 'skills/todo-manager/src/index.ts'
import { createSubagentQueue } from 'skills/subagent-queue/src/index.ts'

const agentQueue = createSubagentQueue(sessions_spawn)

const todoManager = createTodoManager(async (todo) => {
  // 将待办作为子代理任务执行
  const result = await agentQueue.spawn({
    task: todo.title,
    priority: todo.priority,
  })
  return result.output
})

await todoManager.init()

// 添加待办后自动分发到子代理
await todoManager.addTodo({
  title: '研究 X 项目',
  status: 'pending',
  priority: 8,
  tags: ['research'],
})
```

---

## 优先级策略

| 优先级 | 说明 | 执行策略 |
|--------|------|----------|
| 10 | 紧急 | 立即执行 |
| 8-9 | 高 | 优先执行 |
| 5-7 | 中 | 正常排队 |
| 1-4 | 低 | 后台执行 |

---

## 测试用例

```typescript
import { createTodoManager } from './src/index.ts'

const tm = createTodoManager(async (todo) => `完成：${todo.title}`)
await tm.init()

// 添加
const id = await tm.addTodo({
  title: '测试任务',
  status: 'pending',
  priority: 5,
})

// 获取
const todos = await tm.getTodos()
console.assert(todos.length === 1)

// 统计
const stats = await tm.getCount()
console.assert(stats.pending === 1)

// 更新
await tm.updateTodo(id, { status: 'done' })

// 删除
await tm.deleteTodo(id)

console.log('✅ 测试通过')
```

---

## 注意事项

1. **自动执行**: 只有 `status: 'pending'` 的任务会自动入队
2. **优先级排序**: 查询时自动按优先级降序排列
3. **标签筛选**: 标签存储在 JSON 字符串中，使用 LIKE 匹配
4. **队列分离**: `clearQueue()` 只清空执行队列，不删除数据库记录

---

## 未来扩展

- [ ] 支持任务依赖
- [ ] 支持定时任务
- [ ] 支持任务重试
- [ ] 支持子任务
- [ ] 支持任务模板

---

**创建者**: xiaoxiaohuang 🐤
**时间**: 2026-03-06
**依赖**: duckdb-memory, stream-queue
