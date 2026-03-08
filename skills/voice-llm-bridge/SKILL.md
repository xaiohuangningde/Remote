---
name: voice-llm-bridge
description: OpenClaw 语音 LLM 桥接 - 替代 GPT-4o 用于 Airi 语音对话
---

# Voice LLM Bridge

将 Airi 官方语音对话系统的 LLM 替换为 OpenClaw。

## 使用方式

```typescript
import { chatWithOpenClaw } from 'voice-llm-bridge'

const reply = await chatWithOpenClaw([
  { role: 'system', content: '你是一个语音助手' },
  { role: 'user', content: '你好' }
])

console.log(reply) // "你好！有什么我可以帮助你的吗？"
```

## 流式对话

```typescript
import { streamChatWithOpenClaw } from 'voice-llm-bridge'

for await (const token of streamChatWithOpenClaw(messages)) {
  process.stdout.write(token)
}
```

## 配置

```typescript
const config = {
  baseURL: 'http://localhost:3000/api',
  apiKey: 'local',
  model: 'openclaw',
}
```

## 健康检查

```typescript
import { healthCheck } from 'voice-llm-bridge'

const isHealthy = await healthCheck()
console.log(isHealthy) // true/false
```

## 集成到 Airi

编辑 `apps/vad-asr-chat-tts/src/pages/index.vue`:

```typescript
// 替换原有的 streamText 调用
import { streamChatWithOpenClaw } from 'voice-llm-bridge'

// 原代码
// const res = await streamText({ baseURL: ..., apiKey: ..., model: ... })

// 新代码
const reply = await streamChatWithOpenClaw(messages)
```

## 依赖

- OpenClaw sessions_spawn
- Node.js 18+
