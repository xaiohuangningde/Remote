/**
 * 真实 VAD 测试 - 使用 Silero VAD 模型
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('🎤 真实 VAD 测试 (Silero VAD)')
console.log('='.repeat(50))

async function main() {
  const testFile = join(__dirname, '../../whisper-local/output/test-speech.wav')
  
  try {
    readFileSync(testFile)
    console.log(`\n✅ 测试文件：${testFile}`)
  } catch {
    console.log(`❌ 测试文件不存在`)
    return
  }
  
  const ort = await import('onnxruntime-node')
  const modelPath = join(__dirname, '../models/silero_vad.onnx')
  
  console.log('\n📦 加载 VAD 模型...')
  const session = await ort.InferenceSession.create(modelPath)
  console.log('✅ 模型加载成功')
  
  // 显示模型输入输出
  console.log('\n📋 模型信息:')
  console.log(`  输入：${session.inputNames.join(', ')}`)
  console.log(`  输出：${session.outputNames.join(', ')}`)
  
  const audioBuffer = readFileSync(testFile)
  const float32Audio = wavToFloat32(audioBuffer)
  console.log(`\n📊 音频长度：${(float32Audio.length / 16000).toFixed(2)}s`)
  
  // Silero VAD 需要 512 采样点 per frame
  const sampleRate = 16000
  const frameSize = 512
  
  // 初始化状态 (根据 Silero VAD 文档)
  const state = new Float32Array(2 * 1 * 128)  // [num_layers, batch, hidden]
  const sr = new BigInt64Array([BigInt(sampleRate)])
  
  console.log('\n🔄 开始 VAD 推理...')
  const startTime = Date.now()
  
  let speechFrames = 0
  let totalFrames = 0
  
  for (let i = 0; i < float32Audio.length - frameSize; i += frameSize) {
    const chunk = float32Audio.slice(i, i + frameSize)
    
    const feeds = {
      input: new ort.Tensor('float32', chunk, [1, frameSize]),
      state: new ort.Tensor('float32', state, [2, 1, 128]),
      sr: new ort.Tensor('int64', sr, [1]),
    }
    
    const results = await session.run(feeds)
    const probability = results.output.data[0]
    
    totalFrames++
    if (probability > 0.01) {  // 降低阈值
      speechFrames++
      if (totalFrames <= 10 || totalFrames % 50 === 0) {
        console.log(`  [${(i / float32Audio.length * 100).toFixed(0)}%] 语音帧 | 概率：${probability.toFixed(4)}`)
      }
    }
    
    // 更新状态 (stateN 是新的状态输出)
    if (results.stateN) {
      state.set(results.stateN.data)
    }
    
    if (totalFrames % 50 === 0) {
      console.log(`  ${(i / float32Audio.length * 100).toFixed(0)}% | 语音：${speechFrames}/${totalFrames} | 概率：${probability.toFixed(3)}`)
    }
  }
  
  const totalTime = Date.now() - startTime
  const speechRatio = (speechFrames / totalFrames * 100).toFixed(1)
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 VAD 测试结果')
  console.log('='.repeat(50))
  console.log(`总帧数：${totalFrames}`)
  console.log(`语音帧：${speechFrames} (${speechRatio}%)`)
  console.log(`推理耗时：${totalTime}ms`)
  console.log(`平均推理：${(totalTime / totalFrames).toFixed(2)}ms/帧`)
  console.log(`音频时长：${(totalFrames * frameSize / sampleRate).toFixed(2)}s`)
  console.log(`实时率：${(totalTime / (totalFrames * frameSize / sampleRate * 1000)).toFixed(2)}x`)
  
  if (speechFrames > 0) {
    console.log('\n✅ VAD 测试成功 - 检测到语音!')
  } else {
    console.log('\n⚠️ 未检测到语音')
  }
}

function wavToFloat32(buffer) {
  const dataStart = 44
  const data = new Int16Array(buffer.buffer, dataStart)
  const float32 = new Float32Array(data.length)
  for (let i = 0; i < data.length; i++) {
    float32[i] = data[i] / 32768.0
  }
  return float32
}

main().catch(console.error)
