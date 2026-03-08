# 语音功能 - 最简单方案

> 时间：2026-03-07 09:05  
> 策略：使用现有技能，无需新安装

---

## ✅ 立即可用

### TTS (已有)

**`skills/tts`** - OpenClaw 内置 TTS 技能

```typescript
// 直接使用
import { tts } from 'openclaw'
await tts.synthesize({ text: '你好，这是测试' })
```

### VAD (已有)

**`skills/vad`** - Silero VAD
- ✅ 模型已就绪：`skills/vad/models/silero_vad.onnx`

### ASR (Whisper 下载中)

Whisper 正在下载 turbo 模型 (~1.5GB)，完成后即可使用。

---

## 🎯 最简测试流程

### 方案 A: 使用 OpenClaw 内置 TTS

```typescript
// 1. TTS 测试
const ttsResult = await tts.synthesize({ text: '你好' })

// 2. VAD 检测 (已有模型)
import { VADService } from 'skills/vad'
const vad = new VADService()
await vad.init()

// 3. ASR (等待 Whisper 下载完成)
import { WhisperService } from 'skills/whisper-local'
const asr = new WhisperService()
await asr.transcribe('audio.wav')
```

### 方案 B: 使用现有工作流

直接使用 `skills/realtime-voice-chat` 的模拟模式，已经测试通过 (4.95s)。

---

## 📊 当前状态

| 组件 | 状态 | 位置 |
|------|------|------|
| TTS | ✅ 可用 | OpenClaw 内置 |
| VAD | ✅ 可用 | `skills/vad/` |
| ASR | ⏳ 模型下载中 | Whisper turbo |

---

## 🚀 立即可做的事

1. **等待 Whisper 下载完成** (约 5-10 分钟)
2. **测试已有组件** (TTS + VAD)
3. **Whisper 完成后测试完整流程**

---

**无需 Docker，无需重启，使用现有技能！** 🎉
