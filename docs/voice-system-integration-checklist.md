# 语音系统整合执行清单

**创建日期**: 2026-03-06  
**审查标准**: 以 Airi 代码为基准  
**优先级**: 按依赖关系排序

---

## 🎯 最终目标

采用 Airi 项目的架构作为标准，删除冗余代码，整合为统一的工作流驱动语音系统。

---

## 📁 阶段 1: 备份与清理（第 1 天）

### 1.1 备份现有代码

```bash
# 创建备份目录
mkdir -p C:\Users\12132\.openclaw\workspace\backup\voice-old

# 备份现有语音模块
cp -r skills/volcano-voice backup/voice-old/
cp -r skills/stream-queue backup/voice-old/
cp -r skills/vad backup/voice-old/
cp -r skills/voice-clone backup/voice-old/
cp -r skills/realtime-voice-chat backup/voice-old/
cp -r skills/voice-output backup/voice-old/
```

**状态**: ⏳ 待执行  
**负责人**: @li  
**预计时间**: 30 分钟

---

### 1.2 删除冗余代码

```bash
# 删除已备份的冗余模块
rm -rf skills/volcano-voice/src
rm -rf skills/stream-queue
rm -rf skills/vad/src
rm -rf skills/realtime-voice-chat
rm -rf skills/voice-output

# 保留（但需要简化）
# - skills/voice-clone (本地 TTS 备选)
# - skills/voice (整合入口，需要重写)
```

**状态**: ⏳ 待执行  
**负责人**: @li  
**预计时间**: 15 分钟

---

### 1.3 清理依赖

```bash
# 编辑 package.json，删除不需要的依赖
# 删除:
# - onnxruntime-node (Airi 使用 Transformers.js)
# - 其他火山引擎相关依赖

# 安装 Airi 依赖
pnpm add @huggingface/transformers @xsai/generate-speech @xsai/generate-transcription @xsai/stream-text @llama-flow/core
```

**状态**: ⏳ 待执行  
**负责人**: @li  
**预计时间**: 30 分钟

---

## 📁 阶段 2: 采用 Airi VAD（第 2 天）

### 2.1 复制 Airi VAD 代码

```bash
# 创建新 VAD 目录
mkdir -p skills/vad-new/src/libs/vad

# 复制 Airi VAD 文件
cp tmp/airi-voice-ref/apps/vad-asr-chat-tts/src/libs/vad/vad.ts skills/vad-new/src/libs/vad/
cp tmp/airi-voice-ref/apps/vad-asr-chat-tts/src/libs/vad/manager.ts skills/vad-new/src/libs/vad/
cp tmp/airi-voice-ref/apps/vad-asr-chat-tts/src/libs/vad/process.worklet.ts skills/vad-new/src/libs/vad/
cp tmp/airi-voice-ref/apps/vad-asr-chat-tts/src/libs/vad/wav.ts skills/vad-new/src/libs/vad/
```

**状态**: ⏳ 待执行  
**负责人**: @li  
**预计时间**: 15 分钟

---

### 2.2 测试 VAD

```typescript
// 创建测试文件 skills/vad-new/test/vad.test.ts
import { describe, it, expect } from 'vitest'
import { createVAD } from '../src/libs/vad/vad'

describe('VAD', () => {
  it('should initialize', async () => {
    const vad = await createVAD({
      sampleRate: 16000,
      speechThreshold: 0.3,
      minSilenceDurationMs: 400,
    })
    expect(vad).toBeDefined()
  })
  
  it('should detect speech', async () => {
    // TODO: 添加实际测试
  })
})
```

**状态**: ⏳ 待执行  
**负责人**: @li  
**预计时间**: 1 小时

---

### 2.3 更新 SKILL.md

```markdown
---
name: vad
description: Voice Activity Detection (基于 Airi 实现)
---

# VAD - 语音活动检测

> 基于 [@proj-airi/webai-realtime-voice-chat](https://github.com/proj-airi/webai-example-realtime-voice-chat)

## 功能

- 🎤 实时语音检测
- 🔇 静音检测
- 📦 完整语音片段输出（带前后填充）

## 使用

```typescript
import { createVAD } from 'skills/vad-new/src/libs/vad/vad'
import { VADAudioManager } from 'skills/vad-new/src/libs/vad/manager'
import workletUrl from 'skills/vad-new/src/libs/vad/process.worklet?worker&url'

// 创建 VAD
const vad = await createVAD({
  sampleRate: 16000,
  speechThreshold: 0.3,
  exitThreshold: 0.1,
  minSilenceDurationMs: 400,
})

