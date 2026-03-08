# Airi vs 我们的语音系统对比分析报告

**审查日期**: 2026-03-06  
**审查标准**: 以 Airi 代码为基准  
**审查员**: Editor (subagent)

---

## 📊 执行摘要

### 核心发现

| 维度 | Airi 项目 | 我们的实现 | 差距 |
|------|----------|-----------|------|
| **架构** | 统一工作流 (llama-flow) | 分散模块 | 🔴 大 |
| **VAD** | Transformers.js (浏览器原生) | ONNX Runtime (Node.js) | 🟡 中 |
| **ASR** | xsAI (OpenAI 兼容 API) | 火山引擎私有 API | 🟡 中 |
| **TTS** | xsAI (OpenAI 兼容 API) | 火山引擎私有 API | 🟡 中 |
| **LLM** | xsAI (OpenAI 兼容 API) | 豆包 API | 🟢 小 |
| **代码行数** | ~500 行 (单文件) | ~1500 行 (分散) | 🔴 冗余 |
| **依赖** | 11 个核心包 | 8 个核心包 | 🟢 相当 |

### 关键结论

1. **Airi 采用标准化 API** (OpenAI 兼容)，我们使用私有 API
2. **Airi 代码集中在浏览器端**，我们混合了 Node.js 和浏览器
3. **Airi 使用工作流引擎**管理状态，我们手动管理
4. **我们的代码有明显冗余**，可删除 60%+

---

## 🔍 详细对比分析

### 1. 架构对比

#### Airi 架构 (推荐)

```
┌─────────────────────────────────────────┐
│           Vue App (index.vue)           │
│  ┌─────────────────────────────────┐   │
│  │   @llama-flow/core Workflow     │   │
│  │                                 │   │
│  │  speech-ready → transcribe     │   │
│  │  transcription → LLM           │   │
│  │  LLM tokens → sentence split   │   │
│  │  sentence → TTS → playback     │   │
│  └─────────────────────────────────   │
└─────────────────────────────────────────┘
         ↑
         │
    ┌────┴────┐
    │   VAD   │
    │ Manager │
    └─────────┘
```

**特点**:
- 单一工作流引擎管理所有状态
- 事件驱动，清晰的数据流
- 所有逻辑在一个文件中 (~400 行)

#### 我们的架构 (需重构)

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ volcano-voice│    │ voice-clone  │    │ realtime-    │
│ (TTS 队列)   │    │ (CosyVoice)  │    │ voice-chat   │
└──────────────┘    └──────────────┘    └──────────────┘
         ↑                   ↑                    ↑
         │                   │                    │
    ┌────┴───────────────────┴────────────────────┴───┐
    │              stream-queue (队列)                │
    └─────────────────────────────────────────────────┘
                    ↓
            ┌───────────────┐
            │  手动状态管理  │
            └───────────────┘
```

**问题**:
- 模块分散，职责不清
- 手动管理状态，容易出错
- 重复代码多（每个模块都有队列）

---

### 2. VAD 实现对比

#### Airi VAD (`vad.ts`)

```typescript
export class VAD {
  private model: PreTrainedModel | null = null
  private state: Tensor
  private buffer: Float32Array
  private isRecording: boolean = false
  private prevBuffers: Float32Array[] = []
  
  constructor(userConfig: Partial<VADConfig> = {}) {
    this.config = {
      sampleRate: 16000,
      speechThreshold: 0.3,
      exitThreshold: 0.1,  // ✅ 双阈值设计
      minSilenceDurationMs: 400,
      speechPadMs: 80,     // ✅ 前后填充
      minSpeechDurationMs: 250,
      maxBufferDuration: 30,
    }
  }
  
  public async processAudio(inputBuffer: Float32Array): Promise<void> {
    const isSpeech = await this.detectSpeech(inputBuffer)
    
    // ✅ 智能缓冲管理
    if (!wasRecording && !isSpeech) {
      // 保存前缀缓冲（用于填充）
      this.prevBuffers.push(inputBuffer.slice(0))
      return
    }
    
    // ✅ 完整的状态机
    if (isSpeech) {
      this.emit('speech-start')
      this.isRecording = true
    } else if (this.postSpeechSamples >= minSilenceDurationSamples) {
      this.processSpeechSegment()  // ✅ 带填充的完整片段
      this.emit('speech-end')
    }
  }
}
```

**优点**:
- ✅ 双阈值设计（进入/退出），防止抖动
- ✅ 前后填充（pre/post padding），保证完整性
- ✅ 使用 Transformers.js，浏览器原生
- ✅ 完整的状态机管理

#### 我们的 VAD (`vad/src/index.ts`)

```typescript
export class VADDetector {
  private config: VADConfig
  private state: VADState = 'silent'
  private model: any = null  // ⚠️ 类型不安全
  
