---
name: voice
description: 我的语音能力 - TTS/ASR/RTC 整合入口
---

# Voice - 我的语音能力

> 这是我的"装备"之一，让我能像人一样说话和倾听

## 能力

| 能力 | 说明 |
|------|------|
| 🗣️ **speak** | 说话 (TTS) - 文字转语音 |
| 👂 **listen** | 倾听 (ASR) - 语音转文字 |
| 💬 **converse** | 对话 (RTC+LLM) - 实时语音对话 |
| 🔇 **mute** | 静音 - 暂停 TTS 输出 |

## 配置

**凭据**: 火山引擎账号
**控制台**: https://console.volcengine.com
**配置文件**: `~/.openclaw/workspace/ai-companion/config/volcengine.json`

### 必需凭据

```json
{
  "accessKeyId": "AK",
  "accessKeySecret": "SK",
  "tts": { "appId": "", "accessToken": "" },
  "asr": { "appId": "", "accessToken": "" },
  "rtc": { "appId": "", "appKey": "" },
  "llm": { "endpointId": "", "apiKey": "" }
}
```

## 使用

```typescript
import { voice } from 'skills/voice'

// 说话
await voice.speak('你好，我是 xiaoxiaohuang')

// 带情感
await voice.speak('太棒了！', { emotion: 'happy' })

// 倾听
const text = await voice.listen()

// 对话
await voice.converse('今天天气怎么样？')
```

## 依赖

- volcano-voice (底层实现)
- stream-queue (队列管理)

---

**状态**: ⏳ 待配置凭据
**创建者**: xiaoxiaohuang 🐤
