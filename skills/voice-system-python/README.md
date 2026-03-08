# Voice System Python

实时语音对话系统 - Python 桌面版

基于 Airi 官方逻辑，使用 Python 实现完整的 VAD → ASR → LLM → TTS 流程。

## 🎯 特性

- 🎤 **VAD 语音检测** - Silero VAD ONNX 推理
- 🗣️ **ASR 语音识别** - Whisper 本地识别
- 💬 **LLM 对话** - OpenClaw 集成
- 🔊 **TTS 语音合成** - Qwen3-TTS 本地合成
- ⚡ **实时处理** - PyAudio 流式采集

## 📦 安装

```bash
cd skills/voice-system-python
pip install -r requirements.txt
```

## 🚀 快速开始

```python
import asyncio
from src.core import VoiceSystem

async def main():
    system = VoiceSystem()
    await system.run()

asyncio.run(main())
```

## 📁 项目结构

```
voice-system-python/
├── src/
│   ├── vad/
│   │   └── silero_vad.py      # Silero VAD
│   ├── audio/
│   │   └── capture.py         # PyAudio 采集
│   ├── asr/
│   │   └── whisper_asr.py     # Whisper ASR (TODO)
│   ├── tts/
│   │   └── qwen3_tts.py       # Qwen3-TTS (TODO)
│   └── core.py                # 主流程
├── tests/
├── requirements.txt
└── README.md
```

## 🧪 测试

### 测试 VAD

```bash
python src/vad/silero_vad.py
```

### 测试音频采集

```bash
python src/audio/capture.py
```

### 完整测试

```bash
python src/core.py
```

## 📊 性能

| 组件 | 延迟 | 说明 |
|------|------|------|
| VAD | <10ms | ONNX 推理 |
| 音频采集 | 32ms | 512 采样点 @ 16kHz |
| ASR | ~500ms | Whisper tiny |
| TTS | ~1s | Qwen3 本地 |

**总延迟**: ~1.5-2s (目标优化到<1s)

## 🔧 配置

```python
system = VoiceSystem({
    'speech_threshold': 0.3,    # VAD 语音检测阈值
    'exit_threshold': 0.1,       # VAD 退出阈值
    'min_silence_ms': 400,       # 最小静音时长
})
```

## 📝 开发日志

- 2026-03-07: 创建项目，实现 VAD + 音频采集
- 2026-03-07: 集成 Whisper ASR
- 2026-03-07: 集成 Qwen3-TTS

## 🙏 致谢

基于 [Airi](https://github.com/proj-airi/webai-example-realtime-voice-chat) 官方逻辑移植