  constructor(config: Partial<VADConfig> = {}) {
    this.config = {
      threshold: 0.5,      // ⚠️ 单阈值
      minSpeechMs: 250,
      minSilenceMs: 300,
    }
  }
  
  processAudio(audioChunk: Float32Array): VADState {
    // ⚠️ 同步处理（阻塞）
    const results = this.model.run({ input: tensor })
    const probability = results.output.data[0] as number
    const isSpeaking = probability > this.config.threshold
    
    // ⚠️ 简单状态切换，无填充
    if (prevState === 'silent' && this.state === 'speaking') {
      this.callbacks.onSpeechStart?.()
    }
    
    return this.state
  }
}
```

**问题**:
- ❌ 单阈值，容易抖动
- ❌ 无前后填充，语音片段不完整
- ❌ 同步处理，可能阻塞
- ❌ 类型不安全 (`any`)
- ❌ 使用 ONNX Runtime，需要 Node.js

**建议**: **直接采用 Airi 的 VAD 实现**

---

### 3. ASR/STT 对比

#### Airi ASR (通过 xsAI)

```typescript
// 在 index.vue 中
import { generateTranscription } from '@xsai/generate-transcription'

// OpenAI 兼容 API
const res = await generateTranscription({
  baseURL: asrProviderBaseURL.value,  // http://localhost:8000/v1/
  file: audioBlob,
  model: asrProviderModel.value,      // whisper-large-v3-turbo
  apiKey: asrProviderAPIKey.value,
})

segments.value[objIndex - 1].transcription = res.text
```

**优点**:
- ✅ OpenAI 兼容 API，可切换后端
- ✅ 支持多种 ASR 引擎（Whisper, SenseVoice 等）
- ✅ 流式处理支持
- ✅ 简单清晰的接口

#### 我们的 ASR (火山引擎)

```typescript
// 未实现完整 ASR，只有 TTS
// 需要单独调用火山引擎 ASR API
```

**问题**:
- ❌ 私有 API，无法切换供应商
- ❌ 没有流式处理
- ❌ 与 TTS 耦合

**建议**: **采用 xsAI 统一接口**

---

### 4. TTS 对比

#### Airi TTS (通过 xsAI)

```typescript
import { generateSpeech } from '@xsai/generate-speech'

const res = await generateSpeech({
  baseURL: ttsProviderBaseURL.value,  // https://unspeech.ayaka.io/v1/
  apiKey: ttsProviderAPIKey.value,
  model: ttsProviderModel.value,
  voice: ttsProviderVoice.value,
  input: text,
})

const audioBuffer = await audioContext.decodeAudioData(res)
```

**特点**:
- ✅ OpenAI 兼容 API
- ✅ 支持多种 TTS 后端（UnSpeech, Speaches 等）
- ✅ 与 LLM 工作流整合

#### 我们的 TTS (volcano-voice)

```typescript
export class TTSService {
  private config: VolcanoVoiceConfig
  private queue: ReturnType<typeof createQueue<TTSRequest>>
  private pendingResults: Map<string, ...> = new Map()
  
  async synthesize(request: Omit<TTSRequest, 'requestId'>): Promise<TTSResult> {
    const requestId = crypto.randomUUID()
    
    return new Promise<TTSResult>((resolve, reject) => {
      this.pendingResults.set(requestId, { resolve, reject })
      this.queue.enqueue({ ...request, requestId })
    })
  }
}
```

**问题**:
- ❌ 私有 API，无法切换
- ❌ 过度工程化（队列管理复杂）
- ❌ 与工作流无整合
- ❌ 代码量大（~300 行 vs Airi 的 ~20 行）

**建议**: **采用 xsAI 接口，删除 stream-queue 封装**

---

### 5. LLM 整合对比

#### Airi LLM (工作流整合)

```typescript
import { streamText } from '@xsai/stream-text'
import { workflowEvent } from '@llama-flow/core'

