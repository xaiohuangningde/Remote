# 语音系统技术发现

---

## VAD 技术参数 (Silero)

**验证时间**: 2026-03-07

```python
# 输入格式
audio: np.ndarray  # shape: (1, 512), dtype: float32
state: np.ndarray  # shape: (2, 1, 128), dtype: float32
sr: np.ndarray     # value: 16000

# 输出
speech_prob: float  # 0-1 之间
```

**关键发现**:
- 块大小：512 采样点 @ 16kHz = 32ms
- 实时处理率：~31 块/秒
- 需要维护 state 在块之间传递

---

## PyAudio + asyncio 集成

**验证结果**: ✅ 通过

```python
# 关键模式
stream = pyaudio.PyAudio().open(
    format=paFloat32,
    channels=1,
    rate=16000,
    input=True,
    frames_per_buffer=512,
    stream_callback=callback
)

# asyncio 集成
loop.call_soon_threadsafe(callback_wrapper)
```

**性能**: 5 秒处理 155 块，无丢包

---

## OpenClaw 集成方式

**推荐**: CLI 调用

```python
subprocess.run(['openclaw', 'agent', '--message', msg])
```

**原因**: 无标准 REST API，CLI 最稳定

---

## TTS 选项

| 方案 | 延迟 | 成本 | 推荐度 |
|------|------|------|--------|
| Qwen3-TTS 本地 | ~1s | 免费 | ⭐⭐⭐⭐⭐ |
| 火山引擎 API | ~500ms | 收费 | ⭐⭐⭐ |
| Edge TTS | ~2s | 免费 | ⭐⭐ |

---

## 已验证脚本

- `skills/realtime-voice-chat/vad_streaming.py` (456 行)
- `skills/realtime-voice-chat/voice_chat_openclaw.py`
- `skills/qwen3-tts/test_official.py`

## Airi 官方代码结构

```
skills/voice-system/
├── airi-official/           # Airi 官方完整代码
│   ├── apps/
│   │   ├── vad/             # VAD 演示
│   │   ├── vad-asr/         # VAD + ASR
│   │   ├── vad-asr-chat/    # + LLM 对话
│   │   └── vad-asr-chat-tts/# 完整流程
│   └── ...
├── src/
│   ├── libs/vad/            # VAD 核心库
│   │   ├── vad.ts           # Silero VAD
│   │   ├── manager.ts       # 状态管理
│   │   └── process.worklet.ts
│   └── composables/
│       └── audio-context.ts # 音频采集
└── package.json
```

**关键发现**:
- Airi 使用 Web Audio API (浏览器端)
- 我们需要 Python 版本用于桌面应用
- VAD 逻辑可以复用 (Silero ONNX)
