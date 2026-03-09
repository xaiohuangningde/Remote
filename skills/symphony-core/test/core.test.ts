/**
 * Symphony 核心测试 - 简化版
 * 测试 WORKFLOW.md 加载 + 配置验证
 */

import { WorkflowLoader } from '../src/workflow-loader.ts'
import { ConfigLayer } from '../src/config.ts'

async function test() {
  console.log('🧪 Symphony 核心测试...\n')
  
  try {
    // 1. 加载 WORKFLOW.md
    console.log('📖 加载 WORKFLOW.md...')
    const loader = new WorkflowLoader('./WORKFLOW.md')
    const workflow = await loader.load()
    
    console.log(`✅ WORKFLOW.md 加载成功 (${workflow.prompt_template.length} 字符)\n`)
    
    // 2. 解析配置
    console.log('⚙️  解析配置...')
    const config = new ConfigLayer(workflow.config as Record<string, unknown>)
    const fullConfig = config.getFullConfig()
    
    console.log('✅ 配置解析成功:')
    console.log(`   Tracker: ${fullConfig.tracker.kind}`)
    console.log(`   仓库：${fullConfig.tracker.project_slug}`)
    console.log(`   API Key: ${fullConfig.tracker.api_key.substring(0, 10)}...`)
    console.log(`   轮询间隔：${fullConfig.polling.interval_ms / 1000}秒`)
    console.log(`   最大并发：${fullConfig.agent.max_concurrent_agents}`)
    console.log(`   工作空间：${fullConfig.workspace.root}`)
    console.log()
    
    // 3. 验证配置
    console.log('✅ 验证配置...')
    const validation = config.validate()
    if (!validation.ok) {
      throw new Error(validation.error)
    }
    console.log('✅ 配置验证通过\n')
    
    console.log('🎉 所有测试通过！')
    console.log('\n💡 下一步:')
    console.log('   1. 测试 symphony-github 适配器: npx tsx ../symphony-github/test/github-adapter.test.ts')
    console.log('   2. 启动完整 Symphony: 需要实现 launchAgent 方法')
    
  } catch (err) {
    console.error('❌ 测试失败:', err)
    process.exit(1)
  }
}

test().catch(err => {
  console.error('❌ 测试失败:', err)
  process.exit(1)
})
