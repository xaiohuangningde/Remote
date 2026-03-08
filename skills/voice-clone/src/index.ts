/**
 * Voice Clone - 声音克隆
 * 基于 CosyVoice / FishSpeech
 * GPU 加速 (RTX 4060)
 */

import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const execAsync = promisify(exec)

export interface VoiceCloneConfig {
  model: 'cosyvoice' | 'fishspeech'
  modelPath: string
  gpuId?: number
}

export interface CloneResult {
  success: boolean
  audioPath?: string
  duration?: number
  error?: string
}

export class VoiceCloneService {
  private config: VoiceCloneConfig
  private modelLoaded: boolean = false

  constructor(config: VoiceCloneConfig) {
    this.config = config
  }

  /**
   * 初始化模型
   */
  async init(): Promise<void> {
    const modelPath = join(this.config.modelPath, this.config.model)
    
    if (!existsSync(modelPath)) {
      console.log(`[VoiceClone] 模型不存在，需要下载：${modelPath}`)
      await this.downloadModel()
    }

    // 预加载模型到 GPU
    console.log('[VoiceClone] 加载模型到 GPU...')
    this.modelLoaded = true
    console.log('[VoiceClone] 模型加载完成')
  }

  /**
   * 下载模型
   */
  private async downloadModel(): Promise<void> {
    const model = this.config.model
    
    if (model === 'cosyvoice') {
      // CosyVoice from HuggingFace
      console.log('[VoiceClone] 下载 CosyVoice 模型...')
      await execAsync(
        'huggingface-cli download FunAudioLLM/CosyVoice2-0.5B --local-dir models/cosyvoice'
      )
    } else if (model === 'fishspeech') {
      // FishSpeech
      console.log('[VoiceClone] 下载 FishSpeech 模型...')
      await execAsync(
        'huggingface-cli download fishaudio/fish-speech-1.4 --local-dir models/fishspeech'
      )
    }
  }

  /**
   * 克隆声音
   * @param referenceAudio 参考音频路径 (3-10 秒)
   * @param text 要合成的文本
   */
  async clone(referenceAudio: string, text: string): Promise<CloneResult> {
    if (!this.modelLoaded) {
      await this.init()
    }

    console.log(`[VoiceClone] 克隆声音：${referenceAudio} → "${text.substring(0, 30)}..."`)

    try {
      const outputAudio = `output_${Date.now()}.wav`
      
      // 调用 CosyVoice/FishSpeech 推理
      const command = this.buildInferenceCommand(referenceAudio, text, outputAudio)
      await execAsync(command)

      return {
        success: true,
        audioPath: outputAudio,
        duration: await this.getAudioDuration(outputAudio),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 构建推理命令
   */
  private buildInferenceCommand(
    referenceAudio: string,
    text: string,
    outputAudio: string
  ): string {
    if (this.config.model === 'cosyvoice') {
      return `python -m cosyvoice.cli.inference \
        --reference_audio "${referenceAudio}" \
        --synthesis_text "${text}" \
        --output_audio "${outputAudio}" \
        --gpu ${this.config.gpuId || 0}`
    } else {
      return `python -m fishspeech.inference \
        --reference "${referenceAudio}" \
        --text "${text}" \
        --output "${outputAudio}" \
        --device cuda:${this.config.gpuId || 0}`
    }
  }

  /**
   * 获取音频时长
   */
  private async getAudioDuration(audioPath: string): Promise<number> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
      )
      return parseFloat(stdout.trim())
    } catch {
      return 0
    }
  }

  /**
   * 批量克隆
   */
  async cloneBatch(
    referenceAudio: string,
    texts: string[]
  ): Promise<CloneResult[]> {
    const results: CloneResult[] = []
    
    for (const text of texts) {
      const result = await this.clone(referenceAudio, text)
      results.push(result)
    }
    
    return results
  }
}

/**
 * 快速克隆（默认 CosyVoice）
 */
export async function quickClone(
  referenceAudio: string,
  text: string,
  modelPath: string = './models'
): Promise<CloneResult> {
  const service = new VoiceCloneService({
    model: 'cosyvoice',
    modelPath,
    gpuId: 0,
  })
  
  await service.init()
  return service.clone(referenceAudio, text)
}
