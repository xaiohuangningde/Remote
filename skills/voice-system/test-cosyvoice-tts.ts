/**
 * CosyVoice 3.0 TTS 测试脚本
 * 
 * 测试流式 TTS 功能
 */

import { createCosyVoiceTTS, DEFAULT_CONFIG } from './src/services/tts-cosyvoice'

async function main() {
  console.log('=' .repeat(70))
  console.log('  CosyVoice 3.0 TTS 测试')
  console.log('=' .repeat(70))
  
  const testText = '你好，这是 CosyVoice 3.0 流式语音合成测试。如果流式功能正常，你应该能很快听到第一个字，而不需要等待整个句子生成完成。'
  
  try {
    // 创建服务
    console.log('\n[1/3] 创建 TTS 服务...')
    const tts = createCosyVoiceTTS(DEFAULT_CONFIG)
    
    // 初始化
    console.log('[2/3] 初始化服务...')
    await tts.init()
    
    // 测试合成
    console.log('[3/3] 测试合成...')
    console.log(`文本：${testText}\n`)
    
    const result = await tts.synthesize(testText, { streaming: true })
    
    console.log('\n' + '=' .repeat(70))
    console.log('[SUCCESS] 测试完成!')
    console.log(`生成时间：${result.generationTime}ms`)
    console.log(`音频时长：${result.duration.toFixed(2)}s`)
    console.log(`首块延迟：${result.firstChunkLatency || 'N/A'}ms`)
    console.log(`采样率：${result.sampleRate}Hz`)
    console.log('=' .repeat(70))
    
    // 销毁服务
    await tts.destroy()
    
  } catch (error) {
    console.error('\n[FAIL] 测试失败:', error)
    process.exit(1)
  }
}

main()
