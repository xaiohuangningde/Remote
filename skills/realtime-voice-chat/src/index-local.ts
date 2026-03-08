/**
 * 实时语音聊天 - 本地版本
 * VAD + ASR + LLM + Qwen3-TTS 全流程
 */

import { VADDetector } from '../vad/src/index.ts'
import { transcribe } from '../whisper-local/src/index.ts'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import * as fs from 'node:fs'
import * as path from 'node:path'

const execAsync = promisify(exec)

export interface VoiceChatConfig {
  ttsModelPath?: string  // Qwen3-TTS 模型路径
  asrModel?: string
  language?: string
  speaker?: string  // 音色：Vivian, Serena, Uncle_Fu 等
}

export class RealtimeVoiceChat {
  private vad: VADDetector
  private isSpeaking: boolean = false
  private isProcessing: boolean = false
  private audioBuffer: Float32Array[] = []
  private config: VoiceChatConfig

  constructor(config: VoiceChatConfig = {}) {
    this.vad = new VADDetector()
    this.config = {
      ttsModelPath: config.ttsModelPath || 'E:/TuriX-CUA-Windows/models/Qwen3-TTS/Qwen/Qwen3-TTS-12Hz-1___7B-CustomVoice',
      speaker: config.speaker || 'Vivian',
      language: config.language || 'Chinese',
      ...config
    }
    
    // VAD 回调
    this.vad.on('speech-start', () => {
      console.log('[VoiceChat] 用户开始说话')
      this.isSpeaking = true
    })
    
    this.vad.on('speech-end', async () => {
      console.log('[VoiceChat] 用户停止说话，开始处理...')
      this.isSpeaking = false
      await this.processUserSpeech()
    })
  }

  async init(): Promise<void> {
    await this.vad.init()
    console.log('[VoiceChat] 初始化完成')
    console.log(`[VoiceChat] TTS 模型：${this.config.ttsModelPath}`)
    console.log(`[VoiceChat] 音色：${this.config.speaker}`)
  }

  /**
   * 处理麦克风音频流
   */
  processAudio(audioChunk: Float32Array): void {
    if (this.isProcessing) return
    
    this.vad.processAudio(audioChunk)
    
    if (this.isSpeaking) {
      this.audioBuffer.push(audioChunk)
    }
  }

  /**
   * 处理用户语音
   */
  private async processUserSpeech(): Promise<void> {
    if (this.audioBuffer.length === 0) return
    
    this.isProcessing = true
    
    try {
      // 1. 合并音频
      const audio = this.mergeAudio(this.audioBuffer)
      this.audioBuffer = []
      
      // 2. 保存为文件
      const recordingsDir = path.join(process.cwd(), 'recordings')
      if (!fs.existsSync(recordingsDir)) {
        fs.mkdirSync(recordingsDir, { recursive: true })
      }
      const audioPath = path.join(recordingsDir, `user_${Date.now()}.wav`)
      await this.saveAudio(audio, audioPath)
      
      // 3. ASR 转录
      console.log('[VoiceChat] 转录语音...')
      const asr = await transcribe(audioPath)
      console.log(`[VoiceChat] 识别结果：${asr.text}`)
      
      // 4. LLM 回复
      console.log('[VoiceChat] 生成回复...')
      const reply = await this.callLLM(asr.text)
      console.log(`[VoiceChat] 回复：${reply}`)
      
      // 5. TTS 播放（使用 Qwen3-TTS）
      console.log('[VoiceChat] 播放回复...')
      await this.synthesizeWithQwenTTS(reply)
      
    } catch (error) {
      console.error('[VoiceChat] 处理失败:', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * 使用 Qwen3-TTS 合成语音
   */
  private async synthesizeWithQwenTTS(text: string): Promise<void> {
    const outputDir = path.join(process.cwd(), 'output')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    const outputPath = path.join(outputDir, `tts_${Date.now()}.wav`)
    const scriptPath = path.join(__dirname, '../../qwen3-tts/test_official.py')
    
    // 创建临时 Python 脚本
    const tempScript = path.join(outputDir, `gen_${Date.now()}.py`)
    const pythonScript = `
import torch
import soundfile as sf
from qwen_tts import Qwen3TTSModel

model = Qwen3TTSModel.from_pretrained(
    "${this.config.ttsModelPath.replace(/\\/g, '/')}",
    device_map="cpu",
    dtype=torch.float32,
)

wavs, sr = model.generate_custom_voice(
    text="${text.replace(/"/g, '\\"')}",
    language="${this.config.language}",
    speaker="${this.config.speaker}",
)
sf.write("${outputPath.replace(/\\/g, '/')}", wavs[0], sr)
print(f"Generated: {sr}Hz, {len(wavs[0])/sr:.2f}s")
`.trim()
    
    fs.writeFileSync(tempScript, pythonScript, 'utf-8')
    
    try {
      const { stdout, stderr } = await execAsync(
        `E:\\Anaconda\\envs\\qwen3-tts\\python.exe "${tempScript}"`,
        { timeout: 120000 }
      )
      console.log('[VoiceChat] TTS 生成成功:', stdout)
      
      // 播放音频
      await this.playAudio(outputPath)
      
    } catch (error) {
      console.error('[VoiceChat] TTS 失败:', error)
    } finally {
      // 清理临时脚本
      if (fs.existsSync(tempScript)) {
        fs.unlinkSync(tempScript)
      }
    }
  }

  /**
   * 播放音频文件
   */
  private async playAudio(audioPath: string): Promise<void> {
    try {
      // Windows 使用 powershell 播放
      await execAsync(`powershell -c "(New-Object Media.SoundPlayer '${audioPath}').PlaySync()"`)
      console.log('[VoiceChat] 播放完成')
    } catch (error) {
      console.error('[VoiceChat] 播放失败:', error)
      // 备用方案：使用 ffplay 或 sox
      try {
        await execAsync(`sox "${audioPath}" -d`)
      } catch (e) {
        console.error('[VoiceChat] 备用播放也失败:', e)
      }
    }
  }

  /**
   * 合并音频块
   */
  private mergeAudio(chunks: Float32Array[]): Float32Array {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const merged = new Float32Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      merged.set(chunk, offset)
      offset += chunk.length
    }
    return merged
  }

  /**
   * 保存音频文件
   */
  private async saveAudio(audio: Float32Array, path: string): Promise<void> {
    const wav = this.encodeWAV(audio)
    fs.writeFileSync(path, Buffer.from(wav))
  }

  /**
   * 编码为 WAV 格式
   */
  private encodeWAV(audio: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + audio.length * 2)
    const view = new DataView(buffer)
    
    this.writeString(view, 0, 'RIFF')
    view.setUint32(4, 36 + audio.length * 2, true)
    this.writeString(view, 8, 'WAVE')
    this.writeString(view, 12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, 16000, true)
    view.setUint32(28, 32000, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    this.writeString(view, 36, 'data')
    view.setUint32(40, audio.length * 2, true)
    
    let offset = 44
    for (let i = 0; i < audio.length; i++) {
      const sample = Math.max(-1, Math.min(1, audio[i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
      offset += 2
    }
    
    return buffer
  }

  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  /**
   * 调用 LLM
   */
  private async callLLM(userText: string): Promise<string> {
    // 简单回复示例
    return `我听到了："${userText}"。这是一个测试回复。`
  }
}

// 快速创建
export async function createVoiceChat(config: VoiceChatConfig = {}): Promise<RealtimeVoiceChat> {
  const chat = new RealtimeVoiceChat(config)
  await chat.init()
  return chat
}
