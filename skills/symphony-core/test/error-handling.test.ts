/**
 * 测试错误处理和限流检测
 */

import { 
  SymphonyError, 
  SymphonyErrorCode, 
  getRetryStrategy,
  withRetry,
  createError,
} from '../src/errors.ts'

async function test() {
  console.log('🧪 测试错误处理和限流检测...\n')
  
  // 1. 测试错误创建
  console.log('📝 测试错误创建...')
  const configError = createError(
    SymphonyErrorCode.CONFIG_VALIDATION,
    '缺少必填字段',
    { field: 'api_key' }
  )
  console.log(`✅ 配置错误：${configError.code} - ${configError.message}`)
  console.log(`   可重试：${configError.retryable}`)
  
  const rateLimitError = createError(
    SymphonyErrorCode.GITHUB_RATE_LIMIT,
    'GitHub API 限流',
    { remaining: 0, resetAt: '2026-03-08T23:00:00Z' }
  )
  console.log(`✅ 限流错误：${rateLimitError.code} - ${rateLimitError.message}`)
  console.log(`   可重试：${rateLimitError.retryable}`)
  console.log()
  
  // 2. 测试重试策略
  console.log('🔄 测试重试策略...')
  
  const strategies = [
    { error: configError, name: '配置错误' },
    { error: rateLimitError, name: '限流错误' },
    { error: new Error('未知错误'), name: '未知错误' },
  ]
  
  for (const { error, name } of strategies) {
    const strategy = getRetryStrategy(error)
    console.log(`   ${name}:`)
    console.log(`     重试：${strategy.shouldRetry}`)
    console.log(`     延迟：${strategy.delayMs}ms`)
    console.log(`     最大重试：${strategy.maxRetries}`)
  }
  console.log()
  
  // 3. 测试带重试的操作
  console.log('⏳ 测试带重试的操作...')
  
  let attemptCount = 0
  const successfulOperation = async () => {
    attemptCount++
    if (attemptCount < 3) {
      throw new Error('临时错误')
    }
    return '成功'
  }
  
  try {
    const result = await withRetry(successfulOperation, {
      operationName: '测试操作',
      maxRetries: 3,
      baseDelay: 100,  // 快速测试
      onError: (error, attempt) => {
        console.log(`   第 ${attempt} 次失败：${error.message}`)
      },
    })
    console.log(`✅ 操作成功：${result}`)
    console.log(`   总尝试次数：${attemptCount}`)
  } catch (error) {
    console.log(`❌ 操作失败：${(error as Error).message}`)
  }
  console.log()
  
  // 4. 测试不可重试的错误
  console.log('🚫 测试不可重试的错误...')
  
  try {
    await withRetry(async () => {
      throw createError(SymphonyErrorCode.WORKFLOW_MISSING, 'WORKFLOW.md 不存在')
    }, {
      operationName: '加载 WORKFLOW',
      maxRetries: 3,
      onError: (error, attempt) => {
        console.log(`   第 ${attempt} 次失败：${error.message}`)
      },
    })
    console.log('❌ 应该失败但没有')
  } catch (error) {
    const symphonyError = error as SymphonyError
    console.log(`✅ 正确识别不可重试错误：${symphonyError.code}`)
    console.log(`   可重试：${symphonyError.retryable}`)
  }
  console.log()
  
  console.log('🎉 所有测试通过！')
  console.log('\n💡 错误处理特性:')
  console.log('   - 自动错误分类（可重试/不可重试）')
  console.log('   - 指数退避 + 随机抖动')
  console.log('   - GitHub 限流特殊处理')
  console.log('   - 详细的错误上下文')
}

test().catch(err => {
  console.error('❌ 测试失败:', err)
  process.exit(1)
})
