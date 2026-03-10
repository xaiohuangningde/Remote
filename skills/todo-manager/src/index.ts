/**
 * Todo Manager - 待办事项管理器
 * 整合 duckdb-memory + stream-queue
 * 自动执行待办任务
 */

import { DuckDBMemory } from '../../duckdb-memory/src/index.ts'
import { createQueue } from '../../stream-queue/src/index.ts'

export interface Todo {
  id?: string
  title: string
  description?: string
  status: 'pending' | 'running' | 'done' | 'blocked'
  priority: number  // 1-10
  tags?: string[]
  created_at?: number
  updated_at?: number
  metadata?: Record<string, any>
}

export interface TodoResult {
  id: string
  title: string
  success: boolean
  output?: string
  error?: string
}

export class TodoManager {
  private db: DuckDBMemory
  private queue: ReturnType<typeof createQueue<Todo>>
  private executeFn: (todo: Todo) => Promise<string>

  constructor(executeFn: (todo: Todo) => Promise<string>) {
    this.db = new DuckDBMemory()
    this.executeFn = executeFn
    this.queue = createQueue<Todo>({
      handlers: [
        // 处理器 1: 验证待办
        async (ctx) => {
          if (!ctx.data.title || ctx.data.title.trim().length === 0) {
            throw new Error('Empty title')
          }
          await this.updateTodoStatus(ctx.data.id!, 'running')
          ctx.emit('todo-validated', ctx.data.id, ctx.data.title)
        },
        // 处理器 2: 执行待办
        async (ctx) => {
          ctx.emit('todo-started', ctx.data.id, ctx.data.title)
          
          try {
            const output = await this.executeFn(ctx.data)
            await this.updateTodoStatus(ctx.data.id!, 'done')
            ctx.emit('todo-complete', ctx.data.id, output)
            return { success: true, output }
          } catch (error) {
            await this.updateTodoStatus(ctx.data.id!, 'blocked')
            ctx.emit('todo-error', ctx.data.id, error)
            throw error
          }
        },
      ],
    })

    this.setupEventListeners()
  }

  async init(): Promise<void> {
    await this.db.init()
    await this.db.createTable('todos', {
      id: 'VARCHAR PRIMARY KEY',
      title: 'VARCHAR',
      description: 'VARCHAR',
      status: 'VARCHAR',
      priority: 'INTEGER',
      tags: 'VARCHAR',
      created_at: 'BIGINT',
      updated_at: 'BIGINT',
      metadata: 'VARCHAR',
    })
    console.log('[TodoManager] 初始化完成')
  }

  private setupEventListeners() {
    this.queue.onHandlerEvent('todo-validated', (id, title) => {
      console.log(`[Todo] 已验证 [${id}]: ${title}`)
    })

    this.queue.onHandlerEvent('todo-started', (id, title) => {
      console.log(`[Todo] 开始执行 [${id}]: ${title}`)
    })

    this.queue.onHandlerEvent('todo-complete', (id, output) => {
      console.log(`[Todo] 完成 [${id}]: ${output.substring(0, 50)}...`)
    })

    this.queue.onHandlerEvent('todo-error', (id, error) => {
      console.error(`[Todo] 失败 [${id}]:`, error)
    })

    this.queue.on('error', (payload, error) => {
      console.error(`[Todo 队列] 处理失败 [${payload.id}]:`, error)
    })
  }

  private async updateTodoStatus(id: string, status: string): Promise<void> {
    await this.db.exec(`
      UPDATE todos 
      SET status = '${status}', updated_at = ${Date.now()}
      WHERE id = '${id}'
    `)
  }

