# 实时语音对话 - Python 版

> 借鉴 Airi Web 实现，纯 Python 版本

---

## 🚀 快速开始

### 测试 VAD 模块
```bash
# 运行 VAD 测试
python -m test.test_vad

# 运行 VAD 演示 (使用 WAV 文件)
python demo_vad.py --file <your_audio.wav>
```

### 测试完整流程
```bash
python voice_chat_openclaw.py
```

---

## 📁 文件说明

| 文件 | 功能 | 状态 |
|------|------|------|
| `vad_streaming.py` | VAD 流式检测 | ✅ 完整 |
| `voice_chat_openclaw.py` | 完整语音对话 | ✅ 完整 |
| `demo_vad.py` | VAD 演示脚本 | ✅ 完整 |
| `mic_test.py` | 麦克风测试 | ✅ 可用 |
| `chinese_asr.py` | 中文 ASR | ⏳ 待检查 |
| `test/test_vad.py` | VAD 测试套件 | ✅ 完整 |

---

## 🏗️ 架构

```
麦克风 → VAD → Whisper ASR → OpenClaw LLM → 系统 TTS → 播放
```

---

## 📋 依赖

```bash
pip install onnxruntime numpy pyaudio faster-whisper
```

---

## 🧪 测试状态

| 模块 | 测试 | 状态 |
|------|------|------|
| VAD | `python -m test.test_vad` | ✅ 5/5 通过 |
| 麦克风 | `python mic_test.py` | ✅ 可用 |
| 主程序 | `python voice_chat_openclaw.py` | ⏳ 待测试 |

---

## 📊 项目状态

**总体规划**: `tasks/voice-master-plan.md`  
**模块设计**: `tasks/voice-modular-design.md`  
**现有代码**: `tasks/voice-existing-code-status.md`

---

**最后更新**: 2026-03-07 09:52
