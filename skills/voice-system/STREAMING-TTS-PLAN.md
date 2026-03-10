# 流式 TTS 集成计划

> 任务 6: 基于 Qwen3-TTS 实现流式生成，降低首包延迟

---

## 📊 当前状态

- **Qwen3-TTS 模型**: ✅ 已下载 (E:\TuriX-CUA-Windows\models\Qwen3-TTS\)
- **官方 API**: `generate_custom_voice()` 支持批量推理
- **流式能力**: ✅ 官方宣称延迟 97ms (Dual-Track 架构)
- **问题**: 官方文档没有明确的流式 API 示例

---

## 🎯 实施方案

### 方案 1: 使用官方流式参数 (优先)

Qwen3-TTS 基于 HuggingFace Transformers，可能支持 `streaming=True` 参数。

**测试代码**:
```python
from qwen_tts import Qwen3TTSModel
import torch

model = Qwen3TTSModel.from_pretrained(
    model_dir,
    device_map="cpu",
    dtype=torch.float32,
)

# 尝试流式生成
for chunk in model.generate_custom_voice(
    text="你好，这是流式测试",
    language="Chinese",
    speaker="Vivian",
    streaming=True,  # 假设参数
):
    # chunk 是音频片段
    play(chunk)  # 边生成边播放
```

### 方案 2: 分块生成 + 队列播放

如果官方不支持流式，可以自己实现：

```python
# 将长文本分成短句
sentences = split_text(text)

# 异步生成 + 播放
for sentence in sentences:
    audio = model.generate_custom_voice(sentence, ...)
    play_async(audio)  # 异步播放
```

### 方案 3: 使用 vLLM 部署

官方支持 vLLM 部署，可能有更好的流式支持。

---

## 📋 实施步骤

1. [ ] 测试官方 API 是否支持 `streaming` 参数
2. [ ] 如果不支持，实现分块生成方案
3. [ ] 创建 `tts.ts` TypeScript 封装
4. [ ] 集成到 voice-system 编排器
5. [ ] 测试首包延迟

---

## 📝 笔记

- 2026-03-08 09:58: AI 自主扫描发现此任务卡了 2 天
- 官方文档没有明确流式 API，需要实验
- 已有 Qwen3-TTS 模型和环境，可以直接测试

---

**下一步**: 创建 Python 测试脚本验证流式能力
