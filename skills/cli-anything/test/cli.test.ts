/**
 * CLI-Anything Skill Tests
 */

import { createCLIAnything } from '../src/index.js'

describe('CLIAnythingService', () => {
  const service = createCLIAnything()

  test('should create service instance', () => {
    expect(service).toBeDefined()
  })

  test('should get supported software list', async () => {
    const software = await service.getSupportedSoftware()
    expect(Array.isArray(software)).toBe(true)
    expect(software.length).toBeGreaterThan(0)
  })

  test('should check if software is available', async () => {
    // GIMP 可能未安装，所以只测试方法是否工作
    const available = await service.isAvailable('gimp')
    expect(typeof available).toBe('boolean')
  })

  test('should return error for unsupported software', async () => {
    const result = await service.execute('invalid-software', [])
    expect(result.success).toBe(false)
    expect(result.error).toContain('不支持的软件')
  })

  test('should get help for supported software', async () => {
    // 这个测试可能失败如果 CLI 未安装
    const result = await service.getHelp('gimp')
    // 不检查 success，因为可能未安装
    expect(typeof result.output).toBe('string')
  })
})

console.log('✅ CLI-Anything tests loaded')