// 定义事件
const llmTranscriptionEvent = workflowEvent<string, 'transcription'>()
const llmChatCompletionsTokenEvent = workflowEvent<string, 'chat-completions-token'>()
const llmSentenceReadyEvent = workflowEvent<{ text: string, index: number }, 'sentence-ready'>()

// 处理工作流
llmWorkflow.handle([llmTranscriptionEvent], async (event) => {
  const res = await streamText({
    baseURL: llmProviderBaseURL.value,
    apiKey: llmProviderAPIKey.value,
    model: llmProviderModel.value,
    messages: newMessages,
  })
  
  // 流式处理 token
  for await (const textPart of res.textStream) {
    context.sendEvent(llmChatCompletionsTokenEvent.with(textPart))
  }
})

// 按句子分割（带 <break/> 标记）
llmWorkflow.handle([llmChatCompletionsTokenEvent], async (event) => {
  ttsSentenceBuffer.value += event.data
  
  while (true) {
    const markerIndex = ttsSentenceBuffer.value.indexOf('<break/>')
    if (markerIndex === -1) break
    
    const sentenceText = ttsSentenceBuffer.value.substring(0, markerIndex).trim()
    context.sendEvent(llmSentenceReadyEvent.with({ text: sentenceText, index: counter }))
  }
})
```

**优点**:
- ✅ 工作流引擎管理状态
- ✅ 流式处理，低延迟
- ✅ 句子级分割，支持 TTS 流式播放
- ✅ 事件驱动，清晰的数据流

#### 我们的 LLM (无整合)

```typescript
// 没有 LLM 整合代码
// 需要手动调用豆包 API
```

**建议**: **采用 @llama-flow/core + xsAI**

---

### 6. 音频播放对比

#### Airi 音频播放

```typescript
const audioPlaybackQueue = ref<AudioBuffer[]>([])
const pendingAudioBuffers = ref<Map<number, AudioBuffer>>(new Map())
const nextExpectedAudioIndex = ref(0)
const isPlayingAudio = ref(false)

// 有序播放（支持乱序到达）
llmWorkflow.handle([llmTTSOutputEvent], (event): Promise<void> => {
  const { buffer, index } = event.data
  
  // 存储接收到的缓冲
  pendingAudioBuffers.value.set(index, buffer)
  
  // 按顺序入队
  while (pendingAudioBuffers.value.has(nextExpectedAudioIndex.value)) {
    const bufferToPlay = pendingAudioBuffers.value.get(nextExpectedAudioIndex.value)!
    pendingAudioBuffers.value.delete(nextExpectedAudioIndex.value)
    audioPlaybackQueue.value.push(bufferToPlay)
    nextExpectedAudioIndex.value++
  }
  
  playNextAudio()
})

