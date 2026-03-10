/**
 * ASR 测试脚本 - 语音识别测试
 * 
 * 功能：
 * 1. 本地 Whisper ASR 测试
 * 2. 火山引擎 ASR 测试
 * 3. 测试音频生成/准备
 * 4. 配置缺失处理
 * 
 * 使用方法：
 *   node asr-test.js [whisper|volcano|generate|all]
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

// ============ 配置加载 ============

/**
 * 加载火山引擎配置
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
      return null
    }
    
    // 验证 ASR 配置
    if (!config.asr?.appId) {
      console.error('❌ ASR 配置不完整 (appId 缺失)')
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

// ============ 测试音频生成 ============

/**
 * 生成测试音频文件 (使用系统 TTS 或静音音频)
 */
async function generateTestAudio() {
  console.log('\n' + '='.repeat(60))
  console.log('生成测试音频文件')
  console.log('='.repeat(60))
  
  const outputDir = join(__dirname, '../output')
  fs.mkdirSync(outputDir, { recursive: true })
  
  console.log('\n📝 方法 1: 尝试使用系统 TTS 生成测试音频')
  
  // Windows 上使用 PowerShell 的 SpeechSynthesizer
  if (process.platform === 'win32') {
    try {
      const psScript = `
        Add-Type -AssemblyName System.Speech
        $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
        $synth.SetOutputToWaveFile('${join(outputDir, 'test-speech.wav').replace(/\\/g, '\\\\')}')
        $synth.Speak('你好，这是语音识别测试音频。今天天气很好。')
        $synth.Dispose()
      `
      
      await execAsync(`powershell -Command "${psScript.replace(/\n/g, ';')}"`)
      console.log('✅ 使用系统 TTS 生成测试音频成功')
      console.log(`💾 文件位置：${join(outputDir, 'test-speech.wav')}`)
      return join(outputDir, 'test-speech.wav')
    } catch (error) {
      console.log('⚠️  系统 TTS 生成失败:', error.message)
    }
  }
  
  console.log('\n📝 方法 2: 生成静音 WAV 文件作为占位符')
  
  // 生成一个简单的静音 WAV 文件 (44.1kHz, 16bit, 单声道，5 秒)
  const sampleRate = 44100
  const duration = 5 // 秒
  const numSamples = sampleRate * duration
  const bufferSize = 44 + numSamples * 2 // WAV header + data
  
  const buffer = Buffer.alloc(bufferSize)
  
  // WAV header
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(bufferSize - 8, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16) // Subchunk1Size
  buffer.writeUInt16LE(1, 20) // AudioFormat (PCM)
  buffer.writeUInt16LE(1, 22) // NumChannels (mono)
  buffer.writeUInt32LE(sampleRate, 24) // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28) // ByteRate
  buffer.writeUInt16LE(2, 32) // BlockAlign
  buffer.writeUInt16LE(16, 34) // BitsPerSample
  buffer.write('data', 36)
  buffer.writeUInt32LE(numSamples * 2, 40) // Subchunk2Size
  
  // 填充静音数据 (已经是 0)
  
  const outputPath = join(outputDir, 'test-silence.wav')
  fs.writeFileSync(outputPath, buffer)
  
  console.log('✅ 静音 WAV 文件生成成功')
  console.log(`💾 文件位置：${outputPath}`)
  console.log('⚠️  注意：这是静音文件，仅用于测试流程')
  
  return outputPath
}

// ============ Whisper 本地 ASR 测试 ============

/**
 * 测试本地 Whisper
 */
async function testWhisperLocal(audioPath) {
  console.log('\n' + '='.repeat(60))
  console.log('测试 1: 本地 Whisper ASR')
  console.log('='.repeat(60))
  
  if (!fs.existsSync(audioPath)) {
    console.error('❌ 音频文件不存在:', audioPath)
    return false
  }
  
  console.log(`\n📝 音频文件：${audioPath}`)
  console.log(`📊 文件大小：${(fs.statSync(audioPath).size / 1024).toFixed(2)} KB`)
  
  // 检查 Whisper 是否安装
  try {
    console.log('\n🔍 检查 Whisper 安装...')
    const { stdout } = await execAsync('whisper --version')
    console.log('✅ Whisper 已安装:', stdout.trim())
  } catch (error) {
    console.error('❌ Whisper 未安装')
    console.error('💡 安装方法：pip install openai-whisper')
    return false
  }
  
  // 执行转录
  try {
    console.log('\n⏳ 开始转录 (使用 base 模型)...')
    const startTime = Date.now()
    
    const { stdout, stderr } = await execAsync(
      `whisper "${audioPath}" --model base --language zh --output_dir "${__dirname}" --output_format txt`
    )
    
    const endTime = Date.now()
    console.log(`✅ 转录完成，耗时：${((endTime - startTime) / 1000).toFixed(2)}s`)
    
    // 读取结果
    const txtPath = audioPath.replace(/\.(wav|mp3|flac)$/, '.txt')
    if (fs.existsSync(txtPath)) {
      const text = fs.readFileSync(txtPath, 'utf-8').trim()
      console.log(`\n📝 识别结果：${text || '(静音)'}`)
      
      // 清理临时文件
      const jsonPath = txtPath.replace('.txt', '.json')
      const srtPath = txtPath.replace('.txt', '.srt')
      const vttPath = txtPath.replace('.txt', '.vtt')
      
      ;[txtPath, jsonPath, srtPath, vttPath].forEach(path => {
        if (fs.existsSync(path)) {
          fs.unlinkSync(path)
          console.log(`🗑️ 清理临时文件：${path}`)
        }
      })
      
      return true
    } else {
      console.error('❌ 未找到转录结果文件')
      return false
    }
  } catch (error) {
    console.error('❌ 转录失败:', error.message)
    return false
  }
}

