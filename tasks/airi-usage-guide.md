# Airi 官方实现 - 使用指南

> 克隆位置：`D:\projects\airi-voice`
> 参考：https://github.com/proj-airi/webai-example-realtime-voice-chat

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd D:\projects\airi-voice
pnpm install
```

### 2. 选择应用

| 应用 | 功能 | 命令 |
|------|------|------|
| **VAD** | 仅语音检测 | `pnpm -F vad dev` |
| **VAD + ASR** | 语音检测 + 识别 | `pnpm -F vad-asr dev` |
| **VAD + ASR + Chat** | + LLM 对话 | `pnpm -F vad-asr-chat dev` |
| **VAD + ASR + Chat + TTS** | 完整语音对话 | `pnpm -F vad-asr-chat-tts dev` |

### 3. 配置 (以 vad-asr-chat-tts 为例)

编辑 `apps/vad-asr-chat-tts/.env`:

```env
# ASR (Whisper)
ASR_PROVIDER=whisper
WHISPER_MODEL=turbo

# LLM (OpenRouter / GPT-4o)
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your_key

# TTS (UnSpeech / Qwen3)
TTS_PROVIDER=unspeech
UNSPEECH_BASE_URL=https://unspeech.ayaka.io/v1/
UNSPEECH_API_KEY=your_key
TTS_VOICE=Vivian
```

### 4. 启动

```bash
pnpm -F @proj-airi/vad-asr-chat-tts dev
# 访问 http://localhost:5173
```

---

## 🌐 在线演示 (立即可用)

无需安装，直接体验：

| 演示 | 链接 |
|------|------|
| VAD | https://proj-airi-apps-vad.netlify.app |
| VAD + ASR | https://proj-airi-apps-vad-asr.netlify.app |
| VAD + ASR + Chat | https://proj-airi-apps-vad-asr-chat.netlify.app |
| **完整功能** | https://proj-airi-apps-vad-asr-chat-tts.netlify.app |

---

## 📦 项目结构

```
airi-voice/
├── apps/
│   ├── vad/              # 纯 VAD 检测
│   ├── vad-asr/          # VAD + 语音识别
│   ├── vad-asr-chat/     # + LLM 对话
│   └── vad-asr-chat-tts/ # 完整流程
├── packages/             # 共享组件
└── .env                  # 配置
```

---

## 🔧 核心功能

### 1. 实时麦克风捕获
```typescript
const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
const audioContext = new AudioContext()
const source = audioContext.createMediaStreamSource(mediaStream)
```

### 2. VAD 实时检测
```typescript
import { useVAD } from './libs/vad/vad'
const { isSpeaking, start, stop } = useVAD()
```

### 3. 语音打断
```typescript
if (tts.isPlaying() && vad.isSpeaking()) {
  tts.pause()  // 检测到用户说话，暂停 TTS
}
```

### 4. 流式处理
```typescript
// ASR 流式转录
const transcription = await asr.stream(audioChunks)

// LLM 流式回复
const reply = await streamText({ model: 'gpt-4o', messages })

// TTS 流式播放
const audio = await tts.stream(reply.text)
```

---

## 📊 和我们实现的对比

| 功能 | Airi 官方 | 我们当前 |
|------|----------|---------|
| 麦克风输入 | ✅ 实时 WebAudio | ❌ 仅文件 |
| VAD 检测 | ✅ 实时流式 | ⚠️ 文件测试 |
| 语音打断 | ✅ 完整实现 | ❌ 无 |
| 流式 ASR | ✅ | ❌ 批量 |
| 流式 TTS | ✅ | ❌ 批量 |
| UI 界面 | ✅ Vue3 | ❌ CLI |
| 配置管理 | ✅ .env | ⚠️ 分散 |

---

## 💡 建议用法

### 方案 A: 直接使用在线演示
```
https://proj-airi-apps-vad-asr-chat-tts.netlify.app
```
**优点**: 立即可用，无需安装  
**缺点**: 需要配置自己的 API Key

### 方案 B: 本地部署
```bash
cd D:\projects\airi-voice
pnpm install
pnpm -F @proj-airi/vad-asr-chat-tts dev
```
**优点**: 完全控制，可修改  
**缺点**: 需要配置环境

### 方案 C: 参考实现，整合到 OpenClaw
学习 Airi 的代码，整合到现有技能：
- 麦克风捕获 → `skills/vad/`
- 语音打断 → `skills/realtime-voice-chat/`
- 流式处理 → 新建技能

---

## 🎯 下一步

1. **立即体验**: 访问在线演示
2. **本地运行**: `pnpm -F vad-asr-chat-tts dev`
3. **学习整合**: 参考核心实现

---

**位置**: `D:\projects\airi-voice`  
**文档**: `D:\projects\airi-voice\README.md`
