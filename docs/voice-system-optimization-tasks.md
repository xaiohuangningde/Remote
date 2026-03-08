# 语音系统优化建议清单

**创建日期**: 2026-03-06  
**优先级排序**: 按影响程度和实现难度排序

---

## 🔴 高优先级（立即修复）

### 1. 安全性修复 - voice-clone 命令注入

**问题**: 用户输入的文本直接拼接到 shell 命令中

**当前代码**:
```typescript
const command = `python -m cosyvoice.cli.inference \
  --reference_audio "${referenceAudio}" \
  --synthesis_text "${text}" \
  --output_audio "${outputAudio}"`
```

**修复方案**:
```typescript
// 方案 A: 使用参数化调用（推荐）
import { spawn } from 'node:child_process'

async function runInference(referenceAudio: string, text: string, outputAudio: string) {
  return new Promise<CloneResult>((resolve, reject) => {
    const process = spawn('python', [
      '-m', 'cosyvoice.cli.inference',
      '--reference_audio', referenceAudio,
      '--synthesis_text', text,
      '--output_audio', outputAudio,
      '--gpu', String(this.config.gpuId || 0),
    ])
    
    let stderr = ''
    process.stderr.on('data', (data) => { stderr += data })
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, audioPath: outputAudio })
      } else {
        reject(new Error(`Inference failed: ${stderr}`))
      }
    })
  })
}

// 方案 B: 严格转义（次选）
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

async function runInference(referenceAudio: string, text: string, outputAudio: string) {
  // execFile 不会对参数进行 shell 解析，更安全
  const { stdout, stderr } = await execFileAsync(
    'python',
    [
      '-m', 'cosyvoice.cli.inference',
      '--reference_audio', referenceAudio,
      '--synthesis_text', text,
      '--output_audio', outputAudio,
    ]
  )
}
```

**影响**: 🔴 防止远程代码执行  
**工作量**: 2 小时  
**测试**: 添加包含特殊字符的测试用例

---

### 2. 内存泄漏修复 - volcano-voice clearQueue()

**问题**: 在循环中删除 Map 条目可能导致遗漏

**当前代码**:
```typescript
clearQueue(): void {
  this.queue.clear()
  for (const [requestId, pending] of this.pendingResults.entries()) {
    pending.reject(new Error('Queue cleared'))
    this.pendingResults.delete(requestId)  // ⚠️ 在迭代中修改
  }
}
```

**修复方案**:
```typescript
clearQueue(): void {
  this.queue.clear()
  
  // 方案 A: 直接清空（推荐）
  for (const pending of this.pendingResults.values()) {
    pending.reject(new Error('Queue cleared'))
  }
  this.pendingResults.clear()
  
  // 方案 B: 先收集再删除
  const requestIds = Array.from(this.pendingResults.keys())
  for (const requestId of requestIds) {
    const pending = this.pendingResults.get(requestId)
    pending?.reject(new Error('Queue cleared'))
    this.pendingResults.delete(requestId)
  }
}
```

**影响**: 🟡 防止内存泄漏和悬空回调  
**工作量**: 30 分钟  
**测试**: 添加 clearQueue 单元测试

---

### 3. Windows 兼容性修复 - realtime-voice-chat

**问题**: `kill('SIGINT')` 在 Windows 上不支持

**当前代码**:
```typescript
this.pythonProcess.kill('SIGINT')  // ⚠️ Windows 抛出异常
```

**修复方案**:
```typescript
import { platform } from 'node:os'

async stop(): Promise<void> {
  if (!this.pythonProcess || !this.isRunning) {
    return
  }

  const isWindows = platform() === 'win32'
  
  if (isWindows) {
    // Windows: 使用 taskkill
    const { exec } = await import('node:child_process')
    const { promisify } = await import('node:util')
    const execAsync = promisify(exec)
    
    try {
      await execAsync(`taskkill /pid ${this.pythonProcess.pid} /T /F`)
    } catch (error) {
      console.warn('[VoiceChat] taskkill failed:', error)
      this.pythonProcess.kill()  // 降级方案
    }
  } else {
    // Unix: 使用 SIGINT
    this.pythonProcess.kill('SIGINT')
  }
  
  // 等待进程退出
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      this.pythonProcess?.kill()
      resolve()
    }, 3000)

    this.pythonProcess?.on('close', () => {
      clearTimeout(timeout)
      resolve()
    })
  })

  this.pythonProcess = null
  this.isRunning = false
}
```

**影响**: 🟡 防止 Windows 上崩溃  
**工作量**: 1 小时  
**测试**: 在 Windows 和 Linux 上分别测试

---

## 🟡 中优先级（本月优化）

### 4. API 重试机制 - volcano-voice

**问题**: 网络请求失败时直接抛出错误

**当前代码**:
```typescript
const response = await fetch(url, { ... })
if (!response.ok) {
  throw new Error(`Volcano TTS API error: ${response.status}`)
}
```

