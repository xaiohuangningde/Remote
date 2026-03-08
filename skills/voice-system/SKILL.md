---
name: voice-system
description: 基于 Airi 官方实现的实时语音系统 - VAD + ASR + LLM + TTS
---

# Voice System Skill

> 基于 Airi 官方核心代码的实时语音交互系统
> 
> 来源：https://github.com/proj-airi/webai-example-realtime-voice-chat

## 🎯 特性

- 🎤 **VAD 语音检测** - Silero VAD (HuggingFace Transformers)
- 🗣️ **ASR 语音识别** - Whisper API 支持
- 💬 **LLM 对话** - OpenRouter / GPT-4o
- 🔊 **TTS 语音合成** - UnSpeech / Qwen3-TTS
- ⚡ **实时打断** - TTS 播放时可被打断
- 📦 **开箱即用** - 完整演示应用

## 📦 安装

```bash
cd skills/voice-system
pnpm install
```

## 🚀 使用

### 快速启动演示

```bash
pnpm dev
```

访问 http://localhost:5173

### 代码中使用

```typescript
import { createVoiceSystem } from 'skills/voice-system'

const system = createVoiceSystem({
  vad: {
    speechThreshold: 0.3,
    minSilenceDurationMs: 400,
  },
  asr: {
    baseURL: 'http://localhost:8000/v1/',
    apiKey: '',
    model: 'large-v3-turbo',
  },
  llm: {
    baseURL: 'https://openrouter.ai/api/v1/',
    apiKey: '',
    model: 'gpt-4o-mini',
  },
  tts: {
    baseURL: 'https://unspeech.ayaka.io/v1/',
    apiKey: '',
    voice: 'Vivian',
  },
})

// 监听事件
system.on('speech-start', () => console.log('开始说话'))
system.on('speech-ready', ({ buffer, duration }) => {
  console.log(`语音片段：${duration}ms`)
})

// 启动
await system.init()
await system.start()
```

## 📖 文档

详细文档：`skills/voice-system/README.md`

## 🎭 事件

```typescript
system.on('speech-start', () => {...})     // 语音开始
system.on('speech-end', () => {...})       // 语音结束
system.on('speech-ready', ({buffer, duration}) => {...})  // 语音片段就绪
system.on('status', ({type, message}) => {...})  // 状态更新
system.on('error', (error) => {...})       // 错误
```

## ⚙️ 配置

### VAD
- `speechThreshold`: 0.3 (检测阈值)
- `minSilenceDurationMs`: 400 (最小静音时长)

### ASR
- `baseURL`: Whisper API 地址
- `model`: `large-v3-turbo`

### LLM
- `baseURL`: OpenRouter API
- `model`: `gpt-4o-mini`

### TTS
- `baseURL`: UnSpeech API
- `voice`: `Vivian`

## 📊 架构

```
麦克风 → VAD (Silero) → ASR (Whisper) → LLM (GPT-4o) → TTS (UnSpeech) → 扬声器
```

## 🔧 依赖

- @huggingface/transformers (VAD)
- @xsai/generate-transcription (ASR)
- @xsai/stream-text (LLM)
- @xsai/generate-speech (TTS)

## 🌐 演示

- [VAD 演示](https://proj-airi-apps-vad.netlify.app)
- [VAD+ASR+LLM+TTS](https://proj-airi-apps-vad-asr-chat-tts.netlify.app)

---

**基于**: Airi 官方实现  
**版本**: v1.0.0  
**状态**: ✅ 生产就绪
