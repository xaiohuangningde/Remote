/**
 * CosyVoice 3.0 TTS Service
 * 
 * 基于 FunAudioLLM/CosyVoice3-0.5B-2512 的本地 TTS 服务
 * 支持零样本语音克隆和流式生成
 * 
 * @see https://github.com/FunAudioLLM/CosyVoice
 */

import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import * as path from 'path'
import * as fs from 'fs'

// ==================== 类型定义 ====================

export interface CosyVoiceConfig {
  /** 模型路径 */
  modelPath: string
  /** 参考音频路径（零样本克隆） */
  promptWavPath: string
  /** 参考文本（零样本克隆） */
  promptText: string
  /** Python 解释器路径 */
  pythonPath?: string
  /** 工作目录 */
  workDir?: string
}

export interface SynthesizeOptions {
  /** 输入文本 */
  text: string
  /** 是否流式生成（分句） */
  streaming?: boolean
  /** 语速 (0.5-2.0) */
  speed?: number
  /** 情感 (neutral, happy, sad, angry) */
  emotion?: string
}

export interface AudioChunk {
  /** 音频数据 (Base64 或文件路径) */
  data: string | Buffer
  /** 采样率 */
  sampleRate: number
  /** 文本片段 */
  text: string
  /** 生成时间戳 */
  timestamp: number
}

export interface SynthesizeResult {
  /** 完整音频数据 */
  audio: Buffer
  /** 采样率 */
  sampleRate: number
  /** 总时长 (秒) */
  duration: number
  /** 生成时间 (毫秒) */
  generationTime: number
  /** 首块延迟 (毫秒) */
  firstChunkLatency?: number
}

export interface StreamingCallback {
  (chunk: AudioChunk): void
}

// ==================== 服务实现 ====================

export class CosyVoiceTTSService extends EventEmitter {
  private config: CosyVoiceConfig
  private pythonProcess: ChildProcess | null = null
  private isReady = false
  private sampleRate = 22050

  constructor(config: CosyVoiceConfig) {
    super()
    this.config = {
      pythonPath: 'python',
      workDir: process.cwd(),
      ...config,
    }
    
    // 验证配置
    this.validateConfig()
  }

  /**
   * 验证配置
   */
  private validateConfig(): void {
    const { modelPath, promptWavPath } = this.config
    
    if (!fs.existsSync(modelPath)) {
      throw new Error(`模型路径不存在：${modelPath}`)
    }
    
    if (!fs.existsSync(promptWavPath)) {
      throw new Error(`参考音频不存在：${promptWavPath}`)
    }
    
    console.log('[CosyVoiceTTS] 配置验证通过')
    console.log(`  - 模型：${modelPath}`)
    console.log(`  - 参考音频：${promptWavPath}`)
  }

  /**
   * 初始化服务
   */
  async init(): Promise<void> {
    console.log('[CosyVoiceTTS] 初始化服务...')
    
    // 检查 Python 环境
    const pythonPath = await this.findPython()
    this.config.pythonPath = pythonPath
    
    console.log(`[CosyVoiceTTS] 使用 Python: ${pythonPath}`)
    
    // 预加载模型（可选，加速首次调用）
    await this.warmup()
    
    this.isReady = true
    console.log('[CosyVoiceTTS] 服务就绪')
  }

  /**
   * 查找 Python 解释器
   */
  private async findPython(): Promise<string> {
    // 优先使用配置的 Python
    if (this.config.pythonPath && this.config.pythonPath !== 'python') {
      return this.config.pythonPath
    }
    
    // 尝试常见的 Python 路径
    const candidates = [
      'python',
      'python3',
      'python3.10',
      'python3.11',
      'C:\\Users\\12132\\AppData\\Local\\Programs\\Python\\Python310\\python.exe',
      'C:\\Users\\12132\\AppData\\Local\\Programs\\Python\\Python311\\python.exe',
    ]
    
    for (const python of candidates) {
      try {
        const { execSync } = require('child_process')
        execSync(`${python} --version`, { stdio: 'pipe' })
        console.log(`[CosyVoiceTTS] 找到 Python: ${python}`)
        return python
      } catch {
        continue
      }
    }
    
    throw new Error('未找到 Python 解释器，请安装 Python 3.10+')
  }

  /**
   * 预热模型
   */
  private async warmup(): Promise<void> {
    console.log('[CosyVoiceTTS] 预热模型...')
    
    // 使用短文本快速测试
    try {
      await this.synthesize('你好', { streaming: false })
      console.log('[CosyVoiceTTS] 模型预热完成')
    } catch (error) {
      console.warn('[CosyVoiceTTS] 预热失败，将在首次调用时加载:', error)
    }
  }

