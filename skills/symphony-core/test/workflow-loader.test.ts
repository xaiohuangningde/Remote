/**
 * 测试 WORKFLOW.md 加载
 */

import { WorkflowLoader } from '../src/workflow-loader.ts'
import { ConfigLayer } from '../src/config.ts'

async function test() {
  console.log('🧪 测试 WORKFLOW.md 加载...\n')
  
  try {
    // 1. 加载 WORKFLOW.md
    const loader = new WorkflowLoader('../../WORKFLOW.md')
    const workflow = await loader.load()
    
    console.log('✅ WORKFLOW.md 加载成功')
    console.log(`   Prompt 长度：${workflow.prompt_template.length} 字符\n`)
    
    // 2. 解析配置
    const config = new ConfigLayer(workflow.config as Record<string, unknown>)
    const fullConfig = config.getFullConfig()
    
    console.log('✅ 配置解析成功')
    console.log(`   Tracker: ${fullConfig.tracker.kind}`)
    console.log(`   仓库：${fullConfig.tracker.project_slug}`)
    console.log(`   轮询间隔：${fullConfig.polling.interval_ms / 1000}秒`)
    console.log(`   最大并发：${fullConfig.agent.max_concurrent_agents}`)
    console.log(`   API Key: ${fullConfig.tracker.api_key.substring(0, 10)}...`)
    
    // 3. 验证配置
    const validation = config.validate()
    if (validation.ok) {
      console.log('\n✅ 配置验证通过')
    } else {
      console.log('\n❌ 配置验证失败:', validation.error)
      process.exit(1)
    }
    
    console.log('\n🎉 所有测试通过！')
    
  } catch (err) {
    console.error('❌ 测试失败:', err)
    process.exit(1)
  }
}

test()
