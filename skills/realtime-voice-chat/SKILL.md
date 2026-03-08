# Realtime Voice Chat

> 实时语音聊天 - VAD (Silero) + Whisper ASR + LLM + Qwen3-TTS 完整流程

## 特性

- 🎯 **超低延迟**: 模型预加载 + 异步处理
- 🎤 **说话打断**: TTS 播放时可被用户语音打断
- 🛡️ **稳定可靠**: 严格状态管理 + 错误恢复
- 🔌 **可扩展**: 插件式 LLM 支持

## 使用方式

### Python 版本 (推荐)

```bash
# 直接运行
python skills/realtime-voice-chat/realtime_voice_chat.py
```

### TypeScript 版本

```typescript
import { createVoiceChat } from 'skills/realtime-voice-chat/src/index.ts'

// 创建并启动语音聊天
const chat = await createVoiceChat({
  speechThreshold: 0.3,        // 语音检测阈值
  minSilenceDurationMs: 400,   // 最小静音时长
  interruptProtectionMs: 500,  // 打断保护时间
  ttsSpeaker: 'Vivian',        // TTS 音色
  enableInterrupt: true,       // 启用打断
})

// 获取状态
const status = chat.getStatus()
console.log('Is recording:', status.isRecording)
console.log('Is playing:', status.isPlaying)

// 停止
await chat.stop()
```

## 配置

### 核心参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `speechThreshold` | 0.3 | 语音检测阈值 (0-1) |
| `exitThreshold` | 0.1 | 退出阈值 (录音中时使用) |
| `minSilenceDurationMs` | 400 | 最小静音时长 (判定说话结束) |
| `speechPadMs` | 80 | 语音前后填充 |
| `minSpeechDurationMs` | 250 | 最小语音时长 (过短忽略) |
| `interruptThresholdMultiplier` | 2.0 | 打断检测阈值倍数 |
| `interruptProtectionMs` | 500 | TTS 开始后的保护时间 |

### TTS 配置

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `ttsSpeaker` | Vivian | 音色 (Vivian/Serena/Uncle_Fu 等) |
| `ttsLanguage` | Chinese | 语言 |
| `qwen3TtsModelPath` | `E:\TuriX-CUA-Windows\models\...` | 模型路径 |

### 可用音色

| 音色 | 描述 | 语言 |
|------|------|------|
| Vivian | 明亮年轻女声 | 中文 |
| Serena | 温暖温柔女声 | 中文 |
| Uncle_Fu | 低沉醇厚男声 | 中文 |
| Dylan | 北京青年男声 | 中文 (京腔) |
| Eric | 活泼成都男声 | 中文 (四川话) |
| Ryan | 活力男声 | 英文 |
| Aiden | 阳光美式男声 | 英文 |

## 自动流程

```
1. 用户说话 → VAD 检测 (Silero)
2. 说话结束 → ASR 转录 (Whisper)
3. 转录文本 → LLM 回复 (规则/可插拔)
4. 回复文本 → TTS 播放 (Qwen3-TTS)
5. 播放中用户说话 → 自动打断
```

## 依赖

- Python 3.10+
- PyTorch (Silero VAD)
- faster-whisper (ASR)
- Qwen3-TTS (TTS)
- PyAudio (麦克风输入)

## 安装

```bash
# 创建虚拟环境
conda create -n voice-chat python=3.10 -y
conda activate voice-chat

# 安装依赖
pip install pyaudio numpy torch soundfile
pip install faster-whisper
pip install -U qwen-tts

# 下载模型 (ModelScope 加速)
modelscope download --model Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice --local_dir E:\TuriX-CUA-Windows\models\Qwen3-TTS\Qwen\Qwen3-TTS-12Hz-1___7B-CustomVoice
```

## 示例输出

```
[22:30:15] Loading models...
[22:30:18]   [1/3] Silero VAD... OK
[22:30:20]   [2/3] Whisper ASR... OK
[22:30:35]   [3/3] Qwen3-TTS... OK
[22:30:35] All models loaded!
[22:30:35] Initializing microphone...
[22:30:35] Listening! (threshold=0.3, silence=400ms)
[22:30:40]   🎙️ SPEECH START (0.852)
[22:30:42]   🎙️ SPEECH END (450ms)
[22:30:42]   📼 Audio: 2.15s
[22:30:42]   🎤 Recognizing...
[22:30:44]   💬 You: 你好
[22:30:44]   🤖 Reply: 你好！我是小黄，很高兴和你聊天！
[22:30:44]   🔊 Synthesizing...
[22:30:46]   ✅ TTS OK: 2.30s (1.8s)
[22:30:46]   🔈 Playing...
[22:30:48]   Done!
```

## 故障排除

### PyAudio 安装失败

```bash
# Windows
pip install pipwin
pipwin install pyaudio

# 或下载预编译 wheel
pip install https://.../PyAudio‑0.2.14‑cp310‑cp310‑win_amd64.whl
```

### Silero VAD 加载慢

首次加载需要下载模型，后续会使用缓存。可以预下载：

```python
import torch
torch.hub.load('snakers4/silero-vad', 'silero_vad', force_reload=True)
```

### TTS 生成慢

- 使用 CPU: `device_map="cpu"` (默认)
- 使用 GPU: `device_map="cuda:0"` (需要 CUDA)
- 使用 `bfloat16`: `dtype=torch.bfloat16` (更快)

---

**状态**: ✅ 生产就绪  
**版本**: v2.0  
**创建者**: 小黄 🐤
