# Airi Web 实时语音对话分析报告

## 项目概述

Airi Web 实现了一个完整的实时语音对话系统，包含 VAD 流式检测、音频管理、ASR 语音识别、LLM 对话和 TTS 语音合成。

**位置**: `skills/voice-system/airi-official/apps/vad-asr-chat-tts/src/`

---

## 核心组件分析

### 1. VAD 流式检测 (`libs/vad/vad.ts`)

#### 架构设计

```typescript
class VAD {
  - model: PreTrainedModel (Silero VAD)
  - buffer: Float32Array (环形缓冲区)
  - state: Tensor (模型状态)
  - isRecording: boolean (录音状态)
  - prevBuffers: Float32Array[] (语音前填充缓冲)
  - postSpeechSamples: number (语音后 silence 计数)
}
```

#### 关键参数配置

```typescript
interface VADConfig {
  sampleRate: 16000,           // 采样率
  speechThreshold: 0.3,        // 语音检测阈值
  exitThreshold: 0.1,          // 退出语音状态阈值
  minSilenceDurationMs: 400,   // 最小静音时长 (ms)
  speechPadMs: 80,             // 语音前后填充 (ms)
  minSpeechDurationMs: 250,    // 最小语音时长
  maxBufferDuration: 30,       // 最大缓冲时长 (秒)
  newBufferSize: 512,          // 输入块大小
}
```

#### 流式检测流程

```
1. processAudio(inputBuffer)
   ↓
2. detectSpeech(buffer) → isSpeech (boolean)
   ↓
3. 状态机转换:
   - !recording && !isSpeech: 存储到 prevBuffers (预填充)
   - !recording && isSpeech: 触发 speech-start, 进入 recording 状态
   - recording && isSpeech: 继续累积, 重置 postSpeechSamples
   - recording && !isSpeech: postSpeechSamples++, 检查是否达到 minSilenceDuration
   ↓
4. processSpeechSegment(): 触发 speech-ready (带完整 buffer)
   ↓
5. reset(): 重置状态
```

#### 语音边界检测逻辑

```typescript
// 语音开始
if (isSpeech && !this.isRecording) {
  emit('speech-start')
  this.isRecording = true
  this.postSpeechSamples = 0
}

// 语音结束 (静音足够长)
if (this.postSpeechSamples >= minSilenceDurationSamples) {
  if (this.bufferPointer < minSpeechDurationSamples) {
    reset() // 太短，丢弃
  } else {
    processSpeechSegment() // 触发 speech-ready
  }
}
```

#### 关键特性

1. **流式推理**: 使用 `inferenceChain` 保证顺序推理
2. **状态保持**: `state` Tensor 在多次推理间传递
3. **预填充缓冲**: `prevBuffers` 保存语音前的音频 (最多 speechPadSamples)
4. **后填充**: 在 speech-ready 时添加 speechPadMs 的静音填充
5. **溢出处理**: 缓冲区满时处理当前段，剩余部分递归处理

---

### 2. 音频管理器 (`libs/vad/manager.ts`)

#### 架构设计

```typescript
class VADAudioManager {
  - audioContext: AudioContext
  - audioWorkletNode: AudioWorkletNode
  - mediaStream: MediaStream
  - sourceNode: MediaStreamAudioSourceNode
  - vad: VAD
}
```

#### 音频处理流程

```
1. initialize(workletUrl)
   - 加载 AudioWorklet 模块 (process.worklet.ts)
   - 创建 worklet node
   - 设置 message 处理器: worklet → vad.processAudio()

2. startMicrophone()
   - 请求麦克风权限
   - 创建 MediaStreamAudioSourceNode
   - 连接: source → worklet → silentGain (保持 graph 活跃)

3. 音频流:
   麦克风 → sourceNode → worklet (分块) → VAD.processAudio()
```

#### 关键设计

1. **Worklet 分块**: AudioWorklet 以固定大小 (512 采样) 输出音频块
2. **静默输出**: 连接到 gain=0 的 GainNode，保持音频图活跃但不播放
3. **资源管理**: dispose() 时完全关闭 AudioContext

---

### 3. 完整流程整合 (`pages/index.vue`)

#### 事件驱动架构

使用 `@llama-flow/core` 的工作流引擎:

```typescript
// 事件定义
const llmInputSpeechEvent = workflowEvent<{buffer, duration}, 'input-speech'>()
const llmTranscriptionEvent = workflowEvent<string, 'transcription'>()
const llmChatCompletionsTokenEvent = workflowEvent<string, 'chat-completions-token'>()
const llmSentenceReadyEvent = workflowEvent<{text, index}, 'sentence-ready'>()
const llmTTSOutputEvent = workflowEvent<{buffer, index}, 'tts-output'>()
```

#### 完整对话流程

```
用户说话
   ↓
VAD 检测 (speech-ready)
   ↓
llmInputSpeechEvent → 转 WAV → ASR 识别
   ↓
llmTranscriptionEvent → LLM 流式对话
   ↓
llmChatCompletionsTokenEvent → 解析 <break/> 标记
   ↓
llmSentenceReadyEvent → TTS 合成 (逐句)
   ↓
llmTTSOutputEvent → 音频队列 → 播放
```