  /**
   * 添加待办事项
   */
  async addTodo(todo: Omit<Todo, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const id = `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const now = Date.now()
    
    await this.db.insert('todos', {
      id,
      title: todo.title,
      description: todo.description || '',
      status: todo.status,
      priority: todo.priority,
      tags: JSON.stringify(todo.tags || []),
      created_at: now,
      updated_at: now,
      metadata: JSON.stringify(todo.metadata || {}),
    })

    // 加入执行队列（仅 pending 状态）
    if (todo.status === 'pending') {
      this.queue.enqueue({ id, ...todo })
    }

    return id
  }

  /**
   * 批量添加待办
   */
  async addTodos(todos: Array<Omit<Todo, 'id' | 'created_at' | 'updated_at'>>): Promise<string[]> {
    const ids = await Promise.all(todos.map(todo => this.addTodo(todo)))
    return ids
  }

  /**
   * 获取待办列表
   */
  async getTodos(filter?: { status?: string; tag?: string }): Promise<Todo[]> {
    let sql = 'SELECT * FROM todos'
    const conditions: string[] = []

    if (filter?.status) {
      conditions.push(`status = '${filter.status}'`)
    }

    if (filter?.tag) {
      conditions.push(`tags LIKE '%${filter.tag}%'`)
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ')
    }

    sql += ' ORDER BY priority DESC, created_at ASC'

    const result = await this.db.query(sql)
    
    return result.rows.map(row => ({
      id: row[0],
      title: row[1],
      description: row[2],
      status: row[3],
      priority: row[4],
      tags: JSON.parse(row[5] || '[]'),
      created_at: row[6],
      updated_at: row[7],
      metadata: JSON.parse(row[8] || '{}'),
    }))
  }

  /**
   * 获取待办数量
   */
  async getCount(): Promise<{ total: number; pending: number; running: number; done: number; blocked: number }> {
    const total = await this.db.query('SELECT COUNT(*) FROM todos')
    const pending = await this.db.query("SELECT COUNT(*) FROM todos WHERE status = 'pending'")
    const running = await this.db.query("SELECT COUNT(*) FROM todos WHERE status = 'running'")
    const done = await this.db.query("SELECT COUNT(*) FROM todos WHERE status = 'done'")
    const blocked = await this.db.query("SELECT COUNT(*) FROM todos WHERE status = 'blocked'")

    return {
      total: total.rows[0]?.[0] || 0,
      pending: pending.rows[0]?.[0] || 0,
      running: running.rows[0]?.[0] || 0,
      done: done.rows[0]?.[0] || 0,
      blocked: blocked.rows[0]?.[0] || 0,
    }
  }

  /**
   * 更新待办
   */
  async updateTodo(id: string, updates: Partial<Todo>): Promise<void> {
    const sets: string[] = []
    
    if (updates.title) sets.push(`title = '${updates.title}'`)
    if (updates.description) sets.push(`description = '${updates.description}'`)
    if (updates.status) sets.push(`status = '${updates.status}'`)
    if (updates.priority) sets.push(`priority = ${updates.priority}`)
    if (updates.tags) sets.push(`tags = '${JSON.stringify(updates.tags)}'`)
    if (updates.metadata) sets.push(`metadata = '${JSON.stringify(updates.metadata)}'`)
    
    sets.push(`updated_at = ${Date.now()}`)

    await this.db.exec(`UPDATE todos SET ${sets.join(', ')} WHERE id = '${id}'`)
  }

  /**
   * 删除待办
   */
  async deleteTodo(id: string): Promise<void> {
    await this.db.exec(`DELETE FROM todos WHERE id = '${id}'`)
  }

  /**
   * 清空已完成
   */
  async clearDone(): Promise<number> {
    const result = await this.db.query("SELECT id FROM todos WHERE status = 'done'")
    const count = result.rowCount
    await this.db.exec("DELETE FROM todos WHERE status = 'done'")
    return count
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.queue.length()
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    this.queue.clear()
  }

  /**
   * 关闭数据库
   */
  async close(): Promise<void> {
    await this.db.close()
  }
}

// 导出工厂函数
export function createTodoManager(
  executeFn: (todo: Todo) => Promise<string>
): TodoManager {
  return new TodoManager(executeFn)
}
