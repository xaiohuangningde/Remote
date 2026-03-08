# 语音系统架构设计文档

> **版本**: v3.0 (目标架构)  
> **创建时间**: 2026-03-06  
> **架构师**: 小黄 🐤  
> **状态**: 设计阶段

---

## 📋 目录

1. [现状分析](#1-现状分析)
2. [目标架构](#2-目标架构)
3. [组件设计](#3-组件设计)
4. [接口契约](#4-接口契约)
5. [数据流设计](#5-数据流设计)
6. [技术选型](#6-技术选型)
7. [扩展性设计](#7-扩展性设计)
8. [性能优化](#8-性能优化)
9. [实施路线图](#9-实施路线图)

---

## 1. 现状分析

### 1.1 现有架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    当前架构 (v2.0)                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐                                          │
│  │ PyAudio      │ 麦克风输入                                │
│  └──────┬───────┘                                          │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────┐                                          │
│  │ Silero VAD   │ 语音检测                                  │
│  └──────┬───────┘                                          │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────┐                                          │
│  │ Whisper ASR  │ 语音识别                                  │
│  └──────┬───────┘                                          │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────┐                                          │
│  │ 规则引擎     │ 简单回复 (硬编码)                          │
│  └──────┬───────┘                                          │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────┐                                          │
│  │ Qwen3-TTS    │ 语音合成                                  │
│  └──────┬───────┘                                          │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────┐                                          │
│  │ PowerShell   │ 音频播放 (SoundPlayer)                    │
│  └──────────────┘                                          │
│                                                             │
│  ⚠️ 问题：紧耦合、无抽象层、扩展困难                         │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 核心问题识别

| 问题类别 | 具体问题 | 影响 | 优先级 |
|----------|----------|------|--------|
| **架构耦合** | Python 主逻辑 + TS 封装分离 | 维护困难，功能不一致 | 🔴 高 |
| **组件耦合** | VAD/ASR/TTS 硬编码在单文件 | 无法替换后端 | 🔴 高 |
| **播放方式** | PowerShell SoundPlayer 同步播放 | 阻塞、无法控制、打断粗暴 | 🔴 高 |
| **LLM 集成** | 规则引擎，无真实对话能力 | 用户体验差 | 🟡 中 |
| **流式处理** | 等待完整 TTS 生成后播放 | 延迟高 (2-3 秒) | 🟡 中 |
| **配置管理** | 部分参数硬编码 | 环境适配困难 | 🟢 低 |
| **资源管理** | 无显式清理，长时间运行泄漏 | 稳定性问题 | 🟡 中 |
| **错误处理** | try-except 打印后返回 | 状态不一致 | 🟡 中 |

### 1.3 现有代码结构分析

```
skills/realtime-voice-chat/
├── realtime_voice_chat.py    # 主程序 (450 行，单文件 monolithic)
├── src/
│   ├── index.ts              # TS 封装 (仅启动/停止，无深度集成)
│   └── index-local.ts        # 旧 TS 版本 (调用外部脚本，低效)
├── airi_*.py                 # 历史版本 (7 个实验文件)
├── test_*.py                 # 测试脚本
└── 文档/
    ├── SKILL.md              # 技能文档
    ├── README.md             # 使用说明
    ├── ANALYSIS.md           # 问题分析
    └── REPORT.md             # 修复报告
```

**代码质量评估**:

| 维度 | 评分 | 说明 |
|------|------|------|
| 可维护性 | ⭐⭐⭐☆☆ | 单文件 450 行，缺乏模块化 |
| 可扩展性 | ⭐⭐☆☆☆ | 替换 TTS/ASR 需修改核心代码 |
| 可测试性 | ⭐⭐☆☆☆ | 无单元测试，依赖硬件 |
| 性能 | ⭐⭐⭐☆☆ | CPU 模式 3-4 秒延迟，可优化 |
| 稳定性 | ⭐⭐⭐⭐☆ | 有状态管理和错误处理 |

---

## 2. 目标架构

### 2.1 架构愿景

构建一个**模块化、可扩展、低延迟**的实时语音对话系统，支持：

- ✅ **组件热插拔**: 轻松切换 VAD/ASR/TTS/LLM 后端
- ✅ **多语言支持**: 中英文自动检测与处理
- ✅ **流式处理**: 首句响应 <1 秒 (GPU 模式)
- ✅ **生产可靠**: 99.9% 可用性，资源泄漏防护
- ✅ **开发友好**: 清晰的接口契约，完整的测试覆盖

### 2.2 架构原则

1. **单一职责**: 每个组件只做一件事
2. **接口隔离**: 定义清晰的输入/输出契约
3. **依赖倒置**: 依赖抽象而非具体实现
4. **异步优先**: 非阻塞 I/O，流式处理
5. **配置驱动**: 行为通过配置而非代码修改

### 2.3 目标架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                      目标架构 (v3.0)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Application Layer                     │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │              VoiceChatOrchestrator               │   │   │
│  │  │  - 状态管理                                       │   │   │
│  │  │  - 流程编排                                       │   │   │
│  │  │  - 错误恢复                                       │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│         ┌────────────────────┼────────────────────┐            │
│         │                    │                    │            │
│         ▼                    ▼                    ▼            │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐      │
│  │   VAD       │     │    ASR      │     │    TTS      │      │
│  │  Interface  │     │  Interface  │     │  Interface  │      │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘      │
│         │                   │                   │              │
│    ┌────┴────┐         ┌────┴────┐         ┌────┴────┐        │
│    │         │         │         │         │         │        │
│    ▼         ▼         ▼         ▼         ▼         ▼        │
│ ┌──────┐ ┌──────┐  ┌──────┐ ┌──────┐  ┌──────┐ ┌──────┐     │
│ │Silero│ │WebRTC│  │Whisper│ │Azure │  │Qwen3 │ │Azure │     │
│ │ VAD  │ │ VAD │  │ ASR  │ │Speech│  │ TTS  │ │Speech│     │
│ └──────┘ └──────┘  └──────┘ └──────┘  └──────┘ └──────┘     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    LLM Interface                        │   │
│  │         ┌──────────┐  ┌──────────┐  ┌──────────┐       │   │
│  │         │  Rules   │  │  Qwen    │  │  GLM     │       │   │
│  │         │  Engine  │  │  API     │  │  API     │       │   │
│  │         └──────────┘  └──────────┘  └──────────┘       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Audio Backend                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │   PyAudio   │  │  SoundDevice│  │   WebAudio  │     │   │
│  │  │  (Input)    │  │  (Output)   │  │  (Browser)  │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 分层架构

```
┌─────────────────────────────────────┐
│         Presentation Layer          │  ← CLI / Web UI / API
├─────────────────────────────────────┤
│       Application Layer             │  ← VoiceChatOrchestrator
├─────────────────────────────────────┤
│         Domain Layer                │  ← 核心业务逻辑
│  ┌─────────┬─────────┬─────────┐   │
│  │   VAD   │   ASR   │   TTS   │   │
│  │ Service │ Service │ Service │   │
│  └─────────┴─────────┴─────────┘   │
├─────────────────────────────────────┤
│        Infrastructure Layer         │  ← 具体实现 (Silero/Whisper/Qwen3)
└─────────────────────────────────────┘
```

---

## 3. 组件设计

### 3.1 核心组件列表

| 组件 | 职责 | 接口 | 实现 |
|------|------|------|------|
| **VoiceChatOrchestrator** | 编排整个对话流程 | `start()`, `stop()`, `getStatus()` | 唯一 |
| **VADService** | 语音活动检测 | `detect(frame)`, `init()`, `destroy()` | Silero, WebRTC |
| **ASRService** | 语音识别 | `transcribe(audio)`, `init()`, `destroy()` | Whisper, Azure |
| **TTSService** | 语音合成 | `synthesize(text)`, `init()`, `destroy()` | Qwen3, Azure |
| **LLMService** | 对话生成 | `generate(text, context)`, `init()`, `destroy()` | Rules, Qwen, GLM |
| **AudioBackend** | 音频输入输出 | `startRecording()`, `play(audio)`, `stop()` | PyAudio, SoundDevice |
| **StateManager** | 状态管理 | `get()`, `set()`, `subscribe()` | 唯一 |
| **ConfigManager** | 配置管理 | `get()`, `set()`, `load()`, `save()` | 唯一 |

### 3.2 组件详细设计

#### 3.2.1 VoiceChatOrchestrator (编排器)

**职责**: 协调所有组件，管理对话流程

```typescript
interface VoiceChatOrchestrator {
  // 生命周期
  init(): Promise<void>
  start(): Promise<void>
  stop(): Promise<void>
  destroy(): Promise<void>
  
  // 状态
  getStatus(): VoiceChatStatus
  
  // 配置
  updateConfig(config: Partial<VoiceChatConfig>): void
  
  // 事件
  on(event: 'speech-start' | 'speech-end' | 'transcript' | 'reply' | 'error', 
     handler: (data: any) => void): void
}
```

**状态机**:

```
┌──────────┐
│  IDLE    │  ← 初始状态
└────┬─────┘
     │ start()
     ▼
┌──────────┐
│ LISTENING│  ← 等待用户说话
└────┬─────┘
     │ speech-start
     ▼
┌──────────┐
│ RECORDING│  ← 录音中
└────┬─────┘
     │ speech-end
     ▼
┌──────────┐
│PROCESSING│  ← ASR → LLM → TTS
└────┬─────┘
     │ tts-ready
     ▼
┌──────────┐
│ PLAYING  │  ← 播放回复 (可打断)
└────┬─────┘
     │ done / interrupted
     ▼
┌──────────┐
│ LISTENING│  ← 回到监听状态
└──────────┘
```

#### 3.2.2 VADService (语音检测)

**接口定义**:

```typescript
interface VADService {
  // 初始化
  init(config: VADConfig): Promise<void>
  
  // 处理音频帧 (实时调用)
  detect(frame: Float32Array): VADResult
  
  // 清理
  destroy(): Promise<void>
}

interface VADConfig {
  sampleRate: number
  frameSize: number
  speechThreshold: number
  minSilenceDurationMs: number
  minSpeechDurationMs: number
}

interface VADResult {
  isSpeech: boolean
  confidence: number  // 0-1
  timestamp: number
}
```

**实现变体**:

| 实现 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **SileroVAD** | 准确率高，支持中文 | 需要 PyTorch，~100MB | 桌面应用 |
| **WebRTCVAD** | 轻量，快速 | 准确率较低 | 嵌入式/资源受限 |
| **TensorFlowVAD** | 可训练自定义模型 | 复杂，依赖大 | 特殊场景 |

#### 3.2.3 ASRService (语音识别)

**接口定义**:

```typescript
interface ASRService {
  init(config: ASRConfig): Promise<void>
  transcribe(audio: Float32Array): Promise<ASRResult>
  destroy(): Promise<void>
}

interface ASRConfig {
  model: string  // 'base', 'small', 'large'
  language?: string  // 'zh', 'en', 'auto'
  device: 'cpu' | 'cuda'
}

interface ASRResult {
  text: string
  language: string
  confidence: number
  segments: Array<{
    text: string
    start: number
    end: number
  }>
}
```

**实现变体**:

| 实现 | 优点 | 缺点 | 成本 |
|------|------|------|------|
| **Whisper (local)** | 免费，离线，多语言 | CPU 慢，GPU 需显存 | 免费 |
| **Azure Speech** | 准确率高，流式 | 需要网络，付费 | $1/小时 |
| **Google Speech** | 准确率高 | 需要网络，付费 | $1.44/小时 |
| **FunASR** | 中文优化，开源 | 社区支持较少 | 免费 |

#### 3.2.4 TTSService (语音合成)

**接口定义**:

```typescript
interface TTSService {
  init(config: TTSConfig): Promise<void>
  synthesize(text: string, options?: TTSOptions): Promise<TTSResult>
  synthesizeStream(text: string): AsyncGenerator<TTSChunk>  // 流式
  destroy(): Promise<void>
}

interface TTSConfig {
  modelPath?: string  // 本地模型路径
  speaker?: string
  language?: string
  device?: 'cpu' | 'cuda'
}

interface TTSOptions {
  speaker?: string
  speed?: number
  pitch?: number
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry'
}

interface TTSResult {
  audio: Float32Array
  sampleRate: number
  duration: number
}

interface TTSChunk {
  audio: Float32Array
  isLast: boolean
}
```

**实现变体**:

| 实现 | 优点 | 缺点 | 音色 |
|------|------|------|------|
| **Qwen3-TTS** | 中文自然，支持情感 | 模型大 (3GB), CPU 慢 | 9 种 |
| **Azure TTS** | 高质量，流式 | 付费，需要网络 | 100+ |
| **Edge TTS** | 免费，质量好 | 需要网络 | 50+ |
| **CosyVoice** | 开源，可克隆 | 社区支持少 | 可变 |

#### 3.2.5 LLMService (对话生成)

**接口定义**:

```typescript
interface LLMService {
  init(config: LLMConfig): Promise<void>
  generate(input: string, context: ConversationContext): Promise<LLMResult>
  destroy(): Promise<void>
}

interface LLMConfig {
  provider: 'rules' | 'qwen' | 'glm' | 'custom'
  apiKey?: string
  model?: string
  systemPrompt?: string
}

interface ConversationContext {
  history: Array<{role: 'user' | 'assistant', text: string}>
  metadata?: Record<string, any>
}

interface LLMResult {
  text: string
  latency: number
  tokens?: {input: number, output: number}
}
```

**实现变体**:

| 实现 | 优点 | 缺点 | 延迟 |
|------|------|------|------|
| **Rules Engine** | 快速，确定 | 无真实对话能力 | <10ms |
| **Qwen API** | 中文强，便宜 | 需要网络 | 500-1000ms |
| **GLM API** | 中文强 | 需要网络 | 500-1000ms |
| **Local LLM** | 离线，隐私 | 需要 GPU，慢 | 2-5s |

#### 3.2.6 AudioBackend (音频后端)

**接口定义**:

```typescript
interface AudioBackend {
  // 输入
  startRecording(callback: (frame: Float32Array) => void): Promise<void>
  stopRecording(): Promise<void>
  
  // 输出
  play(audio: Float32Array, options?: PlayOptions): Promise<void>
  stop(): Promise<void>  // 停止当前播放
  
  // 设备
  listDevices(): Promise<AudioDevice[]>
  setDevice(deviceId: string): void
  
  // 清理
  destroy(): Promise<void>
}

interface PlayOptions {
  volume?: number  // 0-1
  loop?: boolean
  interruptible?: boolean
}

interface AudioDevice {
  id: string
  name: string
  type: 'input' | 'output'
  sampleRate: number
  channels: number
}
```

**实现变体**:

| 实现 | 平台 | 优点 | 缺点 |
|------|------|------|------|
| **PyAudio** | 跨平台 | 成熟，稳定 | 安装复杂 (Windows) |
| **SoundDevice** | 跨平台 | 易安装，基于 PortAudio | 功能较少 |
| **WebAudio** | 浏览器 | 无需安装 | 仅浏览器 |
| **SDL2** | 跨平台 | 轻量 | 社区小 |

---

## 4. 接口契约

### 4.1 数据流接口

```typescript
// 音频帧 (所有组件共享的格式)
interface AudioFrame {
  data: Float32Array  // 归一化到 [-1, 1]
  sampleRate: number
  channels: number
  timestamp: number
}

// 语音片段 (VAD 输出 → ASR 输入)
interface SpeechSegment {
  audio: Float32Array
  startTime: number
  endTime: number
  confidence: number
}

// 转写结果 (ASR 输出 → LLM 输入)
interface Transcript {
  text: string
  language: string
  confidence: number
  segments: TranscribedSegment[]
}

interface TranscribedSegment {
  text: string
  startOffset: number
  endOffset: number
}

// 回复 (LLM 输出 → TTS 输入)
interface Reply {
  text: string
  metadata?: {
    source: 'rules' | 'llm'
    latency: number
  }
}

// 音频输出 (TTS 输出 → AudioBackend 输入)
interface SynthesizedAudio {
  audio: Float32Array
  sampleRate: number
  duration: number
  text: string
}
```

### 4.2 事件接口

```typescript
// 编排器发出的事件
type OrchestratorEvent =
  | {type: 'speech-start'; timestamp: number}
  | {type: 'speech-end'; duration: number}
  | {type: 'transcript'; text: string; language: string}
  | {type: 'reply'; text: string}
  | {type: 'tts-start'; estimatedDuration: number}
  | {type: 'tts-end'; actualDuration: number}
  | {type: 'playback-start'}
  | {type: 'playback-end'; interrupted: boolean}
  | {type: 'error'; code: string; message: string}
  | {type: 'state-change'; from: State; to: State}

// 订阅接口
interface EventEmitter {
  on<T extends OrchestratorEvent['type']>(
    event: T,
    handler: (data: Extract<OrchestratorEvent, {type: T}>) => void
  ): void
  
  off<T extends OrchestratorEvent['type']>(
    event: T,
    handler: (data: Extract<OrchestratorEvent, {type: T}>) => void
  ): void
}
```

### 4.3 配置接口

```typescript
interface VoiceChatConfig {
  // 音频配置
  audio: {
    sampleRate: number        // 默认：16000
    frameSizeMs: number       // 默认：20
    channels: number          // 默认：1
    inputDevice?: string      // 麦克风 ID
    outputDevice?: string     // 扬声器 ID
  }
  
  // VAD 配置
  vad: {
    provider: 'silero' | 'webrtc'
    speechThreshold: number   // 默认：0.3
    exitThreshold: number     // 默认：0.1
    minSilenceDurationMs: number  // 默认：400
    minSpeechDurationMs: number   // 默认：250
    speechPadMs: number       // 默认：80
  }
  
  // ASR 配置
  asr: {
    provider: 'whisper' | 'azure' | 'google'
    model: string             // 默认：'base'
    language?: string         // 默认：'auto'
    device: 'cpu' | 'cuda'
  }
  
  // TTS 配置
  tts: {
    provider: 'qwen3' | 'azure' | 'edge'
    modelPath?: string        // 本地模型路径
    speaker: string           // 默认：'Vivian'
    language: string          // 默认：'Chinese'
    device?: 'cpu' | 'cuda'
    stream: boolean           // 是否流式播放
  }
  
  // LLM 配置
  llm: {
    provider: 'rules' | 'qwen' | 'glm'
    apiKey?: string
    model?: string
    systemPrompt?: string
    maxContextLength?: number
  }
  
  // 打断配置
  interrupt: {
    enabled: boolean          // 默认：true
    protectionMs: number      // 默认：500
    thresholdMultiplier: number  // 默认：2.0
  }
  
  // 日志配置
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error'
    file?: string             // 日志文件路径
  }
}
```

---

## 5. 数据流设计

### 5.1 完整对话流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         完整对话数据流                                   │
└─────────────────────────────────────────────────────────────────────────┘

  用户说话
     │
     ▼
┌─────────────────┐
│  AudioBackend   │  持续采集音频帧 (每 20ms 一帧)
│  startRecording │
└────────┬────────┘
         │
         │ AudioFrame[]
         ▼
┌─────────────────┐
│   VADService    │  实时检测每帧是否为语音
│   detect()      │  输出：isSpeech, confidence
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  静音      语音
    │         │
    │         ▼
    │   ┌─────────────────┐
    │   │ StateManager    │  状态：LISTENING → RECORDING
    │   │                 │  累积音频帧到 buffer
    │   └────────┬────────┘
    │            │
    │            │ 静音检测 (连续 400ms 低置信度)
    │            ▼
    │     ┌─────────────────┐
    │     │ StateManager    │  状态：RECORDING → PROCESSING
    │     │                 │  触发 speech-end 事件
    │     └────────┬────────┘
    │              │
    │              │ SpeechSegment (完整音频)
    │              ▼
    │       ┌─────────────────┐
    │       │   ASRService    │  语音识别
    │       │   transcribe()  │  输出：text, language
    │       └────────┬────────┘
    │                │
    │                │ Transcript
    │                ▼
    │         ┌─────────────────┐
    │         │   LLMService    │  生成回复
    │         │   generate()    │  输出：reply text
    │         └────────┬────────┘
    │                  │
    │                  │ Reply
    │                  ▼
    │           ┌─────────────────┐
    │           │   TTSService    │  语音合成
    │           │   synthesize()  │  输出：audio buffer
    │           └────────┬────────┘
    │                    │
    │                    │ SynthesizedAudio
    │                    ▼
    │             ┌─────────────────┐
    │             │ StateManager    │  状态：PROCESSING → PLAYING
    │             │                 │  记录 tts_start_time
    │             └────────┬────────┘
    │                      │
    │                      │ AudioFrame[]
    │                      ▼
    │               ┌─────────────────┐
    │               │  AudioBackend   │  播放音频
    │               │   play()        │  同时继续 VAD 检测
    │               └────────┬────────┘
    │                        │
    │            ┌───────────┴───────────┐
    │            │                       │
    │            ▼                       ▼
    │        播放完成                检测到打断
    │            │                       │
    │            │                       │ (保护时间外 + 高置信度)
    │            │                       ▼
    │            │               ┌─────────────────┐
    │            │               │ StateManager    │  状态：PLAYING → PROCESSING
    │            │               │                 │  触发 stop_playback
    │            │               └────────┬────────┘
    │            │                        │
    │            │                        │ (回到 ASR 处理打断语音)
    │            │                        └──────────────┐
    │            │                                       │
    └────────────┴───────────────────────────────────────┘
                 │
                 ▼
          ┌─────────────┐
          │ StateManager│  状态：PLAYING → LISTENING
          │             │  触发 playback-end 事件
          └─────────────┘
                 │
                 ▼
              回到初始状态，等待下一轮对话
```

### 5.2 并发模型

```
┌─────────────────────────────────────────────────────────────┐
│                      并发架构                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Main Thread (UI/事件循环)               │   │
│  │  - 接收用户命令                                      │   │
│  │  - 发出状态更新事件                                  │   │
│  │  - 处理错误                                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│         ┌──────────────────┼──────────────────┐            │
│         │                  │                  │            │
│         ▼                  ▼                  ▼            │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐      │
│  │ Audio Thread│   │ VAD Thread  │   │ ASR Thread  │      │
│  │             │   │             │   │             │      │
│  │ - 采集音频  │   │ - 实时检测  │   │ - 转写      │      │
│  │ - 播放音频  │   │ - 状态判断  │   │ - 耗时操作  │      │
│  │ - 打断控制  │   │             │   │             │      │
│  └─────────────┘   └─────────────┘   └─────────────┘      │
│                                                             │
│  ┌─────────────┐   ┌─────────────┐                         │
│  │ TTS Thread  │   │ LLM Thread  │                         │
│  │             │   │             │                         │
│  │ - 合成语音  │   │ - 生成回复  │                         │
│  │ - 流式输出  │   │ - 上下文管理│                         │
│  └─────────────┘   └─────────────┘                         │
│                                                             │
│  线程间通信：共享状态 (加锁保护) + 事件队列                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 状态转换表

| 当前状态 | 事件 | 下一状态 | 动作 |
|----------|------|----------|------|
| IDLE | start() | LISTENING | 启动 AudioBackend, VAD |
| LISTENING | speech-start | RECORDING | 清空 buffer, 开始累积 |
| RECORDING | speech-end | PROCESSING | 启动 ASR 线程 |
| PROCESSING | asr-done | PROCESSING | 启动 LLM |
| PROCESSING | llm-done | PROCESSING | 启动 TTS |
| PROCESSING | tts-done | PLAYING | 启动播放，记录开始时间 |
| PLAYING | playback-end | LISTENING | 触发下一轮 |
| PLAYING | interrupt | PROCESSING | 停止播放，处理打断语音 |
| ANY | stop() | IDLE | 清理所有资源 |
| ANY | error | IDLE | 错误恢复，清理资源 |

---

## 6. 技术选型

### 6.1 语言选择

| 选项 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **Python** | 音频生态成熟 (PyTorch, PyAudio), ML 友好 | GIL 限制并发，性能一般 | ⭐⭐⭐⭐⭐ |
| **TypeScript** | 类型安全，异步友好，与 OpenClaw 一致 | 音频处理需调用原生模块 | ⭐⭐⭐⭐☆ |
| **Rust** | 性能最佳，内存安全 | 生态不成熟，学习曲线陡 | ⭐⭐⭐☆☆ |
| **混合 (Python+TS)** | 各取所长 | 架构复杂，调试困难 | ⭐⭐⭐☆☆ |

**决策**: **Python 主实现 + TypeScript 封装**

- Python: 核心音频处理、ML 模型
- TypeScript: API 封装、与 OpenClaw 集成

### 6.2 组件选型矩阵

| 组件 | 默认实现 | 备选实现 | 选择理由 |
|------|----------|----------|----------|
| **VAD** | Silero VAD | WebRTC VAD | Silero 准确率高，支持中文 |
| **ASR** | Whisper (local) | Azure Speech | 免费、离线优先，Azure 作为云备选 |
| **TTS** | Qwen3-TTS | Edge TTS | Qwen3 中文自然，Edge 作为轻量备选 |
| **LLM** | Rules (初始) | Qwen API | 快速启动，后续升级真实 LLM |
| **Audio I/O** | PyAudio | SoundDevice | PyAudio 成熟，SoundDevice 安装简单 |
| **并发** | threading | asyncio | threading 简单直接，适合 CPU 密集型 |

### 6.3 依赖清单

```yaml
# Python 依赖 (requirements.txt)
pyaudio>=0.2.14        # 音频 I/O
numpy>=1.24.0          # 数值计算
torch>=2.0.0           # Silero VAD, Qwen3-TTS
soundfile>=0.12.0      # 音频文件读写
faster-whisper>=0.10.0 # Whisper ASR (CTranslate2 加速)
qwen-tts>=0.1.0        # Qwen3-TTS (本地)
requests>=2.31.0       # HTTP 客户端 (LLM API)
pydantic>=2.0.0        # 配置验证
logging>=0.5.1         # 结构化日志

# TypeScript 依赖 (package.json)
{
  "dependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "events": "^3.3.0",
    "winston": "^3.11.0"  # 日志
  }
}
```

### 6.4 模型选型

| 模型 | 大小 | 用途 | 下载方式 |
|------|------|------|----------|
| **Silero VAD** | ~100MB | 语音检测 | torch.hub 自动下载 |
| **Whisper base** | ~150MB | 语音识别 | HuggingFace 自动下载 |
| **Whisper small** | ~500MB | 语音识别 (高精度) | HuggingFace |
| **Qwen3-TTS** | ~3GB | 语音合成 | ModelScope 手动下载 |
| **Qwen2.5-0.5B** | ~1GB | 本地 LLM (可选) | HuggingFace |

**模型路径配置**:

```python
MODEL_PATHS = {
    'silero': '~/.cache/torch/hub/snakers4_silero-vad',
    'whisper': '~/.cache/huggingface/hub',
    'qwen3_tts': r'E:\TuriX-CUA-Windows\models\Qwen3-TTS\Qwen\Qwen3-TTS-12Hz-1___7B-CustomVoice',
}
```

---

## 7. 扩展性设计

### 7.1 插件架构

```typescript
// 插件接口
interface VoiceChatPlugin {
  name: string
  version: string
  
  // 生命周期钩子
  onInit?(orchestrator: VoiceChatOrchestrator): Promise<void>
  onSpeechStart?(segment: SpeechSegment): Promise<void>
  onTranscript?(transcript: Transcript): Promise<void>
  onReply?(reply: Reply): Promise<void>
  onDestroy?(): Promise<void>
}

// 插件注册
class PluginManager {
  private plugins: VoiceChatPlugin[] = []
  
  register(plugin: VoiceChatPlugin): void
  unregister(name: string): void
  
  // 广播事件给所有插件
  async broadcast(event: string, data: any): Promise<void>
}
```

**内置插件示例**:

| 插件 | 功能 |
|------|------|
| **logger** | 结构化日志记录 |
| **metrics** | 性能指标收集 (延迟、准确率) |
| **memory** | 对话历史存储 |
| **hot-reload** | 配置热更新 |
| **web-ui** | WebSocket 状态推送 |

### 7.2 后端替换指南

#### 替换 TTS 后端 (示例)

```python
# 1. 实现 TTS 接口
class AzureTTSService(TTSService):
    def __init__(self, config: TTSConfig):
        self.api_key = config.apiKey
        self.region = config.region
        
    async def init(self):
        from azure.cognitiveservices.speech import SpeechConfig
        self.speech_config = SpeechConfig(
            subscription=self.api_key,
            region=self.region
        )
    
    async def synthesize(self, text: str) -> TTSResult:
        from azure.cognitiveservices.speech import SpeechSynthesizer
        synthesizer = SpeechSynthesizer(speech_config=self.speech_config)
        result = synthesizer.speak_text_async(text).get()
        return TTSResult(
            audio=np.frombuffer(result.audio_data, dtype=np.int16),
            sampleRate=16000,
            duration=len(result.audio_data) / 32000
        )

# 2. 注册到工厂
TTS_REGISTRY['azure'] = AzureTTSService

# 3. 配置文件中使用
config = {
    'tts': {
        'provider': 'azure',
        'apiKey': 'xxx',
        'region': 'eastus'
    }
}
```

#### 替换 ASR 后端 (示例)

```python
# 1. 实现 ASR 接口
class FunASRService(ASRService):
    async def init(self):
        from funasr import AutoModel
        self.model = AutoModel(model='paraformer-zh')
    
    async def transcribe(self, audio: Float32Array) -> ASRResult:
        result = self.model.generate(input=audio)
        return ASRResult(
            text=result[0]['text'],
            language='zh',
            confidence=0.95
        )

# 2. 注册
ASR_REGISTRY['funasr'] = FunASRService
```

### 7.3 多语言支持

```typescript
interface LanguageConfig {
  // 自动检测
  autoDetect: boolean
  
  // 支持的语言列表
  supportedLanguages: string[]  // ['zh', 'en', 'ja', ...]
  
  // 语言特定配置
  perLanguage: {
    [lang: string]: {
      asrModel?: string
      ttsSpeaker?: string
      llmPrompt?: string
    }
  }
}

// 运行时切换
orchestrator.updateConfig({
  asr: {language: 'en'},
  tts: {speaker: 'Aiden'}  // 英文音色
})
```

---

## 8. 性能优化

### 8.1 延迟分析

| 阶段 | 当前 (CPU) | 目标 (GPU) | 优化手段 |
|------|-----------|-----------|----------|
| VAD 检测 | <1ms | <1ms | 已优化 |
| ASR 转写 | 500ms | 100ms | GPU + CTranslate2 |
| LLM 生成 | 50ms | 50ms | 已优化 (规则) |
| TTS 合成 | 2000ms | 400ms | GPU + 流式 |
| 音频播放 | 0ms | 0ms | 异步播放 |
| **总计** | **~2.5s** | **~0.5s** | |

### 8.2 优化策略

#### 8.2.1 模型预加载

```python
class ModelPool:
    """模型预热和复用"""
    
    def __init__(self):
        self._models = {}
        self._lock = threading.Lock()
    
    def get(self, name: str) -> Any:
        with self._lock:
            if name not in self._models:
                self._models[name] = self._load_model(name)
            return self._models[name]
    
    def preload_all(self):
        """启动时预加载所有模型"""
        for name in ['silero', 'whisper', 'qwen3_tts']:
            threading.Thread(target=self.get, args=(name,)).start()
```

#### 8.2.2 流式 TTS

```python
async def synthesize_stream(self, text: str) -> AsyncGenerator[TTSChunk]:
    """流式 TTS: 边生成边播放"""
    
    # 分句处理 (按标点分割)
    sentences = self._split_sentences(text)
    
    for i, sentence in enumerate(sentences):
        # 生成当前句子的音频
        chunk = await self._generate(sentence)
        
        yield TTSChunk(
            audio=chunk,
            isLast=(i == len(sentences) - 1)
        )
        
        # 可以立即播放当前 chunk，同时生成下一句
```

#### 8.2.3 音频缓冲优化

```python
class AudioBufferManager:
    """环形缓冲区，避免内存分配"""
    
    def __init__(self, max_duration_sec: float = 10.0):
        self.sample_rate = 16000
        self.max_samples = int(self.sample_rate * max_duration_sec)
        self.buffer = np.zeros(self.max_samples, dtype=np.float32)
        self.write_pos = 0
        self.read_pos = 0
    
    def write(self, frame: Float32Array):
        # 无拷贝写入环形缓冲
        ...
    
    def read_segment(self, start: int, end: int) -> Float32Array:
        # 零拷贝读取片段
        ...
```

#### 8.2.4 并发优化

```python
# 使用线程池而非每次创建新线程
from concurrent.futures import ThreadPoolExecutor

class ProcessingPipeline:
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=4)
    
    def process(self, audio: SpeechSegment):
        # 提交到线程池
        future = self.executor.submit(self._process_audio, audio)
        future.add_done_callback(self._on_complete)
```

### 8.3 内存管理

```python
class ResourceManager:
    """资源生命周期管理"""
    
    def __init__(self):
        self._resources = []
    
    def register(self, resource, cleanup_fn):
        self._resources.append((resource, cleanup_fn))
    
    def cleanup(self):
        """显式清理所有资源"""
        for resource, cleanup_fn in reversed(self._resources):
            try:
                cleanup_fn(resource)
            except Exception as e:
                logger.error(f"Cleanup error: {e}")
        self._resources.clear()
```

---

## 9. 实施路线图

### 9.1 阶段划分

```
┌─────────────────────────────────────────────────────────────┐
│                    实施路线图                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  阶段 1: 核心重构 (1-2 周)                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ - 模块化架构实现 (VAD/ASR/TTS/LLM 分离)               │   │
│  │ - 接口定义和工厂模式                                  │   │
│  │ - 状态管理器实现                                      │   │
│  │ - 配置系统重构                                        │   │
│  │ - 单元测试框架                                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  阶段 2: 功能增强 (2-3 周)                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ - 流式 TTS 实现                                       │   │
│  │ - LLM API 集成 (Qwen/GLM)                             │   │
│  │ - 对话历史管理                                        │   │
│  │ - 多语言支持                                          │   │
│  │ - 插件系统                                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  阶段 3: 性能优化 (1-2 周)                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ - GPU 加速支持                                        │   │
│  │ - 内存优化 (环形缓冲)                                 │   │
│  │ - 延迟分析和调优                                      │   │
│  │ - 并发模型优化                                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  阶段 4: 生产就绪 (1 周)                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ - 错误恢复机制                                        │   │
│  │ - 日志和监控                                          │   │
│  │ - 文档完善                                            │   │
│  │ - 压力测试                                            │   │
│  │ - Docker 容器化                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  总周期：5-8 周                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 里程碑

| 里程碑 | 时间 | 交付物 | 验收标准 |
|--------|------|--------|----------|
| **M1: 架构完成** | Week 2 | 模块化代码，接口定义 | 所有组件可独立测试 |
| **M2: 功能完整** | Week 5 | 流式 TTS, LLM 集成 | 端到端延迟 <2s |
| **M3: 性能达标** | Week 7 | GPU 加速，优化报告 | 首句响应 <1s (GPU) |
| **M4: 生产发布** | Week 8 | v3.0 正式版，文档 | 99.9% 可用性，测试覆盖>80% |

### 9.3 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| **Qwen3-TTS GPU 兼容性问题** | 中 | 高 | 保留 CPU 回退方案 |
| **PyAudio Windows 安装困难** | 高 | 中 | 提供预编译 wheel，备选 SoundDevice |
| **流式 TTS 实现复杂** | 中 | 中 | 分阶段实现，先完整后流式 |
| **LLM API 成本超预算** | 低 | 中 | 设置用量限制，本地模型备选 |

---

## 附录

### A. 文件结构 (目标)

```
skills/realtime-voice-chat/
├── src/
│   ├── __init__.ts              # TypeScript 入口
│   ├── orchestrator.ts          # 编排器
│   ├── state-manager.ts         # 状态管理
│   ├── config.ts                # 配置系统
│   │
│   ├── interfaces/
│   │   ├── vad.ts               # VAD 接口定义
│   │   ├── asr.ts               # ASR 接口定义
│   │   ├── tts.ts               # TTS 接口定义
│   │   ├── llm.ts               # LLM 接口定义
│   │   └── audio.ts             # 音频接口定义
│   │
│   ├── services/
│   │   ├── vad/
│   │   │   ├── index.ts         # VAD 服务抽象
│   │   │   ├── silero.ts        # Silero 实现
│   │   │   └── webrtc.ts        # WebRTC 实现
│   │   │
│   │   ├── asr/
│   │   │   ├── index.ts
│   │   │   ├── whisper.ts
│   │   │   └── azure.ts
│   │   │
│   │   ├── tts/
│   │   │   ├── index.ts
│   │   │   ├── qwen3.ts
│   │   │   └── edge.ts
│   │   │
│   │   └── llm/
│   │       ├── index.ts
│   │       ├── rules.ts
│   │       └── qwen-api.ts
│   │
│   ├── audio/
│   │   ├── backend.ts           # 音频后端抽象
│   │   ├── pyaudio.ts           # PyAudio 实现
│   │   └── buffer.ts            # 环形缓冲
│   │
│   └── plugins/
│       ├── manager.ts           # 插件管理器
│       ├── logger.ts            # 日志插件
│       └── metrics.ts           # 指标插件
│
├── python/
│   ├── __init__.py
│   ├── orchestrator.py          # Python 编排器
│   ├── services/                # Python 服务实现
│   └── bindings/                # TS-Python 绑定
│
├── config/
│   ├── default.yaml             # 默认配置
│   ├── production.yaml          # 生产配置
│   └── development.yaml         # 开发配置
│
├── tests/
│   ├── unit/                    # 单元测试
│   ├── integration/             # 集成测试
│   └── e2e/                     # 端到端测试
│
├── docs/
│   ├── ARCHITECTURE.md          # 本文档
│   ├── API.md                   # API 文档
│   ├── DEPLOYMENT.md            # 部署指南
│   └── TROUBLESHOOTING.md       # 故障排除
│
├── package.json
├── requirements.txt
├── tsconfig.json
└── README.md
```

### B. 术语表

| 术语 | 定义 |
|------|------|
| **VAD** | Voice Activity Detection, 语音活动检测 |
| **ASR** | Automatic Speech Recognition, 自动语音识别 |
| **TTS** | Text-To-Speech, 文本转语音 |
| **LLM** | Large Language Model, 大语言模型 |
| **Orchestrator** | 编排器，协调各组件的核心 |
| **Streaming** | 流式处理，边生成边播放 |
| **Interrupt** | 打断，用户说话中断 TTS 播放 |

### C. 参考资料

- [Silero VAD](https://github.com/snakers4/silero-vad)
- [Whisper ASR](https://github.com/openai/whisper)
- [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS)
- [Faster Whisper](https://github.com/guillaumekln/faster-whisper)
- [PyAudio](https://pypi.org/project/pyaudio/)
- [Azure Speech](https://azure.microsoft.com/en-us/products/cognitive-services/speech-to-text)

---

**文档版本**: v1.0  
**最后更新**: 2026-03-06  
**维护者**: 小黄 🐤
