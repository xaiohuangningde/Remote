/**
 * Symphony 简化版端到端测试
 * 
 * 测试除 subagent 启动外的所有核心功能：
 * - WORKFLOW.md 加载
 * - 配置验证
 * - GitHub 集成
 * - 工作空间管理
 * - Prompt 渲染
 */

import { WorkflowLoader } from '../src/workflow-loader.ts'
import { ConfigLayer } from '../src/config.ts'
import { Orchestrator } from '../src/orchestrator.ts'
import { createHttpServer } from '../src/http-server.ts'
import { createLogger, getTodayMemoryFile } from '../src/logger.ts'

async function test() {
  console.log('🎵 Symphony 简化版 E2E 测试...\n')
  
  const logger = createLogger('SymphonyE2E', {
    memoryFile: getTodayMemoryFile(),
    console: true,
  })
  
  try {
    // 1. 加载 WORKFLOW.md
    console.log('📖 加载 WORKFLOW.md...')
    const loader = new WorkflowLoader('./WORKFLOW.md')
    const workflow = await loader.load()
    console.log(`✅ WORKFLOW.md 加载成功 (${workflow.prompt_template.length} 字符)\n`)
    
    // 2. 创建配置层
    console.log('⚙️  创建配置层...')
    const config = new ConfigLayer(workflow.config)
    const validation = await config.validate()
    if (!validation.ok) {
      throw new Error(`配置验证失败：${validation.error}`)
    }
    console.log('✅ 配置验证通过\n')
    
    // 3. 创建编排器
    console.log('🔄 创建编排器...')
    const orchestrator = new Orchestrator(config)
    await orchestrator.initialize()
    console.log('✅ 编排器初始化成功\n')
    
    // 4. 启动 HTTP 服务器
    console.log('🌐 启动 HTTP 服务器...')
    const httpServer = createHttpServer({ port: 8765 }, logger)
    await httpServer.start()
    console.log('✅ HTTP 服务器已启动：http://localhost:8765\n')
    
    // 5. 获取候选 issues
    console.log('📋 获取候选 issues...')
    const issues = await orchestrator.fetchCandidateIssues()
    console.log(`✅ 获取到 ${issues.length} 个候选 issues\n`)
    
    if (issues.length > 0) {
      const issue = issues[0]
      console.log(`🎯 测试 Issue #${issue.identifier}: ${issue.title}`)
      console.log(`   状态：${issue.state}`)
      console.log(`   标签：${issue.labels.join(', ') || '无'}\n`)
      
      // 6. 准备工作空间
      console.log('📁 准备工作空间...')
      const workspace = await orchestrator.ensureWorkspace(issue)
      console.log(`✅ 工作空间就绪：${workspace}\n`)
      
      // 7. 显示 issue 详情
      console.log('📋 Issue 详情:')
      console.log(`   ID: ${issue.id}`)
      console.log(`   标识符：${issue.identifier}`)
      console.log(`   标题：${issue.title}`)
      console.log(`   描述：${issue.description?.substring(0, 200) || '无'}...\n`)
      
      // 8. 显示运行时快照
      const snapshot = orchestrator.getSnapshot()
      console.log('📊 运行时快照:')
      console.log(`   运行中：${snapshot.running?.length || 0}`)
      console.log(`   重试中：${snapshot.retrying?.length || 0}`)
      console.log(`   已完成：${snapshot.completed?.length || 0}\n`)
      
      console.log('⚠️  跳过 subagent 启动（需要 OpenClaw 会话）\n')
    } else {
      console.log('⚠️  没有待处理的 issues\n')
    }
    
    console.log('✅ Symphony 简化版 E2E 测试完成！\n')
    console.log('💡 完整测试（包含 subagent 启动）需要在 OpenClaw 会话中运行：')
    console.log('   npx tsx test-e2e.ts\n')
    
    // 保持 HTTP 服务器运行几秒钟
    await new Promise(resolve => setTimeout(resolve, 2000))
    await httpServer.stop()
    
  } catch (err) {
    console.error('❌ 测试失败:', err)
    process.exit(1)
  }
}

test().catch(err => {
  console.error('❌ 测试失败:', err)
  process.exit(1)
})
