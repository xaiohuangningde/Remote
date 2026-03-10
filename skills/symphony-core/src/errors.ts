/**
 * 错误处理模块
 * 
 * 定义 Symphony 错误类型和重试策略
 */

export enum SymphonyErrorCode {
  // 配置错误
  CONFIG_VALIDATION = 'CONFIG_VALIDATION',
  WORKFLOW_MISSING = 'WORKFLOW_MISSING',
  WORKFLOW_PARSE = 'WORKFLOW_PARSE',
  
  // GitHub API 错误
  GITHUB_API = 'GITHUB_API',
  GITHUB_RATE_LIMIT = 'GITHUB_RATE_LIMIT',
  GITHUB_NOT_FOUND = 'GITHUB_NOT_FOUND',
  
  // 网络错误
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // 工作空间错误
  WORKSPACE_CREATE = 'WORKSPACE_CREATE',
  WORKSPACE_HOOK = 'WORKSPACE_HOOK',
  
  // Agent 错误
  AGENT_LAUNCH = 'AGENT_LAUNCH',
  AGENT_TIMEOUT = 'AGENT_TIMEOUT',
  AGENT_STALLED = 'AGENT_STALLED',
  
  // 重试错误
  RETRY_EXHAUSTED = 'RETRY_EXHAUSTED',
}

export class SymphonyError extends Error {
  code: SymphonyErrorCode
  retryable: boolean
  details?: Record<string, unknown>
  
  constructor(
    code: SymphonyErrorCode,
    message: string,
    options?: {
      retryable?: boolean
      details?: Record<string, unknown>
      cause?: Error
    }
  ) {
    super(message, { cause: options?.cause })
    this.code = code
    this.retryable = options?.retryable ?? true
    this.details = options?.details
    this.name = 'SymphonyError'
  }
  
  toJSON(): object {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      details: this.details,
      stack: this.stack,
    }
  }
}

/**
 * 错误分类和重试策略
 */
export function getRetryStrategy(error: unknown): {
  shouldRetry: boolean
  delayMs: number
  maxRetries: number
} {
  const defaultStrategy = {
    shouldRetry: true,
    delayMs: 10000,
    maxRetries: 3,
  }
  
  if (error instanceof SymphonyError) {
    // 不可重试的错误
    if (!error.retryable) {
      return {
        shouldRetry: false,
        delayMs: 0,
        maxRetries: 0,
      }
    }
    
    // 根据错误类型调整策略
    switch (error.code) {
      case SymphonyErrorCode.GITHUB_RATE_LIMIT:
        // GitHub 限流，等待更长时间
        return {
          shouldRetry: true,
          delayMs: 60000,  // 1 分钟
          maxRetries: 2,
        }
      
      case SymphonyErrorCode.WORKFLOW_MISSING:
      case SymphonyErrorCode.WORKFLOW_PARSE:
        // 配置错误，不应重试
        return {
          shouldRetry: false,
          delayMs: 0,
          maxRetries: 0,
        }
      
      case SymphonyErrorCode.NETWORK_TIMEOUT:
        // 网络超时，增加重试次数
        return {
          shouldRetry: true,
          delayMs: 5000,
          maxRetries: 5,
        }
      
      default:
        return defaultStrategy
    }
  }
  
  // 未知错误，使用默认策略
  return defaultStrategy
}

/**
 * 带重试的异步操作
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  context: {
    operationName: string
    maxRetries?: number
    baseDelay?: number
    onError?: (error: Error, attempt: number) => void
  }
): Promise<T> {
  const maxRetries = context.maxRetries ?? 3
  const baseDelay = context.baseDelay ?? 10000
  
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      const strategy = getRetryStrategy(error)
      
      if (!strategy.shouldRetry || attempt > maxRetries) {
        break
      }
      
      // 通知错误
      context.onError?.(lastError, attempt)
      
      // 指数退避 + 随机抖动
      const delay = strategy.delayMs * Math.pow(2, attempt - 1) + Math.random() * 1000
      await sleep(delay)
    }
  }
  
  throw lastError || new Error('Unknown error')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 创建 Symphony 错误的辅助函数
 */
export function createError(
  code: SymphonyErrorCode,
  message: string,
  details?: Record<string, unknown>
): SymphonyError {
  return new SymphonyError(code, message, {
    details,
    retryable: isRetryable(code),
  })
}

function isRetryable(code: SymphonyErrorCode): boolean {
  const nonRetryableCodes: SymphonyErrorCode[] = [
    SymphonyErrorCode.WORKFLOW_MISSING,
    SymphonyErrorCode.WORKFLOW_PARSE,
    SymphonyErrorCode.CONFIG_VALIDATION,
  ]
  
  return !nonRetryableCodes.includes(code)
}
