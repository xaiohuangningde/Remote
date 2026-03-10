# -*- coding: utf-8 -*-
"""
Real-time Voice Chat - Low Latency Version
Based on Project AIRI Architecture
VAD (Silero) + Whisper + LLM + Qwen3-TTS
"""

import os
import sys
import time
import wave
import threading
import numpy as np
import pyaudio

# 配置
CONFIG = {
    'sample_rate': 16000,
    'speech_threshold': 0.01,
    'exit_threshold': 0.005,
    'min_silence_duration_ms': 600,
    'speech_pad_ms': 80,
    'min_speech_duration_ms': 500,  # 0.5 秒以上触发
    'max_buffer_duration': 30,
}

OUTPUT_DIR = r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\pro_chat"
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=" * 60)
print("  Real-time Voice Chat - Low Latency")
print("  Based on Project AIRI Architecture")
print("=" * 60)
print()

# 全局状态
class State:
    def __init__(self):
        self.is_recording = False
        self.audio_buffer = []
        self.prev_buffers = []
        self.post_speech_samples = 0
        self.is_playing = False
        self.stop_playback = False
        self.lock = threading.Lock()

state = State()

# 预加载模型
print("Loading models...")
sys.stdout.flush()

# 1. Silero VAD
print("  [1/3] Silero VAD...")
sys.stdout.flush()
try:
    import torch
    silero_model, utils = torch.hub.load(
        repo_or_dir='snakers4/silero-vad',
        model='silero_vad',
        force_reload=False,
        trust_repo=True,
    )
    print("    OK Silero VAD ready")
except Exception as e:
    print(f"    FAIL Silero VAD: {e}")
    silero_model = None
sys.stdout.flush()

# 2. Whisper
print("  [2/3] Whisper...")
sys.stdout.flush()
try:
    from faster_whisper import WhisperModel
    whisper_model = WhisperModel('base', device='cpu', compute_type='int8')
    print("    OK Whisper ready")
except Exception as e:
    print(f"    FAIL Whisper: {e}")
    whisper_model = None
sys.stdout.flush()

# 3. TTS
print("  [3/3] Qwen3-TTS...")
sys.stdout.flush()
try:
    import soundfile as sf
    sys.path.insert(0, r"E:\TuriX-CUA-Windows\models\Qwen3-TTS")
    from qwen_tts import Qwen3TTSModel
    
    tts_model = Qwen3TTSModel.from_pretrained(
        r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\Qwen\Qwen3-TTS-12Hz-1___7B-CustomVoice",
        device_map="cpu",
        dtype=torch.float32,
    )
    print("    OK TTS ready")
except Exception as e:
    print(f"    FAIL TTS: {e}")
    tts_model = None
sys.stdout.flush()

print()
print("All models loaded! Starting...")
print()

# 音频配置
SAMPLE_RATE = CONFIG['sample_rate']
FRAME_SIZE = int(SAMPLE_RATE * 0.02)  # 20ms

# 计算常量
min_silence_samples = int(CONFIG['min_silence_duration_ms'] * SAMPLE_RATE / 1000)
speech_pad_samples = int(CONFIG['speech_pad_ms'] * SAMPLE_RATE / 1000)
min_speech_samples = int(CONFIG['min_speech_duration_ms'] * SAMPLE_RATE / 1000)
max_prev_buffers = max(1, int(speech_pad_samples / FRAME_SIZE))

def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")
    sys.stdout.flush()

