/**
 * 测试日志和 HTTP API
 */

import { createLogger, getTodayMemoryFile } from '../src/logger.ts'
import { createHttpServer } from '../src/http-server.ts'

async function test() {
  console.log('🧪 测试日志和 HTTP API...\n')
  
  // 1. 测试日志记录器
  console.log('📝 测试日志记录器...')
  const logger = createLogger('Test', {
    memoryFile: getTodayMemoryFile(),
    console: true,
  })
  
  logger.info('这是一条 info 日志')
  logger.warn('这是一条 warn 日志', { warning: '测试' })
  logger.error('这是一条 error 日志', new Error('测试错误'))
  logger.debug('这是一条 debug 日志', { debug: true })
  logger.setContext({ issue_identifier: 'GH-123' })
  logger.info('带上下文的日志')
  
  console.log('✅ 日志测试完成\n')
  
  // 2. 测试 HTTP 服务器
  console.log('🌐 测试 HTTP 服务器...')
  const httpServer = createHttpServer({ port: 8765 }, logger)
  
  await httpServer.start()
  console.log('✅ HTTP 服务器启动在 http://localhost:8765')
  
  // 更新快照
  const mockSnapshot = {
    generated_at: new Date().toISOString(),
    counts: {
      running: 2,
      retrying: 1,
    },
    running: [
      {
        issue_id: '123',
        issue_identifier: 'GH-75',
        state: 'running',
        session_key: 'test-session-1',
        turn_count: 5,
        started_at: new Date().toISOString(),
        last_event_at: new Date().toISOString(),
        tokens: {
          input_tokens: 1000,
          output_tokens: 500,
          total_tokens: 1500,
        },
      },
    ],
    retrying: [
      {
        issue_id: '456',
        identifier: 'GH-147',
        attempt: 2,
        due_at: new Date(Date.now() + 60000).toISOString(),
        error: 'timeout',
      },
    ],
    codex_totals: {
      input_tokens: 5000,
      output_tokens: 2500,
      total_tokens: 7500,
      seconds_running: 120,
    },
  }
  
  httpServer.updateSnapshot(mockSnapshot)
  console.log('✅ 快照已更新\n')
  
  console.log('💡 访问以下 URL 查看 Dashboard:')
  console.log('   http://localhost:8765/')
  console.log('   http://localhost:8765/api/v1/state')
  console.log('   http://localhost:8765/api/v1/health')
  console.log()
  
  console.log('🎉 测试完成！')
  console.log('\n按 Ctrl+C 退出...\n')
  
  // 保持运行以便手动测试
  return new Promise(() => {
    // 永远不 resolve，让用户手动停止
  })
}

test().catch(err => {
  console.error('❌ 测试失败:', err)
  process.exit(1)
})
