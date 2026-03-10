/**
 * MiroFish MCP 功能测试 (JavaScript 版本)
 * 
 * 使用前确保 MiroFish 服务已启动：
 * cd D:\projects\MiroFish
 * npm run dev
 */

import { MiroFish } from '../src/index.ts'

async function runTests() {
  console.log('🧪 MiroFish MCP 功能测试\n')
  console.log('=' .repeat(50))
  
  const mf = new MiroFish()
  
  // ============================================================================
  // 测试 1: 服务连接检查
  // ============================================================================
  console.log('\n【测试 1】服务连接检查')
  try {
    const health = await mf.healthCheck()
    console.log(`  状态：${health.ok ? '✅ 服务运行中' : '⚠️ 服务未运行'}`)
    console.log(`  消息：${health.message}`)
    
    if (!health.ok) {
      console.log('\n  💡 提示：请先启动 MiroFish 服务')
      console.log('  cd D:\\projects\\MiroFish')
      console.log('  npm run dev')
      return
    }
  } catch (error) {
    console.log(`  ❌ 错误：${error.message}`)
    return
  }
  
  // ============================================================================
  // 测试 2: 配置验证
  // ============================================================================
  console.log('\n【测试 2】配置验证')
  console.log(`  后端地址：${mf.getBackendUrl()}`)
  console.log(`  前端地址：${mf.getFrontendUrl()}`)
  console.log(`  项目目录：${mf.config.projectDir}`)
  console.log(`  超时时间：${mf.config.timeout / 1000}秒`)
  console.log(`  轮询间隔：${mf.config.pollInterval / 1000}秒`)
  
  // ============================================================================
  // 测试 3: 状态机流程说明
  // ============================================================================
  console.log('\n【测试 3】状态机流程说明')
  console.log('  完整流程：')
  console.log('  1. createProject()     → 创建项目')
  console.log('  2. buildGraph()        → 构建图谱（LLM 提取实体）')
  console.log('  3. createSimulation()  → 创建仿真')
  console.log('  4. prepareSimulation() → 准备配置（生成 Agent 人设）')
  console.log('  5. waitForReady()      → 轮询直到 ready')
  console.log('  6. startSimulation()   → 启动推演')
  console.log('  7. getRunStatus()      → 查询运行状态')
  console.log('  8. queryResults()      → 获取推演结果')
  
  console.log('\n  一键推演：')
  console.log('  quickSimulate() → 自动完成全流程')
  
  // ============================================================================
  // 测试 4: 使用示例
  // ============================================================================
  console.log('\n【测试 4】使用示例代码')
  console.log(`
  import { createMiroFish } from 'skills/mirofish-mcp/src/index.ts'
  
  const mf = await createMiroFish()
  
  // 一键推演
  const result = await mf.quickSimulate({
    name: '2026 伊朗战争推演',
    seedFile: 'uploads/iran-war-seed.md',
    maxRounds: 20,
    onProgress: (status) => {
      console.log(\`第 \${status.currentRound}/\${status.totalRounds} 轮\`)
    }
  })
  `)
  
  // ============================================================================
  // 总结
  // ============================================================================
  console.log('\n' + '='.repeat(50))
  console.log('✅ 所有测试完成！')
  console.log('\n📚 更多信息:')
  console.log('  - 技能文档：SKILL.md')
  console.log('  - 快速开始：README.md')
  console.log('  - 源码：src/index.ts')
  console.log('\n🌐 访问前端：http://localhost:3000')
}

// 运行测试
runTests().catch(console.error)
