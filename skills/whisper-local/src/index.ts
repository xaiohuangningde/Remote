/**
 * Whisper 本地语音识别
 * GPU 加速
 */

export interface WhisperResult {
  text: string
  language: string
  duration: number
  segments: Array<{
    start: number
    end: number
    text: string
  }>
}

export async function transcribe(
  audioPath: string,
  options: { model?: string; language?: string } = {}
): Promise<WhisperResult> {
  const { exec } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const execAsync = promisify(exec)

  const model = options.model || 'base'
  const language = options.language || 'zh'

  try {
    const { stdout } = await execAsync(
      `whisper "${audioPath}" --model ${model} --language ${language} --output_format json`
    )

    const jsonPath = audioPath.replace(/\.(wav|mp3|flac)$/, '.json')
    const fs = await import('node:fs')
    const result = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))

    return {
      text: result.text,
      language: result.language,
      duration: result.duration,
      segments: result.segments,
    }
  } catch (error) {
    throw new Error(`Whisper 转录失败：${error instanceof Error ? error.message : 'Unknown'}`)
  }
}
