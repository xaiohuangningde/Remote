# -*- coding: utf-8 -*-
"""
从 HuggingFace 下载 CosyVoice3 完整模型
"""

from huggingface_hub import snapshot_download
import sys

model_id = 'FunAudioLLM/Fun-CosyVoice3-0.5B-2512'
save_path = r'E:\TuriX-CUA-Windows\models\Fun-CosyVoice3-0.5B-2512'

print("=" * 60)
print("  从 HuggingFace 下载 Fun-CosyVoice3-0.5B-2512")
print("=" * 60)
print(f"\n模型 ID：{model_id}")
print(f"保存路径：{save_path}\n")

try:
    download_path = snapshot_download(
        repo_id=model_id,
        cache_dir=save_path,
        local_dir=save_path,
        local_dir_use_symlinks=False
    )
    print(f"\n[OK] 下载完成!")
    print(f"     路径：{download_path}")
except Exception as e:
    print(f"\n[FAIL] 下载失败：{e}")
    sys.exit(1)

print("\n" + "=" * 60)
