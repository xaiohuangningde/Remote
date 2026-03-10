/**
 * Symphony 启动脚本
 */

import { createSymphony } from './src/index.ts'

// 注入 OpenClaw 全局函数
declare global {
  var sessions_spawn: any
  var sessions_send: any
}

async function main() {
  console.log('🎵 Starting Symphony...')
  
  const symphony = await createSymphony({
    workflowPath: './WORKFLOW.md',
    httpPort: 8765,
  })
  
  // 处理退出信号
  process.on('SIGINT', async () => {
    console.log('\n🛑 Stopping Symphony...')
    await symphony.stop()
    process.exit(0)
  })
  
  process.on('SIGTERM', async () => {
    console.log('\n🛑 Stopping Symphony...')
    await symphony.stop()
    process.exit(0)
  })
  
  // 启动
  await symphony.start()
  
  console.log('✅ Symphony is running!')
  console.log('📊 Dashboard: http://localhost:8765')
  console.log('📝 Memory: memory/' + new Date().toISOString().split('T')[0] + '.md')
  console.log('\nPress Ctrl+C to stop')
}

main().catch((err) => {
  console.error('❌ Failed to start Symphony:', err)
  process.exit(1)
})
