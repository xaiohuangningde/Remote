# -*- coding: utf-8 -*-
"""
语音对话演示 - 自动测试
模拟用户输入并语音回复
"""

import os
import sys
import time
import subprocess

# 配置
MODEL_DIR = r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\Qwen\Qwen3-TTS-12Hz-1___7B-CustomVoice"
OUTPUT_DIR = r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\voice_demo"
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=" * 60)
print("  语音对话演示")
print("=" * 60)
print()

def speak(text, speaker="Vivian", model=None):
    """TTS 语音合成并播放"""
    try:
        import soundfile as sf
        
        print(f"[系统] 正在说：{text}")
        sys.stdout.flush()
        
        # 加载模型
        if not hasattr(speak, 'model'):
            print("[系统] 加载 TTS 模型...")
            sys.stdout.flush()
            speak.model = Qwen3TTSModel.from_pretrained(
                MODEL_DIR,
                device_map="cpu",
                dtype=torch.float32,
            )
            print("[系统] 模型加载完成")
            sys.stdout.flush()
        
        # 生成语音
        wavs, sr = model.generate_custom_voice(
            text=text,
            language="Chinese",
            speaker=speaker,
        )
        
        # 保存
        output_path = os.path.join(OUTPUT_DIR, f"demo_{int(time.time())}.wav")
        sf.write(output_path, wavs[0], sr)
        
        # 播放
        print(f"[系统] 播放中... ({len(wavs[0])/sr:.2f}s)")
        sys.stdout.flush()
        ps_command = f'powershell -c "(New-Object Media.SoundPlayer \'{output_path}\').PlaySync()"'
        subprocess.run(ps_command, shell=True, capture_output=True)
        print("[系统] 播放完成")
        sys.stdout.flush()
        
    except Exception as e:
        print(f"[错误] {e}")
        sys.stdout.flush()

# 加载模型
import torch
from qwen_tts import Qwen3TTSModel

print("加载 Qwen3-TTS 模型...")
sys.stdout.flush()
model = Qwen3TTSModel.from_pretrained(MODEL_DIR, device_map="cpu", dtype=torch.float32)
print("模型加载完成！")
print()
sys.stdout.flush()

# 演示对话
demo_conversations = [
    ("你好", "你好！我是小黄，很高兴和你聊天！", "Vivian"),
    ("你叫什么名字？", "我叫小黄，是你的 AI 助手。", "Serena"),
    ("现在几点了？", f"现在是{time.strftime('%H 点%M 分')}。", "Uncle_Fu"),
    ("谢谢", "不客气！有什么我可以帮你的吗？", "Vivian"),
]

for user_text, reply, speaker in demo_conversations:
    print("-" * 60)
    print(f"你：{user_text}")
    sys.stdout.flush()
    time.sleep(1)
    
    print(f"系统：{reply} [{speaker}]")
    sys.stdout.flush()
    
    # 语音播放
    try:
        wavs, sr = model.generate_custom_voice(
            text=reply,
            language="Chinese",
            speaker=speaker,
        )
        
        output_path = os.path.join(OUTPUT_DIR, f"demo_{speaker.lower()}_{int(time.time())}.wav")
        sf.write(output_path, wavs[0], sr)
        
        print(f"[播放] 时长：{len(wavs[0])/sr:.2f}s")
        sys.stdout.flush()
        
        ps_command = f'powershell -c "(New-Object Media.SoundPlayer \'{output_path}\').PlaySync()"'
        subprocess.run(ps_command, shell=True, capture_output=True)
        
        print("[完成]")
        sys.stdout.flush()
        
    except Exception as e:
        print(f"[错误] {e}")
        sys.stdout.flush()
    
    time.sleep(0.5)
    print()

print("=" * 60)
print("  演示完成！")
print("=" * 60)
print(f"\n音频文件保存在：{OUTPUT_DIR}")
print("\n想亲自体验吗？运行:")
print("  python voice_chat_keyboard.py")
print("\n或者对着麦克风说话:")
print("  python voice_chat.py")
