# 整合 Airi 实时语音聊天

> 策略：学习 + 整合，不重复造轮子

---

## 📦 目标项目

**webai-example-realtime-voice-chat**
- GitHub: https://github.com/proj-airi/webai-example-realtime-voice-chat
- Stars: 154
- License: MIT
- 状态：生产环境验证

---

## 🎯 整合步骤

### 1. 克隆项目

```bash
cd C:\Users\12132\.openclaw\workspace
git clone https://github.com/proj-airi/webai-example-realtime-voice-chat.git airi-voice-chat
cd airi-voice-chat
pnpm install
```

### 2. 理解架构

```
apps/
├── vad/              # 纯 VAD 检测
├── vad-asr/          # VAD + 语音识别
├── vad-asr-chat/     # VAD + ASR + LLM
└── vad-asr-chat-tts/ # 完整流程 (VAD+ASR+LLM+TTS)
```

### 3. 配置 TTS

编辑 `apps/vad-asr-chat-tts/.env`:
```
TTS_PROVIDER=volcano
VOLCANO_APP_ID=xxx
VOLCANO_ACCESS_TOKEN=xxx
```

### 4. 运行测试

```bash
pnpm -F @proj-airi/vad-asr-chat-tts dev
```

### 5. 整合到 OpenClaw

创建桥接层：
```typescript
// skills/airi-voice-bridge/src/index.ts
import { RealtimeVoiceChat } from '../../../airi-voice-chat/apps/vad-asr-chat-tts/src/index.ts'

export async function createVoiceChat(config) {
  // 使用 Airi 的完整实现
  const chat = await RealtimeVoiceChat.create(config)
  
  // 桥接到 OpenClaw
  chat.on('user-speech', async (text) => {
    // 调用 OpenClaw 的 LLM
    const reply = await sessions_spawn({ task: text })
    chat.reply(reply)
  })
  
  return chat
}
```

---

## ✅ 优势

**直接用 Airi 项目**:
- ✅ 生产环境验证
- ✅ 完整测试
- ✅ 持续维护
- ✅ 社区支持

**我们专注**:
- ✅ OpenClaw 核心能力
- ✅ 任务调度
- ✅ 记忆系统
- ✅ Agent 编排

---

## 📋 下一步

1. 克隆 airi-voice-chat 项目
2. 安装依赖
3. 配置火山引擎 TTS
4. 运行官方 demo
5. 创建桥接层整合到 OpenClaw

---

**不重复造轮子，站在巨人肩膀上！** 🚀