// 监听事件
vad.on('speech-start', () => console.log('开始说话'))
vad.on('speech-end', () => console.log('说话结束'))
vad.on('speech-ready', ({ buffer, duration }) => {
  console.log(`完整语音片段：${duration}ms`)
})

// 音频管理器
const manager = new VADAudioManager(vad)
await manager.initialize(workletUrl)
await manager.startMicrophone()
```

## 配置

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `sampleRate` | 16000 | 采样率 |
| `speechThreshold` | 0.3 | 语音检测阈值 |
| `exitThreshold` | 0.1 | 退出语音状态阈值 |
| `minSilenceDurationMs` | 400 | 最小静音时长 |
| `speechPadMs` | 80 | 前后填充时长 |
| `minSpeechDurationMs` | 250 | 最小语音时长 |

---

**基于**: Airi VAD  
**许可**: MIT
```

**状态**: ⏳ 待执行  
**负责人**: @li  
**预计时间**: 30 分钟

---

## 📁 阶段 3: 采用 xsAI 统一接口（第 3-4 天）

### 3.1 安装 xsAI

```bash
pnpm add @xsai/generate-speech @xsai/generate-transcription @xsai/stream-text @xsai/shared-chat
```

**状态**: ⏳ 待执行  
**负责人**: @li  
**预计时间**: 10 分钟

---

### 3.2 配置 API

```typescript
// 创建配置文件 skills/voice/config.ts
export interface VoiceConfig {
  // LLM
  llmBaseURL: string
  llmAPIKey: string
  llmModel: string
  
  // ASR
  asrBaseURL: string
  asrAPIKey: string
  asrModel: string
  
  // TTS
  ttsBaseURL: string
  ttsAPIKey: string
  ttsModel: string
  ttsVoice: string
}

// 默认配置（使用 UnSpeech + OpenRouter）
export const defaultConfig: VoiceConfig = {
  llmBaseURL: 'https://openrouter.ai/api/v1/',
  llmAPIKey: process.env.OPENROUTER_API_KEY || '',
  llmModel: 'gpt-4o-mini',
  
  asrBaseURL: 'http://localhost:8000/v1/',  // 本地 Whisper
  asrAPIKey: '',
  asrModel: 'whisper-large-v3-turbo',
  
  ttsBaseURL: 'https://unspeech.ayaka.io/v1/',
  ttsAPIKey: process.env.UNSPEECH_API_KEY || '',
  ttsModel: '',
  ttsVoice: '',
}
```

**状态**: ⏳ 待执行  
**负责人**: @li  
**预计时间**: 30 分钟

---

### 3.3 创建统一 Voice API

```typescript
// skills/voice/src/index.ts
import { generateSpeech } from '@xsai/generate-speech'
import { generateTranscription } from '@xsai/generate-transcription'
import { streamText } from '@xsai/stream-text'
import type { Message } from '@xsai/shared-chat'

import { defaultConfig, type VoiceConfig } from './config'

export class VoiceService {
  private config: VoiceConfig
  
  constructor(config: Partial<VoiceConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
  }
  
  // TTS
  async speak(text: string): Promise<AudioBuffer> {
    const res = await generateSpeech({
      baseURL: this.config.ttsBaseURL,
      apiKey: this.config.ttsAPIKey,
      model: this.config.ttsModel,
      voice: this.config.ttsVoice,
      input: text,
    })
    
    const audioContext = new AudioContext()
    return audioContext.decodeAudioData(res)
  }
  
  // ASR
  async listen(audioBlob: Blob): Promise<string> {
    const res = await generateTranscription({
      baseURL: this.config.asrBaseURL,
      apiKey: this.config.asrAPIKey,
      model: this.config.asrModel,
      file: audioBlob,
    })
    
    return res.text
  }
  
  // LLM
  async chat(messages: Message[]): Promise<AsyncGenerator<string>> {
    const res = await streamText({
      baseURL: this.config.llmBaseURL,
      apiKey: this.config.llmAPIKey,
      model: this.config.llmModel,
      messages,
    })
    
    return res.textStream
  }
}

export const voice = new VoiceService()
```

**状态**: ⏳ 待执行  
**负责人**: @li  
**预计时间**: 1 小时

---

### 3.4 更新 SKILL.md