def save_audio(audio_data, filename):
    audio_int16 = (audio_data * 32767).astype(np.int16)
    with wave.open(filename, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(audio_int16.tobytes())

def detect_speech(audio_frame):
    if silero_model is not None:
        try:
            audio_tensor = torch.from_numpy(audio_frame)
            speech_prob = silero_model(audio_tensor, SAMPLE_RATE).item()
            return speech_prob > CONFIG['speech_threshold'], speech_prob
        except:
            pass
    
    energy = np.sqrt(np.mean(audio_frame ** 2))
    return energy > 0.01, energy

def reset_state():
    with state.lock:
        state.audio_buffer = []
        state.is_recording = False
        state.post_speech_samples = 0
        state.prev_buffers = []

def generate_reply(user_text):
    text = user_text.lower()
    
    if "你好" in text or "hello" in text or "hi" in text:
        return "你好！"
    elif "名字" in text:
        return "我叫小黄。"
    elif "时间" in text:
        return f"现在{time.strftime('%H 点%M 分')}。"
    elif "谢谢" in text:
        return "不客气！"
    elif "再见" in text or "拜拜" in text:
        return "再见！"
    elif "测试" in text:
        return "测试成功！"
    else:
        return "嗯嗯。"

def play_audio(filepath):
    state.is_playing = True
    state.stop_playback = False
    
    try:
        import subprocess
        proc = subprocess.Popen(
            ["powershell", "-c", f"(New-Object Media.SoundPlayer '{filepath}').PlaySync()"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        
        while proc.poll() is None:
            if state.stop_playback:
                proc.kill()
                log("  INTERRUPTED!")
                break
            time.sleep(0.1)
            
    except Exception as e:
        log(f"  Playback error: {e}")
    finally:
        state.is_playing = False

def process_speech():
    with state.lock:
        if len(state.audio_buffer) == 0:
            return
        
        all_frames = state.prev_buffers + state.audio_buffer
        audio = np.concatenate(all_frames)
        
        audio_path = os.path.join(OUTPUT_DIR, f"user_{int(time.time())}.wav")
        save_audio(audio, audio_path)
        duration = len(audio) / SAMPLE_RATE
        log(f"  Audio: {duration:.2f}s")
        
        log("  Recognizing...")
        user_text = ""
        try:
            if whisper_model:
                segments, info = whisper_model.transcribe(audio_path, language='zh')
                for segment in segments:
                    user_text += segment.text.strip()
        except Exception as e:
            log(f"  Whisper error: {e}")
            reset_state()
            return
        
        if not user_text:
            log("  No speech")
            reset_state()
            return
        
        log(f"  You: {user_text}")
        
        reply = generate_reply(user_text)
        log(f"  Reply: {reply}")
        
        log("  Synthesizing...")
        tts_start = time.time()
        try:
            if tts_model:
                wavs, sr = tts_model.generate_custom_voice(
                    text=reply,
                    language="Chinese",
                    speaker="Vivian",
                )
                
                output_path = os.path.join(OUTPUT_DIR, f"reply_{int(time.time())}.wav")
                sf.write(output_path, wavs[0], sr)
                
                tts_time = time.time() - tts_start
                log(f"  TTS OK: {len(wavs[0])/sr:.2f}s ({tts_time:.1f}s)")
                
                log("  Playing...")
                play_audio(output_path)
                
        except Exception as e:
            log(f"  TTS error: {e}")
        
        reset_state()

def audio_callback(in_data, frame_count, time_info, status):
    audio_frame = np.frombuffer(in_data, dtype=np.int16).astype(np.float32) / 32767.0
    
    is_speech, prob = detect_speech(audio_frame)
    
    if is_speech:
        if not state.is_recording:
            log(f"  SPEECH START ({prob:.3f})")
            state.is_recording = True
            state.post_speech_samples = 0
        
        with state.lock:
            state.audio_buffer.append(audio_frame)
    
    elif state.is_recording:
        state.post_speech_samples += len(audio_frame)
        
        if state.post_speech_samples >= min_silence_samples:
            log(f"  SPEECH END ({state.post_speech_samples/SAMPLE_RATE*1000:.0f}ms)")
            
            with state.lock:
                if not state.is_recording:  # 双重检查，避免重复触发
                    return
                
                total_samples = sum(len(f) for f in state.audio_buffer)
                if total_samples < min_speech_samples:
                    log("  Too short")
                    state.is_recording = False
                    state.audio_buffer = []
                    state.post_speech_samples = 0
                    state.prev_buffers = []
                else:
                    # 复制数据后释放锁
                    audio_to_process = list(state.audio_buffer)
                    prev_to_process = list(state.prev_buffers)
                    state.is_recording = False
                    state.audio_buffer = []
                    state.post_speech_samples = 0
                    state.prev_buffers = []
                    
                    # 异步处理
                    def process():
                        state_copy = type('StateCopy', (), {})()
                        state_copy.audio_buffer = audio_to_process
                        state_copy.prev_buffers = prev_to_process
                        process_audio_segment(state_copy)
                    
                    threading.Thread(target=process, daemon=True).start()
    
    else:
        if state.is_playing:
            if prob > CONFIG['speech_threshold'] * 2:
                log("  INTERRUPT DETECTED!")
                state.stop_playback = True
                reset_state()
        
        with state.lock:
            if len(state.prev_buffers) >= max_prev_buffers:
                state.prev_buffers.pop(0)
            state.prev_buffers.append(audio_frame.copy())
    
    return (None, pyaudio.paContinue)

# 启动音频流
log("Initializing microphone...")
p = pyaudio.PyAudio()
stream = p.open(
    format=pyaudio.paInt16,
    channels=1,
    rate=SAMPLE_RATE,
    input=True,
    frames_per_buffer=FRAME_SIZE,
    stream_callback=audio_callback,
)

log("Listening... Speak now!")
log(f"Config: threshold={CONFIG['speech_threshold']}, silence={CONFIG['min_silence_duration_ms']}ms, min_speech={CONFIG['min_speech_duration_ms']}ms")
log("-" * 40)
log("Tip: Speak for 1+ seconds. You can interrupt playback by speaking.")

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
