/**
 * 结构化日志模块
 * 
 * 输出格式化的日志到 memory 文件和控制台
 */

import { appendFile, mkdir } from 'fs/promises'
import { join } from 'path'

export interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  component: string
  message: string
  data?: Record<string, unknown>
  issue_id?: string
  issue_identifier?: string
  session_key?: string
}

export interface SymphonyLogger {
  info(message: string, data?: Record<string, unknown>): void
  warn(message: string, data?: Record<string, unknown>): void
  error(message: string, error?: Error): void
  debug(message: string, data?: Record<string, unknown>): void
  setContext(context: LogContext): void
}

export interface LogContext {
  issue_id?: string
  issue_identifier?: string
  session_key?: string
  component?: string
}

/**
 * 创建日志记录器
 */
export function createLogger(
  component: string,
  options?: {
    memoryFile?: string  // memory 文件路径
    console?: boolean    // 是否输出到控制台
  }
): SymphonyLogger {
  const memoryFile = options?.memoryFile
  const logToConsole = options?.console ?? true
  
  let context: LogContext = { component }
  
  function formatEntry(
    level: LogEntry['level'],
    message: string,
    data?: Record<string, unknown>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      component: context.component ?? component,
      message,
      data,
      ...context,
    }
  }
  
  function formatLogLine(entry: LogEntry): string {
    const ctx = []
    if (entry.issue_identifier) ctx.push(entry.issue_identifier)
    if (entry.session_key) ctx.push(entry.session_key)
    
    const ctxStr = ctx.length > 0 ? ` [${ctx.join(', ')}]` : ''
    const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : ''
    
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.component}${ctxStr}: ${entry.message}${dataStr}`
  }
  
  async function writeToFile(entry: LogEntry): Promise<void> {
    if (!memoryFile) return
    
    try {
      const line = formatLogLine(entry) + '\n'
      
      // 确保目录存在
      const dir = join(memoryFile, '..')
      await mkdir(dir, { recursive: true })
      
      // 追加到文件
      await appendFile(memoryFile, line, 'utf-8')
    } catch (err) {
      console.error('[Logger] Write failed:', err)
    }
  }
  
  function log(
    level: LogEntry['level'],
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ): void {
    const entry = formatEntry(level, message, { ...data, error: error?.message })
    
    // 输出到控制台
    if (logToConsole) {
      const line = formatLogLine(entry)
      
      switch (level) {
        case 'error':
          console.error(line)
          if (error) console.error(error.stack)
          break
        case 'warn':
          console.warn(line)
          break
        default:
          console.log(line)
      }
    }
    
    // 输出到文件（异步，不阻塞）
    writeToFile(entry).catch(err => {
      console.error('[Logger] File write error:', err)
    })
  }
  
  return {
    info(message, data) {
      log('info', message, data)
    },
    
    warn(message, data) {
      log('warn', message, data)
    },
    
    error(message, error?) {
      log('error', message, undefined, error)
    },
    
    debug(message, data) {
      log('debug', message, data)
    },
    
    setContext(newContext: LogContext) {
      context = { ...context, ...newContext }
    },
  }
}

/**
 * 获取今天的 memory 文件路径
 */
export function getTodayMemoryFile(): string {
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]  // YYYY-MM-DD
  return `memory/${dateStr}.md`
}
