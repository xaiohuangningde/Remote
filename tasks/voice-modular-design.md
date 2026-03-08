# 语音功能 - 模块化设计

> 原则：步步封装，不互相干扰

---

## 🏗️ 架构设计

### 分层架构

```
┌─────────────────────────────────────────┐
│              main.py                    │
│          (主程序/编排层)                 │
│                                         │
│  - 初始化各模块                          │
│  - 状态管理 (is_speaking, is_processing)│
│  - 流程编排：VAD → ASR → LLM → TTS      │
│  - 错误处理 (降级策略)                   │
└─────────────────────────────────────────┘
           │           │           │
    ┌──────┘    ┌──────┘    ┌──────┘
    ▼           ▼           ▼
┌────────┐  ┌────────┐  ┌────────┐
│  VAD   │  │  LLM   │  │  TTS   │
│ Module │  │ Module │  │ Module │
└────────┘  └────────┘  └────────┘
```

---

## 📦 模块清单

### 1. VAD 模块 (`vad_streaming.py`)

**职责**: 实时语音活动检测

**接口**:
```python
class VADStreaming:
    def __init__(self, config: VADConfig)
    async def process_audio(self, audio: np.ndarray) -> VADState
    def on(self, event: str, callback: Callable)
    
# 事件
# - 'speech-start': 检测到语音开始
# - 'speech-end': 检测到语音结束
# - 'speech-ready': 语音片段就绪 (带音频数据)
```

**依赖**: 
- ✅ `silero_vad.onnx` (模型文件)
- ✅ `onnxruntime` (推理引擎)
- ✅ `numpy` (数值计算)

**独立测试**:
```bash
python -m skills.realtime-voice-chat.vad_streaming --test
```

---

### 2. 音频管理模块 (`audio_manager.py`)

**职责**: 麦克风输入/扬声器输出

**接口**:
```python
class AudioManager:
    def __init__(self, sample_rate=16000, chunk_size=512)
    async def start(self, on_audio: Callable[[np.ndarray], None])
    def stop(self)
    def play(self, audio: np.ndarray) -> bool
    def is_playing(self) -> bool
```

**依赖**:
- ✅ `pyaudio` (音频 I/O)
- ✅ `numpy` (音频数据)

**独立测试**:
```bash
python -m skills.realtime-voice-chat.audio_manager --record 5 --play
```

---

### 3. LLM 模块 (`llm_bridge.py`)

**职责**: 调用 OpenClaw 生成回复

**接口**:
```python
class LLMBridge:
    def __init__(self, api_url: str = None)
    async def chat(self, messages: List[Message]) -> str
    async def health_check(self) -> bool
    
# 降级：API 不可用时返回简单回复
```

**依赖**:
- ✅ `requests` 或 `aiohttp` (HTTP 客户端)

**独立测试**:
```bash
python -m skills.realtime-voice-chat.llm_bridge --test "你好"
```

---

### 4. TTS 模块 (`tts_service.py`)

**职责**: 文字转语音

**接口**:
```python
class TTSService:
    def __init__(self, provider: str = 'system')
    async def synthesize(self, text: str) -> np.ndarray
    def is_playing(self) -> bool
    def stop(self)
    
# Provider: 'system' (Windows TTS) | 'qwen3' | 'volcano'
```

**依赖**:
- ✅ 系统 TTS (Windows)
- ✅ 可选：Qwen3-TTS / Volcano

**独立测试**:
```bash
python -m skills.realtime-voice-chat.tts_service --test "你好，这是测试"
```

---

### 5. 打断处理模块 (`interrupt_handler.py`)

**职责**: 语音打断逻辑

**接口**:
```python
class InterruptHandler:
    def __init__(self, tts: TTSService)
    def on_speech_start(self)  # VAD 触发
    def is_interrupted(self) -> bool
```

**依赖**:
- ✅ `threading` (线程控制)
- ✅ `TTSService` (TTS 模块)

**独立测试**:
```bash
python -m skills.realtime-voice-chat.interrupt_handler --simulate
```

---

### 6. ASR 模块 (`asr_service.py`)

**职责**: 语音识别

**接口**:
```python
class ASRService:
    def __init__(self, model: str = 'tiny')
    async def transcribe(self, audio: np.ndarray) -> str
```

**依赖**:
- ✅ `faster-whisper`

**独立测试**:
```bash
python -m skills.realtime-voice-chat.asr_service --test audio.wav
```

---

## 🔗 模块整合

### 主程序 (`main.py`)

```python
async def main():
    # 1. 初始化模块
    vad = VADStreaming(config)
    audio = AudioManager()
    llm = LLMBridge()
    tts = TTSService()
    interrupt = InterruptHandler(tts)
    
    # 2. 注册事件
    vad.on('speech-start', interrupt.on_speech_start)
    vad.on('speech-end', on_speech_end)
    
    # 3. 开始处理
    async def on_speech_end(audio_data):
        text = await asr.transcribe(audio_data)
        reply = await llm.chat(text)
        await tts.synthesize(reply)
    
    await audio.start(vad.process_audio)
```

---

## 🧪 测试策略

### 单元测试

每个模块独立测试：
```bash
# VAD 模块
python -m vad_streaming --test

# 音频模块
python -m audio_manager --record 5 --play

# LLM 模块
python -m llm_bridge --test "你好"
```

### 整合测试

主程序测试：
```bash
python main.py --dry-run  # 模拟运行
python main.py            # 实际运行
```

### 错误注入测试

```bash
python main.py --mock-llm-fail  # 测试 LLM 降级
python main.py --mock-tts-fail  # 测试 TTS 降级
```

---

## 📁 文件结构

```
skills/realtime-voice-chat/
├── vad_streaming.py       # VAD 模块
├── audio_manager.py       # 音频模块
├── llm_bridge.py          # LLM 模块
├── tts_service.py         # TTS 模块
├── interrupt_handler.py   # 打断模块
├── asr_service.py         # ASR 模块
├── main.py                # 主程序
├── config.py              # 配置
├── test/                  # 测试
│   ├── test_vad.py
│   ├── test_audio.py
│   └── ...
└── README.md              # 文档
```

---

## ✅ 验收标准

| 模块 | 验收测试 | 通过标准 |
|------|---------|---------|
| VAD | `--test` | 检测到语音开始/结束 |
| 音频 | `--record --play` | 录音并回放成功 |
| LLM | `--test "你好"` | 返回非空回复 |
| TTS | `--test "你好"` | 生成音频并播放 |
| 打断 | `--simulate` | TTS 播放中暂停 |
| 整合 | `python main.py` | 完整对话流程 |

---

## 🚀 开发顺序

1. **VAD 模块** (基础)
2. **音频模块** (输入输出)
3. **ASR 模块** (识别)
4. **LLM 模块** (对话)
5. **TTS 模块** (合成)
6. **打断模块** (增强)
7. **主程序** (整合)

**每个模块独立开发和测试！**

---

**状态**: 设计完成，等待验证结果  
**原则**: 模块化、步步封装、不互相干扰
