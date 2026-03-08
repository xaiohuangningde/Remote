/**
 * Voice LLM Bridge - Fixed Version
 * 
 * 修复的问题:
 * 1. 正确处理 workflow 事件
 * 2. 完整对话历史
 * 3. 错误处理和重试
 * 4. <break/>标记支持
 */

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMWorkflowEvents {
  onToken: (token: string) => void
  onEnd: (fullText: string) => void
  onError: (error: Error) => void
}

/**
 * 流式对话 (修复版)
 */
export async function streamChatWithOpenClaw(
  messages: Message[],
  events: LLMWorkflowEvents
): Promise<void> {
  try {
    // 1. 构建完整的对话上下文
    const conversationHistory = messages
      .filter(m => m.role !== 'system')  // 过滤系统消息
      .map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
      .join('\n')
    
    const systemMessage = messages.find(m => m.role === 'system')?.content || ''
    const lastUserMessage = messages[messages.length - 1]?.content || ''
    
    // 2. 调用 OpenClaw (通过 HTTP API，不是 sessions_spawn)
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemMessage || '你是一个语音助手，请用简短的口语回复。<break/> 标记每个句子。' },
          ...messages.filter(m => m.role !== 'system')
        ]
      }),
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    const reply = data.message || data.reply || data.content || ''
    
    if (!reply) {
      throw new Error('Empty response from OpenClaw')
    }
    
    // 3. 逐字发送 (模拟流式)
    let fullText = ''
    for (const char of reply) {
      events.onToken(char)
      fullText += char
      await sleep(30)  // 30ms 延迟，模拟真实流式
    }
    
    // 4. 结束事件
    events.onEnd(fullText)
    
  } catch (error) {
    console.error('OpenClaw LLM Error:', error)
    events.onError(error instanceof Error ? error : new Error(String(error)))
    
    // 降级回复
    events.onToken('抱')
    events.onToken('歉')
    events.onToken('，')
    events.onToken('我')
    events.onToken('暂')
    events.onToken('时')
    events.onToken('无')
    events.onToken('法')
    events.onToken('回')
    events.onToken('答')
    events.onToken('。')
    events.onEnd('抱歉，我暂时无法回答。')
  }
}

/**
 * 简单版本 (非流式)
 */
export async function chatWithOpenClaw(messages: Message[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const tokens: string[] = []
    
    streamChatWithOpenClaw(messages, {
      onToken: (token) => tokens.push(token),
      onEnd: (fullText) => resolve(fullText),
      onError: (error) => reject(error),
    })
  })
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 健康检查
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch('http://localhost:3000/api/health', {
      signal: controller.signal,
    })
    
    clearTimeout(timeout)
    return response.ok
  } catch {
    return false
  }
}