```markdown
---
name: voice
description: 统一语音服务 (TTS/ASR/LLM)
---

# Voice - 统一语音服务

> 基于 xsAI + Airi 架构

## 功能

- 🗣️ TTS (文字转语音)
- 👂 ASR (语音转文字)
- 💬 LLM (智能对话)

## 配置

```bash
# 环境变量
export OPENROUTER_API_KEY=your_key
export UNSPEECH_API_KEY=your_key
```

## 使用

```typescript
import { voice } from 'skills/voice'

// TTS
const audio = await voice.speak('你好')
play(audio)

// ASR
const text = await voice.listen(audioBlob)
console.log('你说的是:', text)

// LLM
const stream = await voice.chat([
  { role: 'user', content: '你好' }
])

for await (const token of stream) {
  process.stdout.write(token)
}
```
```

**状态**: ⏳ 待执行  
**负责人**: @li  
**预计时间**: 30 分钟

---

## 📁 阶段 4: 引入工作流引擎（第 5-6 天）

### 4.1 安装 llama-flow

```bash
pnpm add @llama-flow/core
```

**状态**: ⏳ 待执行  
**负责人**: @li  
**预计时间**: 10 分钟

---

### 4.2 创建工作流

```typescript
// skills/voice/src/workflow.ts
import { createWorkflow, getContext, workflowEvent } from '@llama-flow/core'
import { voice } from './index'

// 定义事件
const inputSpeechEvent = workflowEvent<{ buffer: Float32Array, duration: number }, 'input-speech'>()
const transcriptionEvent = workflowEvent<string, 'transcription'>()
const llmTokenEvent = workflowEvent<string, 'chat-completions-token'>()
const sentenceReadyEvent = workflowEvent<{ text: string, index: number }, 'sentence-ready'>()
const ttsOutputEvent = workflowEvent<{ buffer: AudioBuffer, index: number }, 'tts-output'>()

// 创建工作流
export const voiceWorkflow = createWorkflow()

// 处理语音输入
voiceWorkflow.handle([inputSpeechEvent], async (event) => {
  const context = getContext()
  
  // 转写
  const wavBuffer = toWav(event.data.buffer, 16000)
  const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' })
  
  const text = await voice.listen(audioBlob)
  context.sendEvent(transcriptionEvent.with(text))
})

// 处理转写文本
voiceWorkflow.handle([transcriptionEvent], async (event) => {
  const context = getContext()
  
  // LLM 对话
  const stream = await voice.chat([
    { role: 'user', content: event.data }
  ])
  
  for await (const token of stream) {
    context.sendEvent(llmTokenEvent.with(token))
  }
})

// 处理 LLM token（按句子分割）
voiceWorkflow.handle([llmTokenEvent], async (event) => {
  // TODO: 实现句子分割逻辑
})

// 处理句子（TTS）
voiceWorkflow.handle([sentenceReadyEvent], async (event) => {
  const context = getContext()
  
  const audio = await voice.speak(event.data.text)
  context.sendEvent(ttsOutputEvent.with({ buffer: audio, index: event.data.index }))
})
```

**状态**: ⏳ 待执行  
**负责人**: @li  
**预计时间**: 2 小时

---

### 4.3 创建音频播放器

```typescript
// skills/voice/src/playback.ts
export class AudioPlaybackManager {
  private audioContext: AudioContext
  private queue: AudioBuffer[] = []
  private pendingBuffers: Map<number, AudioBuffer> = new Map()
  private nextIndex: number = 0
  private isPlaying: boolean = false
  
  constructor() {
    this.audioContext = new AudioContext({ sampleRate: 16000 })
  }
  
  enqueue(buffer: AudioBuffer, index: number): void {
    this.pendingBuffers.set(index, buffer)
    
    // 按顺序入队
    while (this.pendingBuffers.has(this.nextIndex)) {
      const buf = this.pendingBuffers.get(this.nextIndex)!
      this.pendingBuffers.delete(this.nextIndex)
      this.queue.push(buf)
      this.nextIndex++
    }
    
    this.playNext()
  }
  
  private async playNext(): Promise<void> {
    if (this.isPlaying || this.queue.length === 0) {
      return
    }
    
    this.isPlaying = true
    const buffer = this.queue.shift()!
    
    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.connect(this.audioContext.destination)
    
    await new Promise<void>(resolve => {
      source.onended = () => {
        this.isPlaying = false
        resolve()
        this.playNext()
      }
      source.start(0)
    })
  }
}
```

**状态**: ⏳ 待执行  
**负责人**: @li  
**预计时间**: 1 小时

---

