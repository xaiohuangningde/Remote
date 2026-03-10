# -*- coding: utf-8 -*-
"""
实时语音对话 - 完整版本
麦克风输入 → VAD → Whisper → LLM → Qwen3-TTS → 扬声器输出
"""

import os
import sys
import time
import wave
import threading
import numpy as np

# 配置
SAMPLE_RATE = 16000
FRAME_SIZE = int(SAMPLE_RATE * 0.02)  # 20ms
SILENCE_THRESHOLD = 0.5  # 秒
OUTPUT_DIR = r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\voice_chat"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Qwen3-TTS 模型路径
MODEL_DIR = r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\Qwen\Qwen3-TTS-12Hz-1___7B-CustomVoice"

print("=" * 60)
print("  实时语音对话系统")
print("=" * 60)
print("功能：你说 → 我听 → 我想 → 我说")
print("按 Ctrl+C 退出")
print()

# 状态
is_speaking = False
is_processing = False
audio_buffer = []
last_voice_time = 0

def print_status(text):
    print(f"[系统] {text}")
    sys.stdout.flush()

def save_audio(audio_data, filename):
    """保存音频为 WAV 文件"""
    audio_int16 = (audio_data * 32767).astype(np.int16)
    with wave.open(filename, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        wav_file.writeframes(audio_int16.tobytes())

def transcribe_audio(audio_path):
    """Whisper 语音识别"""
    try:
        # 导入本地模块
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'whisper-local', 'src'))
        from index import transcribe
        
        result = transcribe(audio_path, model='base', language='zh')
        return result.get('text', '')
    except Exception as e:
        print_status(f"识别失败：{e}")
        return ""

def generate_reply(user_text):
    """生成回复（简单规则 + 随机）"""
    user_text = user_text.lower()
    
    # 简单对话逻辑
    if "你好" in user_text or "hello" in user_text:
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
    else:
        # 默认回复
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
    """Qwen3-TTS 语音合成并播放"""
    global is_speaking
    
    try:
        import torch
        import soundfile as sf
        from qwen_tts import Qwen3TTSModel
        
        print_status(f"正在说：{text}")
        
        # 加载模型（首次调用时）
        if not hasattr(speak_text, 'model'):
            print_status("加载 TTS 模型...")
            speak_text.model = Qwen3TTSModel.from_pretrained(
                MODEL_DIR,
                device_map="cpu",
                dtype=torch.float32,
            )
            print_status("模型加载完成")
        
        model = speak_text.model
        
        # 生成语音
        is_speaking = True
        wavs, sr = model.generate_custom_voice(
            text=text,
            language="Chinese",
            speaker=speaker,
        )
        
        # 保存并播放
        output_path = os.path.join(OUTPUT_DIR, f"reply_{int(time.time())}.wav")
        sf.write(output_path, wavs[0], sr)
        
        # 播放音频
        play_audio(output_path)
        
        is_speaking = False
        print_status("播放完成")
        
    except Exception as e:
        print_status(f"TTS 失败：{e}")
        is_speaking = False

def play_audio(audio_path):
    """播放音频文件"""
    try:
        # Windows PowerShell 播放
        import subprocess
        ps_command = f'powershell -c "(New-Object Media.SoundPlayer \'{audio_path}\').PlaySync()"'
        subprocess.run(ps_command, shell=True, capture_output=True)
    except Exception as e:
        print_status(f"播放失败：{e}")

def process_user_speech():
    """处理用户语音"""
    global is_processing, audio_buffer
    
    if len(audio_buffer) == 0:
        return
    
    is_processing = True
    
    try:
        # 合并音频
        audio_data = np.concatenate(audio_buffer)
        audio_buffer = []
        
        # 保存
        audio_path = os.path.join(OUTPUT_DIR, f"user_{int(time.time())}.wav")
        save_audio(audio_data, audio_path)
        print_status(f"录音保存：{len(audio_data)/SAMPLE_RATE:.2f}秒")
        
        # 识别
        print_status("正在识别...")
        user_text = transcribe_audio(audio_path)
        
        if user_text:
            print_status(f"你说：{user_text}")
            
            # 生成回复
            reply = generate_reply(user_text)
            print_status(f"回复：{reply}")
            
            # 说话
            speak_text(reply)
        else:
            print_status("未识别到内容")
    
    finally:
        is_processing = False

def listen_loop():
    """主监听循环"""
    global is_speaking, is_processing, audio_buffer, last_voice_time
    
    try:
        import pyaudio
    except ImportError:
        print_status("错误：需要安装 pyaudio")
        print_status("运行：pip install pyaudio")
        return
    
    print_status("初始化麦克风...")
    
    p = pyaudio.PyAudio()
    stream = p.open(
        format=pyaudio.paInt16,
        channels=1,
        rate=SAMPLE_RATE,
        input=True,
        frames_per_buffer=FRAME_SIZE,
    )
    
    print_status("开始监听，请说话...")
    print()
    
    speech_started = False
    silence_start = 0
    
    try:
        while True:
            # 如果正在说话或处理中，跳过
            if is_speaking or is_processing:
                stream.read(FRAME_SIZE, exception_on_overflow=False)
                continue
            
            # 读取音频
            data = stream.read(FRAME_SIZE, exception_on_overflow=False)
            audio_data = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32767.0
            
            # 简单能量检测
            energy = np.sqrt(np.mean(audio_data ** 2))
            
            # 语音检测阈值 (0.01 检测说话，0.005 检测静音结束)
            if energy > 0.01:  # 检测到声音
                if not speech_started:
                    speech_started = True
                    print_status("检测到说话")
                audio_buffer.append(audio_data)
                last_voice_time = time.time()
            else:
                if speech_started:
                    # 检测静音结束
                    if time.time() - last_voice_time > SILENCE_THRESHOLD:
                        print_status("说话结束，处理中...")
                        speech_started = False
                        process_user_speech()
    
    except KeyboardInterrupt:
        print("\n")
        print_status("退出中...")
    
    finally:
        stream.stop_stream()
        stream.close()
        p.terminate()

def main():
    """主函数"""
    print_status("启动实时语音对话系统...")
    print()
    
    # 启动监听
    try:
        listen_loop()
    except Exception as e:
        print_status(f"错误：{e}")
        print()
        print("如果 pyaudio 未安装，请运行:")
        print("  pip install pyaudio")
        print()
        print("或使用备用方案（需要手动触发）:")
        print("  python simple_test.py")

if __name__ == "__main__":
    main()
