/**
 * WorldView MCP 技能测试
 */

import { createWorldView } from './src/index.ts'

async function runTests() {
  console.log('🧪 WorldView MCP 测试开始...\n')
  
  const wv = await createWorldView({
    baseUrl: 'http://localhost:3001',
    timeout: 10000,
    cache: { enabled: false }
  })
  
  let passed = 0
  let failed = 0
  
  // 测试 1: 健康检查
  try {
    console.log('测试 1: 健康检查...')
    const health = await wv.healthCheck()
    console.log(`✅ 通过 - 服务状态：${health.status}`)
    passed++
  } catch (error) {
    console.log(`❌ 失败 - ${error}`)
    failed++
  }
  
  // 测试 2: 航班查询
  try {
    console.log('\n测试 2: 航班查询...')
    const flights = await wv.getFlights()
    console.log(`✅ 通过 - 获取 ${flights.length} 架航班`)
    passed++
  } catch (error) {
    console.log(`❌ 失败 - ${error}`)
    failed++
  }
  
  // 测试 3: 卫星查询
  try {
    console.log('\n测试 3: 卫星查询...')
    const satellites = await wv.getSatellites()
    console.log(`✅ 通过 - 获取 ${satellites.length} 颗卫星`)
    passed++
  } catch (error) {
    console.log(`❌ 失败 - ${error}`)
    failed++
  }
  
  // 测试 4: 地震查询
  try {
    console.log('\n测试 4: 地震查询...')
    const earthquakes = await wv.getEarthquakes()
    console.log(`✅ 通过 - 获取 ${earthquakes.length} 次地震`)
    passed++
  } catch (error) {
    console.log(`❌ 失败 - ${error}`)
    failed++
  }
  
  // 测试 5: ISS 追踪
  try {
    console.log('\n测试 5: ISS 追踪...')
    const iss = await wv.trackSatellite('ISS')
    if (iss) {
      console.log(`✅ 通过 - ISS 位置：${iss.latitude.toFixed(2)}, ${iss.longitude.toFixed(2)}`)
      passed++
    } else {
      console.log(`⚠️  警告 - 未找到 ISS`)
      passed++
    }
  } catch (error) {
    console.log(`❌ 失败 - ${error}`)
    failed++
  }
  
  // 总结
  console.log('\n' + '='.repeat(50))
  console.log(`测试结果：${passed} 通过，${failed} 失败`)
  console.log('='.repeat(50))
  
  return failed === 0
}

// 运行测试
runTests().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('测试执行错误:', error)
  process.exit(1)
})
