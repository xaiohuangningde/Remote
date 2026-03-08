/**
 * TTS 测试脚本 - 火山引擎语音合成测试
 * 
 * 功能：
 * 1. 单句 TTS 测试
 * 2. 批量 TTS 测试
 * 3. 队列管理测试
 * 4. 配置缺失处理
 * 
 * 使用方法：
 *   node tts-test.js [single|batch|queue|all]
 * 
 * 依赖配置：
 *   ai-companion/config/volcengine.json
 */

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import * as fs from 'node:fs'
import { promisify } from 'node:util'
import { pipeline } from 'node:stream'
import * as zlib from 'node:zlib'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ============ 配置加载 ============

/**
 * 加载火山引擎配置
 * @returns {Object|null} 配置对象，如果配置缺失则返回 null
 */
function loadVolcanoConfig() {
  const configPath = join(__dirname, '../../../ai-companion/config/volcengine.json')
  
  console.log('📖 读取配置文件:', configPath)
  
  if (!fs.existsSync(configPath)) {
    console.error('❌ 配置文件不存在:', configPath)
    console.error('💡 请创建配置文件并填入火山引擎凭据')
    console.error('🔗 获取凭据：https://console.volcengine.com')
    return null
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    
    // 验证必要字段
    const required = ['accessKeyId', 'accessKeySecret']
    const missing = required.filter(key => !config[key] || config[key].trim() === '')
    
    if (missing.length > 0) {
      console.error('❌ 配置缺失以下必填字段:', missing.join(', '))
      console.error('💡 请在配置文件中填入有效的火山引擎凭据')
      return null
    }
    
    // 验证 TTS 配置
    if (!config.tts?.appId || !config.tts?.accessToken) {
      console.error('❌ TTS 配置不完整 (appId 或 accessToken 缺失)')
      console.error('💡 请在 https://console.volcengine.com/speech 创建应用')
      return null
    }
    
    console.log('✅ 配置加载成功')
    return config
  } catch (error) {
    console.error('❌ 配置文件解析失败:', error instanceof Error ? error.message : 'Unknown error')
    return null
  }
}

// ============ TTS 服务 (简化版，不依赖外部模块) ============

/**
 * 简化的 TTS 服务类，用于测试
 */
class SimpleTTSService {
  constructor(config) {
    this.config = config
    this.queue = []
    this.processing = false
  }
  
  /**
   * 合成单句语音
   */
  async synthesize(text, options = {}) {
    const requestId = crypto.randomUUID()
    console.log(`🎤 [${requestId.slice(0, 8)}] 开始合成: "${text.slice(0, 30)}${text.length > 30 ? '...' : ''}"`)
    
    try {
      const result = await this.callVolcanoAPI(text, options)
      console.log(`✅ [${requestId.slice(0, 8)}] 合成成功，时长：${result.duration.toFixed(2)}s`)
      return {
        requestId,
        success: true,
        ...result,
      }
    } catch (error) {
      console.error(`❌ [${requestId.slice(0, 8)}] 合成失败:`, error.message)
      return {
        requestId,
        success: false,
        error: error.message,
      }
    }
  }
  
  /**
   * 批量合成
   */
  async synthesizeBatch(requests) {
    console.log(`📦 批量处理 ${requests.length} 个请求`)
    const results = []
    
    for (let i = 0; i < requests.length; i++) {
      console.log(`\n[进度 ${i + 1}/${requests.length}]`)
      const result = await this.synthesize(requests[i].text, requests[i])
      results.push(result)
    }
    
    return results
  }
  
