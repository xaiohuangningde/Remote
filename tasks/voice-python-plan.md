# Python 实时语音对话移植计划

## 项目目标

基于 Airi Web 实现，创建 Python 版实时语音对话系统，支持:
- ✅ VAD 流式语音检测
- ✅ 实时音频采集与处理
- ✅ 语音打断 (用户说话时暂停 TTS)
- ✅ LLM 流式对话
- ✅ TTS 逐句合成与播放

---

## 核心组件

### 1. VAD 流式检测

#### Airi 实现摘要
- **模型**: Silero VAD (ONNX)，通过 `@huggingface/transformers` 加载
- **状态保持**: `state` Tensor (2×1×128) 在多次推理间传递
- **流式推理**: `inferenceChain` Promise 链保证顺序
- **缓冲管理**: `Float32Array` 环形缓冲 + `prevBuffers` 预填充
- **事件系统**: `emit('speech-start'/'speech-end'/'speech-ready')`

#### Python 方案

**依赖**:
```python
import onnxruntime as ort  # ONNX Runtime
import numpy as np        # 数值计算
```

**模型准备**:
```bash
# 下载 Silero VAD 模型
wget https://github.com/snakers4/silero-vad/raw/master/files/silero_vad.onnx
```

**代码结构**: `vad_streaming.py`

```python
class VADStreaming:
    def __init__(self, config: VADConfig):
        self.session = ort.InferenceSession('silero_vad.onnx')
        self.state = np.zeros((2, 1, 128), dtype=np.float32)
        self.buffer = np.zeros(max_buffer_samples, dtype=np.float32)
        self.is_recording = False
        self.prev_buffers = []
        self.post_speech_samples = 0
        
    async def process_audio(self, audio_chunk: np.ndarray):
        # 流式推理
        is_speech = self._detect_speech(audio_chunk)
        
        # 状态机转换
        if is_speech and not self.is_recording:
            self._on_speech_start()
        elif self.is_recording and not is_speech:
            self._check_speech_end()
    
    def _detect_speech(self, audio: np.ndarray) -> bool:
        # ONNX 推理
        ort_inputs = {
            'input': audio[np.newaxis, :],
            'sr': np.array([16000], dtype=np.int64),
            'state': self.state
        }
        outputs = self.session.run(None, ort_inputs)
        speech_prob = outputs[0][0]
        self.state = outputs[1]  # 更新状态
        return speech_prob > self.threshold
```

**关键差异**:
- JavaScript: 异步 Promise 链 → Python: 同步推理 (GIL 保证顺序)
- JavaScript: `Float32Array` → Python: `numpy.ndarray`
- JavaScript: 事件回调 → Python: `asyncio.Queue` 或回调函数

---

### 2. 音频管理

#### Airi 实现摘要
- **音频输入**: Web Audio API + AudioWorklet (512 采样分块)
- **采样率**: 16000 Hz
- **连接**: 麦克风 → sourceNode → worklet → VAD.processAudio()
- **静默输出**: gain=0 的 GainNode 保持音频图活跃

#### Python 方案

**依赖**:
```python
import pyaudio  # 音频 I/O
# 或
import sounddevice as sd  # 更现代的替代
```

**代码结构**: `audio_manager.py`

```python
class AudioManager:
    def __init__(self, vad: VADStreaming, chunk_size=512):
        self.vad = vad
        self.chunk_size = chunk_size
        self.sample_rate = 16000
        self.pa = pyaudio.PyAudio()
        self.stream = None
        self.is_running = False
    
    async def start(self):
        self.stream = self.pa.open(
            format=pyaudio.paFloat32,
            channels=1,
            rate=self.sample_rate,
            input=True,
            frames_per_buffer=self.chunk_size,
            stream_callback=self._audio_callback
        )
        self.stream.start_stream()
        self.is_running = True
    
    def _audio_callback(self, in_data, frame_count, time_info, status):
        # 回调中处理音频 (非阻塞)
        audio = np.frombuffer(in_data, dtype=np.float32)
        asyncio.create_task(self.vad.process_audio(audio))
        return (None, pyaudio.paContinue)
    
    def stop(self):
        self.stream.stop_stream()
        self.stream.close()
        self.is_running = False
```