// ============ 火山引擎 ASR 测试 ============

/**
 * 测试火山引擎 ASR
 */
async function testVolcanoASR(audioPath) {
  console.log('\n' + '='.repeat(60))
  console.log('测试 2: 火山引擎 ASR')
  console.log('='.repeat(60))
  
  const config = loadVolcanoConfig()
  if (!config) {
    console.log('⏭️  跳过测试 (配置缺失)')
    return false
  }
  
  if (!fs.existsSync(audioPath)) {
    console.error('❌ 音频文件不存在:', audioPath)
    return false
  }
  
  console.log(`\n📝 音频文件：${audioPath}`)
  
  // 读取音频文件
  const audioBuffer = fs.readFileSync(audioPath)
  const audioBase64 = audioBuffer.toString('base64')
  
  // 火山引擎 ASR API
  const url = 'https://openspeech.bytedance.com/api/v1/stc'
  
  const body = {
    app: {
      appid: config.asr.appId,
      token: config.asr.accessToken || '',
      cluster: 'volcano_asr',
    },
    user: {
      uid: 'openclaw-test',
    },
    audio: {
      format: 'wav',
      rate: 16000,
      language: 'zh-CN',
      bits: 16,
      channel: 1,
      codec: 'raw',
    },
    request: {
      reqid: crypto.randomUUID(),
      show_utterances: false,
      sequence: 1,
    },
    binary: audioBase64,
  }
  
  try {
    console.log('\n⏳ 发送 ASR 请求...')
    const startTime = Date.now()
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    const endTime = Date.now()
    
    if (!response.ok) {
      throw new Error(`API 错误：${response.status} ${response.statusText}`)
    }
    
    const result = await response.json()
    
    console.log(`✅ 请求完成，耗时：${((endTime - startTime) / 1000).toFixed(2)}s`)
    console.log(`📊 响应码：${result.code}`)
    
    if (result.code !== 0) {
      console.error('❌ ASR API 返回错误:', result.message || result)
      return false
    }
    
    if (result.result && result.result.text) {
      console.log(`\n📝 识别结果：${result.result.text}`)
      return true
    } else {
      console.log('\n⚠️  未识别到文本 (可能是静音文件)')
      return true
    }
  } catch (error) {
    console.error('❌ ASR 请求失败:', error.message)
    return false
  }
}

// ============ 配置缺失测试 ============

/**
 * 测试配置缺失处理
 */
async function testConfigMissing() {
  console.log('\n' + '='.repeat(60))
  console.log('测试 3: 配置缺失处理')
  console.log('='.repeat(60))
  
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
    if (fs.existsSync(backupPath)) {
      fs.renameSync(backupPath, configPath)
    }
    return false
  }
}

// ============ 主函数 ============

async function main() {
  console.log('🎤 ASR 测试脚本')
  console.log('配置路径：ai-companion/config/volcengine.json')
  console.log('输出目录：skills/whisper-local/test/output/')
  
  const testMode = process.argv[2] || 'all'
  
  // 首先生成测试音频
  let audioPath
  try {
    audioPath = await generateTestAudio()
  } catch (error) {
    console.error('❌ 生成测试音频失败:', error)
    process.exit(1)
  }
  
  const tests = {
    whisper: () => testWhisperLocal(audioPath),
    volcano: () => testVolcanoASR(audioPath),
    generate: () => Promise.resolve(true), // 已经生成
    config: testConfigMissing,
    all: async () => {
      const results = []
      results.push(await testWhisperLocal(audioPath))
      results.push(await testVolcanoASR(audioPath))
      results.push(await testConfigMissing())
      return results.every(r => r)
    },
  }
  
  const testFn = tests[testMode]
  if (!testFn) {
    console.error('❌ 未知测试模式:', testMode)
    console.error('可用模式：whisper, volcano, generate, config, all')
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