async function playNextAudio() {
  if (isPlayingAudio.value || audioPlaybackQueue.value.length === 0) {
    return
  }
  
  isPlayingAudio.value = true
  const audioBuffer = audioPlaybackQueue.value.shift()!
  
  const source = audioContext.value!.createBufferSource()
  source.buffer = audioBuffer
  source.connect(audioContext.value!.destination)
  
  source.onended = () => {
    isPlayingAudio.value = false
    playNextAudio()
  }
  
  source.start(0)
}
```

**优点**:
- ✅ 支持乱序到达（TTS 可能先完成短句）
- ✅ 保证播放顺序
- ✅ 简单清晰的状态管理

#### 我们的音频播放

```typescript
// 没有实现
// 需要手动管理 AudioContext
```

**建议**: **直接采用 Airi 的实现**

---

## 🗑️ 可删除的文件（冗余代码）

根据 Airi 的标准，以下文件可以删除：

| 文件 | 原因 | 替代方案 |
|------|------|----------|
| `skills/volcano-voice/src/index.ts` | 过度工程化，300 行 | xsAI (`@xsai/generate-speech`) |
| `skills/stream-queue/src/queue.ts` | 不必要的抽象 | 原生 Promise + async/await |
| `skills/vad/src/index.ts` | 功能不完整 | Airi VAD (`vad.ts`) |
| `skills/voice-clone/src/index.ts` | 使用场景有限 | 保留（但简化） |
| `skills/realtime-voice-chat/src/index.ts` | Python 后端复杂 | Airi 纯浏览器实现 |
| `skills/voice-output/SKILL.md` | espeak-ng 质量差 | 使用云端 TTS |

**可删除代码量**: ~1200 行

---

## ✅ 应保留/采用的文件

| 文件 | 原因 | 修改建议 |
|------|------|----------|
| `apps/vad-asr-chat-tts/src/libs/vad/vad.ts` | ✅ 完整的 VAD 实现 | 直接使用 |
| `apps/vad-asr-chat-tts/src/libs/vad/manager.ts` | ✅ 音频管理器 | 直接使用 |
| `apps/vad-asr-chat-tts/src/pages/index.vue` | ✅ 完整工作流示例 | 适配我们的配置 |
| `apps/sherpa-onnx-demo/voiceapi/asr.py` | ✅ 本地 ASR 备选 | 可选部署 |
| `apps/sherpa-onnx-demo/voiceapi/tts.py` | ✅ 本地 TTS 备选 | 可选部署 |

---

## 📋 整合建议

### 方案 A: 完全采用 Airi (推荐)

**步骤**:
1. 删除所有现有语音代码
2. 复制 Airi 的 `vad-asr-chat-tts` 应用
3. 修改配置（API 密钥、模型）
4. 部署到 Netlify/Vercel

**优点**:
- ✅ 代码质量高，经过验证
- ✅ 维护成本低
- ✅ 社区支持

**缺点**:
- ❌ 需要学习新架构（llama-flow）
- ❌ 依赖 xsAI 生态

**预计工作量**: 2-3 天

---

### 方案 B: 混合方案（渐进式）

**步骤**:
1. 保留火山引擎 API（已充值）
2. 采用 Airi 的 VAD 实现
3. 采用 Airi 的工作流管理
4. 逐步替换 TTS/ASR 为 xsAI 兼容

**优点**:
- ✅ 渐进式迁移，风险低
- ✅ 保留现有投资

**缺点**:
- ❌ 过渡期代码复杂
- ❌ 需要维护两层抽象

**预计工作量**: 1-2 周

---

### 方案 C: 最小改动（不推荐）

**步骤**:
1. 仅修复已识别的 Bug
2. 添加文档和测试

**优点**:
- ✅ 改动最小

**缺点**:
- ❌ 架构问题未解决
- ❌ 技术债务累积

**预计工作量**: 3-5 天

---

## 🎯 推荐行动

### 立即执行（本周）

1. **删除冗余代码**
   ```bash
   # 备份后删除
   rm -rf skills/volcano-voice/src
   rm -rf skills/stream-queue/src
   rm -rf skills/vad/src
   ```

2. **采用 Airi VAD**
   ```bash
   # 复制 Airi VAD
   cp -r tmp/airi-voice-ref/apps/vad-asr-chat-tts/src/libs/vad skills/vad-new/
   ```

3. **测试 Airi Demo**
   ```bash
   cd tmp/airi-voice-ref
   pnpm install
   pnpm -F @proj-airi/vad-asr-chat-tts dev
   ```

### 短期目标（本月）

1. **迁移到 xsAI**
   - 安装 `@xsai/generate-speech`, `@xsai/generate-transcription`, `@xsai/stream-text`
   - 替换火山引擎调用

2. **引入工作流引擎**
   - 安装 `@llama-flow/core`
   - 重写状态管理

3. **部署测试环境**
   - Netlify/Vercel 部署
   - 配置环境变量

### 长期目标（下季度）

1. **完全采用 Airi 架构**
2. **贡献回社区**
3. **参与 Airi 项目开发**

---

## 📊 代码质量对比（最终评分）

| 维度 | Airi | 我们 | 改进空间 |
|------|------|------|----------|
| **架构清晰度** | 9/10 | 5/10 | ⬆️ +80% |
| **代码复用** | 8/10 | 4/10 | ⬆️ +100% |
| **可维护性** | 9/10 | 5/10 | ⬆️ +80% |
| **性能** | 8/10 | 6/10 | ⬆️ +33% |
| **文档** | 7/10 | 4/10 | ⬆️ +75% |

**综合评分**:
- **Airi**: **8.2/10** ✅
- **我们**: **4.8/10** ❌

---

## 🔗 参考资源

- [Airi GitHub](https://github.com/proj-airi/webai-example-realtime-voice-chat)
- [Airi Live Demo](https://proj-airi-apps-vad-asr-chat-tts.netlify.app)
- [xsAI Documentation](https://xsai.js.org)
- [llama-flow Documentation](https://llama-flow.com)
- [Project AIRI](https://github.com/moeru-ai/airi)

---

**报告生成完毕** 📝  
**审查员**: Editor (subagent)  
**建议**: 采用方案 A（完全采用 Airi）
