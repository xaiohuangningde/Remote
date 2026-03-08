# 语音功能 - 差距分析

> 对比参考项目：https://github.com/proj-airi/webai-example-realtime-voice-chat
> 分析时间：2026-03-07 09:15

---

## 📊 参考项目架构 (Airi)

```
VAD (Silero) → ASR (Whisper) → LLM (OpenRouter/GPT) → TTS (UnSpeech/Qwen3)
     ↓              ↓                  ↓                    ↓
  WebAudio      Whisper          StreamText          AudioPlayback
  实时捕获        API/本地          流式回复            实时播放
```

**关键特性**:
1. ✅ **实时麦克风捕获** (Web Audio API / PyAudio)
2. ✅ **流式处理** (边说边识别，边识别边回复)
3. ✅ **语音打断** (TTS 播放中检测到说话立即暂停)
4. ✅ **前端 UI** (Vue/React 可视化界面)
5. ✅ **配置管理** (.env 统一配置)

---

## ✅ 我们已有的

| 组件 | 状态 | 说明 |
|------|------|------|
| VAD 模型 | ✅ | Silero VAD (ONNX) |
| ASR | ✅ | faster-whisper |
| LLM | ✅ | OpenClaw 内置 |
| TTS | ✅ | OpenClaw 内置 |
| 测试脚本 | ✅ | 文件流程测试通过 |

---

## ❌ 缺失的部分

### 1. 实时麦克风捕获 ⚠️ **高优先级**

**当前**: 处理 WAV 文件
**需要**: 实时麦克风音频流

```python
# 参考实现 (已有 mic_test.py)
import pyaudio
stream = p.open(format=pyaudio.paInt16, channels=1, rate=16000, input=True)
while True:
    chunk = stream.read(512)
    vad.process(chunk)
```

**差距**: 
- ✅ `mic_test.py` 存在并可录音
- ❌ 未整合到 VAD 实时处理流程
- ❌ 未测试实时 VAD 检测

---

### 2. 流式处理 ⚠️ **中优先级**

**当前**: 批量处理 (完整音频→VAD→ASR→LLM→TTS)
**需要**: 流式处理 (边说边处理)

```python
# 理想流程
while speaking:
    audio = mic.read(512)
    vad.process(audio)  # 实时检测
    if speech_end:
        asr.transcribe_streaming(audio_buffer)  # 流式转录
        llm.stream_reply()  # 流式回复
        tts.play_streaming()  # 流式播放
```

**差距**:
- ❌ 无流式 ASR 集成
- ❌ 无流式 LLM 回复
- ❌ 无流式 TTS 播放

---

### 3. 语音打断 ⚠️ **高优先级**

**当前**: 无打断逻辑
**需要**: TTS 播放中检测到说话立即暂停

```python
# 打断逻辑
while tts.is_playing():
    if vad.detect_speech():  # 检测到用户说话
        tts.pause()  # 暂停播放
        listen_user()  # 听用户说
```

**差距**:
- ❌ 无 TTS 播放状态检测
- ❌ 无打断逻辑实现

---

### 4. 前端 UI ⚠️ **低优先级**

**当前**: 命令行测试
**需要**: Web UI / 桌面应用

**参考**:
- https://proj-airi-apps-vad-asr-chat-tts.netlify.app

**差距**:
- ❌ 无可视化界面
- ❌ 无波形显示
- ❌ 无状态指示

---

### 5. 配置管理 ⚠️ **中优先级**

**当前**: 分散配置
**需要**: 统一配置文件

**参考**: `.env` 文件
```env
VAD_THRESHOLD=0.5
ASR_MODEL=turbo
LLM_PROVIDER=openrouter
TTS_PROVIDER=unspeech
```

**差距**:
- ❌ 无统一配置
- ❌ 硬编码参数多

---

## 📋 优先级排序

| 优先级 | 功能 | 影响 | 工作量 |
|--------|------|------|--------|
| 🔴 P0 | 实时麦克风 + VAD | 核心功能 | 2h |
| 🔴 P0 | 语音打断逻辑 | 核心体验 | 2h |
| 🟡 P1 | 流式处理 | 性能优化 | 4h |
| 🟡 P1 | 统一配置 | 易用性 | 1h |
| 🟢 P2 | 前端 UI | 用户体验 | 8h+ |

---

## 🚀 立即可执行 (P0)

### 步骤 1: 整合麦克风到 VAD

```python
# skills/vad/test/realtime-mic-test.py
import pyaudio
from ..src.index import VADDetector

vad = VADDetector()
await vad.init()

mic = pyaudio.PyAudio()
stream = mic.open(rate=16000, format=pyaudio.paInt16, channels=1, input=True)

print("Listening...")
while True:
    chunk = stream.read(512)
    audio = np.frombuffer(chunk, dtype=np.int16).astype(np.float32) / 32768.0
    state = vad.processAudio(audio)
    print(f"State: {state}")
```

### 步骤 2: 实现语音打断

```python
# skills/realtime-voice-chat/src/interrupt.py
class InterruptHandler:
    def __init__(self, vad, tts):
        self.vad = vad
        self.tts = tts
    
    def check_interrupt(self):
        if self.tts.is_playing() and self.vad.isSpeaking():
            self.tts.pause()
            return True
        return False
```

---

## 📊 当前可用 vs 参考项目

| 功能 | 参考项目 | 当前状态 | 差距 |
|------|---------|---------|------|
| VAD 检测 | ✅ 实时 | ✅ 文件 | ⚠️ 麦克风 |
| ASR 转录 | ✅ 流式 | ✅ 文件 | ⚠️ 流式 |
| LLM 对话 | ✅ 流式 | ✅ 内置 | ✅ |
| TTS 播放 | ✅ 流式 + 打断 | ✅ 内置 | ❌ 打断 |
| 麦克风输入 | ✅ 实时 | ❌ 无 | ❌ 缺失 |
| 前端 UI | ✅ Web | ❌ CLI | ❌ 缺失 |

---

## 💡 建议

### 短期 (今天)
1. ✅ 测试 `mic_test.py` 录音功能
2. ✅ 整合麦克风到 VAD 实时检测
3. ✅ 实现基本语音打断

### 中期 (本周)
1. 流式 ASR 集成
2. 统一配置文件
3. 完整流程测试

### 长期 (可选)
1. Web UI 界面
2. 高级功能 (多说话人、情感识别等)

---

**结论**: 核心组件已就绪，缺失**实时麦克风整合**和**语音打断逻辑**。
