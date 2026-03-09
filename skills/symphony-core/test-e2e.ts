/**
 * Symphony 端到端测试脚本
 * 
 * 在 OpenClaw 会话内直接运行，使用 sessions_spawn
 */

import { WorkflowLoader } from './src/workflow-loader.ts'
import { ConfigLayer } from './src/config.ts'
import { Orchestrator } from './src/orchestrator.ts'
import { createLogger, getTodayMemoryFile } from './src/logger.ts'
import { createHttpServer } from './src/http-server.ts'

interface TestOptions {
  sessions_spawn: any
  sessions_send: any
}

export async function runSymphonyTest(options: TestOptions) {
  const logger = createLogger('SymphonyTest', {
    memoryFile: getTodayMemoryFile(),
    console: true,
  })
  
  console.log('🎵 Starting Symphony Test...')
  
  // 1. 加载 WORKFLOW.md
  const loader = new WorkflowLoader('./WORKFLOW.md')
  const workflow = await loader.load()
  console.log('✅ WORKFLOW.md loaded')
  
  // 2. 创建配置层
  const config = new ConfigLayer(workflow.config)
  const validation = await config.validate()
  if (!validation.ok) {
    throw new Error(`Config validation failed: ${validation.error}`)
  }
  console.log('✅ Configuration validated')
  
  // 3. 创建编排器（注入 sessions_spawn）
  const orchestrator = new Orchestrator(config, {
    sessions_spawn: options.sessions_spawn,
    sessions_send: options.sessions_send,
  })
  
  await orchestrator.initialize()
  console.log('✅ Orchestrator initialized')
  
  // 4. 创建 HTTP 服务器
  const httpServer = createHttpServer({ port: 8765 }, logger)
  await httpServer.start()
  console.log('✅ HTTP server started on http://localhost:8765')
  
  // 5. 获取候选 issues
  const issues = await orchestrator.fetchCandidateIssues()
  console.log(`📋 Found ${issues.length} candidate issues`)
  
  if (issues.length > 0) {
    const issue = issues[0]
    console.log(`🎯 Testing with Issue #${issue.number}: ${issue.title}`)
    
    // 6. 准备工作空间
    const workspace = await orchestrator.ensureWorkspace(issue)
    console.log(`✅ Workspace ready: ${workspace}`)
    
    // 7. 渲染 prompt
    const prompt = await orchestrator.renderPrompt(issue)
    console.log(`📝 Prompt rendered (${prompt.length} chars)`)
    
    // 8. 启动 subagent
    console.log('🚀 Launching subagent...')
    const sessionKey = await orchestrator.launchAgent(issue, prompt, workspace)
    console.log(`✅ Subagent launched: ${sessionKey}`)
    
    // 9. 更新状态
    orchestrator.markRunning(issue, sessionKey)
    
    const snapshot = orchestrator.getSnapshot()
    console.log('\n📊 Runtime Snapshot:')
    console.log(`   Running: ${snapshot.running.length}`)
    console.log(`   Retrying: ${snapshot.retrying.length}`)
    console.log(`   Completed: ${snapshot.completed.length}`)
  } else {
    console.log('⚠️ No issues to process')
  }
  
  console.log('\n✅ Symphony Test Complete!')
  console.log('📊 Dashboard: http://localhost:8765')
  
  return { orchestrator, httpServer }
}

// 直接执行（在 OpenClaw 会话中）
if (typeof globalThis.sessions_spawn !== 'undefined') {
  runSymphonyTest({
    sessions_spawn: globalThis.sessions_spawn,
    sessions_send: globalThis.sessions_send,
  }).catch(console.error)
} else {
  console.log('⚠️ sessions_spawn not available - run in OpenClaw session')
  console.log('Usage: Import and call runSymphonyTest() from OpenClaw')
}
