#!/usr/bin/env python
# Download Qwen3-TTS from ModelScope (China mirror)

from modelscope import snapshot_download

print(" 从 ModelScope 下载 Qwen3-TTS 模型...")
print("=" * 60)

# CustomVoice 模型（主力）
print("\n1. 下载 CustomVoice 模型（1.7B）...")
model_dir = snapshot_download(
    'Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice',
    cache_dir='E:\\TuriX-CUA-Windows\\models\\Qwen3-TTS'
)
print(f"✅ CustomVoice 模型下载完成：{model_dir}")

print("\n" + "=" * 60)
print(" 下载完成！")
