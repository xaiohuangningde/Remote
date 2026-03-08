# -*- coding: utf-8 -*-
"""
验证 CosyVoice3 模型文件完整性
"""

import os
import sys

model_path = r'E:\TuriX-CUA-Windows\models\Fun-CosyVoice3-0.5B-2512'

print("=" * 60)
print("  CosyVoice3 模型文件验证")
print("=" * 60)
print(f"\n模型路径：{model_path}\n")

# 必需文件清单 (文件名 + 最小大小 MB)
required_files = {
    'llm.pt': 500,  # LLM 模型 (~1GB)
    'flow.pt': 100,  # Flow 模型 (~500MB)
    'hift.pt': 50,  # HiFi-GAN (83MB)
    'campplus.onnx': 10,  # CAM++ (28MB)
    'speech_tokenizer_v3.onnx': 10,  # 语音分词器 (~50MB)
    'flow.decoder.estimator.fp32.onnx': 500,  # Flow 解码器 (1.24GB)
    'cosyvoice3.yaml': 0.001,  # 配置文件
    'config.json': 0.001,  # 配置
}

# 必需目录
required_dirs = [
    'CosyVoice-BlankEN',
    'asset'
]

print("检查必需文件:\n")

missing_files = []
incomplete_files = []

for filename, min_size_mb in required_files.items():
    filepath = os.path.join(model_path, filename)
    if os.path.exists(filepath):
        actual_size_mb = os.path.getsize(filepath) / 1024 / 1024
        status = "[OK]" if actual_size_mb >= min_size_mb else "[WARN]"
        print(f"  {status} {filename:40s} {actual_size_mb:8.1f} MB")
        if actual_size_mb < min_size_mb:
            incomplete_files.append(filename)
    else:
        print(f"  [MISSING] {filename:40s}")
        missing_files.append(filename)

print("\n检查必需目录:\n")

for dirname in required_dirs:
    dirpath = os.path.join(model_path, dirname)
    if os.path.isdir(dirpath):
        file_count = len(os.listdir(dirpath))
        print(f"  [OK] {dirname:40s} ({file_count} 文件)")
    else:
        print(f"  [MISSING] {dirname:40s}")
        missing_files.append(dirname)

# 统计
print("\n" + "=" * 60)
print("  验证结果")
print("=" * 60)

total = len(required_files) + len(required_dirs)
present = total - len(missing_files)

print(f"\n完整度：{present}/{total} ({present/total*100:.1f}%)")

if missing_files:
    print(f"\n[ERROR] 缺失 {len(missing_files)} 个文件/目录:")
    for f in missing_files:
        print(f"   - {f}")
    
    if incomplete_files:
        print(f"\n[WARN] 不完整 {len(incomplete_files)} 个文件:")
        for f in incomplete_files:
            print(f"   - {f}")
    
    print("\n建议：运行 download_cosyvoice3_resume.py 继续下载")
    sys.exit(1)
else:
    print("\n[OK] 所有必需文件已就绪!")
    print("\n可以运行测试：py -3.10 test_cosyvoice3.py")
    sys.exit(0)
