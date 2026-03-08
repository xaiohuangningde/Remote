# 语音功能整合计划

> **目标**: 将 Airi 官方实时语音对话功能整合到 OpenClaw
> **参考**: `D:\projects\airi-voice`
> **时间**: 2026-03-07

---

## 📊 现状分析

### Airi 官方实现 (参考)

**核心组件**:
```
apps/vad-asr-chat-tts/src/
├── libs/vad/
│   ├── vad.ts              # Silero VAD (Transformers.js)
│   ├── manager.ts          # 音频管理器
│   ├── process.worklet.ts  # Audio Worklet 处理
│   └── wav.ts              # WAV 编码
├── composables/
│   └── audio-context.ts    # AudioContext 管理
├── pages/
│   └── index.vue           # 主界面 (实时语音对话)
└── components/             # UI 组件
```

**关键特性**:
1. ✅ 实时麦克风捕获 (Web Audio API)
2. ✅ VAD 流式检测 (Silero VAD + Transformers.js)
3. ✅ 语音打断 (TTS 播放中检测说话)
4. ✅ 流式 ASR/LLM/TTS
5. ✅ Vue3 可视化界面

---

### OpenClaw 现有技能

**已有组件**:
```
skills/
├── vad/
│   ├── src/index.ts        # VADDetector (ONNX Runtime)
│   ├── models/
│   │   └── silero_vad.onnx # VAD 模型 ✅
│   └── test/
│       └── real-vad-test.js # 文件测试 ✅
├── whisper-local/
│   └── src/index.ts        # Whisper 封装 ✅
├── realtime-voice-chat/    # Python 实现 (未整合)
└── volcano-voice/          # TTS 队列 ✅
```

**差距**:
- ❌ 无实时麦克风捕获
- ❌ 无 Audio Worklet 处理
- ❌ 无语音打断逻辑
- ❌ 无流式处理
- ❌ 无 UI 界面

---

## 🎯 整合策略

### 方案选择

| 方案 | 说明 | 工作量 | 推荐度 |
|------|------|--------|--------|
| **A. 直接使用 Airi** | 克隆即用 | 1h | ⭐⭐⭐ |
| **B. 核心代码移植** | 移植 VAD/音频管理 | 8h | ⭐⭐⭐⭐ |
| **C. 完全重写** | 参考实现自己写 | 20h+ | ⭐ |

**选择**: **方案 B** - 移植核心代码到 OpenClaw 技能

**理由**:
1. 保持 OpenClaw 技能体系一致性
2. 可复用现有组件 (whisper-local, volcano-voice)
3. 更好的 OpenClaw 集成
4. 学习 Airi 实现，提升技能质量

---

## 📋 整合步骤

### 阶段 1: 音频捕获模块 (2h)

**目标**: 实现实时麦克风输入

**Airi 参考**:
- `src/composables/audio-context.ts`
- `src/libs/vad/manager.ts`

**OpenClaw 实现**:
```typescript
// skills/voice-audio/src/mic-capture.ts
export class MicCapture {
  private stream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private workletNode: AudioWorkletNode | null = null
  
  async start(onChunk: (audio: Float32Array) => void) {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.audioContext = new AudioContext({ sampleRate: 16000 })
    
    // 加载 Audio Worklet
    await this.audioContext.audioWorklet.addModule('voice-audio-processor.js')
    
    this.workletNode = new AudioWorkletNode(this.audioContext, 'voice-audio-processor')
    this.workletNode.port.onmessage = (e) => onChunk(e.data)
    
    const source = this.audioContext.createMediaStreamSource(this.stream)
    source.connect(this.workletNode)
  }
  
  stop() {
    this.stream?.getTracks().forEach(t => t.stop())
    this.audioContext?.close()
  }
}
```

**输出**: `skills/voice-audio/` 新技能

---

### 阶段 2: VAD 流式检测 (2h)

**目标**: 移植 Airi VAD 实现

**Airi 参考**:
- `src/libs/vad/vad.ts` (核心逻辑)
- `src/libs/vad/process.worklet.ts` (音频处理)

**现有代码**:
- `skills/vad/src/index.ts` (已有 VADDetector)

**整合**:
```typescript
// skills/vad/src/streaming-vad.ts
import { VADDetector } from './index'

export class StreamingVAD extends VADDetector {
  private isRecording = false
  private audioBuffer: Float32Array[] = []
  
  // 继承 Airi 的流式检测逻辑
  async processChunk(audio: Float32Array) {
    const state = this.processAudio(audio)
    
    if (state === 'speaking' && !this.isRecording) {
      this.isRecording = true
      this.emit('speech-start')
    } else if (state === 'silent' && this.isRecording) {
      this.isRecording = false
      const fullBuffer = this.concatBuffers()
      this.emit('speech-end', fullBuffer)
      this.audioBuffer = []
    }
    
    if (this.isRecording) {
      this.audioBuffer.push(audio)
    }
  }
}
```

**更新**: `skills/vad/` 现有技能

---

### 阶段 3: 语音打断逻辑 (2h)

**目标**: TTS 播放中检测说话并暂停

**Airi 参考**:
- `src/pages/index.vue` (打断逻辑)

**OpenClaw 实现**:
```typescript
// skills/voice-interrupt/src/index.ts
export class VoiceInterruptHandler {
  constructor(
    private vad: StreamingVAD,
    private tts: TTSService,
  ) {}
  
  start() {
    this.vad.on('speech-start', () => {
      if (this.tts.isPlaying()) {
        this.tts.pause()  // 打断 TTS
        console.log('🔇 TTS 已暂停 (用户说话)')
      }
    })
  }
}
```

**输出**: `skills/voice-interrupt/` 新技能

---

### 阶段 4: 流式处理整合 (3h)

