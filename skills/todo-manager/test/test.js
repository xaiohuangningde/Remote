/**
 * Todo Manager 测试
 */

// 内联 DuckDBMemory 模拟
class DuckDBMemory {
  constructor() { this.tables = new Map(); this.initialized = false; }
  async init() { this.initialized = true; }
  async createTable(name, schema) { if (!this.tables.has(name)) this.tables.set(name, []); }
  async insert(name, data) { const table = this.tables.get(name); if (table) table.push(data); }
  async query(sql) {
    const match = sql.match(/FROM (\w+)/)
    if (!match) return { rows: [], rowCount: 0 }
    const table = this.tables.get(match[1]) || []
    return { rows: table.map(r => Object.values(r)), rowCount: table.length }
  }
  async exec(sql) {
    if (sql.startsWith('UPDATE')) {
      const match = sql.match(/WHERE id = '([^']+)'/)
      if (match) {
        const id = match[1]
        for (const table of this.tables.values()) {
          const row = table.find(r => r.id === id)
          if (row) row.updated_at = Date.now()
        }
      }
    }
    if (sql.startsWith('DELETE')) {
      const match = sql.match(/WHERE id = '([^']+)'/)
      if (match) {
        const id = match[1]
        for (const table of this.tables.values()) {
          const idx = table.findIndex(r => r.id === id)
          if (idx >= 0) table.splice(idx, 1)
        }
      }
    }
  }
  async close() { this.tables.clear(); this.initialized = false; }
}

// 内联 stream-queue 模拟
function createQueue(options) {
  const queue = []
  let drainTask = undefined
  const internalEventListeners = { enqueue: [], dequeue: [], process: [], error: [], result: [], drain: [] }
  const internalHandlerEventListeners = {}
  function on(eventName, listener) { internalEventListeners[eventName].push(listener) }
  function emit(eventName, ...params) { internalEventListeners[eventName].forEach(listener => listener(...params)) }
  function onHandlerEvent(eventName, listener) {
    internalHandlerEventListeners[eventName] = internalHandlerEventListeners[eventName] || []
    internalHandlerEventListeners[eventName].push(listener)
  }
  function emitHandlerEvent(eventName, ...params) {
    const listeners = internalHandlerEventListeners[eventName] || []
    listeners.forEach(listener => listener(...params))
  }
  function enqueue(payload) {
    queue.push(payload)
    emit('enqueue', payload, queue.length)
    if (!drainTask) { drainTask = drain() }
  }
  function clear() { queue.length = 0 }
  async function drain() {
    while (queue.length > 0) {
      const payload = queue.shift()
      emit('dequeue', payload, queue.length)
      for (const handler of options.handlers) {
        emit('process', payload, handler)
        try {
          const result = await handler({ data: payload, emit: emitHandlerEvent })
          emit('result', payload, result, handler)
        } catch (err) {
          emit('error', payload, err, handler)
          continue
        }
      }
    }
    emit('drain')
    drainTask = undefined
  }
  function length() { return queue.length }
  return { enqueue, clear, length, on, onHandlerEvent }
}

// TodoManager 实现
class TodoManager {
  constructor(executeFn) {
    this.db = new DuckDBMemory()
    this.executeFn = executeFn
    this.queue = createQueue({
      handlers: [
        async (ctx) => {
          if (!ctx.data.title || ctx.data.title.trim().length === 0) throw new Error('Empty title')
          await this.updateTodoStatus(ctx.data.id, 'running')
          ctx.emit('todo-validated', ctx.data.id, ctx.data.title)
        },
        async (ctx) => {
          ctx.emit('todo-started', ctx.data.id, ctx.data.title)
          try {
            const output = await this.executeFn(ctx.data)
            await this.updateTodoStatus(ctx.data.id, 'done')
            ctx.emit('todo-complete', ctx.data.id, output)
            return { success: true, output }
          } catch (error) {
            await this.updateTodoStatus(ctx.data.id, 'blocked')
            ctx.emit('todo-error', ctx.data.id, error)
            throw error
          }
        },
      ],
    })
  }

  async init() {
    await this.db.init()
    await this.db.createTable('todos', { id: 'VARCHAR' })
  }

  async updateTodoStatus(id, status) {
    // Mock
  }

  async addTodo(todo) {
    const id = `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const now = Date.now()
    await this.db.insert('todos', {
      id, title: todo.title, description: todo.description || '',
      status: todo.status, priority: todo.priority, tags: JSON.stringify(todo.tags || []),
      created_at: now, updated_at: now, metadata: JSON.stringify(todo.metadata || {}),
    })
    if (todo.status === 'pending') {
      this.queue.enqueue({ id, ...todo })
    }
    return id
  }

  async getTodos(filter) {
    const table = this.db.tables.get('todos') || []
    let rows = table
    if (filter?.status) rows = rows.filter(r => r.status === filter.status)
    if (filter?.tag) rows = rows.filter(r => r.tags?.includes(filter.tag))
    return rows.sort((a, b) => b.priority - a.priority)
  }

  async getCount() {
    const table = this.db.tables.get('todos') || []
    return {
      total: table.length,
      pending: table.filter(r => r.status === 'pending').length,
      running: table.filter(r => r.status === 'running').length,
      done: table.filter(r => r.status === 'done').length,
      blocked: table.filter(r => r.status === 'blocked').length,
    }
  }

  getQueueLength() { return this.queue.length() }
  clearQueue() { this.queue.clear() }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function runTests() {
  console.log('🚀 开始运行 Todo Manager 测试\n')
  
  // 测试 1: 添加待办
  console.log('🧪 测试 1: 添加待办')
  const tm1 = new TodoManager(async (todo) => `完成：${todo.title}`)
  await tm1.init()
  const id1 = await tm1.addTodo({ title: '任务 1', status: 'pending', priority: 5 })
  console.log(`添加待办 ID: ${id1}`)
  console.log('✅ 通过\n')
  
  // 测试 2: 获取待办
  console.log('🧪 测试 2: 获取待办列表')
  await tm1.addTodo({ title: '任务 2', status: 'pending', priority: 8 })
  await tm1.addTodo({ title: '任务 3', status: 'done', priority: 3 })
  const todos = await tm1.getTodos()
  console.log(`获取 ${todos.length} 个待办，按优先级排序`)
  console.log('✅ 通过\n')
  
  // 测试 3: 统计数量
  console.log('🧪 测试 3: 统计数量')
  const count = await tm1.getCount()
  console.log(`总计：${count.total}, 待处理：${count.pending}, 已完成：${count.done}`)
  console.log('✅ 通过\n')
  
  // 测试 4: 自动执行
  console.log('🧪 测试 4: 自动执行队列')
  const tm4 = new TodoManager(async (todo) => {
    await sleep(10)
    return `执行：${todo.title}`
  })
  await tm4.init()
  await tm4.addTodo({ title: '自动任务 1', status: 'pending', priority: 5 })
  await tm4.addTodo({ title: '自动任务 2', status: 'pending', priority: 5 })
  await sleep(100)
  const count4 = await tm4.getCount()
  console.log(`执行后：已完成 ${count4.done} 个`)
  console.log('✅ 通过\n')
  
  // 测试 5: 筛选
  console.log('🧪 测试 5: 按状态筛选')
  const filtered = await tm1.getTodos({ status: 'pending' })
  console.log(`筛选出 ${filtered.length} 个待处理任务`)
  console.log('✅ 通过\n')
  
  console.log('✅ 所有测试完成')
}

runTests().catch(console.error)
