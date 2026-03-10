/**
 * Voice System - 基于 Airi 官方实现 + CosyVoice 3.0 TTS
 * 
 * 整合版：
 * - VAD: Silero VAD (HuggingFace Transformers)
 * - ASR: Whisper (本地)
 * - TTS: CosyVoice 3.0 (本地，流式)
 * - LLM: 可配置
 */

import { VAD, createVAD, type VADConfig, type VADEvents } from './libs/vad/vad'
import { VADAudioManager, type VADAudioOptions } from './libs/vad/manager'
import { 
  createTTSService, 
  type TTSService, 
  type TTSConfig,
  type AudioChunk,
} from './services/tts'

// ==================== 配置 ====================

export interface VoiceSystemConfig {
  vad?: Partial<VADConfig>
  asr?: {
    baseURL: string
    apiKey: string
    model: string
  }
  llm?: {
    baseURL: string
    apiKey: string
    model: string
  }
  tts?: TTSConfig
}

export interface VoiceSystemState {
  isInitialized: boolean
  isRunning: boolean
  isSpeechDetected: boolean
  isProcessing: boolean
  isPlaying: boolean
  error?: string
}

// ==================== 语音系统 ====================

export class VoiceSystem {
  private config: VoiceSystemConfig
  private vad: VAD | null = null
  private audioManager: VADAudioManager | null = null
  private ttsService: TTSService | null = null
  private state: VoiceSystemState = {
    isInitialized: false,
    isRunning: false,
    isSpeechDetected: false,
    isProcessing: false,
    isPlaying: false,
  }
  
  private eventListeners: Partial<Record<keyof VADEvents & string, Function[]>> = {}

  constructor(config: VoiceSystemConfig) {
    this.config = {
      vad: {
        sampleRate: 16000,
        speechThreshold: 0.3,
        exitThreshold: 0.1,
        minSilenceDurationMs: 400,
        speechPadMs: 80,
        minSpeechDurationMs: 250,
        maxBufferDuration: 30,
        newBufferSize: 512,
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
        backend: 'cosyvoice',
        backendConfig: {
          modelPath: 'E:\\TuriX-CUA-Windows\\models\\Fun-CosyVoice3-0.5B-2512',
          promptWavPath: 'C:\\Users\\12132\\.openclaw\\workspace\\models\\CosyVoice\\asset\\zero_shot_prompt.wav',
          promptText: '你好，我是测试文本。<|endofprompt|>',
        },
      },
      ...config,
    }
  }

  /**
   * 初始化系统
   */
  async init(): Promise<void> {
    try {
      console.log('[VoiceSystem] 初始化 VAD...')
      
      // 创建 VAD
      this.vad = await createVAD(this.config.vad)
      
      // 设置事件监听
      this.vad.on('speech-start', () => {
        this.state.isSpeechDetected = true
        this.emit('speech-start')
        console.log('[VoiceSystem] 检测到说话开始')
      })
      
      this.vad.on('speech-end', () => {
        this.state.isSpeechDetected = false
        this.emit('speech-end')
        console.log('[VoiceSystem] 检测到说话结束')
      })
      
      this.vad.on('speech-ready', async ({ buffer, duration }) => {
        console.log(`[VoiceSystem] 语音片段就绪，时长：${duration}ms`)
        this.emit('speech-ready', { buffer, duration })
        
        // 触发 ASR 处理
        this.processSpeech(buffer, duration)
      })
      
      this.vad.on('status', ({ type, message }) => {
        console.log(`[VoiceSystem] 状态：${type} - ${message}`)
        if (type === 'error') {
          this.state.error = message
          this.emit('error', new Error(message))
        }
      })
      
      // 创建音频管理器
      this.audioManager = new VADAudioManager(this.vad, {
        minChunkSize: 512,
        audioContextOptions: {
          sampleRate: 16000,
          latencyHint: 'interactive',
        },
      })
      
      // 初始化音频 worklet
      const workletUrl = new URL('./libs/vad/process.worklet.ts', import.meta.url).href
      await this.audioManager.initialize(workletUrl)
      
      // 初始化 TTS 服务
      console.log('[VoiceSystem] 初始化 TTS 服务...')
      this.ttsService = await createTTSService(this.config.tts!)
      await this.ttsService.init()
      
      // 监听 TTS 事件
      this.ttsService.on('chunk', (chunk: AudioChunk) => {
        this.emit('tts-chunk', chunk)
      })
      
      this.ttsService.on('complete', () => {
        this.emit('tts-complete')
      })
      
      this.ttsService.on('error', (error: Error) => {
        this.emit('error', error)
      })
      
      this.state.isInitialized = true
      console.log('[VoiceSystem] 初始化完成')
    } catch (error) {
      console.error('[VoiceSystem] 初始化失败:', error)
      this.state.error = error instanceof Error ? error.message : String(error)
      throw error
    }
  }

