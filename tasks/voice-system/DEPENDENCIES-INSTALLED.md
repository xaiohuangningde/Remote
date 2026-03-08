# 语音系统依赖安装报告

**时间**: 2026-03-07 15:45
**Python**: 3.10.11

---

## ✅ 已安装依赖

### 核心依赖
| 包名 | 版本 | 用途 |
|------|------|------|
| numpy | 1.26.4 | 数组处理 |
| torch | 2.3.1 | 深度学习框架 |
| torchaudio | 2.3.1 | 音频处理 |
| pyaudio | latest | 麦克风采集 |
| onnxruntime | 1.18.0 | VAD 推理 |
| soundfile | 0.12.1 | 音频文件读写 |
| librosa | 0.10.2 | 音频分析 |

### ASR (语音识别)
| 包名 | 版本 | 状态 |
|------|------|------|
| openai-whisper | 20250625 | ✅ 可用 |

### TTS (语音合成) - CosyVoice 依赖
| 包名 | 版本 | 状态 |
|------|------|------|
| modelscope | 1.20.0 | ✅ 已安装 |
| hydra-core | 1.3.2 | ✅ 已安装 |
| HyperPyYAML | 1.2.3 | ✅ 已安装 |
| inflect | 7.3.1 | ✅ 已安装 |
| conformer | 0.3.2 | ✅ 已安装 |
| x-transformers | 2.11.24 | ✅ 已安装 |
| wetext | 0.0.4 | ✅ 已安装 |
| pyworld | 0.3.4 | ✅ 已安装 |
| transformers | 4.51.3 | ✅ 已安装 |
| diffusers | 0.29.0 | ✅ 已安装 |
| gdown | 5.1.0 | ✅ 已安装 |

---

## ⚠️ CosyVoice3 状态 (2026-03-07 15:45)

### 源码
- **位置**: `C:\Users\12132\.openclaw\workspace\models\CosyVoice`
- **状态**: ✅ 已克隆

### 模型 - ModelScope 下载
- **位置**: `E:\TuriX-CUA-Windows\models\Fun-CosyVoice3-0.5B-2512\FunAudioLLM\Fun-CosyVoice3-0___5B-2512`
- **状态**: ⚠️ 部分完成

### 已下载文件
| 文件 | 大小 | 状态 |
|------|------|------|
| llm.pt | 1.93GB | ✅ |
| flow.pt | 1.27GB | ✅ |
| flow.decoder.estimator.fp32.onnx | 1.26GB | ✅ |
| speech_tokenizer_v3.onnx | 924MB | ✅ |
| hift.pt | 79MB | ✅ |
| campplus.onnx | 27MB | ✅ |
| cosyvoice3.yaml | - | ✅ |

**总计**: ~5.5GB

### 缺失文件
- **CosyVoice-BlankEN/** 目录中的 Qwen2 预训练模型
  - 需要 pytorch_model.bin 或 model.safetensors
  - 这是 CosyVoice3 的核心 LLM 组件

### 问题
CosyVoice3 需要额外的 Qwen2 语言模型预训练权重，该模型未包含在基础下载中。

### 解决方案
**选项 1**: 下载 Qwen2 预训练模型
- 需要额外 ~1-2GB
- 路径：`CosyVoice-BlankEN/`

**选项 2**: 使用 Qwen3-TTS (API)
- 立即可用
- 需要火山引擎 API Key

**选项 3**: 使用 Whisper ASR + 其他 TTS
- VAD + Whisper 已就绪
- 可集成其他 TTS 服务

### 立即可用功能
| 功能 | 状态 |
|------|------|
| VAD (语音活动检测) | ✅ 可用 |
| Whisper ASR | ✅ 可用 |
| CosyVoice3 TTS | ⏳ 缺 Qwen 模型 |
| Qwen3-TTS (API) | ⏳ 需 API Key |

---

## 📁 测试脚本

| 脚本 | 用途 | 状态 |
|------|------|------|
| test_interactive.py | VAD+ 麦克风 | ✅ 可用 |
| test_mic_level.py | 麦克风音量 | ✅ 可用 |
| test_vad_mic.py | VAD 检测 | ✅ 可用 |
| test_cosyvoice3_final.py | CosyVoice TTS | ⏳ 缺 Qwen 模型 |
| test_tts_qwen3.py | Qwen3 TTS | ⏳ 缺 API |

---

## 💡 建议

1. **立即测试**: VAD + Whisper ASR
2. **TTS 选择**:
   - 快速：Qwen3-TTS (API) - 需配置火山引擎 Key
   - 本地：CosyVoice3 - 需下载 Qwen2 预训练模型

---

**记录者**: 小黄 🐤
**更新时间**: 2026-03-07 15:45
