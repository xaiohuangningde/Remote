# Python 桌面版语音系统开发计划

**创建时间**: 2026-03-07 11:49
**状态**: `in_progress`
**技能应用**: planning-with-files + autonomous-agent-patterns

---

## 🎯 目标

基于 Airi 官方逻辑，创建 Python 桌面版实时语音系统。

**参考**:
- Airi 官方 TS 实现：`skills/voice-system/airi-official/`
- 现有 Python 代码：`skills/realtime-voice-chat/`

---

## 📋 架构设计

```
┌─────────────────────────────────────────────────────────┐
│              Python 桌面版语音系统                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐    ┌──────────    ┌──────────┐          │
│  │ PyAudio  │───→│   VAD    │───→│  Whisper │          │
│  │ (采集)   │    │ (Silero) │    │  (ASR)   │          │
│  └──────────    └──────────┘    └──────────┘          │
│                                        │                 │
│                                        ↓                 │
│  ┌──────────┐    ┌──────────    ┌──────────┐          │
│  │  TTS     │←───│  LLM     │←───│ OpenClaw │          │
│  │ (Qwen3)  │    │ (回复)   │    │  (CLI)   │          │
│  └──────────┘    └──────────    └──────────┘          │
│       │                                                 │
│       ↓                                                 │
│  ┌──────────┐                                          │
│  │ 播放音频 │                                          │
│  └──────────┘                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 文件结构

```
skills/voice-system-python/
├── src/
│   ├── __init__.py
│   ├── vad/
│   │   ├── __init__.py
│   │   ├── silero_vad.py      # Silero VAD 推理
│   │   └── state_manager.py   # 状态管理
│   ├── audio/
│   │   ├── __init__.py
│   │   ├── capture.py         # PyAudio 采集
│   │   └── player.py          # 音频播放
│   ├── asr/
│   │   ├── __init__.py
│   │   └── whisper_asr.py     # Whisper ASR
│   ├── tts/
│   │   ├── __init__.py
│   │   └── qwen3_tts.py       # Qwen3-TTS 桥接
│   └── core.py                # 主流程
├── tests/
├── requirements.txt
└── README.md
```

---

## 🚀 开发阶段

### Phase 1: VAD 模块 (今天)
- [ ] 创建目录结构
- [ ] 实现 Silero VAD 推理 (复用现有验证代码)
- [ ] 实现 PyAudio 采集
- [ ] 测试 VAD 检测

### Phase 2: ASR + LLM (今天)
- [ ] 集成 Whisper ASR
- [ ] 桥接 OpenClaw CLI
- [ ] 测试语音→文本→回复

### Phase 3: TTS + 完整流程 (明天)
- [ ] 桥接 Qwen3-TTS
- [ ] 实现音频播放
- [ ] 端到端测试

---

## 📝 技术要点

### VAD (从 Airi 移植)
```python
# Airi TS 逻辑
const vad = await SileroVAD.load()
const prob = vad.process(audioChunk)
if (prob > threshold) → speech_detected
```

### 音频采集 (PyAudio)
```python
import pyaudio

stream = pyaudio.open(
    format=paFloat32,
    channels=1,
    rate=16000,
    input=True,
    frames_per_buffer=512
)
```

### TTS (Qwen3 本地)
```python
from qwen_tts import Qwen3TTSModel

model = Qwen3TTSModel.from_pretrained(model_path)
wavs, sr = model.generate_custom_voice(text, speaker="Vivian")
```

---

## ⚠️ 风险与缓解

| 风险 | 缓解 |
|------|------|
| PyAudio 兼容性 | 提供文件输入模式备选 |
| Whisper 延迟 | 使用 tiny/base 模型 |
| TTS 延迟 | 异步播放 + 队列管理 |

---

## 📊 进度追踪

| 时间 | 完成 | 状态 |
|------|------|------|
| 11:49 | 创建计划 | ✅ |
| - | 创建目录 | ⏳ |
| - | VAD 实现 | ⏳ |
| - | 测试 | ⏳ |
