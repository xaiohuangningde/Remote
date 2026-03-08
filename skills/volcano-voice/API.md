# Volcano Voice API 文档

> 火山引擎全模态语音服务 - TTS/ASR/RTC 完整 API 参考

**版本**: 2.0.0  
**最后更新**: 2026-03-06  
**维护者**: xiaoxiaohuang 🐤

---

## 📖 目录

1. [快速开始](#快速开始)
2. [核心类](#核心类)
3. [TTS 服务](#tts-服务)
4. [队列管理](#队列管理)
5. [VAD 语音打断](#vad-语音打断)
6. [使用示例](#使用示例)
7. [故障排查](#故障排查)
8. [API 参考](#api-参考)

---

## 🚀 快速开始

### 安装依赖

```bash
# 确保已安装 Node.js 18+
npm install onnxruntime-node  # VAD 依赖
```

### 配置凭据

创建配置文件 `~/.openclaw/workspace/ai-companion/config/volcengine.json`:

```json
{
  "accessKeyId": "YOUR_ACCESS_KEY_ID",
  "accessKeySecret": "YOUR_ACCESS_KEY_SECRET",
  "tts": {
    "appId": "YOUR_TTS_APP_ID",
    "accessToken": "YOUR_TTS_ACCESS_TOKEN"
  },
  "asr": {
    "appId": "YOUR_ASR_APP_ID",
    "accessToken": "YOUR_ASR_ACCESS_TOKEN"
  },
  "rtc": {
    "appId": "YOUR_RTC_APP_ID",
    "appKey": "YOUR_RTC_APP_KEY"
  }
}
```

### 基础使用

```typescript
import { TTSService } from 'skills/volcano-voice/src/index.ts'

// 创建 TTS 服务实例
const tts = new TTSService({
  appId: 'your-app-id',
  accessToken: 'your-token',
})

// 合成语音
const result = await tts.synthesize({
  text: '你好，这是语音合成测试',
  voice: 'BV001_streaming',
  emotion: 'neutral',
})

// 播放音频（使用 Web Audio API 或其他播放器）
await playAudio(result.audioBuffer!)
```

---

## 🏗️ 核心类

### TTSService

火山引擎 TTS 服务主类，整合队列管理。

#### 构造函数

```typescript
new TTSService(
  config: VolcanoVoiceConfig,
  enableVAD?: boolean = false
)
```

**参数**:
- `config`: 火山引擎配置
  - `appId`: 应用 ID
  - `accessToken`: 访问令牌
  - `cluster?`: 集群名称（默认 `volcano_tts`）
- `enableVAD`: 是否启用语音打断（默认 `false`）

**示例**:
```typescript
const tts = new TTSService({
  appId: '123456',
  accessToken: 'abc123',
  cluster: 'volcano_tts',
}, true)  // 启用 VAD
```

---

### VADDetector

语音活动检测器，用于实时打断。

#### 构造函数

```typescript
new VADDetector(config?: Partial<VADConfig>)
```

**配置**:
```typescript
interface VADConfig {
  threshold: number       // 检测阈值 (0-1)，默认 0.5
  minSpeechMs: number     // 最小语音长度，默认 250ms
  minSilenceMs: number    // 最小静音长度，默认 300ms
}
```

**示例**:
```typescript
const vad = new VADDetector({
  threshold: 0.3,      // 更敏感
  minSpeechMs: 200,    // 更短触发
  minSilenceMs: 400,   // 更长判断结束
})
```

---

## 🔊 TTS 服务

### synthesize() - 单个请求

合成单个 TTS 请求。

**签名**:
```typescript
async synthesize(
  request: Omit<TTSRequest, 'requestId'>
): Promise<TTSResult>
```

**参数**:
```typescript
interface TTSRequest {
  text: string                          // 要合成的文本
  voice?: string                        // 音色（默认 'BV001_streaming'）
  emotion?: 'neutral' | 'happy' | 'sad' | 'angly'  // 情感
  speed?: number                        // 语速（0.5-2.0，默认 1.0）
  callback?: (result: TTSResult) => void  // 回调函数
}
```

**返回**:
```typescript
interface TTSResult {
  requestId: string      // 请求 ID
  success: boolean       // 是否成功
  audioBuffer?: ArrayBuffer  // 音频数据
  audioUrl?: string      // 音频 URL（如有）
  duration?: number      // 时长（秒）
  error?: string         // 错误信息（如失败）
}
```

**示例**:
```typescript
// 基础用法
const result = await tts.synthesize({
  text: '你好世界',
})

// 带情感
const happyResult = await tts.synthesize({
  text: '太棒了！我们成功了！',
  emotion: 'happy',
  speed: 1.2,  // 稍快
})

// 带回调
await tts.synthesize({
  text: '这是回调示例',
  callback: (result) => {
    console.log('TTS 完成:', result.requestId)
  },
})
```

**错误处理**:
```typescript
try {
  const result = await tts.synthesize({ text: '测试' })
  if (!result.success) {
    console.error('TTS 失败:', result.error)
  }
} catch (error) {
  console.error('请求异常:', error)
}
```

---

### synthesizeBatch() - 批量请求

批量合成多个 TTS 请求。

**签名**:
```typescript
async synthesizeBatch(
  requests: Array<Omit<TTSRequest, 'requestId'>>
): Promise<TTSResult[]>
```

**示例**:
```typescript
const results = await tts.synthesizeBatch([
  { text: '第一条消息' },
  { text: '第二条消息' },
  { text: '第三条消息' },
])

// 按顺序播放
for (const result of results) {
  await playAudio(result.audioBuffer!)
}
```

**注意**: 请求会按顺序入队，但完成顺序可能不同。使用 `Promise.all` 等待所有完成。

---

### getQueueLength() - 获取队列长度

**签名**:
```typescript
getQueueLength(): number
```

**示例**:
```typescript
console.log('待处理请求数:', tts.getQueueLength())
```

---

### clearQueue() - 清空队列

清空所有待处理请求，并拒绝所有 pending 请求。

**签名**:
```typescript
clearQueue(): void
```

**示例**:
```typescript
// VAD 检测到用户说话时清空队列
vad.on('speech-start', () => {
  console.log('用户开始说话，清空 TTS 队列')
  tts.clearQueue()
})
```

**注意**: 已处理的请求不受影响，只有队列中的请求会被拒绝。

---

## 📦 队列管理

### 访问底层队列

```typescript
const queue = tts.queue

// 监听事件
queue.on('enqueue', (payload, length) => {
  console.log(`任务入队，队列长度：${length}`)
})

queue.on('dequeue', (payload, length) => {
  console.log(`任务出队，队列长度：${length}`)
})

queue.on('drain', () => {
  console.log('所有任务完成')
})

queue.on('error', (payload, error) => {
  console.error(`任务失败 [${payload.requestId}]:`, error)
})
```

### 监听 TTS 自定义事件

```typescript
// 验证通过
queue.onHandlerEvent('tts-validated', (requestId) => {
  console.log(`请求 ${requestId} 已验证`)
})

// 处理中
queue.onHandlerEvent('tts-processing', (requestId) => {
  console.log(`请求 ${requestId} 正在处理...`)
})

// 完成
queue.onHandlerEvent('tts-complete', (requestId, { audioBuffer, duration }) => {
  console.log(`请求 ${requestId} 完成，时长 ${duration?.toFixed(2)}s`)
})

// 错误
queue.onHandlerEvent('tts-error', (requestId, error) => {
  console.error(`请求 ${requestId} 失败:`, error)
})
```

### 移除监听器

```typescript
const listener = (payload, length) => {
  console.log('队列变化')
}

// 添加监听器
queue.on('enqueue', listener)

// 移除监听器（防止内存泄漏）
queue.off('enqueue', listener)
```

---

## 🎤 VAD 语音打断

### 启用 VAD

**方式 1**: 构造函数启用
```typescript
const tts = new TTSService(config, true)  // enableVAD = true
```

**方式 2**: 手动启用
```typescript
await tts.enableVAD()
```

### 处理音频流

```typescript
// 从麦克风获取音频流
const audioContext = new AudioContext()
const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
const source = audioContext.createMediaStreamSource(stream)
const processor = audioContext.createScriptProcessor(4096, 1, 1)

processor.onaudioprocess = (e) => {
  const audioChunk = e.inputBuffer.getChannelData(0)
  tts.processAudio(audioChunk)  // 处理音频
}

source.connect(processor)
processor.connect(audioContext.destination)
```

### 监听 VAD 事件

```typescript
tts.vad?.on('speech-start', () => {
  console.log('检测到用户说话')
  tts.clearQueue()  // 清空待播放队列
})

tts.vad?.on('speech-end', () => {
  console.log('用户说话结束')
  // 可以继续播放或等待回复
})
```

---

## 💡 使用示例

### 示例 1: 带超时的 TTS 请求

```typescript
async function synthesizeWithTimeout(
  tts: TTSService,
  text: string,
  timeoutMs: number = 30000
): Promise<TTSResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const result = await tts.synthesize({
      text,
      callback: (result) => {
        if (!result.success) {
          controller.abort()
        }
      },
    })
    return result
  } catch (error) {
    if ((error as any).name === 'AbortError') {
      throw new Error(`TTS 请求超时 (${timeoutMs}ms)`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

// 使用
try {
  const result = await synthesizeWithTimeout(tts, '你好', 10000)
  console.log('合成成功:', result.duration)
} catch (error) {
  console.error('合成失败:', error)
}
```

---

### 示例 2: 优先级队列

```typescript
// 扩展 TTSService 支持优先级
class PriorityTTSService extends TTSService {
  async synthesizePriority(
    request: Omit<TTSRequest, 'requestId'>,
    priority: 'low' | 'normal' | 'high' | 'urgent'
  ): Promise<TTSResult> {
    const priorityMap = {
      low: 1,
      normal: 5,
      high: 8,
      urgent: 10,
    }
    
    // 插入到队列的合适位置
    const requestId = crypto.randomUUID()
    
    return new Promise<TTSResult>((resolve, reject) => {
      this.pendingResults.set(requestId, { resolve, reject })
      
      // 自定义入队逻辑（需要修改 stream-queue）
      this.queue.enqueueWithPriority({
        ...request,
        requestId,
      }, priorityMap[priority])
    })
  }
}

// 使用
await tts.synthesizePriority({ text: '普通消息' }, 'normal')
await tts.synthesizePriority({ text: '紧急打断！' }, 'urgent')  // 插队
```

---

### 示例 3: 流式播放

```typescript
async function* streamTTS(
  tts: TTSService,
  text: string,
  options: { voice?: string; emotion?: string } = {}
): AsyncGenerator<ArrayBuffer> {
  // 将长文本按句子分割
  const sentences = text.split(/(?<=[。！？.!?])\s*/).filter(s => s.trim())
  
  for (const sentence of sentences) {
    const result = await tts.synthesize({
      text: sentence,
      ...options,
    })
    
    if (result.success && result.audioBuffer) {
      yield result.audioBuffer
    }
  }
}

// 使用
async function playStreaming(text: string) {
  const audioContext = new AudioContext()
  
  for await (const chunk of streamTTS(tts, text)) {
    const audioBuffer = await audioContext.decodeAudioData(
      chunk.slice(0)  // ArrayBuffer 需要复制
    )
    
    const source = audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(audioContext.destination)
    source.start()
    
    // 等待播放完成
    await new Promise(resolve => source.onended = resolve)
  }
}
```

---

### 示例 4: 错误重试

```typescript
async function synthesizeWithRetry(
  tts: TTSService,
  request: Omit<TTSRequest, 'requestId'>,
  maxRetries: number = 3
): Promise<TTSResult> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await tts.synthesize(request)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.warn(`TTS 失败 (尝试 ${attempt}/${maxRetries}):`, lastError.message)
      
      if (attempt < maxRetries) {
        // 指数退避：1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError!
}

// 使用
try {
  const result = await synthesizeWithRetry(tts, { text: '你好' }, 5)
  console.log('最终成功:', result.duration)
} catch (error) {
  console.error('所有重试失败:', error)
}
```

---

### 示例 5: 批量处理与进度追踪

```typescript
interface ProgressCallback {
  (completed: number, total: number, current: string): void
}

async function synthesizeBatchWithProgress(
  tts: TTSService,
  texts: string[],
  onProgress: ProgressCallback
): Promise<TTSResult[]> {
  const results: TTSResult[] = []
  const total = texts.length
  
  // 监听队列事件
  const completed = new Set<string>()
  
  const unsubscribe = () => {
    tts.queue.offHandlerEvent('tts-complete', onComplete)
    tts.queue.offHandlerEvent('tts-error', onError)
  }
  
  const onComplete = (requestId: string) => {
    completed.add(requestId)
    onProgress(completed.size, total, texts[completed.size - 1] || '')
    
    if (completed.size === total) {
      unsubscribe()
    }
  }
  
  const onError = (requestId: string, error: Error) => {
    completed.add(requestId)
    console.error(`请求 ${requestId} 失败:`, error)
    onProgress(completed.size, total, texts[completed.size - 1] || '')
    
    if (completed.size === total) {
      unsubscribe()
    }
  }
  
  tts.queue.onHandlerEvent('tts-complete', onComplete)
  tts.queue.onHandlerEvent('tts-error', onError)
  
  // 批量入队
  const promises = texts.map(text => tts.synthesize({ text }))
  return Promise.all(promises)
}

// 使用
const texts = ['第一章', '第二章', '第三章', '第四章', '第五章']

const results = await synthesizeBatchWithProgress(
  tts,
  texts,
  (completed, total, current) => {
    console.log(`进度：${completed}/${total} - ${current.substring(0, 20)}...`)
  }
)
```

---

## 🐛 故障排查

### 常见问题

#### 1. "Volcano TTS API error: 401 Unauthorized"

**原因**: 凭据无效或过期

**解决方案**:
```bash
# 检查配置文件
cat ~/.openclaw/workspace/ai-companion/config/volcengine.json

# 验证凭据
curl -X POST https://openspeech.bytedance.com/api/v1/tts \
  -H "Content-Type: application/json" \
  -d '{"app": {"appid": "YOUR_APP_ID", "token": "YOUR_TOKEN"}}'
```

#### 2. "VAD 未初始化"

**原因**: 未调用 `enableVAD()` 就使用 VAD 功能

**解决方案**:
```typescript
// 确保先初始化
await tts.enableVAD()

// 或者在构造函数中启用
const tts = new TTSService(config, true)
```

#### 3. 队列中的请求永远不处理

**原因**: 队列处理器抛出未捕获异常

**解决方案**:
```typescript
// 监听队列错误事件
tts.queue.on('error', (payload, error) => {
  console.error('队列错误:', error)
})

// 检查处理器代码是否有 try-catch
```

#### 4. 内存泄漏

**症状**: 长时间运行后内存占用持续增长

**检查**:
```typescript
// 检查 pendingResults 大小
console.log('Pending requests:', tts.pendingResults.size)

// 检查队列长度
console.log('Queue length:', tts.getQueueLength())
```

**解决方案**:
```typescript
// 添加请求超时
async synthesize(request) {
  const timeout = setTimeout(() => {
    this.pendingResults.delete(requestId)
  }, 30000)
  
  this.pendingResults.set(requestId, {
    resolve: (result) => clearTimeout(timeout),
    reject: (error) => clearTimeout(timeout),
  })
}
```

#### 5. 音频播放有杂音

**原因**: 采样率不匹配或缓冲问题

**解决方案**:
```typescript
// 确保音频格式正确
const audioContext = new AudioContext({ sampleRate: 24000 })

// 检查音频缓冲
console.log('Buffer size:', audioBuffer.byteLength)
console.log('Expected duration:', audioBuffer.byteLength / (24000 * 2))
```

---

### 调试模式

启用详细日志:

```typescript
// 在环境变量中设置
process.env.VOLCANO_VOICE_DEBUG = 'true'

// 或在代码中
const tts = new TTSService(config)
tts.queue.on('enqueue', (payload) => {
  console.log('[DEBUG] Enqueue:', payload)
})
tts.queue.on('dequeue', (payload) => {
  console.log('[DEBUG] Dequeue:', payload)
})
```

---

### 性能监控

```typescript
// 监控队列性能
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageDuration: 0,
}

tts.queue.on('enqueue', () => {
  metrics.totalRequests++
})

tts.queue.onHandlerEvent('tts-complete', (requestId, { duration }) => {
  metrics.successfulRequests++
  metrics.averageDuration = (metrics.averageDuration + duration!) / 2
})

tts.queue.onHandlerEvent('tts-error', () => {
  metrics.failedRequests++
})

// 定期报告
setInterval(() => {
  console.table(metrics)
}, 60000)
```

---

## 📚 API 参考

### 类型定义

```typescript
// TTS 请求
interface TTSRequest {
  text: string
  voice?: string
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry'
  speed?: number
  requestId: string
  callback?: (result: TTSResult) => void
}

// TTS 结果
interface TTSResult {
  requestId: string
  success: boolean
  audioUrl?: string
  audioBuffer?: ArrayBuffer
  duration?: number
  error?: string
}

// 火山引擎配置
interface VolcanoVoiceConfig {
  appId: string
  accessToken: string
  cluster?: string
}

// VAD 配置
interface VADConfig {
  threshold: number
  minSpeechMs: number
  minSilenceMs: number
}

// VAD 状态
type VADState = 'silent' | 'speaking'
```

### 事件列表

| 事件 | 参数 | 说明 |
|------|------|------|
| `enqueue` | `(payload, queueLength)` | 任务入队 |
| `dequeue` | `(payload, queueLength)` | 任务出队 |
| `process` | `(payload, handler)` | 开始处理 |
| `error` | `(payload, error, handler)` | 处理错误 |
| `result` | `(payload, result, handler)` | 处理完成 |
| `drain` | `()` | 队列清空 |
| `tts-validated` | `(requestId)` | 请求验证通过 |
| `tts-processing` | `(requestId)` | 开始处理 TTS |
| `tts-complete` | `(requestId, { audioBuffer, duration })` | TTS 完成 |
| `tts-error` | `(requestId, error)` | TTS 错误 |

---

## 🔗 相关资源

- [火山引擎 TTS 文档](https://www.volcengine.com/docs/6561/79817)
- [stream-queue 文档](../../stream-queue/README.md)
- [VAD 文档](../../vad/README.md)
- [示例代码](../../voice-test/)

---

**文档维护**: xiaoxiaohuang  
**反馈问题**: 提交 Issue 或联系 @xiaoning999998