  /**
   * 处理语音（ASR → LLM → TTS）
   */
  private async processSpeech(buffer: Float32Array, duration: number): Promise<void> {
    if (this.state.isProcessing) {
      console.log('[VoiceSystem] 正在处理，跳过')
      return
    }
    
    this.state.isProcessing = true
    this.emit('processing-start')
    
    try {
      // TODO: ASR 识别
      console.log('[VoiceSystem] ASR 识别中...')
      const transcript = '测试文本' // 占位
      
      this.emit('transcript', { text: transcript })
      
      // TODO: LLM 生成回复
      console.log('[VoiceSystem] LLM 生成回复...')
      const reply = '这是测试回复' // 占位
      
      this.emit('reply', { text: reply })
      
      // TTS 合成并播放
      console.log('[VoiceSystem] TTS 合成中...')
      await this.synthesizeAndPlay(reply)
      
    } catch (error) {
      console.error('[VoiceSystem] 处理失败:', error)
      this.emit('error', error)
    } finally {
      this.state.isProcessing = false
      this.emit('processing-end')
    }
  }

  /**
   * 合成并播放（流式）
   */
  private async synthesizeAndPlay(text: string): Promise<void> {
    if (!this.ttsService) {
      throw new Error('TTS 服务未初始化')
    }
    
    this.state.isPlaying = true
    this.emit('playback-start')
    
    const chunks: AudioChunk[] = []
    
    try {
      // 流式合成
      await this.ttsService.synthesizeStreaming(
        text,
        (chunk: AudioChunk) => {
          chunks.push(chunk)
          // TODO: 播放音频片段
          console.log(`[VoiceSystem] 播放音频片段：${chunk.text.substring(0, 20)}...`)
          this.emit('tts-chunk', chunk)
        },
        { streaming: true }
      )
      
      this.emit('playback-end', { interrupted: false })
      
    } catch (error) {
      console.error('[VoiceSystem] TTS 合成失败:', error)
      this.emit('error', error)
    } finally {
      this.state.isPlaying = false
    }
  }

  /**
   * 启动系统（开始监听麦克风）
   */
  async start(): Promise<void> {
    if (!this.state.isInitialized) {
      throw new Error('系统未初始化，请先调用 init()')
    }

    if (!this.audioManager) {
      throw new Error('音频管理器未创建')
    }

    try {
      console.log('[VoiceSystem] 启动麦克风...')
      await this.audioManager.startMicrophone()
      this.state.isRunning = true
      console.log('[VoiceSystem] 已开始监听')
    } catch (error) {
      console.error('[VoiceSystem] 启动失败:', error)
      this.state.error = error instanceof Error ? error.message : String(error)
      throw error
    }
  }

  /**
   * 停止系统
   */
  async stop(): Promise<void> {
    console.log('[VoiceSystem] 停止中...')
    
    await this.audioManager?.stopMicrophone()
    this.state.isRunning = false
    this.state.isSpeechDetected = false
    
    console.log('[VoiceSystem] 已停止')
  }

  /**
   * 销毁系统（释放资源）
   */
  async destroy(): Promise<void> {
    console.log('[VoiceSystem] 销毁中...')
    
    await this.audioManager?.dispose()
    await this.ttsService?.destroy()
    
    this.vad = null
    this.audioManager = null
    this.ttsService = null
    this.state.isInitialized = false
    this.state.isRunning = false
    this.state.isSpeechDetected = false
    
    console.log('[VoiceSystem] 已销毁')
  }

  /**
   * 获取状态
   */
  getState(): VoiceSystemState {
    return { ...this.state }
  }

  /**
   * 注册事件监听
   */
  on<K extends keyof VADEvents | string>(event: K, callback: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = []
    }
    this.eventListeners[event]!.push(callback)
  }

  /**
   * 移除事件监听
   */
  off<K extends keyof VADEvents | string>(event: K, callback: Function): void {
    if (!this.eventListeners[event]) return
    this.eventListeners[event] = this.eventListeners[event]!.filter(cb => cb !== callback)
  }

  /**
   * 触发事件
   */
  private emit<K extends keyof VADEvents | string>(event: K, data?: any): void {
    const listeners = this.eventListeners[event]
    if (listeners) {
      for (const listener of listeners) {
        listener(data)
      }
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<VoiceSystemConfig>): void {
    this.config = { ...this.config, ...config }
    
    if (config.vad && this.vad) {
      this.vad.updateConfig(config.vad)
    }
  }
}

/**
 * 创建语音系统
 */
export function createVoiceSystem(config: VoiceSystemConfig = {}): VoiceSystem {
  return new VoiceSystem(config)
}

// 导出底层组件
export { VAD, createVAD, VADAudioManager }
export { createTTSService }
export type { VADConfig, VADEvents, VADAudioOptions }
export type { TTSService, TTSConfig, AudioChunk, SynthesizeOptions, SynthesizeResult }
