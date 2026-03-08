# -*- coding: utf-8 -*-
"""
Real-time Voice Chat - Lite Version
轻量版：能量检测 VAD + Whisper ASR

适合内存有限的环境
"""

import os
import sys
import time
import wave
import threading
import numpy as np
import pyaudio

# UTF-8 输出
if sys.platform == 'win32':
    os.system('chcp 65001 >nul')
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# 配置
CONFIG = {
    'sample_rate': 16000,
    'frame_size': 512,
    'energy_threshold': 0.01,      # 能量阈值
    'min_silence_duration_ms': 600, # 静音判定时间
    'min_speech_duration_ms': 500,  # 最短语音时长
}

OUTPUT_DIR = r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\pro_chat"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 状态
state = {
    'is_recording': False,
    'audio_buffer': [],
    'post_speech_samples': 0,
    'lock': threading.Lock(),
}

print("=" * 60)
print("  Real-time Voice Chat - Lite")
print("  Energy VAD + Whisper ASR")
print("=" * 60)
print()

# 加载 Whisper
print("Loading Whisper...")
sys.stdout.flush()
try:
    from faster_whisper import WhisperModel
    whisper_model = WhisperModel('base', device='cpu', compute_type='int8')
    print("  OK")
except Exception as e:
    print(f"  FAIL: {e}")
    whisper_model = None

print()

# 常量
min_silence_samples = int(CONFIG['min_silence_duration_ms'] * CONFIG['sample_rate'] / 1000)
min_speech_samples = int(CONFIG['min_speech_duration_ms'] * CONFIG['sample_rate'] / 1000)

def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")
    sys.stdout.flush()

def detect_speech(audio_frame):
    """能量检测 VAD"""
    energy = np.sqrt(np.mean(audio_frame ** 2))
    return energy > CONFIG['energy_threshold'], energy

def generate_reply(text):
    t = text.lower()
    if any(x in t for x in ["你好", "hello", "hi"]):
        return "你好！"
    elif "名字" in t:
        return "我叫小黄。"
    elif "时间" in t:
        return f"现在{time.strftime('%H 点%M 分')}。"
    elif "谢谢" in t:
        return "不客气！"
    elif any(x in t for x in ["再见", "拜拜"]):
        return "再见！"
    elif "测试" in t:
        return "测试成功！"
    return "嗯嗯。"

def process_audio():
    """处理音频片段"""
    with state['lock']:
        if not state['audio_buffer']:
            return
        
        audio = np.concatenate(state['audio_buffer'])
        
        # 保存
        audio_path = os.path.join(OUTPUT_DIR, f"user_{int(time.time())}.wav")
        audio_int16 = (audio * 32767).astype(np.int16)
        with wave.open(audio_path, 'wb') as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(CONFIG['sample_rate'])
            wav.writeframes(audio_int16.tobytes())
        
        duration = len(audio) / CONFIG['sample_rate']
        log(f"  Audio: {duration:.2f}s")
        
        # ASR
        log("  ASR...")
        user_text = ""
        if whisper_model:
            try:
                segments, _ = whisper_model.transcribe(audio_path, language='zh')
                for segment in segments:
                    text = segment.text.strip()
                    if text:
                        user_text += text
            except Exception as e:
                log(f"  ASR error: {e}")
                return
        
        if not user_text:
            log("  No speech")
            return
        
        log(f"  You: {user_text}")
        
        reply = generate_reply(user_text)
        log(f"  Reply: {reply}")
        log("  (TTS disabled in lite mode)")
        
        # 重置
        state['audio_buffer'] = []
        state['is_recording'] = False
        state['post_speech_samples'] = 0

def audio_callback(in_data, frame_count, time_info, status):
    audio_frame = np.frombuffer(in_data, dtype=np.int16).astype(np.float32) / 32767.0
    is_speech, energy = detect_speech(audio_frame)
    
    with state['lock']:
        if is_speech:
            if not state['is_recording']:
                log(f"  SPEECH START ({energy:.4f})")
                state['is_recording'] = True
                state['post_speech_samples'] = 0
            state['audio_buffer'].append(audio_frame)
        
        elif state['is_recording']:
            state['post_speech_samples'] += len(audio_frame)
            
            if state['post_speech_samples'] >= min_silence_samples:
                log(f"  SPEECH END ({state['post_speech_samples']/CONFIG['sample_rate']*1000:.0f}ms)")
                
                total = sum(len(f) for f in state['audio_buffer'])
                if total < min_speech_samples:
                    log("  Too short")
                else:
                    threading.Thread(target=process_audio, daemon=True).start()
                
                state['is_recording'] = False
                state['audio_buffer'] = []
                state['post_speech_samples'] = 0
    
    return (None, pyaudio.paContinue)

# 启动
log("Initializing...")
p = pyaudio.PyAudio()
stream = p.open(
    format=pyaudio.paInt16,
    channels=1,
    rate=CONFIG['sample_rate'],
    input=True,
    frames_per_buffer=CONFIG['frame_size'],
    stream_callback=audio_callback,
)

log(f"Listening! (energy={CONFIG['energy_threshold']}, silence={CONFIG['min_silence_duration_ms']}ms)")
log(f"Speak for {CONFIG['min_speech_duration_ms']}ms+.")

try:
    while stream.is_active():
        time.sleep(0.1)
except KeyboardInterrupt:
    log("\nStopping...")
finally:
    stream.stop_stream()
    stream.close()
    p.terminate()
    log("Bye!")
