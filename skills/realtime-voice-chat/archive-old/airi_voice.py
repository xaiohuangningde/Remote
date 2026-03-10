# -*- coding: utf-8 -*-
"""
Real-time Voice Chat - Based on Project AIRI
直接复用 AIRI 的 VAD 架构和参数
"""

import os
import sys
import time
import wave
import threading
import numpy as np
import pyaudio

# AIRI 默认配置（从 index.vue 提取）
CONFIG = {
    'sample_rate': 16000,
    'speech_threshold': 0.3,       # AIRI 默认值
    'exit_threshold': 0.1,          # AIRI 默认值
    'min_silence_duration_ms': 400, # AIRI 默认值
    'speech_pad_ms': 80,
    'min_speech_duration_ms': 250,  # AIRI 默认值
}

OUTPUT_DIR = r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\pro_chat"
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=" * 60)
print("  Real-time Voice Chat - AIRI Edition")
print("  Based on Project AIRI Architecture")
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
print("Loading models (AIRI stack)...")
sys.stdout.flush()

print("  [1/3] Silero VAD (AIRI params)...")
try:
    import torch
    silero_model, utils = torch.hub.load(
        repo_or_dir='snakers4/silero-vad',
        model='silero_vad',
        force_reload=False,
        trust_repo=True,
    )
    print("    OK - threshold=0.3, exit=0.1, silence=400ms")
except Exception as e:
    print(f"    FAIL: {e}")
    silero_model = None

print("  [2/3] Whisper ASR...")
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
    import warnings
    warnings.filterwarnings('ignore', message='.*sox.*')
    sys.path.insert(0, r"E:\TuriX-CUA-Windows\models\Qwen3-TTS")
    from qwen_tts import Qwen3TTSModel
    
    print("    Loading model...")
    sys.stdout.flush()
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
FRAME_SIZE = 512  # AIRI 默认值
min_silence_samples = int(CONFIG['min_silence_duration_ms'] * SAMPLE_RATE / 1000)
speech_pad_samples = int(CONFIG['speech_pad_ms'] * SAMPLE_RATE / 1000)
min_speech_samples = int(CONFIG['min_speech_duration_ms'] * SAMPLE_RATE / 1000)
max_prev_buffers = max(1, int(speech_pad_samples / FRAME_SIZE))

def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")
    sys.stdout.flush()

def detect_speech(audio_frame):
    """AIRI VAD 检测逻辑"""
    if silero_model:
        try:
            audio_tensor = torch.from_numpy(audio_frame)
            speech_prob = silero_model(audio_tensor, SAMPLE_RATE).item()
            
            # AIRI 阈值逻辑（从 vad.ts 复制）
            is_speech = (
                speech_prob > CONFIG['speech_threshold']
                or (state['is_recording'] and speech_prob >= CONFIG['exit_threshold'])
            )
            return is_speech, speech_prob
        except Exception as e:
            pass
    
    # Fallback
    energy = np.sqrt(np.mean(audio_frame ** 2))
    return energy > 0.01, energy

def generate_reply(text):
    """简单回复生成"""
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
    """处理音频片段"""
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
    
    # Whisper ASR
    log("  ASR...")
    user_text = ""
    if whisper_model:
        try:
            segments, _ = whisper_model.transcribe(audio_path, language='zh')
            user_text = " ".join([s.text.strip() for s in segments])
        except Exception as e:
            log(f"  ASR error: {e}")
            return
    
    if not user_text:
        log("  No speech")
        return
    
    log(f"  You: {user_text}")
    
    # LLM 回复
    reply = generate_reply(user_text)
    log(f"  Reply: {reply}")
    
    # TTS
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
                    audio_copy = list(state['audio_buffer'])
                    threading.Thread(target=process_audio, args=(audio_copy,), daemon=True).start()
                
                state['is_recording'] = False
                state['audio_buffer'] = []
                state['post_speech_samples'] = 0
        
        else:
            # 打断检测
            if state['is_playing'] and prob > CONFIG['speech_threshold'] * 2:
                log("  INTERRUPT!")
                state['stop_playback'] = True
            
            # Pre-padding (AIRI 逻辑)
            if len(state['prev_buffers']) >= max_prev_buffers:
                state['prev_buffers'].pop(0)
            state['prev_buffers'].append(audio_frame.copy())
    
    return (None, pyaudio.paContinue)

# 启动
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

log(f"Listening! (AIRI params: threshold={CONFIG['speech_threshold']}, exit={CONFIG['exit_threshold']}, silence={CONFIG['min_silence_duration_ms']}ms)")
log("Speak for 0.25+ seconds. You can interrupt by speaking.")

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
