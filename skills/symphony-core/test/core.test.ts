/**
 * Symphony Phase 2 核心功能测试（不需要 GitHub token）
 */

import { createSymphony, WorkflowLoader, ConfigLayer } from '../src/index.ts'
import { createWorkspaceManager } from '../../symphony-workspace/src/index.ts'

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
    
    const snapshot = await symphony.getSnapshot()
    
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
 * 测试 4: 工作空间创建
 */
async function testWorkspaceCreation(): Promise<TestResult> {
  const start = Date.now()
  try {
    const workspace = await createWorkspaceManager({
      root: './symphony_workspaces_test',
    })
    
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
 * 测试 5: WORKFLOW.md 热加载
 */
async function testHotReload(): Promise<TestResult> {
  const start = Date.now()
  try {
    const loader = new WorkflowLoader('./WORKFLOW.md')
    const workflow1 = await loader.load()
    
    // 再次加载应该返回相同内容（缓存）
    const workflow2 = await loader.load()
    
    if (workflow1.prompt_template !== workflow2.prompt_template) {
      throw new Error('热加载返回不一致的内容')
    }
    
    return {
      name: 'WORKFLOW.md 热加载',
      passed: true,
      duration: Date.now() - start,
    }
  } catch (error) {
    return {
      name: 'WORKFLOW.md 热加载',
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
  console.log('🧪 Symphony Phase 2 核心功能测试开始\n')
  
  const tests = [
    testCreateSymphony,
    testValidateConfig,
    testGetSnapshot,
    testWorkspaceCreation,
    testHotReload,
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
}

// 运行测试
runTests().catch(error => {
  console.error('测试运行失败:', error)
  process.exit(1)
})