**关键差异**:
- JavaScript: AudioWorklet 自动分块 → Python: PyAudio 回调
- JavaScript: 异步消息 → Python: 回调函数 (需注意线程安全)

---

### 3. 语音打断

#### Airi 实现摘要
- **状态**: ❌ Airi Web 未实现真正的语音打断
- **播放**: 简单队列 `audioPlaybackQueue`，按顺序播放
- **缺失**: 用户说话时没有暂停 TTS 播放的逻辑

#### Python 方案

**代码结构**: `interrupt_handler.py`

```python
class InterruptHandler:
    def __init__(self):
        self.is_playing = False
        self.stop_event = threading.Event()
        self.current_player = None
        self.lock = threading.Lock()
    
    def on_speech_start(self):
        """VAD 检测到语音开始时调用"""
        with self.lock:
            if self.is_playing:
                print("语音打断: 停止当前播放")
                self.stop_event.set()
    
    def play_audio(self, audio_buffer: np.ndarray, sample_rate=16000):
        """播放音频，可被打断"""
        with self.lock:
            if self.stop_event.is_set():
                return  # 已被打断
        
        self.is_playing = True
        self.stop_event.clear()
        
        # 创建播放线程
        player = threading.Thread(
            target=self._play_audio_internal,
            args=(audio_buffer, sample_rate)
        )
        self.current_player = player
        player.start()
        player.join()  # 等待播放完成或被中断
        
        self.is_playing = False
    
    def _play_audio_internal(self, audio_buffer, sample_rate):
        # 分块播放，每块检查 stop_event
        chunk_size = 512
        for i in range(0, len(audio_buffer), chunk_size):
            if self.stop_event.is_set():
                print("播放已中断")
                return
            chunk = audio_buffer[i:i+chunk_size]
            # 播放 chunk...
```

**使用方式**:
```python
# 主程序中
interrupt = InterruptHandler()
vad.on('speech-start', interrupt.on_speech_start)

# TTS 合成后
tts_audio = await tts.synthesize(sentence)
interrupt.play_audio(tts_audio)
```

---

### 4. LLM 桥接

#### Airi 实现摘要
- **调用方式**: HTTP API (`@xsai/stream-text`)
- **流式输出**: `ReadableStream` 逐 token 读取
- **分句标记**: `<break/>` 标记分割句子
- **事件**: `llmChatCompletionsTokenEvent` → `llmSentenceReadyEvent`

#### OpenClaw 调用方式

**方案 A: 直接调用 OpenClaw API** (推荐)

```python
# llm_bridge.py
from openclaw import chat

async def stream_chat(messages: list[Message]) -> AsyncGenerator[str, None]:
    """流式对话，逐 token 生成"""
    async for token in chat.stream(messages):
        yield token

class SentenceParser:
    def __init__(self, break_marker='<break/>'):
        self.buffer = ''
        self.break_marker = break_marker
        self.sentence_index = 0
    
    def feed(self, token: str) -> list[tuple[str, int]]:
        """输入 token，返回完整的句子列表"""
        self.buffer += token
        sentences = []
        
        while True:
            idx = self.buffer.find(self.break_marker)
            if idx == -1:
                break
            sentence = self.buffer[:idx].strip()
            self.buffer = self.buffer[idx + len(self.break_marker):]
            if sentence:
                sentences.append((sentence, self.sentence_index))
                self.sentence_index += 1
        
        return sentences
```

**方案 B: HTTP API** (如果需要独立服务)

```python
import httpx

async def stream_chat_http(messages: list, endpoint: str):
    async with httpx.AsyncClient() as client:
        async with client.stream('POST', endpoint, json={'messages': messages}) as resp:
            async for line in resp.aiter_lines():
                if line.startswith('data: '):
                    yield json.loads(line[6:])['token']
```

---

## 文件结构

```
skills/realtime-voice-chat/
├── vad_streaming.py      # VAD 流式检测 (核心)
├── audio_manager.py      # 音频采集与播放
├── interrupt_handler.py  # 语音打断逻辑
├── llm_bridge.py         # OpenClaw LLM 桥接
├── tts_service.py        # TTS 服务 (火山引擎)
├── asr_service.py        # ASR 服务 (可选)
├── main.py               # 主程序整合
├── config.py             # 配置管理
├── requirements.txt      # Python 依赖
└── README.md             # 使用说明
```

---

## 任务分解

