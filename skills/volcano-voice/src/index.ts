/**
 * Volcano Voice - 火山引擎语音服务
 * 整合 stream-queue 进行 TTS 请求队列管理
 */

import { createQueue } from '../../stream-queue/src/queue.ts'

// ============ 类型定义 ============

export interface TTSRequest {
  text: string
  voice?: string
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry'
  speed?: number
  requestId: string
  callback?: (result: TTSResult) => void
}

export interface TTSResult {
  requestId: string
  success: boolean
  audioUrl?: string
  audioBuffer?: ArrayBuffer
  duration?: number
  error?: string
}

export interface VolcanoVoiceConfig {
  appId: string
  accessToken: string
  cluster?: string
}

// ============ Volcano TTS API 调用 ============

async function callVolcanoTTS(
  text: string,
  config: VolcanoVoiceConfig,
  options: { voice?: string; emotion?: string; speed?: number } = {}
): Promise<{ audioBuffer: ArrayBuffer; duration: number }> {
  const url = 'https://openspeech.bytedance.com/api/v1/tts'
  
  const body = {
    app: {
      appid: config.appId,
      token: config.accessToken,
      cluster: options.cluster || 'volcano_tts',
    },
    user: {
      uid: 'openclaw-user',
    },
    audio: {
      voice_type: options.voice || 'BV001_streaming',
      encoding: 'wav',
      compression_rate: 1,
      rate: 24000,
      speed_ratio: options.speed || 1.0,
      volume_ratio: 1.0,
      pitch_ratio: 1.0,
    },
    request: {
      reqid: crypto.randomUUID(),
      text: text,
      text_type: 'plain',
      operation: 'query',
      with_frontend: 1,
      frontend_type: 'unitTson',
    },
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Volcano TTS API error: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()
  
  if (result.code !== 0 || !result.data) {
    throw new Error(`Volcano TTS error: ${result.message || 'Unknown error'}`)
  }

  // 解码 base64 音频
  const audioBase64 = result.data.audio
  const audioBuffer = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0)).buffer
  
  // 估算时长（WAV 24kHz 16bit）
  const duration = result.data.duration || (audioBuffer.byteLength / (24000 * 2))

  return { audioBuffer, duration }
}

// ============ TTS 队列服务 ============

export class TTSService {
  private config: VolcanoVoiceConfig
  private queue: ReturnType<typeof createQueue<TTSRequest>>
  private pendingResults: Map<string, { resolve: (r: TTSResult) => void; reject: (e: Error) => void }> = new Map()
  private vadEnabled: boolean = false
  private vad?: any // VADDetector

  constructor(config: VolcanoVoiceConfig, enableVAD: boolean = false) {
    this.config = config

    // 创建 TTS 队列，使用 stream-queue
    this.queue = createQueue<TTSRequest>({
      handlers: [
        // 处理器 1: 验证请求
        async (ctx) => {
          if (!ctx.data.text || ctx.data.text.trim().length === 0) {
            throw new Error('Empty text')
          }
          ctx.emit('tts-validated', ctx.data.requestId)
        },
        // 处理器 2: 调用火山 TTS API
        async (ctx) => {
          ctx.emit('tts-processing', ctx.data.requestId)
          
          try {
            const { audioBuffer, duration } = await callVolcanoTTS(
              ctx.data.text,
              this.config,
              {
                voice: ctx.data.voice,
                emotion: ctx.data.emotion,
                speed: ctx.data.speed,
              }
            )
            
            ctx.emit('tts-complete', ctx.data.requestId, { audioBuffer, duration })
            return { audioBuffer, duration }
          } catch (error) {
            ctx.emit('tts-error', ctx.data.requestId, error)
            throw error
          }
        },
        // 处理器 3: 通知回调
        async (ctx) => {
          if (ctx.data.callback) {
            ctx.data.callback({
              requestId: ctx.data.requestId,
              success: true,
            })
          }
        },
      ],
    })

    // 监听队列事件
    this.setupEventListeners()
    
    if (enableVAD) {
      this.enableVAD()
    }
  }

  /**
   * 启用 VAD 语音打断
   */
  async enableVAD(): Promise<void> {
    const { VADDetector } = await import('../../vad/src/index.ts')
    this.vad = new VADDetector()
    await this.vad.init()
    
    this.vad.on('speech-start', () => {
      console.log('[TTS] 检测到用户说话，暂停播放')
      this.clearQueue() // 清空待播放队列
    })
    
    this.vadEnabled = true
  }

  /**
   * 处理麦克风音频流
   */
  processAudio(audioChunk: Float32Array): void {
    if (this.vadEnabled && this.vad) {
      this.vad.processAudio(audioChunk)
    }
  }

  private setupEventListeners() {
    // 验证通过
    this.queue.onHandlerEvent('tts-validated', (requestId) => {
      console.log(`[TTS] 请求 ${requestId} 已验证`)
    })

    // 处理中
    this.queue.onHandlerEvent('tts-processing', (requestId) => {
      console.log(`[TTS] 请求 ${requestId} 正在处理...`)
    })

    // 完成
    this.queue.onHandlerEvent('tts-complete', (requestId, { audioBuffer, duration }) => {
      console.log(`[TTS] 请求 ${requestId} 完成，时长 ${duration?.toFixed(2)}s`)
      this.resolveRequest(requestId, {
        requestId,
        success: true,
        audioBuffer,
        duration,
      })
    })

    // 错误
    this.queue.onHandlerEvent('tts-error', (requestId, error) => {
      console.error(`[TTS] 请求 ${requestId} 失败:`, error)
      this.rejectRequest(requestId, error instanceof Error ? error : new Error(String(error)))
    })

    // 队列错误
    this.queue.on('error', (payload, error) => {
      console.error(`[TTS 队列] 处理失败 [${payload.requestId}]:`, error)
    })

    // 队列清空
    this.queue.on('drain', () => {
      console.log('[TTS 队列] 所有任务完成')
    })
  }

  private resolveRequest(requestId: string, result: TTSResult) {
    const pending = this.pendingResults.get(requestId)
    if (pending) {
      pending.resolve(result)
      this.pendingResults.delete(requestId)
    }
  }

  private rejectRequest(requestId: string, error: Error) {
    const pending = this.pendingResults.get(requestId)
    if (pending) {
      pending.reject(error)
      this.pendingResults.delete(requestId)
    }
  }

  /**
   * 添加 TTS 请求到队列
   */
  async synthesize(request: Omit<TTSRequest, 'requestId'>): Promise<TTSResult> {
    const requestId = crypto.randomUUID()
    
    return new Promise<TTSResult>((resolve, reject) => {
      this.pendingResults.set(requestId, { resolve, reject })
      
      this.queue.enqueue({
        ...request,
        requestId,
      })
    })
  }

  /**
   * 批量添加 TTS 请求
   */
  async synthesizeBatch(requests: Array<Omit<TTSRequest, 'requestId'>>): Promise<TTSResult[]> {
    const promises = requests.map(req => this.synthesize(req))
    return Promise.all(promises)
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.queue.length()
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    this.queue.clear()
    // 拒绝所有待处理的请求
    for (const [requestId, pending] of this.pendingResults.entries()) {
      pending.reject(new Error('Queue cleared'))
      this.pendingResults.delete(requestId)
    }
  }
}

// ============ 导出 ============

export { createQueue } from '../../stream-queue/src/queue.ts'
