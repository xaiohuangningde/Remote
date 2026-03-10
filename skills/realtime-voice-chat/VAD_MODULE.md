# VAD 流式检测模块

> Silero VAD ONNX 实时语音活动检测模块

---

## 📖 模块说明

本模块提供基于 Silero VAD ONNX 模型的流式语音活动检测功能。

**核心特性**:
- ✅ 使用 Silero VAD ONNX 模型
- ✅ 支持流式音频输入 (512 采样分块)
- ✅ 状态保持 (state Tensor: [2, 1, 128])
- ✅ 事件回调：speech-start, speech-end, speech-ready
- ✅ 完整错误处理
- ✅ 独立可用，不依赖其他模块

**适用场景**:
- 实时语音对话系统
- 语音录制触发
- 语音打断检测
- 音频流分析

---

## 📦 安装依赖

```bash
# 必需依赖
pip install onnxruntime numpy

# 可选依赖（用于演示脚本）
pip install pyaudio scipy
```

**模型文件**:
- 路径：`skills/vad/models/silero_vad.onnx`
- 如果不存在，请从以下地址下载：
  - HuggingFace: https://huggingface.co/onnx-community/silero-vad
  - 或使用项目中的验证脚本下载

---

## 🚀 快速开始

### 1. 基本使用

```python
import asyncio
import numpy as np
from skills.realtime-voice-chat.vad_streaming import create_vad

async def main():
    # 创建并初始化 VAD
    vad = await create_vad()
    
    # 注册事件回调
    vad.on('speech-start', lambda: print("🎤 语音开始"))
    vad.on('speech-end', lambda: print("🤐 语音结束"))
    vad.on('speech-ready', lambda data: print(f"📝 语音就绪：{data['samples']} 采样点"))
    
    # 处理音频流
    while True:
        # 假设从麦克风获取 512 采样点
        audio = np.random.randn(512).astype(np.float32) * 0.1
        
        # 处理并获取状态
        state = await vad.process_audio(audio)
        
        # 检查状态
        if state.is_speaking:
            print(f"检测到语音，概率：{state.speech_prob:.2f}")

asyncio.run(main())
```

### 2. 从文件检测

```bash
# 使用演示脚本
python -m skills.realtime-voice-chat.demo_vad --file test.wav
```

### 3. 从麦克风检测

```bash
# 实时麦克风检测
python -m skills.realtime-voice-chat.demo_vad --mic
```

---

## 📚 API 文档

### VADConfig

配置参数类。

```python
@dataclass
class VADConfig:
    sample_rate: int = 16000              # 采样率 (Hz)
    speech_threshold: float = 0.3         # 语音检测阈值
    exit_threshold: float = 0.1           # 退出语音状态阈值
    min_silence_duration_ms: int = 400    # 最小静默时长 (ms)
    speech_pad_ms: int = 80               # 语音前后填充 (ms)
    min_speech_duration_ms: int = 250     # 最小语音时长 (ms)
    max_buffer_duration: int = 30         # 最大缓冲时长 (秒)
    new_buffer_size: int = 512            # 输入块大小
    model_path: str = "..."               # 模型文件路径
```

### VADStreaming

核心 VAD 检测类。

#### 初始化

```python
from vad_streaming import VADStreaming, VADConfig

config = VADConfig(sample_rate=16000, speech_threshold=0.3)
vad = VADStreaming(config)
await vad.initialize()
```

#### process_audio

处理音频分块。

```python
async def process_audio(self, audio: np.ndarray) -> VADState
```

**参数**:
- `audio`: 音频数据，shape 应为 `(512,)` 或 `(1, 512)`，float32 类型，归一化到 `[-1, 1]`

**返回**:
- `VADState`: 当前 VAD 状态

**示例**:
```python
audio = np.random.randn(512).astype(np.float32) * 0.1
state = await vad.process_audio(audio)
print(f"语音概率：{state.speech_prob:.2f}")
print(f"是否说话：{state.is_speaking}")
```

#### on

注册事件回调。

```python
def on(self, event: str, callback: Callable) -> None
```

**支持的事件**:
- `'speech-start'`: 检测到语音开始
- `'speech-end'`: 检测到语音结束
- `'speech-ready'`: 语音片段就绪（带音频数据）

**示例**:
```python
vad.on('speech-start', lambda: print("语音开始"))
vad.on('speech-ready', lambda data: process_audio(data['buffer']))
```

#### get_state

获取当前状态（用于调试）。

```python
def get_state(self) -> dict
```

**返回**:
```python
{
    'is_speaking': bool,
    'speech_prob': float,
    'buffer_samples': int,
    'post_speech_samples': int,
    'total_samples': int,
    'is_initialized': bool,
    'config': {...}
}
```

#### update_config

更新配置参数。

```python
def update_config(self, **kwargs) -> None
```

**示例**:
```python
vad.update_config(speech_threshold=0.5, sample_rate=44100)
```

### VADState

状态数据类。

