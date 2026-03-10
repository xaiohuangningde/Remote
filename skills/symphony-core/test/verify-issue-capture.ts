/**
 * 验证 Symphony 是否已成功捕获 GitHub Issue #1
 */

import { WorkflowLoader } from '../src/workflow-loader.ts'
import { ConfigLayer } from '../src/config.ts'
import { Orchestrator } from '../src/orchestrator.ts'
import { access } from 'fs/promises'

async function verify() {
  console.log('🔍 验证 Symphony Issue 捕获...\n')
  
  // 设置环境变量
  process.env.WORKSPACE_ROOT = 'C:\\Users\\12132\\.openclaw\\workspace'
  
  // 1. 加载配置
  const loader = new WorkflowLoader('./WORKFLOW.md')
  const workflow = await loader.load()
  const config = new ConfigLayer(workflow.config)
  
  console.log('✅ 配置加载成功')
  console.log(`   仓库：${config.getTracker().project_slug}`)
  console.log(`   工作空间：${config.getWorkspace().root}\n`)
  
  // 2. 创建编排器
  const orchestrator = new Orchestrator(config)
  await orchestrator.initialize()
  console.log('✅ 编排器初始化成功\n')
  
  // 3. 获取候选 issues
  console.log('📋 获取候选 issues...')
  const issues = await orchestrator.fetchCandidateIssues()
  console.log(`✅ 获取到 ${issues.length} 个 issues\n`)
  
  if (issues.length > 0) {
    const issue = issues[0]
    console.log('✅ GitHub Issue 已成功捕获:')
    console.log(`   编号：${issue.identifier}`)
    console.log(`   标题：${issue.title}`)
    console.log(`   状态：${issue.state}`)
    console.log(`   创建时间：${issue.created_at}`)
    console.log()
    
    // 4. 检查工作空间
    console.log('📁 检查工作空间...')
    const workspacePath = await orchestrator['ensureWorkspace'](issue)
    console.log(`   路径：${workspacePath}`)
    
    // 检查目录是否实际存在
    try {
      await access(workspacePath)
      console.log('   状态：✅ 已创建')
    } catch {
      console.log('   状态：⚠️  未创建（需要调用 ensureWorkspace）')
    }
    console.log()
    
    // 5. 显示 sessions_spawn 调用方式
    console.log('🚀 launchAgent 方法中的 sessions_spawn 调用:')
    console.log(`   task: prompt (渲染后的 prompt 文本)`)
    console.log(`   mode: session`)
    console.log(`   runtime: subagent`)
    console.log(`   label: ${issue.identifier}`)
    console.log(`   cwd: ${workspacePath}`)
    console.log()
    
    console.log('✅ 验证完成！')
  } else {
    console.log('❌ 没有获取到任何 issues')
  }
}

verify().catch(err => {
  console.error('❌ 验证失败:', err)
  process.exit(1)
})
