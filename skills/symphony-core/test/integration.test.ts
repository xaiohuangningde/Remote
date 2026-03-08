/**
 * Symphony 集成测试
 * 测试完整流程：WORKFLOW.md 加载 → GitHub 获取 issues → 工作空间准备
 */

import { createSymphony } from '../src/index.ts'

async function test() {
  console.log('🧪 Symphony 集成测试...\n')
  
  try {
    // 1. 创建 Symphony 实例
    console.log('📦 创建 Symphony 实例...')
    const symphony = await createSymphony({
      workflowPath: '../../WORKFLOW.md',
    })
    console.log('✅ Symphony 实例创建成功\n')
    
    // 2. 获取快照（不启动轮询）
    console.log('📊 获取运行时快照...')
    const snapshot = await symphony.getSnapshot()
    
    console.log('✅ 快照获取成功:')
    console.log(`   运行中任务：${snapshot.counts.running}`)
    console.log(`   重试队列：${snapshot.counts.retrying}`)
    console.log(`   Token 使用：${snapshot.codex_totals.total_tokens}`)
    console.log()
    
    // 3. 手动触发一次 poll（不启动轮询循环）
    console.log('🔄 触发单次 poll...')
    await symphony.triggerPoll()
    console.log('✅ Poll 完成\n')
    
    // 4. 再次获取快照
    console.log('📊 获取 poll 后快照...')
    const postPollSnapshot = await symphony.getSnapshot()
    
    console.log('✅ 快照获取成功:')
    console.log(`   运行中任务：${postPollSnapshot.counts.running}`)
    console.log(`   重试队列：${postPollSnapshot.counts.retrying}`)
    console.log()
    
    console.log('🎉 集成测试通过！')
    console.log('\n💡 提示：可以调用 symphony.start() 启动完整轮询循环')
    
  } catch (err) {
    console.error('❌ 测试失败:', err)
    process.exit(1)
  }
}

test().catch(err => {
  console.error('❌ 测试失败:', err)
  process.exit(1)
})