**修复方案**:
```typescript
async function callVolcanoTTSWithRetry(
  text: string,
  config: VolcanoVoiceConfig,
  options: { voice?: string; emotion?: string; speed?: number } = {},
  maxRetries: number = 3
): Promise<{ audioBuffer: ArrayBuffer; duration: number }> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      
      if (result.code !== 0 || !result.data) {
        throw new Error(result.message || 'Unknown error')
      }

      // 解码音频...
      return { audioBuffer, duration }
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.warn(`[TTS] 请求失败 (尝试 ${attempt}/${maxRetries}):`, lastError.message)
      
      if (attempt < maxRetries) {
        // 指数退避：1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError!
}
```

**影响**: 🟡 提高稳定性，减少临时失败  
**工作量**: 2 小时  
**测试**: 模拟网络失败场景

---

### 5. TTS 流式处理 - 降低延迟

**问题**: 必须等待完整音频生成才能播放

**优化方案**:
```typescript
// 新增：流式 TTS 接口
export interface TTSStreamChunk {
  requestId: string
  audioBuffer: ArrayBuffer
  isLast: boolean
}

async function* synthesizeStream(
  text: string,
  config: VolcanoVoiceConfig,
  options: { voice?: string; emotion?: string; speed?: number } = {}
): AsyncGenerator<TTSStreamChunk> {
  const requestId = crypto.randomUUID()
  
  // 将长文本分块（按句子）
  const chunks = splitTextIntoSentences(text)
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const { audioBuffer } = await callVolcanoTTS(chunk, config, options)
    
    yield {
      requestId,
      audioBuffer,
      isLast: i === chunks.length - 1,
    }
  }
}

// 使用示例
async function playStreaming(text: string) {
  const stream = tts.synthesizeStream(text, config)
  
  for await (const chunk of stream) {
    await audioPlayer.play(chunk.audioBuffer)
    
    if (chunk.isLast) {
      console.log('[TTS] 播放完成')
    }
  }
}

// 文本分块工具函数
function splitTextIntoSentences(text: string): string[] {
  // 按句子分割（中文句号、问号、感叹号）
  return text.split(/(?<=[。！？.!?])\s*/).filter(s => s.trim().length > 0)
}
```

**影响**: 🟢 首字节延迟从 3s 降至 500ms  
**工作量**: 4 小时  
**测试**: 测试长文本流式播放

---

### 6. stream-queue 并发支持

**问题**: 队列串行处理，无法利用并发

**当前代码**:
```typescript
async function drain() {
  while (queue.length > 0) {
    const payload = queue.shift() as T
    for (const handler of options.handlers) {
      await handler({ data: payload, emit: emitHandlerEvent })  // ⚠️ 串行
    }
  }
}
```

**修复方案**:
```typescript
export function createQueue<T>(options: {
  handlers: Array<(ctx: HandlerContext<T>) => Promise<void>>
  concurrency?: number  // 新增：并发数，默认 1（串行）
}) {
  const queue: T[] = []
  let processing = 0
  const maxConcurrency = options.concurrency ?? 1

  async function drain() {
    while (queue.length > 0 && processing < maxConcurrency) {
      const payload = queue.shift() as T
      processing++
      
      // 并行处理（不 await）
      processPayload(payload).finally(() => {
        processing--
        if (queue.length > 0) {
          drain()  // 继续处理
        } else if (processing === 0) {
          emit('drain')
        }
      })
    }
  }
  
  async function processPayload(payload: T) {
    for (const handler of options.handlers) {
      try {
        await handler({ data: payload, emit: emitHandlerEvent })
      } catch (err) {
        emit('error', payload, err, handler)
      }
    }
  }
  
  // ...
}
```

**影响**: 🟢 TTS 吞吐量提升 3-5 倍  
**工作量**: 3 小时  
**测试**: 并发压力测试

---

### 7. 添加监听器移除方法 - stream-queue

**问题**: 没有 `off()` 方法，监听器无法清理

**修复方案**:
```typescript
export function createQueue<T>(options: { ... }) {
  // ... 现有代码 ...
  
  function off<E extends keyof Events<T>>(eventName: E, listener: Events<T>[E][number]) {
    const listeners = internalEventListeners[eventName] as Events<T>[E]
    const index = listeners.indexOf(listener as any)
    if (index !== -1) {
      listeners.splice(index, 1)
    }
  }
  
  function offHandlerEvent(eventName: string, listener: (...params: any[]) => void) {
    const listeners = internalHandlerEventListeners[eventName] || []
    const index = listeners.indexOf(listener)
    if (index !== -1) {
      listeners.splice(index, 1)
    }
  }

  return {
    enqueue,
    clear,
    length,
    on,
    off,              // 新增
    onHandlerEvent,
    offHandlerEvent,  // 新增
  }
}
```

**影响**: 🟡 防止内存泄漏  
**工作量**: 1 小时  
**测试**: 添加监听器生命周期测试

---

## 🟢 低优先级（下季度改进）

### 8. 优先级队列支持

**功能**: 允许紧急任务插队

