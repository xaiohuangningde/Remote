#!/usr/bin/env python
# Test Qwen3-TTS

import torch
import soundfile as sf
from qwen_tts import Qwen3TTSModel

print(" Qwen3-TTS 测试")
print("=" * 50)

# 加载模型（CustomVoice - 主力）
print("加载模型中...")
model = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
    device_map="cuda:0" if torch.cuda.is_available() else "cpu",
    dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
)

print(f"✅ 模型加载完成，设备：{model.device}")

# 测试 1：简单说话
print("\n🧪 测试 1: 简单说话")
wavs, sr = model.generate_custom_voice(
    text="你好，我是 xiaoxiaohuang，你的 AI 助手。",
    language="Chinese",
    speaker="Vivian",
)
sf.write("test_output.wav", wavs[0], sr)
print(f"✅ 生成成功，保存：test_output.wav")

# 测试 2：带情感
print("\n🧪 测试 2: 带情感指令")
wavs, sr = model.generate_custom_voice(
    text="太棒了！我们成功了！",
    language="Chinese",
    speaker="Vivian",
    instruct="用特别开心的语气说",
)
sf.write("test_output_happy.wav", wavs[0], sr)
print(f"✅ 生成成功，保存：test_output_happy.wav")

print("\n" + "=" * 50)
print("🎉 所有测试完成！")