| 任务 | 预计时间 | 优先级 | 依赖 |
|------|---------|--------|------|
| **1. VAD 移植** | 1h | P0 | 无 |
| - 下载 Silero VAD 模型 | 10m | | |
| - 实现 `VADStreaming` 类 | 30m | | |
| - 实现状态保持推理 | 20m | | |
| - 实现事件回调系统 | 20m | | |
| **2. 音频管理** | 1h | P0 | VAD |
| - PyAudio 初始化 | 15m | | |
| - 实现音频回调 | 25m | | |
| - 实现音频播放 | 20m | | |
| - 线程安全处理 | 20m | | |
| **3. 打断逻辑** | 30m | P0 | 音频管理 |
| - 实现 `InterruptHandler` | 20m | | |
| - 集成 VAD speech-start | 10m | | |
| **4. LLM 桥接** | 30m | P1 | 无 |
| - 实现 `stream_chat` | 15m | | |
| - 实现 `SentenceParser` | 15m | | |
| **5. TTS 集成** | 30m | P1 | 打断逻辑 |
| - 集成火山引擎 TTS | 20m | | |
| - 逐句合成队列 | 10m | | |
| **6. 整合测试** | 1h | P1 | 全部 |
| - 端到端流程测试 | 30m | | |
| - 语音打断测试 | 15m | | |
| - 性能优化 | 15m | | |

**总计**: 约 4.5 小时

---

## 依赖安装

```bash
# 核心依赖
pip install onnxruntime numpy pyaudio

# 可选：更现代的音频库
pip install sounddevice soundfile

# TTS/ASR (火山引擎)
pip install volcengine-python-sdk

# HTTP 客户端 (如果需要)
pip install httpx

# 异步支持
pip install asyncio-throttle
```

**requirements.txt**:
```txt
onnxruntime>=1.16.0
numpy>=1.24.0
pyaudio>=0.2.13
sounddevice>=0.4.6
volcengine-python-sdk>=1.0.0
httpx>=0.25.0
```

---

## 测试计划

### 1. VAD 单元测试

```python
def test_vad_speech_detection():
    vad = VADStreaming()
    # 播放一段录音，验证 speech-start/speech-end 事件
    assert speech_detected == True

def test_vad_state_preservation():
    vad = VADStreaming()
    # 验证 state Tensor 在多次推理间保持
    assert vad.state.shape == (2, 1, 128)
```

### 2. 音频管理测试

```python
def test_audio_capture():
    manager = AudioManager(vad)
    await manager.start()
    # 验证能捕获音频
    time.sleep(1)
    await manager.stop()
```

### 3. 打断逻辑测试

```python
def test_interrupt_during_playback():
    interrupt = InterruptHandler()
    # 开始播放长音频
    thread = Thread(target=interrupt.play_audio, args=(long_audio,))
    thread.start()
    time.sleep(0.5)
    # 触发打断
    interrupt.on_speech_start()
    # 验证播放停止
    assert not interrupt.is_playing
```

### 4. 端到端测试

```python
async def test_full_conversation():
    # 模拟完整流程: VAD → ASR → LLM → TTS → 播放
    # 验证每个环节正常衔接
    pass
```

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| **PyAudio 安装问题** | 中 | 提供 sounddevice 备选方案 |
| **VAD 推理延迟** | 中 | 使用 onnxruntime-gpu (如有 GPU) |
| **线程竞争** | 高 | 使用 Lock 保护共享状态 |
| **音频设备权限** | 中 | 提供详细的权限配置文档 |
| **TTS 延迟** | 低 | 异步队列预合成下一句 |

---

## 下一步行动

1. ✅ 完成分析报告 (`tasks/voice-airi-analysis.md`)
2. ✅ 完成移植计划 (`tasks/voice-python-plan.md`)
3. ⏳ 更新状态文件 (`tasks/voice-project-state.md`)
4. ⏳ 开始实现 VAD 流式检测
5. ⏳ 实现音频管理
6. ⏳ 整合测试

---

## 参考资源

- **Silero VAD**: https://github.com/snakers4/silero-vad
- **ONNX Runtime**: https://onnxruntime.ai/
- **PyAudio**: https://pypi.org/project/PyAudio/
- **Airi Web**: `skills/voice-system/airi-official/apps/vad-asr-chat-tts/`
