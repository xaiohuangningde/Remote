/**
 * MiroFish MCP 健康检查测试
 */

import { MiroFish } from '../src/index.ts'

async function testHealthCheck() {
  console.log('🧪 MiroFish 健康检查测试\n')
  
  const mf = new MiroFish()
  
  // 测试 1: 健康检查
  console.log('测试 1: 健康检查...')
  const health = await mf.healthCheck()
  console.log(`  结果：${health.ok ? '✅ 通过' : '❌ 失败'}`)
  console.log(`  消息：${health.message}\n`)
  
  // 测试 2: 获取 URL
  console.log('测试 2: 获取服务地址...')
  console.log(`  后端：${mf.getBackendUrl()}`)
  console.log(`  前端：${mf.getFrontendUrl()}\n`)
  
  // 测试 3: 配置验证
  console.log('测试 3: 配置验证...')
  console.log(`  项目目录：${(mf as any).config.projectDir}`)
  console.log(`  超时时间：${(mf as any).config.timeout / 1000}秒\n`)
  
  console.log('✅ 所有测试完成！')
}

// 运行测试
testHealthCheck().catch(console.error)
