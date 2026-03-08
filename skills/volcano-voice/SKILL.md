---
name: volcano-voice
description: 火山引擎语音接入 - RTC + ASR + TTS + LLM 全模态语音对话
---

# Volcano Voice Skill

火山引擎全模态语音接入，提供实时语音对话能力。

**更新时间**: 2026-03-06
**整合模块**: stream-queue (事件驱动任务队列)

## 功能

- 🎤 **语音识别** (ASR) - 实时语音转文字
- 🤖 **AI 对话** (豆包大模型) - 智能回复
- 🔊 **语音合成** (TTS) - 文字转语音（**队列管理，支持批量**）
- 🎯 **语音打断** (VAD) - 用户说话时自动暂停 TTS
- 📹 **实时音视频** (RTC) - 实时语音通话

## 新增：TTS 队列管理

使用 `stream-queue` 进行 TTS 请求队列管理，提供：

- ✅ 自动排队处理
- ✅ 错误隔离和重试
- ✅ 事件通知（验证/处理中/完成/错误）
- ✅ 批量处理支持
- ✅ 队列清空能力

## 配置

配置保存在: `~/.openclaw/workspace/ai-companion/config/volcengine.json`

```json
{
  "accessKeyId": "你的AccessKeyID",
  "rtc": {
    "appId": "你的RTC_AppId",
    "appKey": "你的RTC_AppKey"
  },
  "asr": {
    "appId": "你的ASR_AppId",
    "accessToken": "你的ASR_AccessToken"
  },
  "llm": {
    "endpointId": "你的EndpointId",
    "apiKey": "你的LLM_ApiKey"
  }
}
```

## 使用方式

### 基础用法（带队列）

```javascript
import { TTSService } from 'skills/volcano-voice/src/index.ts'

const tts = new TTSService({
  appId: 'your-app-id',
  accessToken: 'your-token',
})

// 单个 TTS 请求（自动排队）
const result = await tts.synthesize({
  text: '你好，这是语音合成测试',
  voice: 'BV001_streaming',
  emotion: 'neutral',
})

// 批量 TTS 请求（自动按顺序处理）
const results = await Promise.all([
  tts.synthesize({ text: '第一条消息' }),
  tts.synthesize({ text: '第二条消息' }),
  tts.synthesize({ text: '第三条消息' }),
])

// 查看队列状态
console.log('队列长度:', tts.getQueueLength())

// 清空队列（取消所有待处理请求）
tts.clearQueue()
```

### 监听事件

```javascript
const tts = new TTSService(config)

// 访问底层队列监听事件
const queue = tts.queue

queue.on('enqueue', (payload, length) => {
  console.log(`任务入队，队列长度：${length}`)
})

queue.on('drain', () => {
  console.log('所有任务完成')
})

queue.on('error', (payload, error) => {
  console.error(`任务失败 [${payload.requestId}]:`, error)
})

// 监听自定义 TTS 事件
queue.onHandlerEvent('tts-validated', (requestId) => {
  console.log(`请求 ${requestId} 已验证`)
})

queue.onHandlerEvent('tts-complete', (requestId, data) => {
  console.log(`请求 ${requestId} 完成，时长 ${data.duration}s`)
})
```

### 旧版用法（保留兼容）

```javascript
// 在 agent 代码中
const { AICompanion } = require('skills/volcano-voice');

const companion = new AICompanion();
await companion.init();

// 开始语音对话
await companion.converse('你好！');
```

## 火山引擎服务开通

1. 注册火山引擎账号: https://console.volcengine.com
2. 开通服务:
   - RTC (实时音视频): https://console.volcengine.com/rtc
   - ASR (语音识别): https://console.volcengine.com/speech
   - LLM (豆包大模型): https://console.volcengine.com/ark
3. 获取配置参数并填入 `config/volcengine.json`

## 免费额度

| 服务 | 免费额度 |
|------|---------|
| RTC | 6000分钟/月 |
| ASR | 6000分钟/月 |
| 豆包 LLM | 50万Tokens/月 |
| TTS | 无免费 (需充值) |
