# VAD 流式检测模块 - 快速开始

## 1. 安装依赖

```bash
pip install onnxruntime numpy
```

## 2. 确认模型文件存在

```bash
# 检查模型文件
ls skills/vad/models/silero_vad.onnx
```

如果不存在，请从 HuggingFace 下载：
https://huggingface.co/onnx-community/silero-vad

## 3. 运行测试

```bash
# 运行所有测试
python -m skills.realtime-voice-chat.test.test_vad

# 运行特定测试
python -m skills.realtime-voice-chat.test.test_vad --test load
python -m skills.realtime-voice-chat.test.test_vad --test inference
```

## 4. 运行演示

```bash
# 从 WAV 文件检测
python -m skills.realtime-voice-chat.demo_vad --file test.wav

# 从麦克风检测（需要 pyaudio）
pip install pyaudio
python -m skills.realtime-voice-chat.demo_vad --mic
```

## 5. 代码示例

```python
import asyncio
import numpy as np
from skills.realtime-voice-chat.vad_streaming import create_vad

async def main():
    # 创建 VAD
    vad = await create_vad()
    
    # 注册事件
    vad.on('speech-start', lambda: print("语音开始"))
    vad.on('speech-end', lambda: print("语音结束"))
    vad.on('speech-ready', lambda data: print(f"语音就绪：{data['samples']} 采样点"))
    
    # 处理音频
    for _ in range(100):
        audio = np.random.randn(512).astype(np.float32) * 0.1
        state = await vad.process_audio(audio)
        if state.is_speaking:
            print(f"检测到语音：{state.speech_prob:.2f}")

asyncio.run(main())
```

## 6. 查看文档

详细文档：`skills/realtime-voice-chat/VAD_MODULE.md`

## 7. 故障排查

**问题**: 模型文件未找到

**解决**: 
```python
from vad_streaming import VADConfig, VADStreaming

config = VADConfig(model_path="/absolute/path/to/silero_vad.onnx")
vad = VADStreaming(config)
await vad.initialize()
```

**问题**: onnxruntime 未安装

**解决**: `pip install onnxruntime`

---

**测试状态**: ✅ 所有测试通过 (5/5)  
**版本**: v1.0.0  
**更新时间**: 2026-03-07
