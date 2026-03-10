# -*- coding: utf-8 -*-
"""
Real-time Voice Chat - Chinese Optimized
使用 FunASR (阿里达摩院) - 中文识别比 Whisper 更好

FunASR 优势:
1. 专门针对中文优化
2. 识别准确率更高
3. 速度更快
4. 内存占用更低
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

# AIRI 参数
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
print("  Real-time Voice Chat - Chinese Optimized")
print("  ASR: FunASR (阿里达摩院)")
print("=" * 60)
print()

state = {
    'is_recording': False,
    'audio_buffer': [],
    'prev_buffers': [],
    'post_speech_samples': 0,
    'lock': threading.Lock(),
}

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

print("  [2/3] FunASR (Chinese ASR)...")
try:
    from funasr import AutoModel
    
    # 使用 Paraformer - 阿里达摩院中文识别模型
    asr_model = AutoModel(
        model="paraformer-zh",
        vad_model="fsmn-vad",
        punc_model="ct-punc",
        device="cpu",
    )
    print("    OK (Paraformer-zh)")
except Exception as e:
    print(f"    FAIL: {e}")
    print("    Fallback to Whisper...")
    try:
        from faster_whisper import WhisperModel
        asr_model = WhisperModel('base', device='cpu', compute_type='int8')
        print("    OK (Whisper fallback)")
    except:
        asr_model = None

print("  [3/3] Ready!")
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

def transcribe_audio(audio_path):
    """使用 FunASR 或 Whisper 转录"""
    if asr_model is None:
        return ""
    
    try:
        # 检查是 FunASR 还是 Whisper
        if hasattr(asr_model, 'generate'):
            # FunASR
            result = asr_model.generate(input=audio_path, batch_size_s=300)
            # FunASR 返回格式：[{'text': '...', 'timestamp': [...]}]
            if result and len(result) > 0:
                return result[0].get('text', '')
        else:
            # Whisper
            segments, _ = asr_model.transcribe(audio_path, language='zh')
            return " ".join([s.text.strip() for s in segments])
    except Exception as e:
        log(f"  ASR error: {e}")
        return ""
    
    return ""

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

def process_audio_segment():
    with state['lock']:
        if not state['audio_buffer']:
            return
        
        all_frames = state['prev_buffers'] + state['audio_buffer']
        audio = np.concatenate(all_frames)
        
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
        
        # ASR 识别
        log("  ASR...")
        user_text = transcribe_audio(audio_path)
        
        if not user_text:
            log("  No speech")
            return
        
        log(f"  You: {user_text}")
        
        reply = generate_reply(user_text)
        log(f"  Reply: {reply}")
        log("  (TTS disabled)")
        
        # 重置
        state['audio_buffer'] = []
        state['prev_buffers'] = []
        state['is_recording'] = False
        state['post_speech_samples'] = 0

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
                    threading.Thread(target=process_audio_segment, daemon=True).start()
                
                state['is_recording'] = False
                state['audio_buffer'] = []
                state['post_speech_samples'] = 0
        
        else:
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

log(f"Listening! (threshold={CONFIG['speech_threshold']}, silence={CONFIG['min_silence_duration_ms']}ms)")
log("Speak for 250ms+.")

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