## 📁 阶段 5: 整合测试（第 7 天）

### 5.1 创建测试应用

```vue
<!-- skills/voice/demo/App.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { createVAD } from '../src/libs/vad/vad'
import { VADAudioManager } from '../src/libs/vad/manager'
import { voiceWorkflow } from '../src/workflow'
import { AudioPlaybackManager } from '../src/playback'

const isRunning = ref(false)
const vad = ref()
const audioManager = ref()
const playback = ref(new AudioPlaybackManager())

async function start() {
  // 初始化 VAD
  vad.value = await createVAD({
    sampleRate: 16000,
    speechThreshold: 0.3,
    minSilenceDurationMs: 400,
  })
  
  // 监听事件
  vad.value.on('speech-ready', ({ buffer, duration }) => {
    voiceWorkflow.getContext().sendEvent(
      inputSpeechEvent.with({ buffer, duration })
    )
  })
  
  // 音频管理器
  audioManager.value = new VADAudioManager(vad.value)
  await audioManager.value.initialize(workletUrl)
  await audioManager.value.startMicrophone()
  
  isRunning.value = true
}

async function stop() {
  await audioManager.value?.stopMicrophone()
  await audioManager.value?.dispose()
  isRunning.value = false
}
</script>

<template>
  <div>
    <button v-if="!isRunning" @click="start">开始对话</button>
    <button v-else @click="stop">停止对话</button>
  </div>
</template>
```

**状态**: ⏳ 待执行  
**负责人**: @li  
**预计时间**: 2 小时

---

### 5.2 端到端测试

```typescript
// skills/voice/test/e2e.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { voice } from '../src/index'

describe('Voice E2E', () => {
  beforeAll(async () => {
    // 初始化
  })
  
  afterAll(async () => {
    // 清理
  })
  
  it('should complete full cycle', async () => {
    // 1. TTS
    const audio = await voice.speak('你好')
    expect(audio).toBeDefined()
    
    // 2. ASR（播放音频并录制）
    // TODO: 实现
    
    // 3. LLM
    const stream = await voice.chat([{ role: 'user', content: '你好' }])
    const response = []
    for await (const token of stream) {
      response.push(token)
    }
    expect(response.length).toBeGreaterThan(0)
  })
})
```

**状态**: ⏳ 待执行  
**负责人**: @li  
**预计时间**: 2 小时

---

## 📁 阶段 6: 文档与部署（第 8 天）

### 6.1 编写完整文档

```markdown
# Voice System Documentation

## 架构

[架构图]

## 快速开始

1. 安装依赖
2. 配置环境变量
3. 运行测试应用

## API 参考

[详细 API 文档]

## 故障排查

[常见问题]
```

**状态**: ⏳ 待执行  
**负责人**: @li  
**预计时间**: 2 小时

---

### 6.2 部署测试

```bash
# 构建
pnpm build

# 部署到 Netlify
netlify deploy --prod
```

**状态**: ⏳ 待执行  
**负责人**: @li  
**预计时间**: 1 小时

---

## 📊 进度追踪

| 阶段 | 任务 | 状态 | 完成日期 |
|------|------|------|----------|
| 1 | 备份现有代码 | ⏳ | - |
| 1 | 删除冗余代码 | ⏳ | - |
| 1 | 清理依赖 | ⏳ | - |
| 2 | 复制 Airi VAD | ⏳ | - |
| 2 | 测试 VAD | ⏳ | - |
| 2 | 更新 SKILL.md | ⏳ | - |
| 3 | 安装 xsAI | ⏳ | - |
| 3 | 配置 API | ⏳ | - |
| 3 | 创建统一 Voice API | ⏳ | - |
| 3 | 更新 SKILL.md | ⏳ | - |
| 4 | 安装 llama-flow | ⏳ | - |
| 4 | 创建工作流 | ⏳ | - |
| 4 | 创建音频播放器 | ⏳ | - |
| 5 | 创建测试应用 | ⏳ | - |
| 5 | 端到端测试 | ⏳ | - |
| 6 | 编写文档 | ⏳ | - |
| 6 | 部署测试 | ⏳ | - |

---

## 🎯 成功标准

- [ ] VAD 正常工作（检测准确率 > 90%）
- [ ] TTS/ASR 可切换后端
- [ ] 工作流稳定运行
- [ ] 端到端延迟 < 2 秒
- [ ] 代码行数减少 50%+
- [ ] 文档完整

---

**清单生成完毕** ✅  
**审查员**: Editor (subagent)