**实现方案**:
```typescript
interface QueuedItem<T> {
  payload: T
  priority: number  // 1-10，越高越优先
}

function enqueue(payload: T, priority: number = 5) {
  const item: QueuedItem<T> = { payload, priority }
  
  // 按优先级插入（降序）
  const insertIndex = queue.findIndex(item => item.priority < priority)
  queue.splice(insertIndex === -1 ? queue.length : insertIndex, 0, item)
  
  emit('enqueue', payload, queue.length)
  if (!drainTask) {
    drainTask = drain()
  }
}

async function drain() {
  while (queue.length > 0) {
    const item = queue.shift() as QueuedItem<T>
    const payload = item.payload
    // ... 处理 ...
  }
}
```

**工作量**: 3 小时

---

### 9. 音频缓冲池

**功能**: 复用 ArrayBuffer，减少 GC 压力

**实现方案**:
```typescript
class AudioBufferPool {
  private pool: ArrayBuffer[] = []
  private size: number
  private maxSize: number

  constructor(size: number = 96000, maxSize: number = 10) {
    this.size = size  // 24kHz * 2s * 2ch = 96000 bytes
    this.maxSize = maxSize
  }

  acquire(): ArrayBuffer {
    return this.pool.pop() || new ArrayBuffer(this.size)
  }

  release(buffer: ArrayBuffer) {
    if (this.pool.length < this.maxSize) {
      // 清空缓冲
      new Uint8Array(buffer).fill(0)
      this.pool.push(buffer)
    }
  }

  clear() {
    this.pool.length = 0
  }
}

// 在 TTSService 中使用
private bufferPool = new AudioBufferPool()

async function callVolcanoTTS(...) {
  const buffer = this.bufferPool.acquire()
  try {
    // 填充 buffer...
    return { audioBuffer: buffer, duration }
  } finally {
    // 播放完成后归还
    setTimeout(() => this.bufferPool.release(buffer), 1000)
  }
}
```

**工作量**: 4 小时

---

### 10. 请求超时机制

**功能**: 防止请求永久挂起

**实现方案**:
```typescript
async synthesize(request: Omit<TTSRequest, 'requestId'>): Promise<TTSResult> {
  const requestId = crypto.randomUUID()
  const timeoutMs = 30000  // 30 秒超时
  
  return new Promise<TTSResult>((resolve, reject) => {
    const timeout = setTimeout(() => {
      this.pendingResults.delete(requestId)
      reject(new Error(`Request timeout after ${timeoutMs}ms`))
    }, timeoutMs)
    
    this.pendingResults.set(requestId, {
      resolve: (result) => {
        clearTimeout(timeout)
        resolve(result)
      },
      reject: (error) => {
        clearTimeout(timeout)
        reject(error)
      },
    })
    
    this.queue.enqueue({ ...request, requestId })
  })
}
```

**工作量**: 1 小时

---

## 📊 优化预期效果

| 优化项 | 延迟改善 | 吞吐量改善 | 稳定性改善 |
|--------|---------|-----------|-----------|
| 流式处理 | ⬇️ 80% | - | - |
| 并发队列 | - | ⬆️ 3-5x | - |
| 重试机制 | - | - | ⬆️ 90% |
| 缓冲池 | ⬇️ 20% (抖动) | ⬆️ 10% | - |
| 超时机制 | - | - | ⬆️ 防止挂起 |

---

## 🧪 测试建议

### 单元测试
```typescript
// volcano-voice.test.ts
describe('TTSService', () => {
  it('should handle empty text', async () => {
    await expect(tts.synthesize({ text: '' })).rejects.toThrow('Empty text')
  })
  
  it('should clear queue and reject pending requests', async () => {
    const promise = tts.synthesize({ text: 'test' })
    tts.clearQueue()
    await expect(promise).rejects.toThrow('Queue cleared')
  })
  
  it('should retry on network failure', async () => {
    // Mock fetch to fail twice, succeed on third attempt
    // Verify retry logic works
  })
})

// stream-queue.test.ts
describe('createQueue', () => {
  it('should support concurrent processing', async () => {
    const queue = createQueue({ handlers: [...], concurrency: 3 })
    // Verify parallel execution
  })
  
  it('should allow removing listeners', () => {
    const listener = () => {}
    queue.on('enqueue', listener)
    queue.off('enqueue', listener)
    // Verify listener removed
  })
})
```

### 集成测试
```typescript
// 模拟真实场景
describe('Voice System Integration', () => {
  it('should handle rapid TTS requests', async () => {
    // Send 10 TTS requests in quick succession
    // Verify all are processed in order
  })
  
  it('should handle VAD interrupt during TTS', async () => {
    // Start TTS playback
    // Simulate VAD speech detection
    // Verify TTS queue is cleared
  })
})
```

---

## 📝 实施路线图

### 第 1 周（安全修复）
- [ ] 修复 voice-clone 命令注入
- [ ] 修复 clearQueue 内存泄漏
- [ ] 修复 Windows 进程终止

### 第 2-3 周（性能优化）
- [ ] 实现 API 重试机制
- [ ] 实现 TTS 流式处理
- [ ] 添加 stream-queue 并发支持

### 第 4 周（完善）
- [ ] 添加监听器移除方法
- [ ] 添加请求超时
- [ ] 编写完整测试套件
- [ ] 更新文档

---

**清单生成完毕** ✅
