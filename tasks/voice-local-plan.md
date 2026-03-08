# 语音功能 - 本地部署方案 (无需 Docker)

> 创建时间：2026-03-07 09:01  
> 策略：使用现有技能 + 本地安装

---

## 🎯 核心思路

**不依赖 Docker**，使用已有的本地技能：

| 服务 | 方案 | 状态 |
|------|------|------|
| **TTS** | `skills/meijutts` 或 `skills/qwen3-tts` | ✅ 已有 |
| **ASR** | `skills/whisper-local` (安装 whisper) | ⏳ 需安装 |
| **VAD** | `skills/vad` (Silero VAD) | ✅ 模型就绪 |

---

## 📦 现有技能清单

### 已安装可用的 TTS

| 技能 | 位置 | 说明 |
|------|------|------|
| **meijutts** | `skills/meijutts/` | 基于 Genie-TTS，支持多情感 |
| **qwen3-tts** | `skills/qwen3-tts/` | 千问 TTS，支持克隆 |
| **voice-clone** | `skills/voice-clone/` | CosyVoice/FishSpeech |
| **volcano-voice** | `skills/volcano-voice/` | 火山引擎 (需配置) |

### 已安装的 ASR

| 技能 | 位置 | 说明 |
|------|------|------|
| **whisper-local** | `skills/whisper-local/` | 本地 Whisper (需安装依赖) |

### 已安装的 VAD

| 技能 | 位置 | 说明 |
|------|------|------|
| **vad** | `skills/vad/` | Silero VAD (模型已就绪) |

---

## 🚀 实施步骤

### 步骤 1: 安装 Whisper (5 分钟)

```bash
# 方案 A: 标准 Whisper (CPU/GPU)
pip install openai-whisper

# 方案 B: faster-whisper (更快，推荐)
pip install faster-whisper

# 验证安装
whisper --help
```

### 步骤 2: 测试 whisper-local 技能

```bash
cd skills/whisper-local/test
node asr-test.js whisper
```

### 步骤 3: 测试 VAD

```bash
# 创建简单测试脚本
cd skills/vad
# 使用已有模型 silero_vad.onnx
```

### 步骤 4: 测试 TTS (meijutts)

```bash
# 查看 meijutts 技能
cd skills/meijutts
# 测试朗读
```

### 步骤 5: 整合测试

使用 `skills/realtime-voice-chat/test/flow-test.js` 进行完整流程测试

---

## 📋 修改测试脚本

需要修改 `flow-test.js` 使用本地技能而非 Docker 服务：

**ASR**: 从 `http://localhost:8000` 改为 `whisper-local` 技能  
**TTS**: 从 `http://localhost:8080` 改为 `meijutts` 或 `qwen3-tts` 技能

---

## ⏰ 预计时间

| 步骤 | 预计时间 |
|------|---------|
| 安装 Whisper | 5 分钟 |
| 测试各模块 | 5 分钟 |
| 修改测试脚本 | 5 分钟 |
| 完整流程测试 | 5 分钟 |
| **总计** | **20 分钟** |

---

## 🎯 优势

- ✅ 无需 Docker
- ✅ 无需重启计算机
- ✅ 使用现有技能
- ✅ 更轻量级

---

## 📞 下一步

1. 确认是否安装 Whisper
2. 修改测试脚本使用本地技能
3. 执行完整流程测试

---

**准备执行本地方案！** 🚀