```python
@dataclass
class VADState:
    is_speaking: bool = False           # 是否正在说话
    speech_prob: float = 0.0            # 语音概率
    buffer_samples: int = 0             # 缓冲区采样数
    post_speech_samples: int = 0        # 语音后采样数
    total_samples: int = 0              # 总处理采样数
```

### 辅助函数

#### create_vad

异步创建并初始化 VAD。

```python
async def create_vad(config: VADConfig = None) -> VADStreaming
```

#### create_vad_sync

同步创建并初始化 VAD。

```python
def create_vad_sync(config: VADConfig = None) -> VADStreaming
```

---

## 🧪 测试

### 运行所有测试

```bash
python -m skills.realtime-voice-chat.test.test_vad
```

### 运行特定测试

```bash
# 模型加载测试
python -m skills.realtime-voice-chat.test.test_vad --test load

# 推理测试
python -m skills.realtime-voice-chat.test.test_vad --test inference

# 流式测试
python -m skills.realtime-voice-chat.test.test_vad --test streaming

# 事件测试
python -m skills.realtime-voice-chat.test.test_vad --test events

# 边界测试
python -m skills.realtime-voice-chat.test.test_vad --test edge
```

### 测试覆盖

| 测试项 | 说明 | 通过标准 |
|--------|------|---------|
| load | 模型加载 | 无异常 |
| inference | 推理测试 | 输出概率 0-1 |
| streaming | 流式测试 | 处理 100+ 块无错误 |
| events | 事件测试 | speech-start/end 触发 |
| edge | 边界测试 | 静音/短语音正确处理 |

---

## 🔧 故障排查

### 1. 模型文件未找到

**错误**:
```
FileNotFoundError: 未找到 VAD 模型文件
```

**解决**:
```bash
# 确认模型文件存在
ls skills/vad/models/silero_vad.onnx

# 或指定模型路径
config = VADConfig(model_path="/path/to/silero_vad.onnx")
vad = VADStreaming(config)
```

### 2. onnxruntime 未安装

**错误**:
```
ImportError: onnxruntime 未安装
```

**解决**:
```bash
pip install onnxruntime
```

### 3. 音频概率始终为 0

**可能原因**:
- 音频未归一化到 `[-1, 1]` 范围
- 采样率不匹配（模型期望 16kHz）
- 音频数据太小（< 64 采样点）

**解决**:
```python
# 确保音频归一化
audio = audio.astype(np.float32)
max_val = np.max(np.abs(audio))
if max_val > 1.0:
    audio = audio / max_val

# 使用正确的采样率
config = VADConfig(sample_rate=16000)
```

### 4. 事件不触发

**可能原因**:
- 语音阈值设置过高
- 音频振幅太小

**解决**:
```python
# 降低阈值
config = VADConfig(speech_threshold=0.2)

# 或增加音频振幅
audio = audio * 2.0  # 注意不要超过 1.0
```

### 5. 麦克风检测失败

**错误**:
```
ImportError: pyaudio 未安装
```

**解决**:
```bash
# Windows
pip install pyaudio

# macOS
brew install portaudio
pip install pyaudio

# Linux
sudo apt-get install python3-pyaudio
```

---

## 📊 性能参考

| 指标 | 数值 |
|------|------|
| 输入块大小 | 512 采样点 |
| 延迟 (@16kHz) | 32ms |
| CPU 占用 | ~5-10% (单核) |
| 内存占用 | ~50MB |
| 推理时间 | < 5ms/块 |

---

## 🎯 最佳实践

### 1. 调整阈值

根据环境噪音调整：

```python
# 安静环境
config = VADConfig(speech_threshold=0.2)

# 嘈杂环境
config = VADConfig(speech_threshold=0.5)
```

### 2. 优化延迟

```python
# 减小块大小（更低延迟，更高 CPU）
config = VADConfig(new_buffer_size=256)

# 减小静默时长（更快响应）
config = VADConfig(min_silence_duration_ms=200)
```

### 3. 处理长语音

```python
# 增加缓冲时长
config = VADConfig(max_buffer_duration=60)  # 60 秒
```

### 4. 错误处理

```python
try:
    vad = await create_vad()
    state = await vad.process_audio(audio)
except RuntimeError as e:
    print(f"VAD 错误：{e}")
except Exception as e:
    print(f"未知错误：{e}")
```

---

## 📝 更新日志

### v1.0.0 (2026-03-07)
- ✅ 初始版本
- ✅ Silero VAD ONNX 模型支持
- ✅ 流式 512 采样分块处理
- ✅ 事件回调系统
- ✅ 完整测试套件
- ✅ 演示脚本

---

## 🔗 参考资料

- [Silero VAD](https://github.com/snakers4/silero-vad)
- [ONNX Runtime](https://onnxruntime.ai/)
- [Airi VAD 实现](../voice-system/airi-official/apps/vad-asr-chat-tts/src/libs/vad/vad.ts)
- [验证报告](../../tasks/voice-vad-onnx-verify.md)

---

**模块状态**: ✅ 生产就绪  
**维护者**: OpenClaw Voice Team