#### 语音打断实现

**当前实现**: 简单的播放队列管理

```typescript
const audioPlaybackQueue = ref<AudioBuffer[]>([])
const pendingAudioBuffers = ref<Map<number, AudioBuffer>>(new Map())
const nextExpectedAudioIndex = ref(0)
const isPlayingAudio = ref(false)

// 按顺序播放
while (pendingAudioBuffers.value.has(nextExpectedAudioIndex.value)) {
  audioPlaybackQueue.value.push(buffer)
  nextExpectedAudioIndex.value++
}
playNextAudio()
```

**注意**: Airi Web 当前**没有实现真正的语音打断** (用户说话时暂停 TTS 播放)。需要在 Python 版本中补充。

#### LLM 流式输出处理

```typescript
// 逐 token 累积，按 <break/> 分句
ttsSentenceBuffer += token
while (true) {
  const markerIndex = ttsSentenceBuffer.indexOf('<break/>')
  if (markerIndex === -1) break
  
  const sentence = ttsSentenceBuffer.substring(0, markerIndex).trim()
  sendEvent(llmSentenceReadyEvent.with({ text: sentence, index: counter++ }))
  ttsSentenceBuffer = ttsSentenceBuffer.substring(markerIndex + '<break/>'.length)
}
```

#### 音频播放队列

```typescript
async function playNextAudio() {
  if (isPlayingAudio.value || audioPlaybackQueue.value.length === 0) return
  
  isPlayingAudio.value = true
  const source = audioContext.createBufferSource()
  source.buffer = audioBuffer
  source.connect(audioContext.destination)
  source.onended = () => {
    isPlayingAudio.value = false
    playNextAudio() // 播放下一个
  }
  source.start(0)
}
```

---

## 关键技术点总结

### 1. VAD 流式检测

| 特性 | Airi 实现 | Python 映射 |
|------|----------|-------------|
| 模型 | Silero VAD (ONNX) | silero_vad.onnx + onnxruntime |
| 状态保持 | Tensor state | numpy array state |
| 流式推理 | inferenceChain (Promise 链) | 同步推理 (GIL 保证顺序) |
| 缓冲管理 | Float32Array 环形缓冲 | numpy array |
| 事件系统 | emit/on/off | asyncio.Queue 或回调 |

### 2. 音频管理

| 特性 | Airi 实现 | Python 映射 |
|------|----------|-------------|
| 音频输入 | Web Audio API + Worklet | PyAudio / sounddevice |
| 分块大小 | 512 采样 | 512 采样 (保持一致) |
| 采样率 | 16000 Hz | 16000 Hz |
| 麦克风 | getUserMedia | PyAudio.get_default_input_device |

### 3. 语音打断

| 特性 | Airi 实现 | Python 方案 |
|------|----------|-------------|
| 打断触发 | ❌ 未实现 | VAD speech-start 时暂停播放 |
| 播放控制 | 简单队列 | 线程标志 + 条件变量 |
| 状态同步 | ref 响应式 | threading.Event |

### 4. LLM 桥接

| 特性 | Airi 实现 | OpenClaw 方案 |
|------|----------|---------------|
| 调用方式 | HTTP API (@xsai/stream-text) | 直接调用 OpenClaw API |
| 流式输出 | ReadableStream | async generator |
| 分句标记 | `<break/>` | 相同约定或句子检测 |

---

## 潜在问题与改进

### 1. 语音打断缺失

**问题**: Airi Web 没有实现用户说话时暂停 TTS 播放。

**Python 方案**:
```python
class InterruptHandler:
    def __init__(self):
        self.is_playing = False
        self.stop_event = threading.Event()
    
    def on_speech_start(self):
        if self.is_playing:
            self.stop_event.set()  # 停止当前播放
    
    def play_audio(self, buffer):
        self.is_playing = True
        self.stop_event.clear()
        # 播放时检查 stop_event
```

### 2. 并发控制

**问题**: JavaScript 单线程，Python 需要显式线程控制。

**Python 方案**:
- 使用 `threading.Lock` 保护共享状态
- 使用 `queue.Queue` 传递音频块
- 使用 `threading.Event` 控制启停

### 3. 模型加载

**问题**: Silero VAD 需要从 HuggingFace 下载。

**Python 方案**:
```python
import onnxruntime as ort
sess = ort.InferenceSession('silero_vad.onnx')
```

---

## 总结

Airi Web 提供了一个完整的实时语音对话参考实现，核心是:

1. **VAD 流式检测**: Silero VAD + 状态保持 + 环形缓冲
2. **音频管理**: Web Audio Worklet 分块 → VAD 处理
3. **事件驱动**: 工作流引擎串联 VAD → ASR → LLM → TTS
4. **逐句合成**: `<break/>` 标记分句，异步 TTS 队列播放

**Python 移植关键点**:
- 使用 `onnxruntime` 替代 `@huggingface/transformers`
- 使用 `PyAudio` 替代 Web Audio API
- 使用 `threading` 管理并发
- 使用 `asyncio` 实现异步 LLM 调用
- 补充语音打断逻辑 (Airi 缺失)