**目标**: 整合 ASR/LLM/TTS 流式处理

**Airi 参考**:
- `src/pages/index.vue` (完整流程)

**OpenClaw 实现**:
```typescript
// skills/realtime-voice-chat/src/index.ts
import { MicCapture } from 'voice-audio'
import { StreamingVAD } from 'vad'
import { WhisperService } from 'whisper-local'
import { TTSService } from 'volcano-voice'
import { VoiceInterruptHandler } from 'voice-interrupt'

export class RealtimeVoiceChat {
  private mic: MicCapture
  private vad: StreamingVAD
  private asr: WhisperService
  private tts: TTSService
  private interrupt: VoiceInterruptHandler
  
  async start() {
    // 初始化
    await this.vad.init()
    this.interrupt.start()
    
    // 开始监听
    this.mic.start(async (audio) => {
      await this.vad.processChunk(audio)
    })
    
    this.vad.on('speech-end', async (audio) => {
      // ASR 转录
      const text = await this.asr.transcribe(audio)
      
      // LLM 回复
      const reply = await llm.chat(text)
      
      // TTS 播放
      await this.tts.speak(reply)
    })
  }
}
```

**更新**: `skills/realtime-voice-chat/` 现有技能

---

### 阶段 5: UI 界面 (可选 4h+)

**目标**: Web 可视化界面

**方案 A**: Vue3 (参考 Airi)
```vue
<!-- skills/voice-ui/src/VoiceChat.vue -->
<template>
  <div>
    <button @click="toggleListening">
      {{ isListening ? '🔴 监听中' : '⚪ 点击开始' }}
    </button>
    <div v-if="isSpeaking">🎤 用户说话...</div>
    <div v-if="isTTSPlaying">🔊 AI 回复...</div>
  </div>
</template>
```

**方案 B**: 简单 HTML
```html
<!-- skills/voice-ui/public/index.html -->
<button onclick="startListening()">开始对话</button>
<div id="status"></div>
```

**输出**: `skills/voice-ui/` 新技能 (可选)

---

### 阶段 6: 配置统一 (1h)

**目标**: 统一配置文件

**实现**:
```json
// skills/voice-config/config.json
{
  "vad": {
    "model": "silero_vad.onnx",
    "threshold": 0.3,
    "minSilenceMs": 400
  },
  "asr": {
    "provider": "whisper",
    "model": "turbo"
  },
  "llm": {
    "provider": "openclaw"
  },
  "tts": {
    "provider": "volcano",
    "voice": "default"
  }
}
```

**输出**: `skills/voice-config/` 新技能

---

## 📅 时间规划

| 阶段 | 任务 | 预计时间 | 优先级 |
|------|------|---------|--------|
| 1 | 音频捕获模块 | 2h | 🔴 P0 |
| 2 | VAD 流式检测 | 2h | 🔴 P0 |
| 3 | 语音打断逻辑 | 2h | 🔴 P0 |
| 4 | 流式处理整合 | 3h | 🟡 P1 |
| 5 | UI 界面 | 4h+ | 🟢 P2 |
| 6 | 配置统一 | 1h | 🟡 P1 |
| **总计** | | **14h+** | |

---

## 🎯 里程碑

### M1: 核心功能可用 (6h)
- [x] 阶段 1: 音频捕获
- [x] 阶段 2: VAD 流式检测
- [x] 阶段 3: 语音打断

**验收**: 可实时麦克风对话，支持打断

### M2: 完整流程 (9h)
- [x] M1 全部
- [x] 阶段 4: 流式处理整合

**验收**: 完整 VAD→ASR→LLM→TTS 流程

### M3: 产品化 (14h+)
- [x] M2 全部
- [x] 阶段 5: UI 界面
- [x] 阶段 6: 配置统一

**验收**: 可交付的语音对话功能

---

## 📁 文件结构 (整合后)

```
skills/
├── voice-audio/          # 新增：音频捕获
│   ├── src/
│   │   ├── mic-capture.ts
│   │   └── audio-processor.js
│   └── SKILL.md
├── vad/                  # 更新：流式 VAD
│   ├── src/
│   │   ├── index.ts
│   │   └── streaming-vad.ts  # 新增
│   └── SKILL.md
├── voice-interrupt/      # 新增：语音打断
│   ├── src/index.ts
│   └── SKILL.md
├── realtime-voice-chat/  # 更新：整合主程序
│   ├── src/
│   │   └── index.ts
│   └── SKILL.md
├── voice-config/         # 新增：统一配置
│   ├── config.json
│   └── SKILL.md
└── voice-ui/             # 可选：UI 界面
    └── public/
```

---

## 🚀 立即开始

### 第一步：创建音频捕获模块

```bash
mkdir -p skills/voice-audio/src
# 创建 mic-capture.ts
```

### 第二步：移植 VAD 流式逻辑

```bash
# 复制 Airi 的 vad.ts 核心逻辑
cp D:\projects\airi-voice\apps\vad-asr-chat-tts\src\libs\vad\vad.ts \
   skills/vad/src/streaming-vad.ts
```

### 第三步：测试麦克风

```bash
python skills/realtime-voice-chat/mic_test.py
```

---

## 📊 成功标准

| 功能 | 验收标准 | 测试方法 |
|------|---------|---------|
| 麦克风 | 实时捕获音频 | 录音 5s 回放 |
| VAD | 检测语音开始/结束 | 说话测试 |
| 打断 | TTS 播放中暂停 | 边听边说 |
| ASR | 准确转录 | 已知文本对比 |
| 完整流程 | <3s 响应 | 计时测试 |

---

**指挥官**: 小黄 🐤  
**状态**: 准备执行  
**下一步**: 开始阶段 1 - 音频捕获模块
