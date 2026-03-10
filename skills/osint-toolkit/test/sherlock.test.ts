/**
 * OSINT Toolkit - Sherlock 测试
 */

import { createOSINT, OSINTError } from '../src/index.ts'

async function testSherlock() {
  console.log('🔍 测试 Sherlock 用户名追踪...\n')

  const osint = await createOSINT()

  // 测试用例 1: 常见用户名
  console.log('测试 1: 搜索用户名 "google"')
  try {
    const result = await osint.sherlock.search('google')
    console.log(`✅ 找到 ${result.found} 个相关账号`)
    console.log(`   平台：${result.platforms.filter(p => p.status === 'found').slice(0, 5).map(p => p.name).join(', ')}`)
  } catch (error: any) {
    console.log(`❌ 失败：${error.message}`)
  }

  // 测试用例 2: 随机用户名
  console.log('\n测试 2: 搜索用户名 "test_user_12345"')
  try {
    const result = await osint.sherlock.search('test_user_12345')
    console.log(`✅ 找到 ${result.found} 个相关账号`)
    if (result.found > 0) {
      console.log(`   平台：${result.platforms.filter(p => p.status === 'found').map(p => p.name).join(', ')}`)
    }
  } catch (error: any) {
    console.log(`❌ 失败：${error.message}`)
  }

  // 测试用例 3: 不存在的用户名
  console.log('\n测试 3: 搜索用户名 "xyz_nonexistent_user_999"')
  try {
    const result = await osint.sherlock.search('xyz_nonexistent_user_999')
    console.log(`✅ 找到 ${result.found} 个相关账号 (预期 0)`)
  } catch (error: any) {
    console.log(`❌ 失败：${error.message}`)
  }

  console.log('\n✅ Sherlock 测试完成')
}

// 运行测试
testSherlock().catch(console.error)
