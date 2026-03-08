/**
 * Voice System - 基于 Airi 官方实现
 * https://github.com/proj-airi/webai-example-realtime-voice-chat
 * 
 * 简化整合版 - 直接使用 @huggingface/transformers 和 xsai
 */

import { VAD, createVAD, type VADConfig, type VADEvents } from './libs/vad/vad'
import { VADAudioManager, type VADAudioOptions } from './libs/vad/manager'

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
  tts?: {
    baseURL: string
    apiKey: string
    model: string
    voice: string
  }
}

export interface VoiceSystemState {
  isInitialized: boolean
  isRunning: boolean
  isSpeechDetected: boolean
  error?: string
}

export class VoiceSystem {
  private config: VoiceSystemConfig
  private vad: VAD | null = null
  private audioManager: VADAudioManager | null = null
  private state: VoiceSystemState = {
    isInitialized: false,
    isRunning: false,
    isSpeechDetected: false,
  }
  
  private eventListeners: Partial<Record<keyof VADEvents, Function[]>> = {}

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
        baseURL: 'https://unspeech.ayaka.io/v1/',
        apiKey: '',
        model: '',
        voice: '',
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
      
      this.state.isInitialized = true
      console.log('[VoiceSystem] 初始化完成')
    } catch (error) {
      console.error('[VoiceSystem] 初始化失败:', error)
      this.state.error = error instanceof Error ? error.message : String(error)
      throw error
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
    this.vad = null
    this.audioManager = null
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
  on<K extends keyof VADEvents>(event: K, callback: VADEvents[K] extends Function ? VADEvents[K] : never): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = []
    }
    this.eventListeners[event]!.push(callback as Function)
  }

  /**
   * 移除事件监听
   */
  off<K extends keyof VADEvents>(event: K, callback: VADEvents[K] extends Function ? VADEvents[K] : never): void {
    if (!this.eventListeners[event]) return
    this.eventListeners[event] = this.eventListeners[event]!.filter(cb => cb !== callback)
  }

  /**
   * 触发事件
   */
  private emit<K extends keyof VADEvents>(event: K, data?: VADEvents[K]): void {
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

// 导出底层组件（供高级使用）
export { VAD, createVAD, VADAudioManager }
export type { VADConfig, VADEvents, VADAudioOptions }
