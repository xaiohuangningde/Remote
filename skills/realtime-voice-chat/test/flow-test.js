/**
 * 完整流程测试脚本 - VAD → ASR → LLM → TTS
 * 
 * 功能：
 * 1. 测试完整的语音对话流程
 * 2. 模拟用户语音输入
 * 3. 测试各环节的衔接
 * 4. 性能统计和日志记录
 * 
 * 使用方法：
 *   node flow-test.js [mock|real|all]
 * 
 * 依赖配置：
 *   ai-companion/config/volcengine.json
 */

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import * as fs from 'node:fs'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const execAsync = promisify(exec)

// ============ 性能统计 ============

class PerformanceStats {
  constructor() {
    this.timings = new Map()
    this.results = []
  }
  
  start(stage) {
    this.timings.set(stage, Date.now())
  }
  
  end(stage) {
    const start = this.timings.get(stage)
    if (!start) return null
    
    const duration = Date.now() - start
    this.results.push({ stage, duration, timestamp: new Date().toISOString() })
    this.timings.delete(stage)
    return duration
  }
  
  report() {
    console.log('\n' + '='.repeat(60))
    console.log('📊 性能统计报告')
    console.log('='.repeat(60))
    
    let total = 0
    for (const result of this.results) {
      console.log(`   ${result.stage.padEnd(20)} ${result.duration}ms`)
      total += result.duration
    }
    
    console.log('-'.repeat(60))
    console.log(`   ${'总耗时'.padEnd(20)} ${total}ms (${(total / 1000).toFixed(2)}s)`)
    console.log('='.repeat(60))
    
    return this.results
  }
}

// ============ 配置加载 ============

function loadVolcanoConfig() {
  const configPath = join(__dirname, '../../../ai-companion/config/volcengine.json')
  
  if (!fs.existsSync(configPath)) {
    console.error('❌ 配置文件不存在:', configPath)
    return null
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    
    const required = ['accessKeyId', 'accessKeySecret']
    const missing = required.filter(key => !config[key] || config[key].trim() === '')
    
    if (missing.length > 0) {
      console.error('❌ 配置缺失:', missing.join(', '))
      return null
    }
    
    return config
  } catch (error) {
    console.error('❌ 配置文件解析失败:', error.message)
    return null
  }
}

// ============ VAD 模拟 ============

/**
 * 模拟 VAD 语音检测
 */
async function simulateVAD() {
  console.log('\n🎯 [VAD] 语音活动检测')
  console.log('   等待用户说话...')
  
  // 模拟检测延迟
  await new Promise(resolve => setTimeout(resolve, 500))
  
  console.log('   👄 检测到语音开始 (SPEECH START)')
  
  // 模拟语音录制
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  console.log('   🤐 检测到语音结束 (SPEECH END)')
  
  return {
    detected: true,
    duration: 2000, // ms
    audioData: Buffer.alloc(0), // 模拟音频数据
  }
}

// ============ ASR 处理 ============

/**
 * 模拟 ASR 语音识别
 */
async function simulateASR(vadResult, config) {
  console.log('\n🎯 [ASR] 语音识别')
  
  // 模拟识别延迟
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // 模拟识别结果
  const mockTexts = [
    '今天天气怎么样？',
    '帮我查一下明天的天气',
    '现在几点了？',
    '讲个笑话听听',
  ]
  
  const recognizedText = mockTexts[Math.floor(Math.random() * mockTexts.length)]
  
  console.log(`   📝 识别结果：${recognizedText}`)
  
  return {
    text: recognizedText,
    confidence: 0.95,
    language: 'zh-CN',
  }
}

// ============ LLM 处理 ============

/**
 * 模拟 LLM 回复生成
 */
