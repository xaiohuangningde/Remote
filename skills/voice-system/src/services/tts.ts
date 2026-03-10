/**
 * TTS Service Interface
 * 
 * 统一的 TTS 服务接口，支持多种后端：
 * - CosyVoice 3.0 (本地)
 * - Qwen3-TTS (本地)
 * - Edge TTS (云端)
 * - Azure Speech (云端)
 */

import { EventEmitter } from 'events'

// ==================== 类型定义 ====================

export interface TTSConfig {
  /** TTS 后端类型 */
  backend: 'cosyvoice' | 'qwen3' | 'edge' | 'azure'
  /** 后端特定配置 */
  backendConfig?: any
}

export interface SynthesizeOptions {
  /** 输入文本 */
  text: string
  /** 是否流式生成 */
  streaming?: boolean
  /** 语速 */
  speed?: number
  /** 音高 */
  pitch?: number
  /** 音量 */
  volume?: number
  /** 情感 */
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry'
  /** 说话人 ID 或名称 */
  speaker?: string
}

export interface AudioChunk {
  /** 音频数据 */
  data: Float32Array | Buffer
  /** 采样率 */
  sampleRate: number
  /** 文本片段 */
  text: string
  /** 时间戳 */
  timestamp: number
  /** 片段索引 */
  index?: number
}

export interface SynthesizeResult {
  /** 音频数据 */
  audio: Float32Array | Buffer
  /** 采样率 */
  sampleRate: number
  /** 时长（秒） */
  duration: number
  /** 生成时间（毫秒） */
  generationTime: number
  /** 首块延迟（毫秒） */
  firstChunkLatency?: number
}

export type StreamingCallback = (chunk: AudioChunk) => void

// ==================== TTS 服务接口 ====================

export interface TTSService {
  /** 初始化服务 */
  init(): Promise<void>
  
  /** 合成语音（完整） */
  synthesize(text: string, options?: SynthesizeOptions): Promise<SynthesizeResult>
  
  /** 流式合成（边生成边回调） */
  synthesizeStreaming(
    text: string,
    onChunk: StreamingCallback,
    options?: SynthesizeOptions
  ): Promise<void>
  
  /** 销毁服务 */
  destroy(): Promise<void>
  
  /** 获取服务状态 */
  getStatus(): any
  
  /** 事件：音频片段生成 */
  on(event: 'chunk', listener: (chunk: AudioChunk) => void): this
  
  /** 事件：合成完成 */
  on(event: 'complete', listener: () => void): this
  
  /** 事件：错误 */
  on(event: 'error', listener: (error: Error) => void): this
}

// ==================== 抽象基类 ====================

export abstract class BaseTTSService extends EventEmitter implements TTSService {
  protected config: TTSConfig
  protected isReady = false
  
  constructor(config: TTSConfig) {
    super()
    this.config = config
  }
  
  abstract init(): Promise<void>
  abstract synthesize(text: string, options?: SynthesizeOptions): Promise<SynthesizeResult>
  abstract synthesizeStreaming(
    text: string,
    onChunk: StreamingCallback,
    options?: SynthesizeOptions
  ): Promise<void>
  abstract destroy(): Promise<void>
  abstract getStatus(): any
  
  /**
   * 分割文本为句子（用于流式生成）
   */
  protected splitSentences(text: string): string[] {
    // 按中文标点分割
    const sentences = text.split(/([。！？；.!?;])/)
    const result: string[] = []
    
    for (let i = 0; i < sentences.length; i += 2) {
      let sentence = sentences[i]
      if (i + 1 < sentences.length) {
        sentence += sentences[i + 1]
      }
      if (sentence.trim()) {
        result.push(sentence.trim())
      }
    }
    
    return result
  }
}

// ==================== 工厂函数 ====================

/**
 * 创建 TTS 服务实例
 */
export async function createTTSService(config: TTSConfig): Promise<TTSService> {
  switch (config.backend) {
    case 'cosyvoice':
      const { CosyVoiceTTSService } = await import('./services/tts-cosyvoice')
      return new CosyVoiceTTSService(config.backendConfig) as any
    
    case 'qwen3':
      // TODO: 实现 Qwen3-TTS 服务
      throw new Error('Qwen3-TTS 后端尚未实现')
    
    case 'edge':
      // TODO: 实现 Edge TTS 服务
      throw new Error('Edge TTS 后端尚未实现')
    
    case 'azure':
      // TODO: 实现 Azure Speech 服务
      throw new Error('Azure Speech 后端尚未实现')
    
    default:
      throw new Error(`未知的 TTS 后端：${config.backend}`)
  }
}

// ==================== 默认配置 ====================

export const DEFAULT_TTS_CONFIG: TTSConfig = {
  backend: 'cosyvoice',
  backendConfig: {
    modelPath: 'E:\\TuriX-CUA-Windows\\models\\Fun-CosyVoice3-0.5B-2512',
    promptWavPath: 'C:\\Users\\12132\\.openclaw\\workspace\\models\\CosyVoice\\asset\\zero_shot_prompt.wav',
    promptText: '你好，我是测试文本。<|endofprompt|>',
  },
}