  /**
   * 添加到队列
   */
  enqueue(text, options = {}) {
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID()
      this.queue.push({
        requestId,
        text,
        options,
        resolve,
        reject,
      })
      
      console.log(`📝 [${requestId.slice(0, 8)}] 已加入队列 (队列长度：${this.queue.length})`)
      
      // 如果当前没有在处理，开始处理队列
      if (!this.processing) {
        this.processQueue()
      }
    })
  }
  
  /**
   * 处理队列
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return
    }
    
    this.processing = true
    
    while (this.queue.length > 0) {
      const item = this.queue.shift()
      
      try {
        const result = await this.callVolcanoAPI(item.text, item.options)
        item.resolve({
          requestId: item.requestId,
          success: true,
          ...result,
        })
      } catch (error) {
        item.reject(error)
      }
    }
    
    this.processing = false
    console.log('🎉 队列处理完成')
  }
  
  /**
   * 清空队列
   */
  clearQueue() {
    const count = this.queue.length
    this.queue.forEach(item => {
      item.reject(new Error('Queue cleared'))
    })
    this.queue = []
    console.log(`🗑️ 已清空队列 (${count} 个请求被移除)`)
  }
  
  /**
   * 获取队列长度
   */
  getQueueLength() {
    return this.queue.length
  }
  
  /**
   * 调用火山 TTS API
   */
  async callVolcanoAPI(text, options = {}) {
    const url = 'https://openspeech.bytedance.com/api/v1/tts'
    
    const body = {
      app: {
        appid: this.config.tts.appId,
        token: this.config.tts.accessToken,
        cluster: options.cluster || 'volcano_tts',
      },
      user: {
        uid: 'openclaw-test',
      },
      audio: {
        voice_type: options.voice || 'BV001_streaming',
        encoding: 'wav',
        compression_rate: 1,
        rate: 24000,
        speed_ratio: options.speed || 1.0,
        volume_ratio: 1.0,
        pitch_ratio: 1.0,
      },
      request: {
        reqid: crypto.randomUUID(),
        text: text,
        text_type: 'plain',
        operation: 'query',
        with_frontend: 1,
        frontend_type: 'unitTson',
      },
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    if (!response.ok) {
      throw new Error(`API 错误：${response.status} ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (result.code !== 0 || !result.data) {
      throw new Error(result.message || 'TTS API 返回错误')
    }
    
    // 解码 base64 音频
    const audioBase64 = result.data.audio
    const audioBuffer = Buffer.from(audioBase64, 'base64')
    
    // 估算时长
    const duration = result.data.duration || (audioBuffer.byteLength / (24000 * 2))
    
    return {
      audioBuffer,
      duration,
    }
  }
}

// ============ 测试用例 ============

/**
 * 测试 1: 单句 TTS
 */
async function testSingleSentence() {
  console.log('\n' + '='.repeat(60))
  console.log('测试 1: 单句 TTS')
  console.log('='.repeat(60))
  
  const config = loadVolcanoConfig()
  if (!config) {
    console.log('⏭️  跳过测试 (配置缺失)')
    return false
  }
  
  const tts = new SimpleTTSService(config)
  
  const testCases = [
    { text: '你好，这是语音合成测试。', name: '中文问候' },
    { text: 'Hello, this is a TTS test.', name: '英文问候' },
    { text: '今天天气真好，适合出去散步。', name: '长句测试' },
  ]
  
  let successCount = 0
  
  for (const testCase of testCases) {
    console.log(`\n📝 测试用例：${testCase.name}`)
    const result = await tts.synthesize(testCase.text)
    
    if (result.success) {
      successCount++
      // 保存音频文件
      const outputPath = join(__dirname, `../output/tts-test-${Date.now()}-${testCase.name}.wav`)
      fs.mkdirSync(join(__dirname, '../output'), { recursive: true })
      fs.writeFileSync(outputPath, result.audioBuffer)
      console.log(`💾 音频已保存：${outputPath}`)
    }
  }
  
  console.log(`\n✅ 单句测试完成：${successCount}/${testCases.length} 成功`)
  return successCount === testCases.length
}

/**
 * 测试 2: 批量 TTS
 */
async function testBatch() {
  console.log('\n' + '='.repeat(60))
  console.log('测试 2: 批量 TTS')
  console.log('='.repeat(60))
  
  const config = loadVolcanoConfig()
  if (!config) {
    console.log('⏭️  跳过测试 (配置缺失)')
    return false
  }
  
  const tts = new SimpleTTSService(config)
  
  const batchRequests = [
    { text: '第一条消息', voice: 'BV001_streaming' },
    { text: '第二条消息', voice: 'BV001_streaming' },
    { text: '第三条消息', voice: 'BV001_streaming' },
    { text: '第四条消息', voice: 'BV001_streaming' },
    { text: '第五条消息', voice: 'BV001_streaming' },
  ]
  
  const startTime = Date.now()
  const results = await tts.synthesizeBatch(batchRequests)
  const endTime = Date.now()
  
  const successCount = results.filter(r => r.success).length
  const totalTime = ((endTime - startTime) / 1000).toFixed(2)
  
  console.log(`\n📊 批量测试结果:`)
  console.log(`   总请求数：${batchRequests.length}`)
  console.log(`   成功数：${successCount}`)
  console.log(`   失败数：${batchRequests.length - successCount}`)
  console.log(`   总耗时：${totalTime}s`)
  console.log(`   平均耗时：${(totalTime / batchRequests.length).toFixed(2)}s/请求`)
  
  return successCount === batchRequests.length
}

/**
 * 测试 3: 队列管理
 */
async function testQueue() {
  console.log('\n' + '='.repeat(60))
  console.log('测试 3: 队列管理')
  console.log('='.repeat(60))
  
  const config = loadVolcanoConfig()
  if (!config) {
    console.log('⏭️  跳过测试 (配置缺失)')
    return false
  }
  
  const tts = new SimpleTTSService(config)
  
  console.log('\n📝 步骤 1: 添加 3 个请求到队列')
  const promises = []
  
  promises.push(tts.enqueue('队列消息 1'))
  promises.push(tts.enqueue('队列消息 2'))
  promises.push(tts.enqueue('队列消息 3'))
  
  console.log(`   当前队列长度：${tts.getQueueLength()}`)
  
  console.log('\n⏳ 等待队列处理完成...')
  const results = await Promise.allSettled(promises)
  
  const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length
  console.log(`\n✅ 队列处理完成：${successCount}/3 成功`)
  
  console.log('\n📝 步骤 2: 测试清空队列')
  tts.enqueue('消息 A')
  tts.enqueue('消息 B')
  tts.enqueue('消息 C')
  console.log(`   添加后队列长度：${tts.getQueueLength()}`)
  
  tts.clearQueue()
  console.log(`   清空后队列长度：${tts.getQueueLength()}`)
  
  return true
}

/**
 * 测试 4: 配置缺失处理
 */
async function testConfigMissing() {
  console.log('\n' + '='.repeat(60))
  console.log('测试 4: 配置缺失处理')
  console.log('='.repeat(60))
  
  // 临时重命名配置文件
  const configPath = join(__dirname, '../../../ai-companion/config/volcengine.json')
  const backupPath = configPath + '.backup'
  
  try {
    console.log('\n📝 步骤 1: 模拟配置文件不存在')
    if (fs.existsSync(configPath)) {
      fs.renameSync(configPath, backupPath)
    }
    
    const config = loadVolcanoConfig()
    if (config === null) {
      console.log('✅ 正确检测到配置缺失')
    } else {
      console.log('❌ 未检测到配置缺失')
      return false
    }
    
    console.log('\n📝 步骤 2: 恢复配置文件')
    if (fs.existsSync(backupPath)) {
      fs.renameSync(backupPath, configPath)
      console.log('✅ 配置文件已恢复')
    }
    
    return true
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    // 确保恢复配置文件
    if (fs.existsSync(backupPath)) {
      fs.renameSync(backupPath, configPath)
    }
    return false
  }
}

// ============ 主函数 ============

async function main() {
  console.log('🎤 TTS 测试脚本')
  console.log('配置路径：ai-companion/config/volcengine.json')
  console.log('输出目录：skills/volcano-voice/test/output/')
  
  const testMode = process.argv[2] || 'all'
  
  const tests = {
    single: testSingleSentence,
    batch: testBatch,
    queue: testQueue,
    config: testConfigMissing,
    all: async () => {
      const results = []
      results.push(await testSingleSentence())
      results.push(await testBatch())
      results.push(await testQueue())
      results.push(await testConfigMissing())
      return results.every(r => r)
    },
  }
  
  const testFn = tests[testMode]
  if (!testFn) {
    console.error('❌ 未知测试模式:', testMode)
    console.error('可用模式：single, batch, queue, config, all')
    process.exit(1)
  }
  
  try {
    const success = await testFn()
    
    console.log('\n' + '='.repeat(60))
    if (success) {
      console.log('🎉 所有测试通过!')
    } else {
      console.log('⚠️  部分测试失败')
    }
    console.log('='.repeat(60))
    
    process.exit(success ? 0 : 1)
  } catch (error) {
    console.error('\n❌ 测试执行失败:', error)
    process.exit(1)
  }
}

main()
