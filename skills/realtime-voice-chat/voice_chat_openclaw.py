# -*- coding: utf-8 -*-
"""
实时语音对话 - OpenClaw 版本
麦克风输入 → VAD → Whisper → OpenClaw LLM → TTS → 扬声器输出

无需 Web，纯 Python 实现
"""

import os
import sys
import time
import wave
import threading
import numpy as np
import pyaudio
from vad_streaming import VADStreaming, VADConfig

# 配置 (优化延迟)
SAMPLE_RATE = 16000
FRAME_SIZE = int(SAMPLE_RATE * 0.02)  # 20ms (512 采样点)
SILENCE_THRESHOLD = 0.3  # 秒
MIN_RECORDING_DURATION = 0.5  # 最小录音时长

# VAD 配置 (Silero VAD - 降低阈值)
vad_config = VADConfig(
    sample_rate=SAMPLE_RATE,
    speech_threshold=0.15,  # 从 0.3 降低到 0.15
    exit_threshold=0.05,    # 从 0.1 降低到 0.05
    min_silence_duration_ms=int(SILENCE_THRESHOLD * 1000),
)
vad_instance = None  # 全局 VAD 实例

print("=" * 60)
print("  实时语音对话 - 麦克风测试")
print("=" * 60)
print("功能：麦克风 → VAD → Whisper → LLM → TTS")
print("按 Ctrl+C 退出")
print()
print("请说话测试：")
print("  \"你好，这是测试\"")
print("  \"今天天气怎么样\"")
print("  \"再见\"")
print()

# 状态
is_speaking = False
is_processing = False
audio_buffer = []
last_voice_time = 0

def print_status(text):
    # 移除 emoji 避免 Windows 编码问题
    text = text.replace('✅', '[OK]').replace('🎤', '[MIC]').replace('📝', '[TXT]')
    text = text.replace('🧠', '[AI]').replace('🔊', '[SPK]').replace('💬', '[MSG]')
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
    """Whisper 语音识别 (优化：预加载模型)"""
    try:
        # 使用全局变量缓存模型
        if not hasattr(transcribe_audio, 'model'):
            print_status("加载 Whisper 模型...")
            transcribe_audio.model = WhisperModel("tiny", device="cpu", compute_type="float32")
        
        segments, info = transcribe_audio.model.transcribe(audio_path, language="zh", vad_filter=True)
        text = " ".join([s.text for s in segments])
        return text
    except Exception as e:
        print_status(f"识别失败：{e}")
        return ""

def generate_reply_openclaw(user_text):
    """调用 OpenClaw 生成回复"""
    try:
        # 方案 A: HTTP API (如果可用)
        import requests
        response = requests.post(
            'http://localhost:3000/api/chat',
            json={'messages': [{'role': 'user', 'content': user_text}]},
            timeout=30
        )
        return response.json().get('message', '抱歉，我无法回答')
    except:
        # 方案 B: 本地简单回复 (降级)
        return generate_simple_reply(user_text)

def generate_simple_reply(user_text):
    """简单回复 (降级方案)"""
    user_text = user_text.lower()
    
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
    else:
        return "嗯，我明白了。这是一个很有趣的话题！"

def speak_text(text):
    """TTS 语音合成并播放 (优化：异步播放)"""
    global is_speaking
    
    try:
        print_status(f"🔊 播放：{text[:30]}...")
        
        # 使用异步 TTS (不阻塞)
        import subprocess
        import threading
        
        def play_tts():
            try:
                # 使用 PowerShell 异步朗读
                subprocess.Popen([
                    'powershell', '-c',
                    '$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; '
                    '$speak.SpeakAsync("' + text.replace('"', "'") + '"); '
                    'Start-Sleep -Seconds 3'
                ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception as e:
                print_status(f"TTS 播放失败：{e}")
            finally:
                global is_speaking
                is_speaking = False
        
        # 异步播放
        thread = threading.Thread(target=play_tts)
        thread.start()
        
        print_status("✅ TTS 已启动 (异步播放)")
        
    except Exception as e:
        print_status(f"TTS 失败：{e}")
        is_speaking = False

def process_voice(audio_data):
    """处理录音：ASR → LLM → TTS"""
    global is_processing
    
    if is_processing:
        return
    
    is_processing = True
    
    try:
        # 1. 保存音频
        temp_wav = "temp_voice.wav"
        save_audio(np.array(audio_data), temp_wav)
        print_status(f"📝 录音完成 ({len(audio_data)/SAMPLE_RATE:.1f}s)")
        
        # 2. ASR 识别
        print_status("🎤 识别中...")
        text = transcribe_audio(temp_wav)
        
        if not text.strip():
            print_status("⚠️ 未识别到内容")
            return
        
        print_status(f"📝 识别：{text}")
        
        # 3. LLM 回复 (OpenClaw)
        print_status("🧠 思考中...")
        reply = generate_reply_openclaw(text)
        print_status(f"💬 回复：{reply[:50]}...")
        
        # 4. TTS 播放
        speak_text(reply)
        
    except Exception as e:
        print_status(f"处理失败：{e}")
    finally:
        is_processing = False

def vad_detect(audio_chunk):
    """简单能量 VAD 检测 (降低阈值)"""
    energy = np.sqrt(np.mean(np.array(audio_chunk) ** 2))
    return energy > 0.005  # 降低阈值，更敏感

def main():
    """主函数"""
    global is_speaking, audio_buffer, last_voice_time
    main.loop_count = 0  # 添加循环计数器
    
    print_status("初始化麦克风...")
    
    p = pyaudio.PyAudio()
    stream = p.open(
        format=pyaudio.paInt16,
        channels=1,
        rate=SAMPLE_RATE,
        input=True,
        frames_per_buffer=FRAME_SIZE,
    )
    
    print_status("✅ 就绪！请说话...")
    
    try:
        while True:
            # 读取音频
            chunk = stream.read(FRAME_SIZE, exception_on_overflow=False)
            audio_data = np.frombuffer(chunk, dtype=np.int16).astype(np.float32) / 32768.0
            
            # VAD 检测 (带调试)
            try:
                is_speaking = vad_detect(audio_data)
                # 显示前 10 次的 VAD 概率值
                if main.loop_count < 10:
                    print(f"[DEBUG] Loop {main.loop_count}: VAD={is_speaking}, Audio range=[{audio_data.min():.4f}, {audio_data.max():.4f}]")
                    sys.stdout.flush()
            except Exception as e:
                print(f"[ERROR] VAD 失败：{e}")
                is_speaking = False
                sys.stdout.flush()
            
            main.loop_count += 1
            
            if is_speaking:
                # 检测到语音，累积音频
                audio_buffer.extend(audio_data.tolist())
                last_voice_time = time.time()
            else:
                # 检测到静音，检查是否超过阈值
                if len(audio_buffer) > 0 and (time.time() - last_voice_time) > SILENCE_THRESHOLD:
                    duration = len(audio_buffer) / SAMPLE_RATE
                    if duration >= MIN_RECORDING_DURATION:
                        print_status("🎤 语音结束，处理中...")
                        process_voice(audio_buffer)
                    else:
                        print_status(f"⚠️ 录音太短 ({duration:.1f}s)，忽略")
                    audio_buffer = []
            
    except KeyboardInterrupt:
        print_status("\n退出中...")
    finally:
        stream.stop_stream()
        stream.close()
        p.terminate()
        print_status("再见！")

if __name__ == "__main__":
    main()
