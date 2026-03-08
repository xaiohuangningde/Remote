---
name: qwen3-tts
description: 千问 TTS - 2026 年最新最强开源 TTS，支持声音设计/克隆/情感控制
---

# Qwen3-TTS - 我的主力语音能力

> 发布时间：2026 年 1 月 | 阿里千问团队 | 97ms 超低延迟

## 核心能力

| 能力 | 说明 | 状态 |
|------|------|------|
| **🗣️ CustomVoice** | 9 种预设音色（中英文等） | ✅ 主力 |
| **🎨 VoiceDesign** | 用自然语言描述创造声音 | ✅ 特色 |
| **🎭 声音克隆** | 3 秒快速克隆任意声音 | ✅ 高级 |
| **💬 流式输出** | 97ms 延迟，实时对话 | ✅ 优化 |
| **🌍 多语言** | 10 种语言 + 方言 | ✅ 支持 |
| **😊 情感控制** | 指令控制语调/节奏/情感 | ✅ 强大 |

## 预设音色（CustomVoice）

| 音色 | 描述 | 语言 |
|------|------|------|
| Vivian | 明亮年轻女声，略带电音 | 中文 |
| Serena | 温暖温柔女声 | 中文 |
| Uncle_Fu | 低沉醇厚的成熟男声 | 中文 |
| Dylan | 北京青年男声，清澈自然 | 中文（京腔） |
| Eric | 活泼成都男声，略带沙哑 | 中文（四川话） |
| Ryan | 活力男声，节奏感强 | 英文 |
| Aiden | 阳光美式男声 | 英文 |
| Ono_Anna | 俏皮日本女声 | 日文 |
| Sohee | 温暖韩国女声 | 韩文 |

## 使用方式

### 基础用法

```python
from qwen_tts import Qwen3TTSModel
import torch

model = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
    device_map="cuda:0",
    dtype=torch.bfloat16,
)

# 简单说话
wavs, sr = model.generate_custom_voice(
    text="你好，我是 xiaoxiaohuang",
    language="Chinese",
    speaker="Vivian",
)

# 带情感指令
wavs, sr = model.generate_custom_voice(
    text="你太过分了！",
    language="Chinese",
    speaker="Vivian",
    instruct="用特别愤怒的语气说",
)
```

### 声音设计

```python
model = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
    device_map="cuda:0",
)

# 用描述创造声音
wavs, sr = model.generate_voice_design(
    text="哥哥，你回来啦！",
    language="Chinese",
    instruct="体现撒娇稚嫩的萝莉女声，音调偏高且起伏明显",
)
```

### 声音克隆

```python
model = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-Base",
    device_map="cuda:0",
)

# 3 秒快速克隆
wavs, sr = model.generate_voice_clone(
    text="这是我的克隆声音",
    language="Chinese",
    ref_audio="reference.wav",
    ref_text="参考音频的文本内容",
)
```

## 依赖

- Python 3.12+
- PyTorch 2.4+
- CUDA 12.x
- qwen-tts 包

## 安装

```bash
conda create -n qwen3-tts python=3.12 -y
conda activate qwen3-tts
pip install -U qwen-tts
pip install -U flash-attn --no-build-isolation
```

## 模型下载（ModelScope 加速）

```bash
pip install -U modelscope

# CustomVoice 模型（主力）
modelscope download --model Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice --local_dir ./Qwen3-TTS-12Hz-1.7B-CustomVoice

# VoiceDesign 模型（可选）
modelscope download --model Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign --local_dir ./Qwen3-TTS-12Hz-1.7B-VoiceDesign

# Base 模型（克隆用，可选）
modelscope download --model Qwen/Qwen3-TTS-12Hz-1.7B-Base --local_dir ./Qwen3-TTS-12Hz-1.7B-Base
```

## 对比其他 TTS

| 特性 | Qwen3-TTS | CosyVoice | ChatTTS | Kokoro |
|------|-----------|-----------|---------|--------|
| 发布时间 | 2026.01 | 2024.06 | 2024.06 | 2024 |
| 中文质量 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 延迟 | 97ms | 中 | 中 | 低 |
| 声音设计 | ✅ | ❌ | ❌ | ❌ |
| 声音克隆 | ✅ 3 秒 | ✅ | ❌ | ❌ |
| 情感控制 | ✅ 指令 | ⭐⭐⭐ | ⭐⭐ | ⭐ |
| 多语言 | 10 种 | 多语言 | 中文 | 多语言 |

---

**状态**: ✅ 已整合  
**主力音色**: Vivian (中文女声)  
**创建者**: xiaoxiaohuang 🐤
