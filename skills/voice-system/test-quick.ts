#!/usr/bin/env node

/**
 * Voice System 快速测试脚本
 * 验证代码结构和基本功能
 */

console.log('🔍 Voice System 快速测试\n')

// 测试 1: 导入模块
console.log('测试 1: 导入模块...')
try {
  const { VoiceSystem, createVoiceSystem, createVAD, createASR, createTTS, createLLM } = 
    await import('./src/index.ts')
  console.log('✅ 模块导入成功\n')
  
  // 测试 2: 创建实例
  console.log('测试 2: 创建实例...')
  const vad = createVAD({ threshold: 0.5 })
  const asr = createASR({ language: 'zh' })
  const tts = createTTS({ voice: 'Vivian' })
  const llm = createLLM({ provider: 'rule' })
  console.log('✅ 组件创建成功\n')
  
  // 测试 3: 初始化组件
  console.log('测试 3: 初始化组件...')
  await vad.init()
  console.log('  ✓ VAD 初始化')
  
  await asr.init()
  console.log('  ✓ ASR 初始化')
  
  await tts.init()
  console.log('  ✓ TTS 初始化')
  
  await llm.init()
  console.log('  ✓ LLM 初始化')
  console.log('✅ 所有组件初始化成功\n')
  
  // 测试 4: VAD 处理
  console.log('测试 4: VAD 音频处理...')
  const silentAudio = new Float32Array(16000).fill(0)
  const result = vad.processAudio(silentAudio)
  console.log(`  检测结果：isSpeech=${result.isSpeech}, probability=${result.probability.toFixed(3)}`)
  console.log('✅ VAD 处理成功\n')
  
  // 测试 5: LLM 回复
  console.log('测试 5: LLM 回复生成...')
  const testInputs = ['你好', '你叫什么名字', '谢谢', '再见']
  for (const input of testInputs) {
    const reply = await llm.generateReply(input)
    console.log(`  问：${input}`)
    console.log(`  答：${reply}`)
  }
  console.log('✅ LLM 回复成功\n')
  
  // 测试 6: 创建完整系统
  console.log('测试 6: 创建完整语音系统...')
  const voiceSystem = createVoiceSystem({
    vad: { threshold: 0.3 },
    interrupt: { enabled: false },
  })
  console.log('✅ 系统创建成功\n')
  
  // 测试 7: 系统状态
  console.log('测试 7: 检查系统状态...')
  const state = voiceSystem.getState()
  console.log(`  当前状态：${state.state}`)
  console.log(`  录音中：${state.isRecording}`)
  console.log(`  播放中：${state.isPlaying}`)
  console.log('✅ 状态检查成功\n')
  
  // 清理资源
  console.log('清理资源...')
  await vad.destroy()
  await asr.destroy()
  await tts.destroy()
  await llm.destroy()
  await voiceSystem.destroy()
  console.log('✅ 资源清理完成\n')
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ 所有测试通过！')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
} catch (error) {
  console.error('❌ 测试失败:', error)
  process.exit(1)
}
