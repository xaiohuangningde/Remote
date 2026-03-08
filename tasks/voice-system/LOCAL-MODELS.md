# 本地可用模型清单

**更新时间**: 2026-03-07 12:00
**调查者**: 小黄 🐤

---

## 📦 TTS 模型

### 1. Qwen3-TTS ✅ (已集成)

**路径**: `E:\TuriX-CUA-Windows\models\Qwen3-TTS\Qwen\Qwen3-TTS-12Hz-1___7B-CustomVoice`

**特性**:
- 模型大小：4.52GB
- 支持语言：10 种 (中/英/日/韩/德/法/俄/葡/西/意)
- 支持音色：9 种
  - Vivian (明亮女声)
  - Serena (柔和女声)
  - Uncle_Fu (低沉男声)
  - Dylan (北京男声)
  - Eric (四川男声)
  - Ryan (英文男声)
  - Aiden (美式男声)
  - Ono_Anna (日语女声)
  - Sohee (韩语女声)
- 采样率：24kHz
- 延迟：~1s

**使用方式**:
```python
from src.tts.qwen3_tts_bridge import Qwen3TTSBridge

tts = Qwen3TTSBridge()
audio = tts.synthesize_to_array("你好", speaker="Vivian")
```

**依赖**:
- `qwen-tts==0.1.1`
- `transformers==4.57.3` (必须！)
- `datasets==2.19.0` (必须！)
- `soundfile==0.13.1`

---

### 2. CosyVoice 3.0 ⏳ (代码已写，模型未下载)

**路径**: `C:\Users\12132\.openclaw\workspace\models\CosyVoice\` (仅代码)

**需要下载**: `Fun-CosyVoice3-0.5B-2512`

**特性**:
- 模型大小：~1GB
- 支持语言：9 种
- 支持方言：18+ 种 (粤语/闽南语/四川话/东北话等)
- 零样本克隆：支持
- 指令控制：支持 (情感/语速/音量)
- 流式输出：支持 (延迟低至 150ms)
- 采样率：22kHz

**优势**:
- 比 Qwen3-TTS 更轻量
- 方言支持更强
- 流式延迟更低

**待办**: 下载模型

---

## 📦 VAD 模型

### Silero VAD ✅ (已集成)

**路径**: `C:\Users\12132\.openclaw\workspace\models\silero_vad.onnx`

**特性**:
- 模型大小：~1MB
- 推理延迟：<5ms
- 实时率：96% (29.7fps @ 16kHz)
- 输入：512 采样点/帧

**使用方式**:
```python
from src.vad.silero_vad import VADProcessor

vad = VADProcessor()
prob = vad.process_chunk(audio)
```

---

## 📦 ASR 模型

### Whisper ⏳ (待安装)

**选项**:
1. **Whisper tiny** - 最快，39M 参数
2. **Whisper base** - 平衡，74M 参数
3. **Whisper small** - 更好质量，244M 参数
4. **Whisper medium** - 高质量，769M 参数
5. **Whisper large-v3** - 最佳，1.5B 参数

**推荐**: `tiny` 或 `base` (实时性优先)

**待办**: `pip install openai-whisper`

---

## 📦 LLM

### OpenClaw ✅ (已集成)

**方式**: CLI 调用

```python
import subprocess
result = subprocess.run(
    ['openclaw', 'agent', '--message', text],
    capture_output=True,
    text=True
)
reply = result.stdout
```

---

## 🎯 推荐组合

### 方案 A: 全本地 (推荐)

| 组件 | 模型 | 延迟 | 质量 |
|------|------|------|------|
| VAD | Silero VAD | 5ms | ⭐⭐⭐⭐ |
| ASR | Whisper tiny | 500ms | ⭐⭐⭐ |
| LLM | OpenClaw | 1-2s | ⭐⭐⭐⭐⭐ |
| TTS | Qwen3-TTS | 1s | ⭐⭐⭐⭐⭐ |

**总延迟**: ~2-3.5s
**优点**: 完全离线，无 API 成本
**缺点**: 延迟略高

---

### 方案 B: 混合 (低延迟)

| 组件 | 模型 | 延迟 | 质量 |
|------|------|------|------|
| VAD | Silero VAD | 5ms | ⭐⭐⭐⭐ |
| ASR | Whisper tiny | 500ms | ⭐⭐⭐ |
| LLM | OpenClaw | 1-2s | ⭐⭐⭐⭐⭐ |
| TTS | CosyVoice 3.0 | 150ms | ⭐⭐⭐⭐⭐ |

**总延迟**: ~1.5-2.5s
**优点**: TTS 延迟更低
**缺点**: 需下载 CosyVoice 模型

---

## 📊 对比

| 方案 | 总延迟 | 成本 | 依赖 |
|------|--------|------|------|
| 全本地 (Qwen3) | 2-3.5s | 免费 | 少 |
| 混合 (CosyVoice) | 1.5-2.5s | 免费 | 中 |
| 火山引擎 API | 1-2s | 收费 | 无 |

---

## 🚀 下一步

1. ✅ VAD 集成 - 完成
2. ✅ TTS 桥接 - 完成 (Qwen3)
3. ⏳ ASR 集成 - 安装 Whisper
4. ⏳ CosyVoice 下载 - 可选 (降低延迟)
5. ⏳ 端到端测试

---

**调查者**: 小黄 🐤
**时间**: 2026-03-07 12:00
