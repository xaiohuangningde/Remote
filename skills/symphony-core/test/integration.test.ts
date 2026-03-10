/**
 * Symphony Phase 2 集成测试
 * 
 * 测试目标：验证完整的 GitHub Issue → Subagent → 完成流程
 */

import { createSymphony } from '../src/index.ts'
import type { RuntimeSnapshot } from '../src/types.ts'

interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration: number
}

const results: TestResult[] = []

/**
 * 测试 1: 创建 Symphony 实例
 */
async function testCreateSymphony(): Promise<TestResult> {
  const start = Date.now()
  try {
    const symphony = await createSymphony({
      workflowPath: './WORKFLOW.md',
    })
    
    return {
      name: '创建 Symphony 实例',
      passed: true,
      duration: Date.now() - start,
    }
  } catch (error) {
    return {
      name: '创建 Symphony 实例',
      passed: false,
      error: String(error),
      duration: Date.now() - start,
    }
  }
}

/**
 * 测试 2: 验证配置
 */
async function testValidateConfig(): Promise<TestResult> {
  const start = Date.now()
  try {
    // 直接测试 ConfigLayer
    const { WorkflowLoader, ConfigLayer } = await import('../src/index.ts')
    
    const loader = new WorkflowLoader('./WORKFLOW.md')
    const workflow = await loader.load()
    const config = new ConfigLayer(workflow.config)
    
    const validation = config.validate()
    
    if (!validation.ok) {
      return {
        name: '验证配置',
        passed: false,
        error: validation.error,
        duration: Date.now() - start,
      }
    }
    
    return {
      name: '验证配置',
      passed: true,
      duration: Date.now() - start,
    }
  } catch (error) {
    return {
      name: '验证配置',
      passed: false,
      error: String(error),
      duration: Date.now() - start,
    }
  }
}

/**
 * 测试 3: 获取运行时快照
 */
async function testGetSnapshot(): Promise<TestResult> {
  const start = Date.now()
  try {
    const symphony = await createSymphony({
      workflowPath: './WORKFLOW.md',
    })
    
    const snapshot: RuntimeSnapshot = await symphony.getSnapshot()
    
    // 验证快照结构
    if (!Array.isArray(snapshot.running)) {
      throw new Error('snapshot.running 应该是数组')
    }
    
    if (!Array.isArray(snapshot.retrying)) {
      throw new Error('snapshot.retrying 应该是数组')
    }
    
    return {
      name: '获取运行时快照',
      passed: true,
      duration: Date.now() - start,
    }
  } catch (error) {
    return {
      name: '获取运行时快照',
      passed: false,
      error: String(error),
      duration: Date.now() - start,
    }
  }
}

/**
 * 测试 4: GitHub API 连接
 */
async function testGitHubConnection(): Promise<TestResult> {
  const start = Date.now()
  try {
    // 直接测试 GitHub 适配器
    const { createGitHubAdapter } = await import('../../symphony-github/src/index.ts')
    
    const token = process.env.GITHUB_TOKEN
    if (!token) {
      throw new Error('GITHUB_TOKEN 环境变量未设置')
    }
    
    const github = await createGitHubAdapter({
      token,
      repo: 'openclaw/openclaw',
    })
    
    // 尝试获取 issues
    const issues = await github.fetchCandidateIssues({
      limit: 5,
    })
    
    console.log(`成功获取 ${issues.length} 个 issues`)
    
    return {
      name: 'GitHub API 连接',
      passed: true,
      duration: Date.now() - start,
    }
  } catch (error) {
    return {
      name: 'GitHub API 连接',
      passed: false,
      error: String(error),
      duration: Date.now() - start,
    }
  }
}

/**
 * 测试 5: 工作空间创建
 */
async function testWorkspaceCreation(): Promise<TestResult> {
  const start = Date.now()
  try {
    const { createWorkspaceManager } = await import('../../symphony-workspace/src/index.ts')
    
    const workspace = await createWorkspaceManager({
      root: './symphony_workspaces_test',
    })
    
    // 创建工作空间
    const ws = await workspace.ensureWorkspace({
      identifier: 'TEST-1',
    })
    
    console.log(`工作空间创建成功：${ws.path}`)
    
    return {
      name: '工作空间创建',
      passed: true,
      duration: Date.now() - start,
    }
  } catch (error) {
    return {
      name: '工作空间创建',
      passed: false,
      error: String(error),
      duration: Date.now() - start,
    }
  }
}

/**
 * 主测试运行器
 */
async function runTests(): Promise<void> {
  console.log('🧪 Symphony Phase 2 集成测试开始\n')
  
  const tests = [
    testCreateSymphony,
    testValidateConfig,
    testGetSnapshot,
    testGitHubConnection,
    testWorkspaceCreation,
  ]
  
  for (const test of tests) {
    const result = await test()
    results.push(result)
    
    const status = result.passed ? '✅' : '❌'
    console.log(`${status} ${result.name} (${result.duration}ms)`)
    if (!result.passed) {
      console.log(`   错误：${result.error}`)
    }
  }
  
  // 汇总报告
  const passed = results.filter(r => r.passed).length
  const total = results.length
  
  console.log(`\n${'='.repeat(50)}`)
  console.log(`测试结果：${passed}/${total} 通过`)
  
  if (passed === total) {
    console.log('🎉 所有测试通过！')
  } else {
    console.log('⚠️ 部分测试失败，请检查错误信息')
  }
  
  // 退出码
  process.exit(passed === total ? 0 : 1)
}

// 运行测试
runTests().catch(error => {
  console.error('测试运行失败:', error)
  process.exit(1)
})
