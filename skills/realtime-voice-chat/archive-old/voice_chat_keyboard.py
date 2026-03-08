# -*- coding: utf-8 -*-
"""
简化版语音对话 - 键盘输入 + 语音输出
测试 TTS 播放功能
"""

import os
import sys
import time

# Qwen3-TTS 模型路径
MODEL_DIR = r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\Qwen\Qwen3-TTS-12Hz-1___7B-CustomVoice"
OUTPUT_DIR = r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\voice_chat"
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=" * 60)
print("  语音对话测试 - 键盘输入版")
print("=" * 60)
print("输入文字，系统用语音回复")
print("输入 'quit' 退出")
print()

def generate_reply(user_text):
    """生成回复"""
    user_text = user_text.lower()
    
    if "你好" in user_text or "hello" in user_text or "hi" in user_text:
        return "你好！我是小黄，很高兴和你聊天！"
    elif "名字" in user_text or "是谁" in user_text:
        return "我叫小黄，是你的 AI 助手。"
    elif "时间" in user_text or "几点" in user_text:
        current_time = time.strftime("%H 点%M 分")
        return f"现在是{current_time}。"
    elif "天气" in user_text:
        return "今天天气不错，适合出去走走哦！"
    elif "谢谢" in user_text:
        return "不客气！有什么我可以帮你的吗？"
    elif "再见" in user_text or "拜拜" in user_text:
        return "再见！祝你有美好的一天！"
    elif "唱歌" in user_text:
        return "啦啦啦~ 我唱歌不好听，还是聊天吧！"
    elif "笑" in user_text or "哈哈" in user_text:
        return "哈哈，你开心我也开心！"
    elif "测试" in user_text:
        return "测试成功！系统运行正常。"
    else:
        replies = [
            "嗯嗯，我在听呢，请继续说。",
            "原来是这样啊，我明白了。",
            "这个问题很有意思，让我想想。",
            "好的，我记住了。",
            "你说得对，我同意。",
        ]
        import random
        return random.choice(replies)

def speak_text(text, speaker="Vivian"):
    """TTS 语音合成并播放"""
    try:
        import torch
        import soundfile as sf
        from qwen_tts import Qwen3TTSModel
        import subprocess
        
        print(f"[TTS] 正在说：{text}")
        sys.stdout.flush()
        
        # 加载模型
        if not hasattr(speak_text, 'model'):
            print("[TTS] 加载模型...")
            sys.stdout.flush()
            speak_text.model = Qwen3TTSModel.from_pretrained(
                MODEL_DIR,
                device_map="cpu",
                dtype=torch.float32,
            )
            print("[TTS] 模型加载完成")
            sys.stdout.flush()
        
        model = speak_text.model
        
        # 生成语音
        wavs, sr = model.generate_custom_voice(
            text=text,
            language="Chinese",
            speaker=speaker,
        )
        
        # 保存
        output_path = os.path.join(OUTPUT_DIR, f"reply_{int(time.time())}.wav")
        sf.write(output_path, wavs[0], sr)
        print(f"[TTS] 生成完成：{output_path} ({len(wavs[0])/sr:.2f}s)")
        sys.stdout.flush()
        
        # 播放
        print("[TTS] 播放中...")
        sys.stdout.flush()
        ps_command = f'powershell -c "(New-Object Media.SoundPlayer \'{output_path}\').PlaySync()"'
        subprocess.run(ps_command, shell=True, capture_output=True)
        print("[TTS] 播放完成")
        sys.stdout.flush()
        
    except Exception as e:
        print(f"[ERROR] TTS 失败：{e}")
        sys.stdout.flush()

def main():
    """主循环"""
    print("[系统] 准备就绪！\n")
    sys.stdout.flush()
    
    while True:
        try:
            user_input = input("你：").strip()
            
            if not user_input:
                continue
            
            if user_input.lower() == 'quit' or user_input.lower() == 'exit':
                print("[系统] 再见！")
                sys.stdout.flush()
                break
            
            # 生成回复
            reply = generate_reply(user_input)
            
            # 语音播放
            speak_text(reply)
            
            print()
            
        except KeyboardInterrupt:
            print("\n[系统] 退出")
            sys.stdout.flush()
            break
        except Exception as e:
            print(f"[ERROR] {e}")
            sys.stdout.flush()

if __name__ == "__main__":
    main()
