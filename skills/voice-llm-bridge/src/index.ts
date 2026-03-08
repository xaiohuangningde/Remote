/**
 * Voice LLM Bridge - OpenClaw 语音对话接口
 * 
 * 替代 Airi 的 GPT-4o，使用 OpenClaw 作为 LLM
 */

import { sessions_spawn } from 'openclaw'

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatConfig {
  baseURL: string
  apiKey: string
  model: string
}

/**
 * 与 OpenClaw 对话
 */
export async function chatWithOpenClaw(
  messages: Message[],
  config?: ChatConfig
): Promise<string> {
  const userMessage = messages[messages.length - 1]?.content
  
  if (!userMessage) {
    throw new Error('No user message')
  }

  // 提取系统提示
  const systemMessage = messages.find(m => m.role === 'system')?.content || ''
  
  // 调用 OpenClaw
  const task = systemMessage 
    ? `${systemMessage}\n\n用户：${userMessage}`
    : `对话回复：${userMessage}`

  const result = await sessions_spawn({
    task,
    mode: 'run',
    runTimeoutSeconds: 30,
  })

  return result.message || ''
}

/**
 * 流式对话 (模拟)
 */
export async function* streamChatWithOpenClaw(
  messages: Message[],
  config?: ChatConfig
): AsyncGenerator<string> {
  const reply = await chatWithOpenClaw(messages, config)
  
  // 逐字输出 (模拟流式)
  for (const char of reply) {
    yield char
    await sleep(50)
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 健康检查
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const reply = await chatWithOpenClaw([{ role: 'user', content: '你好' }])
    return reply.length > 0
  } catch {
    return false
  }
}
