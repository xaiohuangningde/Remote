# -*- coding: utf-8 -*-
"""
Real-time Voice Chat - AIRI Production
完整流程：VAD (Silero) + Whisper ASR + LLM + Qwen3-TTS
基于 Project AIRI 架构和参数
"""

import os
import sys
import time
import wave
import threading
import numpy as np
import pyaudio

# 强制 UTF-8 输出
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# AIRI 默认配置
CONFIG = {
    'sample_rate': 16000,
    'speech_threshold': 0.3,
    'exit_threshold': 0.1,
    'min_silence_duration_ms': 400,
    'speech_pad_ms': 80,
    'min_speech_duration_ms': 250,
}

OUTPUT_DIR = r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\pro_chat"
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=" * 60)
print("  Real-time Voice Chat - AIRI Production")
print("  VAD + ASR + LLM + TTS")
print("=" * 60)
print()

state = {
    'is_recording': False,
    'audio_buffer': [],
    'prev_buffers': [],
    'post_speech_samples': 0,
    'is_playing': False,
    'stop_playback': False,
    'lock': threading.Lock(),
}

print("Loading models...")
sys.stdout.flush()

print("  [1/4] Silero VAD...")
try:
    import torch
    silero_model, utils = torch.hub.load(
        repo_or_dir='snakers4/silero-vad',
        model='silero_vad',
        force_reload=False,
        trust_repo=True,
    )
    print("    OK")
except Exception as e:
    print(f"    FAIL: {e}")
    silero_model = None

print("  [2/4] Whisper ASR...")
try:
    from faster_whisper import WhisperModel
    whisper_model = WhisperModel('base', device='cpu', compute_type='int8')
    print("    OK")
except Exception as e:
    print(f"    FAIL: {e}")
    whisper_model = None

print("  [3/4] Loading TTS model...")
try:
    import soundfile as sf
    sys.path.insert(0, r"E:\TuriX-CUA-Windows\models\Qwen3-TTS")
    from qwen_tts import Qwen3TTSModel
    
    tts_model = Qwen3TTSModel.from_pretrained(
        r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\Qwen\Qwen3-TTS-12Hz-1___7B-CustomVoice",
        device_map="cpu",
        dtype=torch.float32,
    )
    print("    OK")
except Exception as e:
    print(f"    FAIL: {e}")
    tts_model = None

print("  [4/4] Setting up...")
print()
print("Ready!")
print()

SAMPLE_RATE = CONFIG['sample_rate']
FRAME_SIZE = 512
min_silence_samples = int(CONFIG['min_silence_duration_ms'] * SAMPLE_RATE / 1000)
min_speech_samples = int(CONFIG['min_speech_duration_ms'] * SAMPLE_RATE / 1000)

def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")
    sys.stdout.flush()

def detect_speech(audio_frame):
    if silero_model:
        try:
            audio_tensor = torch.from_numpy(audio_frame)
            speech_prob = silero_model(audio_tensor, SAMPLE_RATE).item()
            is_speech = (
                speech_prob > CONFIG['speech_threshold']
                or (state['is_recording'] and speech_prob >= CONFIG['exit_threshold'])
            )
            return is_speech, speech_prob
        except:
            pass
    energy = np.sqrt(np.mean(audio_frame ** 2))
    return energy > 0.01, energy

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

def play_audio(filepath):
    state['is_playing'] = True
    state['stop_playback'] = False
    try:
        import subprocess
        proc = subprocess.Popen(
            ["powershell", "-c", f"(New-Object Media.SoundPlayer '{filepath}').PlaySync()"],
        )
        while proc.poll() is None:
            if state['stop_playback']:
                proc.kill()
                log("  INTERRUPTED!")
                break
            time.sleep(0.1)
    except Exception as e:
        log(f"  Playback error: {e}")
    finally:
        state['is_playing'] = False

def process_audio(audio_data):
    audio = np.concatenate(audio_data)
    
    audio_path = os.path.join(OUTPUT_DIR, f"user_{int(time.time())}.wav")
    audio_int16 = (audio * 32767).astype(np.int16)
    with wave.open(audio_path, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(audio_int16.tobytes())
    
    duration = len(audio) / SAMPLE_RATE
    log(f"  Audio: {duration:.2f}s")
    
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
    
    log("  TTS...")
    tts_start = time.time()
    if tts_model:
        try:
            wavs, sr = tts_model.generate_custom_voice(
                text=reply,
                language="Chinese",
                speaker="Vivian",
            )
            output_path = os.path.join(OUTPUT_DIR, f"reply_{int(time.time())}.wav")
            sf.write(output_path, wavs[0], sr)
            log(f"  TTS OK: {len(wavs[0])/sr:.2f}s ({time.time()-tts_start:.1f}s)")
            log("  Playing...")
            play_audio(output_path)
        except Exception as e:
            log(f"  TTS error: {e}")

def audio_callback(in_data, frame_count, time_info, status):
    audio_frame = np.frombuffer(in_data, dtype=np.int16).astype(np.float32) / 32767.0
    is_speech, prob = detect_speech(audio_frame)
    
    with state['lock']:
        if is_speech:
            if not state['is_recording']:
                log(f"  SPEECH START ({prob:.3f})")
                state['is_recording'] = True
                state['post_speech_samples'] = 0
            state['audio_buffer'].append(audio_frame)
        
        elif state['is_recording']:
            state['post_speech_samples'] += len(audio_frame)
            
            if state['post_speech_samples'] >= min_silence_samples:
                log(f"  SPEECH END ({state['post_speech_samples']/SAMPLE_RATE*1000:.0f}ms)")
                
                total = sum(len(f) for f in state['audio_buffer'])
                if total < min_speech_samples:
                    log("  Too short")
                else:
                    audio_copy = list(state['audio_buffer'])
                    threading.Thread(target=process_audio, args=(audio_copy,), daemon=True).start()
                
                state['is_recording'] = False
                state['audio_buffer'] = []
                state['post_speech_samples'] = 0
        
        else:
            if state['is_playing'] and prob > CONFIG['speech_threshold'] * 2:
                log("  INTERRUPT!")
                state['stop_playback'] = True
            
            if len(state['prev_buffers']) >= 10:
                state['prev_buffers'].pop(0)
            state['prev_buffers'].append(audio_frame.copy())
    
    return (None, pyaudio.paContinue)

log("Initializing...")
p = pyaudio.PyAudio()
stream = p.open(
    format=pyaudio.paInt16,
    channels=1,
    rate=SAMPLE_RATE,
    input=True,
    frames_per_buffer=FRAME_SIZE,
    stream_callback=audio_callback,
)

log(f"Listening! (AIRI: threshold={CONFIG['speech_threshold']}, exit={CONFIG['exit_threshold']}, silence={CONFIG['min_silence_duration_ms']}ms)")
log("Speak for 0.25+ seconds. You can interrupt playback.")

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
