# -*- coding: utf-8 -*-
"""
下载 CosyVoice3 完整模型
"""

from modelscope import snapshot_download
import sys

model_dir = 'FunAudioLLM/Fun-CosyVoice3-0.5B-2512'
save_path = r'E:\TuriX-CUA-Windows\models\Fun-CosyVoice3-0.5B-2512'

print("=" * 60)
print("  下载 CosyVoice3-0.5B-2512 完整模型")
print("=" * 60)
print(f"\n模型库：{model_dir}")
print(f"保存路径：{save_path}\n")

try:
    # 下载完整模型
    download_path = snapshot_download(model_dir, cache_dir=save_path)
    print(f"\n[OK] 下载完成!")
    print(f"     路径：{download_path}")
except Exception as e:
    print(f"\n[FAIL] 下载失败：{e}")
    sys.exit(1)

print("\n" + "=" * 60)
