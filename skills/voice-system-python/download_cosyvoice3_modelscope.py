# -*- coding: utf-8 -*-
"""
使用 ModelScope 国内镜像下载 CosyVoice3 模型
"""

from modelscope import snapshot_download
import sys
import os

# 模型 ID (ModelScope)
model_id = 'FunAudioLLM/Fun-CosyVoice3-0.5B-2512'
save_path = r'E:\TuriX-CUA-Windows\models\Fun-CosyVoice3-0.5B-2512'

print("=" * 60)
print("  CosyVoice3 模型下载 - ModelScope 国内镜像")
print("=" * 60)
print(f"\n模型 ID: {model_id}")
print(f"保存路径：{save_path}\n")

# 检查路径是否存在
if not os.path.exists(save_path):
    os.makedirs(save_path, exist_ok=True)
    print(f"[INFO] 创建目录：{save_path}")

print("\n开始下载 (使用 ModelScope 国内镜像)...")
print("提示：下载过程中可随时中断，下次运行会继续下载\n")

try:
    # 使用 ModelScope 下载
    download_path = snapshot_download(
        model_id=model_id,
        cache_dir=save_path
    )
    
    print(f"\n[OK] 下载完成!")
    print(f"     路径：{download_path}")
    
    # 验证文件
    print("\n验证下载的文件...")
    required_files = [
        'llm.pt',
        'flow.pt',
        'hift.pt',
        'campplus.onnx',
        'speech_tokenizer_v3.onnx',
        'flow.decoder.estimator.fp32.onnx',
        'cosyvoice3.yaml'
    ]
    
    missing = []
    for f in required_files:
        full_path = os.path.join(save_path, f)
        if os.path.exists(full_path):
            size_mb = os.path.getsize(full_path) / 1024 / 1024
            print(f"  [OK] {f} ({size_mb:.1f} MB)")
        else:
            print(f"  [MISSING] {f}")
            missing.append(f)
    
    if missing:
        print(f"\n[WARN] 缺失 {len(missing)} 个文件:")
        for f in missing:
            print(f"  - {f}")
        print("\n请重新运行此脚本继续下载缺失文件")
    else:
        print("\n[OK] 所有必需文件已下载完成!")
        
except KeyboardInterrupt:
    print("\n\n[INFO] 下载被用户中断")
    print("下次运行此脚本会继续下载")
    sys.exit(0)
except Exception as e:
    print(f"\n[FAIL] 下载失败：{e}")
    print("\n建议:")
    print("  1. 检查网络连接")
    print("  2. 手动从浏览器下载")
    print("     https://modelscope.cn/models/FunAudioLLM/Fun-CosyVoice3-0.5B-2512")
    sys.exit(1)

print("\n" + "=" * 60)
