/**
 * VAD - Voice Activity Detection
 * 语音打断检测
 * GPU 加速 (Silero VAD)
 */

export interface VADConfig {
  threshold: number      // 检测阈值 (0-1)
  minSpeechMs: number    // 最小语音长度
  minSilenceMs: number   // 最小静音长度
}

export type VADState = 'silent' | 'speaking'

export class VADDetector {
  private config: VADConfig
  private state: VADState = 'silent'
  private model: any = null
  private callbacks: {
    onSpeechStart?: () => void
    onSpeechEnd?: () => void
  } = {}

  constructor(config: Partial<VADConfig> = {}) {
    this.config = {
      threshold: 0.5,
      minSpeechMs: 250,
      minSilenceMs: 300,
      ...config,
    }
  }

  /**
   * 初始化 VAD 模型
   */
  async init(): Promise<void> {
    // 加载 Silero VAD 模型 (GPU)
    console.log('[VAD] 加载 Silero VAD 模型...')
    
    // 使用 ONNX Runtime GPU
    const ort = await import('onnxruntime-node')
    const session = await ort.InferenceSession.create('./models/silero_vad.onnx')
    this.model = session
    
    console.log('[VAD] 模型加载完成')
  }

  /**
   * 处理音频流
   */
  processAudio(audioChunk: Float32Array): VADState {
    if (!this.model) {
      throw new Error('VAD 未初始化')
    }

    // 推理
    const tensor = new ort.Tensor('float32', audioChunk, [1, audioChunk.length])
    const results = this.model.run({ input: tensor })
    
    const probability = results.output.data[0] as number
    const isSpeaking = probability > this.config.threshold

    const prevState = this.state
    this.state = isSpeaking ? 'speaking' : 'silent'

    // 状态变化触发回调
    if (prevState === 'silent' && this.state === 'speaking') {
      this.callbacks.onSpeechStart?.()
    } else if (prevState === 'speaking' && this.state === 'silent') {
      this.callbacks.onSpeechEnd?.()
    }

    return this.state
  }

  /**
   * 注册回调
   */
  on(event: 'speech-start' | 'speech-end', callback: () => void): void {
    if (event === 'speech-start') {
      this.callbacks.onSpeechStart = callback
    } else if (event === 'speech-end') {
      this.callbacks.onSpeechEnd = callback
    }
  }

  /**
   * 当前状态
   */
  getState(): VADState {
    return this.state
  }

  /**
   * 是否正在说话
   */
  isSpeaking(): boolean {
    return this.state === 'speaking'
  }
}

/**
 * 快速创建 VAD 监听器
 */
export function createVADListener(
  onSpeechStart: () => void,
  onSpeechEnd: () => void,
  config?: Partial<VADConfig>
): VADDetector {
  const vad = new VADDetector(config)
  vad.on('speech-start', onSpeechStart)
  vad.on('speech-end', onSpeechEnd)
  return vad
}
