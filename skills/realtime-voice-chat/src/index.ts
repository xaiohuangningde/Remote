/**
 * 实时语音聊天 - TypeScript 封装
 * 
 * 底层使用 Python 实现 (VAD + Whisper + Qwen3-TTS)
 * 本模块提供 TypeScript API 封装
 */

import { spawn, ChildProcess } from 'node:child_process'
import * as path from 'node:path'
import * as fs from 'node:fs'

export interface VoiceChatConfig {
  /** 语音检测阈值 (0-1) */
  speechThreshold?: number
  
  /** 最小静音时长 (ms) */
  minSilenceDurationMs?: number
  
  /** 打断保护时间 (ms) */
  interruptProtectionMs?: number
  
  /** TTS 音色 */
  ttsSpeaker?: string
  
  /** 是否启用打断 */
  enableInterrupt?: boolean
  
  /** 输出目录 */
  outputDir?: string
}

export interface VoiceChatStats {
  /** 是否正在录音 */
  isRecording: boolean
  
  /** 是否正在播放 */
  isPlaying: boolean
  
  /** 是否正在处理 */
  isProcessing: boolean
  
  /** 今日对话次数 */
  conversationCount: number
}

export class RealtimeVoiceChat {
  private config: VoiceChatConfig
  private pythonProcess: ChildProcess | null = null
  private isRunning: boolean = false
  private stats: VoiceChatStats = {
    isRecording: false,
    isPlaying: false,
    isProcessing: false,
    conversationCount: 0,
  }

  constructor(config: VoiceChatConfig = {}) {
    this.config = {
      speechThreshold: 0.3,
      minSilenceDurationMs: 400,
      interruptProtectionMs: 500,
      ttsSpeaker: 'Vivian',
      enableInterrupt: true,
      outputDir: r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\voice_chat",
      ...config,
    }
  }

  /**
   * 启动语音聊天服务
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[VoiceChat] Already running')
      return
    }

    const scriptPath = path.join(__dirname, '../realtime_voice_chat.py')
    
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Script not found: ${scriptPath}`)
    }

    console.log('[VoiceChat] Starting Python backend...')
    
    this.pythonProcess = spawn('python', [scriptPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    })

    this.pythonProcess.stdout?.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean)
      for (const line of lines) {
        console.log(`[VoiceChat] ${line}`)
        this.parseState(line)
      }
    })

    this.pythonProcess.stderr?.on('data', (data) => {
      console.error('[VoiceChat] Error:', data.toString())
    })

    this.pythonProcess.on('close', (code) => {
      console.log(`[VoiceChat] Process exited with code ${code}`)
      this.isRunning = false
    })

    this.isRunning = true
    console.log('[VoiceChat] Started successfully')
  }

  /**
   * 停止语音聊天服务
   */
  async stop(): Promise<void> {
    if (!this.pythonProcess || !this.isRunning) {
      return
    }

    console.log('[VoiceChat] Stopping...')
    
    // 发送 SIGINT (Ctrl+C)
    this.pythonProcess.kill('SIGINT')
    
    // 等待进程退出
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        // 超时强制 kill
        if (this.pythonProcess) {
          this.pythonProcess.kill()
        }
        resolve()
      }, 3000)

      this.pythonProcess?.on('close', () => {
        clearTimeout(timeout)
        resolve()
      })
    })

    this.pythonProcess = null
    this.isRunning = false
    console.log('[VoiceChat] Stopped')
  }

  /**
   * 获取当前状态
   */
  getStatus(): VoiceChatStats {
    return { ...this.stats }
  }

  /**
   * 解析状态日志
   */
  private parseState(line: string): void {
    if (line.includes('SPEECH START')) {
      this.stats.isRecording = true
    } else if (line.includes('SPEECH END')) {
      this.stats.isRecording = false
      this.stats.isProcessing = true
    } else if (line.includes('Playing')) {
      this.stats.isPlaying = true
      this.stats.isProcessing = false
    } else if (line.includes('Done') || line.includes('INTERRUPTED')) {
      this.stats.isPlaying = false
      this.stats.conversationCount++
    }
  }
}

/**
 * 快速创建语音聊天
 */
export async function createVoiceChat(
  config: VoiceChatConfig = {}
): Promise<RealtimeVoiceChat> {
  const chat = new RealtimeVoiceChat(config)
  await chat.start()
  return chat
}

// ============================================================================
// 命令行模式
// ============================================================================

if (import.meta.vitest) {
  // 测试模式
} else if (process.argv[2] === '--start') {
  // 直接启动
  createVoiceChat().then((chat) => {
    console.log('Voice chat started. Press Ctrl+C to stop.')
    
    process.on('SIGINT', async () => {
      await chat.stop()
      process.exit(0)
    })
  })
}