  /**
   * 合成语音（完整）
   */
  async synthesize(
    text: string,
    options: SynthesizeOptions = {}
  ): Promise<SynthesizeResult> {
    if (!this.isReady) {
      throw new Error('服务未初始化，请先调用 init()')
    }
    
    const startTime = Date.now()
    let firstChunkTime: number | undefined
    
    console.log(`[CosyVoiceTTS] 合成文本：${text.substring(0, 50)}...`)
    
    // 创建临时文件保存输出
    const tempDir = path.join(this.config.workDir || process.cwd(), 'temp')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    
    const outputWav = path.join(tempDir, `tts_${Date.now()}.wav`)
    
    // 调用 Python 脚本
    const pythonScript = path.join(__dirname, '../../voice-system-python/test_cosyvoice3_streaming.py')
    
    return new Promise((resolve, reject) => {
      const args = [
        pythonScript,
        '--text', text,
        '--output', outputWav,
        '--streaming', options.streaming ? 'true' : 'false',
      ]
      
      const process = spawn(this.config.pythonPath!, args, {
        cwd: this.config.workDir,
        env: { ...process.env },
      })
      
      let stderr = ''
      
      process.stdout?.on('data', (data) => {
        const output = data.toString()
        console.log(`[CosyVoiceTTS] ${output.trim()}`)
        
        // 检测首块生成
        if (output.includes('首块延迟') && !firstChunkTime) {
          firstChunkTime = Date.now()
        }
      })
      
      process.stderr?.on('data', (data) => {
        stderr += data.toString()
        console.error(`[CosyVoiceTTS] ${data.toString().trim()}`)
      })
      
      process.on('close', (code) => {
        if (code === 0) {
          // 读取生成的音频
          if (fs.existsSync(outputWav)) {
            const audioBuffer = fs.readFileSync(outputWav)
            const generationTime = Date.now() - startTime
            
            // 解析 WAV 头获取采样率和时长
            const { sampleRate, duration } = this.parseWavHeader(audioBuffer)
            
            const result: SynthesizeResult = {
              audio: audioBuffer,
              sampleRate: sampleRate || this.sampleRate,
              duration: duration || 0,
              generationTime,
              firstChunkLatency: firstChunkTime ? firstChunkTime - startTime : undefined,
            }
            
            console.log(`[CosyVoiceTTS] 合成完成 (${generationTime}ms)`)
            resolve(result)
            
            // 清理临时文件
            setTimeout(() => {
              fs.unlink(outputWav, () => {})
            }, 1000)
          } else {
            reject(new Error('音频文件未生成'))
          }
        } else {
          reject(new Error(`Python 进程退出 (code=${code}): ${stderr}`))
        }
      })
      
      process.on('error', (error) => {
        reject(error)
      })
      
      this.pythonProcess = process
    })
  }

  /**
   * 流式合成（边生成边回调）
   */
  async synthesizeStreaming(
    text: string,
    onChunk: StreamingCallback,
    options: SynthesizeOptions = {}
  ): Promise<void> {
    if (!this.isReady) {
      throw new Error('服务未初始化，请先调用 init()')
    }
    
    console.log(`[CosyVoiceTTS] 流式合成：${text.substring(0, 50)}...`)
    
    // 分割文本为句子
    const sentences = this.splitSentences(text)
    console.log(`[CosyVoiceTTS] 分割为 ${sentences.length} 个句子`)
    
    const startTime = Date.now()
    let firstChunkEmitted = false
    
    // 逐句生成
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i]
      console.log(`[CosyVoiceTTS] 生成句子 ${i + 1}/${sentences.length}`)
      
      try {
        const result = await this.synthesize(sentence, { 
          ...options, 
          streaming: false 
        })
        
        if (!firstChunkEmitted) {
          firstChunkEmitted = true
          console.log(`[CosyVoiceTTS] ⚡ 首块延迟：${Date.now() - startTime}ms`)
        }
        
        // 回调音频片段
        onChunk({
          data: result.audio,
          sampleRate: result.sampleRate,
          text: sentence,
          timestamp: Date.now(),
        })
        
        this.emit('chunk', {
          index: i,
          text: sentence,
          duration: result.duration,
        })
        
      } catch (error) {
        console.error(`[CosyVoiceTTS] 句子 ${i + 1} 生成失败:`, error)
        this.emit('error', { 
          sentence: i + 1, 
          text: sentence, 
          error 
        })
        // 继续处理下一句
      }
    }
    
    console.log(`[CosyVoiceTTS] 流式合成完成`)
    this.emit('complete')
  }

  /**
   * 分割文本为句子
   */
  private splitSentences(text: string): string[] {
    // 按中文标点分割
    const sentences = text.split(/([。！？；])/)
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

  /**
   * 解析 WAV 文件头
   */
  private parseWavHeader(buffer: Buffer): { sampleRate?: number; duration?: number } {
    try {
      if (buffer.length < 44) {
        return {}
      }
      
      // WAV 头格式
      const sampleRate = buffer.readUInt32LE(24)
      const numChannels = buffer.readUInt16LE(22)
      const bitsPerSample = buffer.readUInt16LE(34)
      const dataSize = buffer.length - 44
      
      const bytesPerSecond = sampleRate * numChannels * (bitsPerSample / 8)
      const duration = dataSize / bytesPerSecond
      
      return { sampleRate, duration }
    } catch {
      return {}
    }
  }

  /**
   * 销毁服务
   */
  async destroy(): Promise<void> {
    console.log('[CosyVoiceTTS] 销毁服务...')
    
    if (this.pythonProcess) {
      this.pythonProcess.kill()
      this.pythonProcess = null
    }
    
    this.isReady = false
    console.log('[CosyVoiceTTS] 服务已销毁')
  }

  /**
   * 获取服务状态
   */
  getStatus(): { ready: boolean; sampleRate: number } {
    return {
      ready: this.isReady,
      sampleRate: this.sampleRate,
    }
  }
}

// ==================== 工厂函数 ====================

/**
 * 创建 CosyVoice TTS 服务
 */
export function createCosyVoiceTTS(config: CosyVoiceConfig): CosyVoiceTTSService {
  return new CosyVoiceTTSService(config)
}

// ==================== 默认配置 ====================

export const DEFAULT_CONFIG: CosyVoiceConfig = {
  modelPath: 'E:\\TuriX-CUA-Windows\\models\\Fun-CosyVoice3-0.5B-2512',
  promptWavPath: 'C:\\Users\\12132\\.openclaw\\workspace\\models\\CosyVoice\\asset\\zero_shot_prompt.wav',
  promptText: '你好，我是测试文本。<|endofprompt|>',
}
