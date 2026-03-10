# 语音系统架构设计文档

> **版本**: v3.0 (状态驱动架构)  
> **创建时间**: 2026-03-06  
> **架构师**: 小黄 🐤  
> **状态**: 实施中

---

## 📋 目录

1. [现状分析](#1-现状分析)
2. [目标架构](#2-目标架构)
3. [组件设计](#3-组件设计)
4. [接口契约](#4-接口契约)
5. [数据流设计](#5-数据流设计)
6. [技术选型](#6-技术选型)
7. [状态驱动开发流程](#7-状态驱动开发流程)
8. [性能优化](#8-性能优化)

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
6. **状态驱动**: Read state → Act → Update state

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
```

---

## 5. 数据流设计

### 5.1 完整对话流程

```
用户说话
   │
   ▼
┌─────────────────┐
│  AudioBackend   │  持续采集音频帧
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   VADService    │  实时检测语音
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  静音      语音
    │         │
    │         ▼
    │   ┌─────────────────┐
    │   │ StateManager    │  LISTENING → RECORDING
    │   └────────┬────────┘
    │            │
    │            ▼
    │     ┌─────────────────┐
    │     │ StateManager    │  RECORDING → PROCESSING
    │     └────────┬────────┘
    │              │
    │              ▼
    │       ┌─────────────────┐
    │       │   ASRService    │  语音识别
    │       └────────┬────────┘
    │                │
    │                ▼
    │         ┌─────────────────┐
    │         │   LLMService    │  生成回复
    │         └────────┬────────┘
    │                  │
    │                  ▼
    │           ┌─────────────────┐
    │           │   TTSService    │  语音合成
    │           └────────┬────────┘
    │                    │
    │                    ▼
    │             ┌─────────────────┐
    │             │ StateManager    │  PROCESSING → PLAYING
    │             └────────┬────────┘
    │                      │
    │                      ▼
    │               ┌─────────────────┐
    │               │  AudioBackend   │  播放音频
    │               └────────┬────────┘
    │                        │
    └────────────────────────┘
                 │
                 ▼
          ┌─────────────┐
          │ StateManager│  PLAYING → LISTENING
          └─────────────┘
                 │
                 ▼
              回到初始状态
```

---

## 6. 技术选型

### 6.1 语言选择

**决策**: **Python 主实现 + TypeScript 封装**

- Python: 核心音频处理、ML 模型
- TypeScript: API 封装、与 OpenClaw 集成

### 6.2 组件选型矩阵

| 组件 | 默认实现 | 备选实现 | 选择理由 |
|------|----------|----------|----------|
| **VAD** | Silero VAD | WebRTC VAD | Silero 准确率高，支持中文 |
| **ASR** | Whisper (local) | Azure Speech | 免费、离线优先 |
| **TTS** | Qwen3-TTS | Edge TTS | Qwen3 中文自然 |
| **LLM** | Rules (初始) | Qwen API | 快速启动，后续升级 |
| **Audio I/O** | PyAudio | SoundDevice | PyAudio 成熟 |

### 6.3 依赖清单

```yaml
# Python 依赖
pyaudio>=0.2.14        # 音频 I/O
numpy>=1.24.0          # 数值计算
torch>=2.0.0           # Silero VAD, Qwen3-TTS
faster-whisper>=0.10.0 # Whisper ASR
qwen-tts>=0.1.0        # Qwen3-TTS

# TypeScript 依赖
{
  "dependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "events": "^3.3.0"
  }
}
```

---

## 7. 状态驱动开发流程

> **核心原则**: Read state → Act → Update state  
> **不要**: 用"本周/下周"时间规划（这是人类模式，不是 Agent 模式）

### 7.1 状态驱动工作流

```
┌─────────────┐
│  读状态文件  │
│ STATE.json  │
└──────┬──────┘
       ↓
┌─────────────┐
│  解析状态    │
│ status/next │
└──────┬──────┘
       ↓
┌─────────────┐
│  决策执行    │
│ blocked?    │
└──────┬──────┘
       ↓
┌─────────────┐
│  更新状态    │
│ 写回文件    │
└─────────────┘
```

### 7.2 状态定义

#### `status` 字段

| 值 | 含义 | 行动 |
|----|------|------|
| `running` | 正常进行中 | 执行 `nextAction` |
| `blocked` | 遇到阻碍 | 尝试解决，3 次失败后求助 |
| `pending` | 等待启动 | 启动最高优先级任务 |
| `done` | 完成 | 归档，清理 |

#### `tasks` 结构

```json
{
  "completed": [
    { "id": 1, "desc": "...", "completedAt": "..." }
  ],
  "inProgress": [
    { "id": 2, "desc": "...", "startedAt": "..." }
  ],
  "pending": [
    { "id": 3, "desc": "...", "priority": "high|medium|low" }
  ]
}
```

### 7.3 任务队列管理

#### 优先级规则

1. **blocked 任务** → 优先解决（3 次尝试后升级）
2. **inProgress 任务** → 继续执行
3. **pending 任务** → 按优先级启动

#### 状态更新时机

- **启动任务**: `pending` → `inProgress`
- **完成任务**: `inProgress` → `completed`
- **遇到阻碍**: `inProgress` → `blocked`
- **解决阻碍**: `blocked` → `inProgress`

### 7.4 状态驱动 vs 时间驱动

| 时间驱动 (❌) | 状态驱动 (✅) |
|--------------|--------------|
| "本周完成 X，下周完成 Y" | "当前状态：running，下一步：执行 Z" |
| 按日历规划 | 按状态文件推进 |
| 中断后丢失上下文 | 随时中断/恢复，状态不丢失 |
| 人类工作模式 | Agent 工作模式 |

### 7.5 相关文件

- `STATE.json` - 实时状态（机器可读）
- `TASK-QUEUE.md` - 任务队列（人类可读）
- `STATE-DRIVEN-FLOW.md` - 状态驱动流程说明

### 7.6 工作原则

- **状态文件是指令，不是建议**
- 读状态 → 执行 → 更新状态
- 不要等提醒，自己推进
- 受阻 3 次后求助

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

启动时预加载所有模型到内存，避免首次调用延迟。

#### 8.2.2 流式 TTS

边生成边播放，降低首包延迟至 400ms。

#### 8.2.3 音频缓冲优化

使用环形缓冲区，避免频繁内存分配。

#### 8.2.4 并发优化

使用线程池处理 ASR/TTS/LLM，避免阻塞主线程。

---

## 附录

### A. 文件结构 (目标)

```
skills/voice-system/
├── src/
│   ├── index.ts              # TypeScript 入口
│   ├── orchestrator.ts       # 编排器
│   ├── state-manager.ts      # 状态管理
│   ├── config.ts             # 配置系统
│   │
│   ├── interfaces/
│   │   ├── vad.ts            # VAD 接口定义
│   │   ├── asr.ts            # ASR 接口定义
│   │   ├── tts.ts            # TTS 接口定义
│   │   └── llm.ts            # LLM 接口定义
│   │
│   ├── services/
│   │   ├── vad/
│   │   ├── asr/
│   │   ├── tts/
│   │   └── llm/
│   │
│   └── audio/
│       ├── backend.ts
│       └── buffer.ts
│
├── config/
│   └── default.yaml
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── STATE.json                # 实时状态
├── TASK-QUEUE.md             # 任务队列
├── STATE-DRIVEN-FLOW.md      # 状态驱动流程
├── ARCHITECTURE.md           # 本文档
├── package.json
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

---

**文档版本**: v1.0  
**最后更新**: 2026-03-06  
**维护者**: 小黄 🐤