async function simulateLLM(asrResult, config) {
  console.log('\n🎯 [LLM] 大模型回复生成')
  
  // 模拟处理延迟
  await new Promise(resolve => setTimeout(resolve, 800))
  
  // 根据用户输入生成回复
  const responses = {
    '天气': '今天天气很好，适合出去散步哦！',
    '时间': '现在是北京时间，具体时间请查看您的设备。',
    '笑话': '为什么程序员总是分不清万圣节和圣诞节？因为 Oct 31 == Dec 25！',
    'default': '我明白了，这是一个很好的问题！',
  }
  
  const userText = asrResult.text
  let reply = responses.default
  
  for (const [key, value] of Object.entries(responses)) {
    if (userText.includes(key)) {
      reply = value
      break
    }
  }
  
  console.log(`   💬 AI 回复：${reply}`)
  
  return {
    text: reply,
    tokens: reply.length,
    model: 'qwen-plus',
  }
}

// ============ TTS 处理 ============

/**
 * 模拟 TTS 语音合成
 */
async function simulateTTS(llmResult, config) {
  console.log('\n🎯 [TTS] 语音合成')
  
  // 模拟合成延迟
  await new Promise(resolve => setTimeout(resolve, 600))
  
  console.log(`   🔊 合成完成，时长：${(llmResult.text.length * 50).toFixed(0)}ms`)
  
  return {
    audioBuffer: Buffer.alloc(0), // 模拟音频
    duration: llmResult.text.length * 0.05, // 估算时长 (秒)
    voice: 'BV001_streaming',
  }
}

// ============ 真实流程 ============

/**
 * 真实的 VAD 检测 (需要麦克风)
 */
async function realVAD() {
  console.log('\n🎯 [VAD] 真实语音检测')
  console.log('   ⚠️  需要麦克风设备')
  
  // TODO: 实现真实的 VAD 检测
  // 可以参考 skills/vad/src/index.ts
  
  console.log('   ⏭️  跳过 (需要实现)')
  return simulateVAD()
}

/**
 * 真实的 Whisper ASR
 */
async function realASR(audioPath, config) {
  console.log('\n🎯 [ASR] 真实语音识别')
  
  try {
    const { stdout } = await execAsync('whisper --version')
    console.log('   ✅ Whisper 已安装')
  } catch (error) {
    console.log('   ⚠️  Whisper 未安装，使用模拟')
    return simulateASR({ audioData: Buffer.alloc(0) }, config)
  }
  
  // TODO: 实现真实的 Whisper 调用
  // 可以参考 skills/whisper-local/src/index.ts
  
  console.log('   ⏭️  跳过 (需要实现)')
  return simulateASR({ audioData: Buffer.alloc(0) }, config)
}

/**
 * 真实的 LLM 调用
 */
async function realLLM(text, config) {
  console.log('\n🎯 [LLM] 真实大模型调用')
  
  if (!config.llm?.apiKey || !config.llm?.endpointId) {
    console.log('   ⚠️  LLM 配置缺失，使用模拟')
    return simulateLLM({ text }, config)
  }
  
  // TODO: 实现真实的 LLM 调用
  // 使用火山引擎豆包 API
  
  console.log('   ⏭️  跳过 (需要实现)')
  return simulateLLM({ text }, config)
}

/**
 * 真实的 TTS 调用
 */
async function realTTS(text, config) {
  console.log('\n🎯 [TTS] 真实语音合成')
  
  if (!config.tts?.appId || !config.tts?.accessToken) {
    console.log('   ⚠️  TTS 配置缺失，使用模拟')
    return simulateTTS({ text }, config)
  }
  
  // TODO: 实现真实的 TTS 调用
  // 可以参考 skills/volcano-voice/src/index.ts
  
  console.log('   ⏭️  跳过 (需要实现)')
  return simulateTTS({ text }, config)
}

// ============ 完整流程测试 ============

/**
 * 执行完整流程测试
 */
