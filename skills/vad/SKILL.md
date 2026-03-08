# VAD Skill

> Voice Activity Detection - 语音打断检测

## 使用方式

```typescript
import { createVADListener } from 'skills/vad/src/index.ts'

// 创建监听器
const vad = createVADListener(
  () => console.log('用户开始说话'),
  () => console.log('用户停止说话')
)

await vad.init()

// 处理麦克风音频流
microphone.on('data', (chunk) => {
  vad.processAudio(chunk)
})
```

## 整合到 TTS

```typescript
import { TTSService } from 'skills/volcano-voice/src/index.ts'

// 启用 VAD 打断
const tts = new TTSService(config, true) // true = 启用 VAD

// 连接麦克风
microphone.on('data', (chunk) => {
  tts.processAudio(chunk) // 自动检测并打断
})
```

## 依赖

- ONNX Runtime (GPU)
- Silero VAD 模型
