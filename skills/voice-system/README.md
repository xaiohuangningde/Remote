# Voice System - 基于 Airi 官方实现

> 实时语音交互系统 - 使用 Airi 官方核心代码
> 
> 来源：https://github.com/proj-airi/webai-example-realtime-voice-chat

## 🎯 特性

- 🎤 **VAD 语音检测** - 基于 Silero VAD (HuggingFace Transformers)
- 🗣️ **ASR 语音识别** - 支持 Whisper API
- 💬 **LLM 对话** - 支持 OpenRouter / GPT-4o
- 🔊 **TTS 语音合成** - 支持 UnSpeech / Qwen3-TTS
- ⚡ **实时打断** - 说话时可打断 TTS 播放
- 📦 **开箱即用** - 完整的前端演示应用

## 📦 安装

```bash
cd skills/voice-system
pnpm install
```

## 🚀 快速开始

### 方式 1: 使用演示应用

```bash
pnpm dev
```

访问 http://localhost:5173

### 方式 2: 在代码中使用

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
    model: '',
    voice: 'Vivian',
  },
})

// 监听事件
system.on('speech-start', () => {
  console.log('🎤 开始说话')
})

system.on('speech-ready', ({ buffer, duration }) => {
  console.log(`📼 语音片段就绪，时长：${duration}ms`)
  // 这里可以手动处理 ASR/LLM/TTS 流程
})

// 初始化并启动
await system.init()
await system.start()
```

## ⚙️ 配置

### VAD 配置

```typescript
{
  sampleRate: 16000,              // 采样率
  speechThreshold: 0.3,           // 语音检测阈值
  exitThreshold: 0.1,             // 退出语音状态阈值
  minSilenceDurationMs: 400,      // 最小静音时长
  speechPadMs: 80,                // 语音前后填充
  minSpeechDurationMs: 250,       // 最小语音时长
  maxBufferDuration: 30,          // 最大缓冲时长 (秒)
  newBufferSize: 512,             // 输入缓冲区大小
}
```

### ASR 配置

```typescript
{
  baseURL: 'http://localhost:8000/v1/',  // ASR API 地址
  apiKey: '',                             // API Key
  model: 'large-v3-turbo',                // Whisper 模型
}
```

### LLM 配置

```typescript
{
  baseURL: 'https://openrouter.ai/api/v1/',
  apiKey: '',
  model: 'gpt-4o-mini',
}
```

### TTS 配置

```typescript
{
  baseURL: 'https://unspeech.ayaka.io/v1/',
  apiKey: '',
  model: '',          // TTS 模型
  voice: 'Vivian',    // 音色
}
```

## 🎭 事件系统

```typescript
// 语音开始
system.on('speech-start', () => {
  console.log('检测到说话开始')
})

// 语音结束
system.on('speech-end', () => {
  console.log('检测到说话结束')
})

// 语音片段就绪（可开始 ASR）
system.on('speech-ready', ({ buffer, duration }) => {
  console.log(`语音片段：${duration}ms`)
  // buffer: Float32Array 音频数据
})

// 状态更新
system.on('status', ({ type, message }) => {
  console.log(`状态：${type} - ${message}`)
})

// 错误
system.on('error', (error) => {
  console.error('错误:', error)
})
```

## 📊 完整流程

```
1. 用户说话 → VAD 检测 (Silero)
   ↓
2. 语音结束 → speech-ready 事件
   ↓
3. ASR 转录 → 文本
   ↓
4. LLM 生成 → 回复文本
   ↓
5. TTS 合成 → 音频播放
   ↓
6. 播放中用户说话 → 自动打断
```

## 🛠️ 本地部署服务

### ASR (Whisper)

使用 [Speaches](https://github.com/speaches-ai/speaches):

```bash
docker run -p 8000:8000 ghcr.io/speaches-ai/speaches:latest
```

### TTS (Qwen3-TTS)

使用 [UnSpeech](https://github.com/moeru-ai/unspeech):

```bash
docker run -p 8080:8080 ghcr.io/moeru-ai/unspeech:latest
```

## 📁 项目结构

```
skills/voice-system/
├── src/
│   ├── libs/
│   │   └── vad/
│   │       ├── vad.ts              # VAD 核心 (Airi 官方)
│   │       ├── manager.ts          # 音频管理器
│   │       ├── process.worklet.ts  # Audio Worklet
│   │       └── wav.ts              # WAV 编码
│   ├── composables/
│   │   └── audio-context.ts        # AudioContext
│   └── index.ts                    # 统一入口
├── package.json
└── README.md
```

## 🎨 演示应用

Airi 官方提供了完整的演示应用：

- [VAD 演示](https://proj-airi-apps-vad.netlify.app)
- [VAD + ASR](https://proj-airi-apps-vad-asr.netlify.app)
- [VAD + ASR + LLM](https://proj-airi-apps-vad-asr-chat.netlify.app)
- [VAD + ASR + LLM + TTS](https://proj-airi-apps-vad-asr-chat-tts.netlify.app)

## 🔧 依赖

- **@huggingface/transformers** - Silero VAD 模型
- **@xsai/generate-transcription** - ASR 客户端
- **@xsai/stream-text** - LLM 流式对话
- **@xsai/generate-speech** - TTS 客户端
- **@vueuse/core** - Vue 工具函数
- **vue** - 前端框架 (演示应用)

## 📝 说明

本项目直接使用了 Airi 官方的核心代码，主要修改：

1. ✅ 简化了配置接口
2. ✅ 添加了中文注释
3. ✅ 整合为统一的 VoiceSystem 类
4. ✅ 保留了所有底层组件的直接访问能力

## 🔗 相关链接

- **Airi 官方仓库**: https://github.com/proj-airi/webai-example-realtime-voice-chat
- **Project AIRI**: https://github.com/moeru-ai/airi
- **UnSpeech**: https://github.com/moeru-ai/unspeech
- **Speaches**: https://github.com/speaches-ai/speaches

---

**创建者**: 小黄 🐤  
**基于**: Airi 官方实现  
**版本**: v1.0.0  
**许可证**: MIT
