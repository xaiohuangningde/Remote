/**
 * Symphony 演示脚本
 * 
 * 展示如何使用 Symphony 系统自动处理 GitHub issues
 */

import { createSymphony } from './src/index.ts'

async function demo(): Promise<void> {
  console.log('🚀 Symphony 系统演示\n')
  
  // 1. 创建 Symphony 实例
  console.log('📝 加载配置...')
  let symphony
  try {
    symphony = await createSymphony({
      workflowPath: './WORKFLOW.md',
      httpPort: 8080,
    })
  } catch (error) {
    console.error('❌ 创建实例失败:', error)
    return
  }
  console.log('✅ Symphnony 实例创建成功\n')
  
  // 2. 检查初始化状态
  console.log('📊 运行时快照:')
  const snapshot = await symphony.getSnapshot()
  console.log(`   - 运行中任务: ${snapshot.running.length}`)
  console.log(`   - 重试任务: ${snapshot.retrying.length}`)
  console.log(`   - 已完成: ${snapshot.completed.length}`)
  console.log('   - Codex 总计:')
  console.log(`     • 输入 tokens: ${snapshot.codex_totals.input_tokens}`)
  console.log(`     • 输出 tokens: ${snapshot.codex_totals.output_tokens}`)
  console.log(`     • 总 tokens: ${snapshot.codex_totals.total_tokens}`)
  console.log()
  
  // 3. 启动系统
  console.log('🔄 启动轮询循环...')
  await symphony.start()
  console.log('✅ Symphony 已启动')
  console.log(`   - 轮询间隔: ${30000}ms`)
  console.log(`   - 最大并发: ${3}`)
  console.log('   - Dashboard: http://localhost:8080')
  console.log()
  
  // 4. 手动触发轮询
  console.log('🔍 手动轮询...')
  await symphony.triggerPoll()
  console.log('✅ 轮询完成')
  console.log()
  
  // 5. 同步状态
  console.log('📋 当前状态:')
  const newSnapshot = await symphony.getSnapshot()
  console.log(`   - 运行中: ${newSnapshot.running.length}`)
  console.log(`   - 重试中: ${newSnapshot.retrying.length}`)
  console.log(`   - 完成: ${newSnapshot.completed.length}`)
  console.log()
  
  // 6. 停止系统（演示结束）
  console.log('🛑 停止 Symphony...')
  await symphony.stop()
  console.log('✅ Symphony 已停止')
  console.log()
  
  console.log('🎉 演示完成！')
  console.log()
  console.log('📖 下一步:')
  console.log('   1. 设置 GITHUB_TOKEN 环境变量')
  console.log('   2. 运行实际轮询测试')
  console.log('   3. 配置工作空间钩子')
}

// 运行演示
demo().catch(error => {
  console.error('演示失败:', error)
  process.exit(1)
})
