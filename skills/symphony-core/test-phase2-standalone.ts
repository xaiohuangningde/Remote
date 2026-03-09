/**
 * Symphony Phase 2 独立集成测试
 * 
 * 不依赖 OpenClaw sessions_spawn，仅测试核心功能
 */

import { WorkflowLoader } from './src/workflow-loader.ts'
import { ConfigLayer } from './src/config.ts'
import { Orchestrator } from './src/orchestrator.ts'
import { createLogger, getTodayMemoryFile } from './src/logger.ts'
import { createHttpServer } from './src/http-server.ts'

async function runIndependentTest() {
  console.log('\n🎵 Symphony Phase 2 独立集成测试开始...\n')
  
  const results = []
  
  try {
    // ========================================================================
    // 测试 1: 加载 WORKFLOW.md
    // ========================================================================
    console.log('📖 测试 1: 加载 WORKFLOW.md...')
    const loader = new WorkflowLoader('./WORKFLOW.md')
    const workflow = await loader.load()
    
    if (workflow.prompt_template.length > 0) {
      results.push({ test: 'WORKFLOW.md 加载', success: true })
      console.log('   ✅ WORKFLOW.md 加载成功')
      console.log(`      配置项：${Object.keys(workflow.config).join(', ')}`)
      console.log(`      Prompt 长度：${workflow.prompt_template.length} 字符\n`)
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
      const polling = config.getPolling()
      
      results.push({ test: '配置验证', success: true })
      console.log('   ✅ 配置验证通过')
      console.log(`      - Tracker: ${tracker.kind}`)
      console.log(`      - 仓库：${tracker.project_slug}`)
      console.log(`      - API Key: ${tracker.api_key ? '已配置' : '❌ 未配置'}`)
      console.log(`      - 轮询间隔：${polling.interval_ms}ms`)
      console.log(`      - 最大并发：${agent.max_concurrent_agents}`)
      console.log(`      - 活跃状态：${tracker.active_states.join(', ')}`)
      console.log(`      - 终端状态：${tracker.terminal_states.join(', ')}\n`)
    } else {
      throw new Error(`配置验证失败：${validation.error}`)
    }
    
    // ========================================================================
    // 测试 3: 编排器初始化
    // ========================================================================
    console.log('🔄 测试 3: 编排器初始化...')
    const orchestrator = new Orchestrator(config)
    
    await orchestrator.initialize()
    results.push({ test: '编排器初始化', success: true })
    console.log('   ✅ 编排器初始化成功\n')
    
    // ========================================================================
    // 测试 4: GitHub 适配器 - 获取 issues
    // ========================================================================
    console.log('📋 测试 4: 获取 GitHub issues...')
    const fetchCandidateIssues = (orchestrator as any).fetchCandidateIssues.bind(orchestrator)
    const issues = await fetchCandidateIssues()
    
    results.push({ test: '获取 issues', success: true, count: issues.length })
    console.log(`   ✅ 获取到 ${issues.length} 个 issues:`)
    
    if (issues.length > 0) {
      for (const issue of issues) {
        console.log(`      - #${issue.number}: ${issue.title}`)
        console.log(`         状态：${issue.state}`)
        console.log(`         标签：${issue.labels?.length || 0}`)
        console.log(`         创建：${issue.created_at}`)
      }
    }
    console.log()
    
    // ========================================================================
    // 测试 5: 工作空间管理
    // ========================================================================
    if (issues.length > 0) {
      console.log('📁 测试 5: 工作空间管理...')
      const ensureWorkspace = (orchestrator as any).ensureWorkspace.bind(orchestrator)
      const testIssue = issues[0]
      
      const workspace = await ensureWorkspace(testIssue)
      results.push({ test: '工作空间管理', success: true, path: workspace })
      console.log(`   ✅ 工作空间就绪：${workspace}`)
      console.log(`      Issue: ${testIssue.identifier}`)
      console.log(`      标题：${testIssue.title}\n`)
    }
    
    // ========================================================================
    // 测试 6: Prompt 构建
    // ========================================================================
    if (issues.length > 0) {
      console.log('📝 测试 6: Prompt 构建...')
      const buildPrompt = (orchestrator as any).buildPrompt.bind(orchestrator)
      const testIssue = issues[0]
      
      const prompt = await buildPrompt(testIssue)
      results.push({ test: 'Prompt 构建', success: true, length: prompt.length })
      console.log(`   ✅ Prompt 构建成功 (${prompt.length} 字符)`)
      console.log(`      预览：${prompt.substring(0, 150)}...\n`)
    }
    
    // ========================================================================
    // 测试 7: 状态同步
    // ========================================================================
    if (issues.length > 0) {
      console.log('🔄 测试 7: Issue 状态同步...')
      const fetchIssueStates = (orchestrator as any).fetchIssueStates.bind(orchestrator)
      const issueIds = issues.map((i: any) => i.id)
      
      const states = await fetchIssueStates(issueIds)
      results.push({ test: '状态同步', success: true, count: states.size })
      console.log(`   ✅ 同步了 ${states.size} 个 issue 的状态:`)
      
      for (const [id, state] of states) {
        const issue = issues.find((i: any) => i.id === id)
        if (issue) {
          console.log(`      - ${issue.identifier}: ${state}`)
        }
      }
      console.log()
    }
    
    // ========================================================================
    // 测试 8: 运行时快照
    // ========================================================================
    console.log('📊 测试 8: 运行时快照...')
    const snapshot = orchestrator.getSnapshot()
    results.push({ 
      test: '运行时快照', 
      success: true, 
      running: snapshot.counts.running,
      retrying: snapshot.counts.retrying,
    })
    console.log('   ✅ 运行时快照生成:')
    console.log(`      - 运行中：${snapshot.counts.running}`)
    console.log(`      - 重试中：${snapshot.counts.retrying}`)
    console.log(`      - Token 使用：${snapshot.codex_totals.total_tokens}`)
    console.log(`      - 生成时间：${snapshot.generated_at}\n`)
    
    // ========================================================================
    // 测试 9: HTTP 服务器
    // ========================================================================
    console.log('🌐 测试 9: HTTP 服务器...')
    const logger = createLogger('SymphonyTest', {
      memoryFile: getTodayMemoryFile(),
      console: false,
    })
    const httpServer = createHttpServer({ port: 8766 }, logger)
    await httpServer.start()
    
    httpServer.updateSnapshot(orchestrator.getSnapshot())
    results.push({ test: 'HTTP 服务器', success: true, port: 8766 })
    console.log('   ✅ HTTP 服务器启动：http://localhost:8766')
    console.log('      端点：/status, /snapshot, /trigger-poll\n')
    
    await httpServer.stop()
    
    // ========================================================================
    // 测试 10: 重试队列
    // ========================================================================
    console.log('🔁 测试 10: 重试队列机制...')
    const scheduleRetry = (orchestrator as any).scheduleRetry.bind(orchestrator)
    const testIssueId = issues.length > 0 ? issues[0].id : 'test-123'
    
    scheduleRetry(testIssueId, 'test_error')
    const retryQueue = (orchestrator as any).processRetryQueue.bind(orchestrator)
    await retryQueue()
    
    results.push({ test: '重试队列', success: true })
    console.log('   ✅ 重试队列机制正常\n')
    
    // ========================================================================
    // 总结
    // ========================================================================
    const passed = results.filter(r => r.success).length
    const total = results.length
    
    console.log('='.repeat(70))
    console.log(`📊 测试结果：${passed}/${total} 通过`)
    console.log('='.repeat(70))
    console.log()
    
    for (const result of results) {
      const icon = result.success ? '✅' : '❌'
      console.log(`${icon} ${result.test}`)
    }
    console.log()
    
    if (passed === total) {
      console.log('✅ 所有测试通过！Symphony Phase 2 集成成功！\n')
      return { success: true, results }
    } else {
      console.log(`⚠️  ${total - passed} 个测试失败\n`)
      return { success: false, results }
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('\n❌ 测试失败:', errorMessage)
    console.error(error)
    
    return {
      success: false,
      error: errorMessage,
      results,
    }
  }
}

// 执行测试
runIndependentTest()
  .then(result => {
    console.log('📝 测试完成')
    process.exit(result.success ? 0 : 1)
  })
  .catch(err => {
    console.error('测试异常:', err)
    process.exit(1)
  })
