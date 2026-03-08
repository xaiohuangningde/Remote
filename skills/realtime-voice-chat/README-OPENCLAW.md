# 实时语音对话 - OpenClaw 版本

> 纯 Python 实现，无需 Web

---

## 🚀 快速开始

### 1. 测试麦克风
```bash
cd skills/realtime-voice-chat
python -c "import pyaudio; p=pyaudio.PyAudio(); print(f'设备数：{p.get_device_count()}'); p.terminate()"
```

### 2. 运行实时对话
```bash
python voice_chat_openclaw.py
```

---

## 📊 功能

```
麦克风 → VAD → Whisper → OpenClaw LLM → 系统 TTS → 扬声器
```

- ✅ 实时麦克风输入 (PyAudio)
- ✅ VAD 语音检测 (能量阈值)
- ✅ Whisper 语音识别
- ✅ OpenClaw LLM 对话
- ✅ 系统 TTS 播放

---

## 🔧 配置

编辑 `voice_chat_openclaw.py`:

```python
# OpenClaw API 地址
OPENCLAW_URL = 'http://localhost:3000/api/chat'

# VAD 阈值
SILENCE_THRESHOLD = 0.5  # 秒

# 采样率
SAMPLE_RATE = 16000
```

---

## 📋 依赖

```bash
pip install pyaudio numpy faster-whisper requests
```

---

## 🎯 流程

1. **录音**: 麦克风捕获音频
2. **VAD**: 检测语音结束 (静音 0.5s)
3. **ASR**: Whisper 转录为文字
4. **LLM**: OpenClaw 生成回复
5. **TTS**: 系统语音合成播放

---

## ⚠️ 注意事项

1. **编码问题**: 确保 UTF-8
2. **麦克风权限**: Windows 需要授权
3. **Whisper 模型**: 首次运行自动下载

---

## 🐛 故障排查

### 问题 1: 麦克风无输入
```bash
# 测试麦克风
python mic_test.py
```

### 问题 2: OpenClaw 无法连接
检查 OpenClaw 是否运行，或修改为本地简单回复

### 问题 3: TTS 无声
Windows 系统 TTS 需要扬声器

---

## 📁 文件清单

| 文件 | 说明 |
|------|------|
| `voice_chat_openclaw.py` | 主程序 |
| `mic_test.py` | 麦克风测试 |
| `voice_chat.py` | 原版 (简单回复) |
| `realtime_voice_chat.py` | 实时版本 |

---

**状态**: 准备测试  
**下一步**: 运行 `python voice_chat_openclaw.py`
