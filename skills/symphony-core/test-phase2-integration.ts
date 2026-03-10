/**
 * Symphony Phase 2 集成测试脚本
 * 
 * 测试完整的 GitHub issue 自动处理流程
 */

import { WorkflowLoader } from './src/workflow-loader.ts'
import { ConfigLayer } from './src/config.ts'
import { Orchestrator } from './src/orchestrator.ts'
import { createLogger, getTodayMemoryFile } from './src/logger.ts'
import { createHttpServer } from './src/http-server.ts'

interface TestResult {
  success: boolean
  message: string
  details?: Record<string, unknown>
}

export async function runPhase2IntegrationTest() {
  const results: TestResult[] = []
  const logger = createLogger('SymphonyPhase2Test', {
    memoryFile: getTodayMemoryFile(),
    console: true,
  })
  
  console.log('\n🎵 Symphony Phase 2 集成测试开始...\n')
  
  try {
    // ========================================================================
    // 测试 1: 加载 WORKFLOW.md
    // ========================================================================
    console.log('📖 测试 1: 加载 WORKFLOW.md...')
    const loader = new WorkflowLoader('./WORKFLOW.md')
    const workflow = await loader.load()
    
    if (workflow.prompt_template.length > 0) {
      results.push({
        success: true,
        message: 'WORKFLOW.md 加载成功',
        details: { configKeys: Object.keys(workflow.config), promptLength: workflow.prompt_template.length },
      })
      console.log('   ✅ WORKFLOW.md 加载成功\n')
    } else {
      throw new Error('WORKFLOW.md prompt template 为空')
    }
    
    // ========================================================================
    // 测试 2: 配置层验证
    // ========================================================================
    console.log('⚙️  测试 2: 配置层验证...')
    const config = new ConfigLayer(workflow.config)
    const validation = await config.validate()
    
    if (validation.ok) {
      const tracker = config.getTracker()
      const agent = config.getAgent()
      results.push({
        success: true,
        message: '配置验证通过',
        details: {
          tracker: tracker.kind,
          repo: tracker.project_slug,
          maxConcurrentAgents: agent.max_concurrent_agents,
          pollInterval: config.getPollInterval(),
        },
      })
      console.log('   ✅ 配置验证通过')
      console.log(`      - Tracker: ${tracker.kind}`)
      console.log(`      - Repo: ${tracker.project_slug}`)
      console.log(`      - 轮询间隔：${config.getPollInterval()}ms`)
      console.log(`      - 最大并发：${agent.max_concurrent_agents}\n`)
    } else {
      throw new Error(`配置验证失败：${validation.error}`)
    }
    
    // ========================================================================
    // 测试 3: 编排器初始化
    // ========================================================================
    console.log('🔄 测试 3: 编排器初始化...')
    const orchestrator = new Orchestrator(config, {
      sessions_spawn: globalThis.sessions_spawn,
      sessions_send: globalThis.sessions_send,
    })
    
    await orchestrator.initialize()
    results.push({
      success: true,
      message: '编排器初始化成功',
      details: { initialized: true },
    })
    console.log('   ✅ 编排器初始化成功\n')
    
    // ========================================================================
    // 测试 4: GitHub 适配器 - 获取 issues
    // ========================================================================
    console.log('📋 测试 4: 获取 GitHub issues...')
    // 使用反射访问私有方法（测试用）
    const fetchCandidateIssues = (orchestrator as any).fetchCandidateIssues.bind(orchestrator)
    const issues = await fetchCandidateIssues()
    
    if (issues.length > 0) {
      results.push({
        success: true,
        message: `获取到 ${issues.length} 个 issues`,
        details: {
          count: issues.length,
          issues: issues.map((i: any) => ({ number: i.number, title: i.title })),
        },
      })
      console.log(`   ✅ 获取到 ${issues.length} 个 issues:`)
      for (const issue of issues) {
        console.log(`      - #${issue.number}: ${issue.title}`)
      }
      console.log()
    } else {
      results.push({
        success: false,
        message: '没有获取到 issues',
        details: { count: 0 },
      })
      console.log('   ⚠️  没有获取到 issues\n')
    }
    
    // ========================================================================
    // 测试 5: 工作空间管理
    // ========================================================================
    if (issues.length > 0) {
      console.log('📁 测试 5: 工作空间管理...')
      const ensureWorkspace = (orchestrator as any).ensureWorkspace.bind(orchestrator)
      const testIssue = issues[0]
      
      const workspace = await ensureWorkspace(testIssue)
      results.push({
        success: true,
        message: '工作空间准备成功',
        details: { path: workspace, issue: testIssue.identifier },
      })
      console.log(`   ✅ 工作空间就绪：${workspace}\n`)
    }
    
    // ========================================================================
    // 测试 6: Prompt 构建
    // ========================================================================
    if (issues.length > 0) {
      console.log('📝 测试 6: Prompt 构建...')
      const buildPrompt = (orchestrator as any).buildPrompt.bind(orchestrator)
      const testIssue = issues[0]
      
      const prompt = await buildPrompt(testIssue)
      results.push({
        success: true,
        message: 'Prompt 构建成功',
        details: { length: prompt.length, issue: testIssue.identifier },
      })
      console.log(`   ✅ Prompt 构建成功 (${prompt.length} 字符)`)
      console.log(`      预览：${prompt.substring(0, 100)}...\n`)
    }
    
    // ========================================================================
    // 测试 7: 运行时快照
    // ========================================================================
    console.log('📊 测试 7: 运行时快照...')
    const snapshot = orchestrator.getSnapshot()
    results.push({
      success: true,
      message: '运行时快照生成成功',
      details: {
        running: snapshot.counts.running,
        retrying: snapshot.counts.retrying,
      },
    })
    console.log('   ✅ 运行时快照:')
    console.log(`      - 运行中：${snapshot.counts.running}`)
    console.log(`      - 重试中：${snapshot.counts.retrying}`)
    console.log(`      - 已完成：${snapshot.codex_totals.total_tokens} tokens\n`)
    
    // ========================================================================
    // 测试 8: HTTP 服务器（可选）
    // ========================================================================
    console.log('🌐 测试 8: HTTP 服务器...')
    const httpServer = createHttpServer({ port: 8766 }, logger)
    await httpServer.start()
    
    // 更新快照
    httpServer.updateSnapshot(orchestrator.getSnapshot())
    
    results.push({
      success: true,
      message: 'HTTP 服务器启动成功',
      details: { port: 8766, url: 'http://localhost:8766' },
    })
    console.log('   ✅ HTTP 服务器启动：http://localhost:8766\n')
    
    // 停止 HTTP 服务器
    await httpServer.stop()
    
    // ========================================================================
    // 总结
    // ========================================================================
    const passed = results.filter(r => r.success).length
    const total = results.length
    
    console.log('='.repeat(60))
    console.log(`📊 测试结果：${passed}/${total} 通过`)
    console.log('='.repeat(60))
    
    if (passed === total) {
      console.log('\n✅ 所有测试通过！Symphony Phase 2 集成成功！\n')
    } else {
      console.log('\n⚠️  部分测试失败，请检查上方详情\n')
    }
    
    return {
      success: passed === total,
      results,
      snapshot: orchestrator.getSnapshot(),
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('\n❌ 测试失败:', errorMessage)
    console.error(error)
    
    results.push({
      success: false,
      message: `测试异常：${errorMessage}`,
    })
    
    return {
      success: false,
      results,
      error: errorMessage,
    }
  }
}

// 自动执行（如果在 OpenClaw 会话中）
if (typeof globalThis.sessions_spawn !== 'undefined') {
  runPhase2IntegrationTest()
    .then(result => {
      console.log('\n📝 测试报告已生成')
      if (!result.success) {
        console.error('\n❌ 集成测试失败')
      }
    })
    .catch(console.error)
} else {
  console.log('⚠️  sessions_spawn 不可用 - 在 OpenClaw 会话中运行此脚本')
  console.log('导出：export { runPhase2IntegrationTest }')
}