async function runFullFlow(mode = 'mock') {
  const stats = new PerformanceStats()
  const config = loadVolcanoConfig()
  
  if (!config) {
    console.log('⚠️  配置缺失，将使用模拟模式')
    mode = 'mock'
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('🚀 完整语音流程测试')
  console.log(`模式：${mode === 'mock' ? '模拟' : '真实'}`)
  console.log('='.repeat(60))
  
  try {
    // Step 1: VAD
    stats.start('VAD')
    const vadResult = mode === 'mock' 
      ? await simulateVAD()
      : await realVAD()
    stats.end('VAD')
    
    if (!vadResult.detected) {
      console.log('\n⚠️  未检测到语音，流程终止')
      return false
    }
    
    // Step 2: ASR
    stats.start('ASR')
    const asrResult = mode === 'mock'
      ? await simulateASR(vadResult, config)
      : await realASR(vadResult.audioData, config)
    stats.end('ASR')
    
    if (!asrResult.text) {
      console.log('\n⚠️  未识别到文本，流程终止')
      return false
    }
    
    // Step 3: LLM
    stats.start('LLM')
    const llmResult = mode === 'mock'
      ? await simulateLLM(asrResult, config)
      : await realLLM(asrResult.text, config)
    stats.end('LLM')
    
    if (!llmResult.text) {
      console.log('\n⚠️  LLM 未生成回复，流程终止')
      return false
    }
    
    // Step 4: TTS
    stats.start('TTS')
    const ttsResult = mode === 'mock'
      ? await simulateTTS(llmResult, config)
      : await realTTS(llmResult.text, config)
    stats.end('TTS')
    
    // 输出统计
    stats.report()
    
    console.log('\n✅ 完整流程测试完成!')
    return true
  } catch (error) {
    console.error('\n❌ 流程执行失败:', error.message)
    return false
  }
}

// ============ 多轮对话测试 ============

/**
 * 测试多轮对话
 */
async function testMultiTurnConversation() {
  console.log('\n' + '='.repeat(60))
  console.log('🔄 多轮对话测试')
  console.log('='.repeat(60))
  
  const conversation = [
    '你好',
    '今天天气怎么样？',
    '帮我查一下北京的天气',
    '谢谢',
    '再见',
  ]
  
  const config = loadVolcanoConfig()
  
  for (let i = 0; i < conversation.length; i++) {
    console.log(`\n[第 ${i + 1} 轮]`)
    
    // 模拟用户输入
    const vadResult = { detected: true, duration: 1000, audioData: Buffer.alloc(0) }
    const asrResult = { text: conversation[i], confidence: 0.95 }
    
    // 生成回复
    const llmResult = await simulateLLM(asrResult, config)
    const ttsResult = await simulateTTS(llmResult, config)
    
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  
  console.log('\n✅ 多轮对话测试完成!')
  return true
}

// ============ 配置缺失测试 ============

async function testConfigMissing() {
  console.log('\n' + '='.repeat(60))
  console.log('🔧 配置缺失处理测试')
  console.log('='.repeat(60))
  
  const configPath = join(__dirname, '../../../ai-companion/config/volcengine.json')
  const backupPath = configPath + '.backup'
  
  try {
    console.log('\n📝 模拟配置缺失...')
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
    
    console.log('\n📝 恢复配置...')
    if (fs.existsSync(backupPath)) {
      fs.renameSync(backupPath, configPath)
      console.log('✅ 配置已恢复')
    }
    
    return true
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    if (fs.existsSync(backupPath)) {
      fs.renameSync(backupPath, configPath)
    }
    return false
  }
}

// ============ 主函数 ============

async function main() {
  console.log('🎤 完整流程测试脚本')
  console.log('配置路径：ai-companion/config/volcengine.json')
  console.log('输出目录：skills/realtime-voice-chat/test/output/')
  
  const testMode = process.argv[2] || 'all'
  
  const tests = {
    mock: () => runFullFlow('mock'),
    real: () => runFullFlow('real'),
    multi: testMultiTurnConversation,
    config: testConfigMissing,
    all: async () => {
      const results = []
      results.push(await runFullFlow('mock'))
      results.push(await testMultiTurnConversation())
      results.push(await testConfigMissing())
      return results.every(r => r)
    },
  }
  
  const testFn = tests[testMode]
  if (!testFn) {
    console.error('❌ 未知测试模式:', testMode)
    console.error('可用模式：mock, real, multi, config, all')
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
