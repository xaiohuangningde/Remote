# -*- coding: utf-8 -*-
"""
Real-time Voice Chat - Low Latency v2
Fixed: Race condition, duplicate SPEECH END
"""

import os
import sys
import time
import wave
import threading
import numpy as np
import pyaudio

CONFIG = {
    'sample_rate': 16000,
    'speech_threshold': 0.01,
    'min_silence_duration_ms': 600,
    'min_speech_duration_ms': 500,
}

OUTPUT_DIR = r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\pro_chat"
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=" * 60)
print("  Real-time Voice Chat v2")
print("=" * 60)
print()

# 全局状态
state = {
    'is_recording': False,
    'audio_buffer': [],
    'prev_buffers': [],
    'post_speech_samples': 0,
    'is_playing': False,
    'stop_playback': False,
    'lock': threading.Lock(),
}

# 预加载模型
print("Loading models...")
sys.stdout.flush()

print("  [1/3] Silero VAD...")
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

print("  [2/3] Whisper...")
try:
    from faster_whisper import WhisperModel
    whisper_model = WhisperModel('base', device='cpu', compute_type='int8')
    print("    OK")
except Exception as e:
    print(f"    FAIL: {e}")
    whisper_model = None

print("  [3/3] Qwen3-TTS...")
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

print()
print("Ready!")
print()

SAMPLE_RATE = CONFIG['sample_rate']
FRAME_SIZE = int(SAMPLE_RATE * 0.02)
min_silence_samples = int(CONFIG['min_silence_duration_ms'] * SAMPLE_RATE / 1000)
min_speech_samples = int(CONFIG['min_speech_duration_ms'] * SAMPLE_RATE / 1000)

def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")
    sys.stdout.flush()

def detect_speech(audio_frame):
    if silero_model:
        try:
            audio_tensor = torch.from_numpy(audio_frame)
            prob = silero_model(audio_tensor, SAMPLE_RATE).item()
            return prob > CONFIG['speech_threshold'], prob
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
    """处理音频片段（在独立线程中运行）"""
    audio = np.concatenate(audio_data)
    
    # 保存
    audio_path = os.path.join(OUTPUT_DIR, f"user_{int(time.time())}.wav")
    audio_int16 = (audio * 32767).astype(np.int16)
    with wave.open(audio_path, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(audio_int16.tobytes())
    
    duration = len(audio) / SAMPLE_RATE
    log(f"  Audio: {duration:.2f}s")
    
    # Whisper
    log("  Recognizing...")
    user_text = ""
    if whisper_model:
        try:
            segments, _ = whisper_model.transcribe(audio_path, language='zh')
            user_text = " ".join([s.text.strip() for s in segments])
        except Exception as e:
            log(f"  Whisper error: {e}")
            return
    
    if not user_text:
        log("  No speech")
        return
    
    log(f"  You: {user_text}")
    
    # Reply
    reply = generate_reply(user_text)
    log(f"  Reply: {reply}")
    
    # TTS
    log("  Synthesizing...")
    tts_start = time.time()
    if tts_model:
        try:
            wavs, sr = tts_model.generate_custom_voice(
                text=reply,
                language="Chinese",
                speaker="Vivian",
            )
            output_path = os.path.join(OUTPUT_DIR, f"reply_{int(time.time())}.wav")
            import soundfile as sf
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
                    # 复制数据并启动处理线程
                    audio_copy = list(state['audio_buffer'])
                    threading.Thread(target=process_audio, args=(audio_copy,), daemon=True).start()
                
                # 重置状态
                state['is_recording'] = False
                state['audio_buffer'] = []
                state['post_speech_samples'] = 0
        
        else:
            # 打断检测
            if state['is_playing'] and prob > CONFIG['speech_threshold'] * 2:
                log("  INTERRUPT!")
                state['stop_playback'] = True
            
            # Pre-padding
            if len(state['prev_buffers']) >= 10:
                state['prev_buffers'].pop(0)
            state['prev_buffers'].append(audio_frame.copy())
    
    return (None, pyaudio.paContinue)

# 启动
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

log(f"Listening! (threshold={CONFIG['speech_threshold']}, min_speech={CONFIG['min_speech_duration_ms']}ms)")
log("Speak for 0.5+ seconds. You can interrupt by speaking.")

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
