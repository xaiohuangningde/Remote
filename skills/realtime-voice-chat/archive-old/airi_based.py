# -*- coding: utf-8 -*-
"""
Real-time Voice Chat - AIRI Based
直接使用 AIRI 的 VAD 参数和逻辑（来自 vad.ts）

核心参数（from AIRI vad.ts defaultConfig）:
  sampleRate: 16000
  speechThreshold: 0.3
  exitThreshold: 0.1
  minSilenceDurationMs: 400
  speechPadMs: 80
  minSpeechDurationMs: 250
  newBufferSize: 512
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

# ============ AIRI 参数定义 ============
AIRI_CONFIG = {
    'sample_rate': 16000,
    'speech_threshold': 0.3,      # 从 AIRI vad.ts 复制
    'exit_threshold': 0.1,        # 从 AIRI vad.ts 复制
    'min_silence_duration_ms': 400,  # 从 AIRI vad.ts 复制
    'speech_pad_ms': 80,          # 从 AIRI vad.ts 复制
    'min_speech_duration_ms': 250,   # 从 AIRI vad.ts 复制
}

OUTPUT_DIR = r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\pro_chat"
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=" * 60)
print("  Real-time Voice Chat - AIRI Based")
print("  Parameters from: proj-airi/webai-realtime-voice-chat")
print("=" * 60)
print()

print("Config (from AIRI vad.ts):")
for k, v in AIRI_CONFIG.items():
    print(f"  {k}: {v}")
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

# 加载模型
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
    print("    OK (Silero VAD from snakers4/silero-vad)")
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

print("  [3/4] Qwen3-TTS...")
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

print("  [4/4] Ready!")
print()

# 计算常量 (from AIRI vad.ts)
SAMPLE_RATE = AIRI_CONFIG['sample_rate']
FRAME_SIZE = 512  # AIRI newBufferSize
min_silence_samples = int(AIRI_CONFIG['min_silence_duration_ms'] * SAMPLE_RATE / 1000)
speech_pad_samples = int(AIRI_CONFIG['speech_pad_ms'] * SAMPLE_RATE / 1000)
min_speech_samples = int(AIRI_CONFIG['min_speech_duration_ms'] * SAMPLE_RATE / 1000)
max_prev_buffers = max(1, int(speech_pad_samples / FRAME_SIZE))

def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")
    sys.stdout.flush()

def detect_speech(audio_frame):
    """
    AIRI VAD 检测逻辑 (from vad.ts detectSpeech)
    
    逻辑：
    1. 如果不在说话且当前帧不是语音 → 保存到 prevBuffers (pre-padding)
    2. 如果在说话或检测到语音 → 添加到 buffer
    3. 阈值逻辑：
       - 新语音: prob > speechThreshold (0.3)
       - 说话中: prob >= exitThreshold (0.1)
    """
    if silero_model:
        try:
            audio_tensor = torch.from_numpy(audio_frame)
            speech_prob = silero_model(audio_tensor, SAMPLE_RATE).item()
            
            # AIRI 阈值逻辑 (from vad.ts)
            is_speech = (
                speech_prob > AIRI_CONFIG['speech_threshold']
                or (state['is_recording'] and speech_prob >= AIRI_CONFIG['exit_threshold'])
            )
            return is_speech, speech_prob
        except Exception as e:
            log(f"  VAD error: {e}")
            pass
    
    # Fallback
    energy = np.sqrt(np.mean(audio_frame ** 2))
    return energy > 0.01, energy

def generate_reply(text):
    """简单规则回复"""
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
    """播放音频，支持打断"""
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

def process_audio_segment():
    """
    处理完整的语音片段 (from AIRI vad.ts processSpeechSegment)
    
    流程：
    1. 合并前缀 padding (prevBuffers)
    2. 合并主语音段 (audioBuffer)
    3. 添加后缀 padding (speechPadSamples)
    4. 发送到 ASR
    5. 回复 → TTS
    """
    with state['lock']:
        if not state['audio_buffer']:
            return
        
        # 合并音频
        all_frames = state['prev_buffers'] + state['audio_buffer']
        audio = np.concatenate(all_frames)
        
        duration = len(audio) / SAMPLE_RATE
        
        # 保存
        audio_path = os.path.join(OUTPUT_DIR, f"user_{int(time.time())}.wav")
        audio_int16 = (audio * 32767).astype(np.int16)
        with wave.open(audio_path, 'wb') as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(SAMPLE_RATE)
            wav.writeframes(audio_int16.tobytes())
        
        log(f"  Audio: {duration:.2f}s (incl. padding)")
        
        # Whisper ASR
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
            log("  No speech detected")
            return
        
        log(f"  You: {user_text}")
        
        # 生成回复
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
                sf.write(output_path, wavs[0], sr)
                log(f"  TTS OK: {len(wavs[0])/sr:.2f}s ({time.time()-tts_start:.1f}s)")
                
                # 播放（可打断）
                log("  Playing...")
                play_audio(output_path)
            except Exception as e:
                log(f"  TTS error: {e}")
        
        # 重置状态
        state['audio_buffer'] = []
        state['prev_buffers'] = []
        state['is_recording'] = False
        state['post_speech_samples'] = 0

def audio_callback(in_data, frame_count, time_info, status):
    """
    音频回调 (from AIRI VADAudioManager)
    
    实时处理音频帧，实现 AIRI VAD 逻辑
    """
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
            # 说话中，但当前帧不是语音
            state['post_speech_samples'] += len(audio_frame)
            
            # 检查是否达到静音阈值
            if state['post_speech_samples'] >= min_silence_samples:
                log(f"  SPEECH END ({state['post_speech_samples']/SAMPLE_RATE*1000:.0f}ms)")
                
                # 检查语音长度
                total_samples = sum(len(f) for f in state['audio_buffer'])
                if total_samples < min_speech_samples:
                    log("  Too short, ignored")
                else:
                    # 处理语音段
                    threading.Thread(target=process_audio_segment, daemon=True).start()
                
                # 重置
                state['is_recording'] = False
                state['audio_buffer'] = []
                state['post_speech_samples'] = 0
        
        else:
            # 非录制状态，保存 pre-padding
            if state['is_playing'] and prob > AIRI_CONFIG['speech_threshold'] * 2:
                log("  INTERRUPT!")
                state['stop_playback'] = True
            
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

log(f"Listening! (AIRI params: threshold={AIRI_CONFIG['speech_threshold']}, exit={AIRI_CONFIG['exit_threshold']}, silence={AIRI_CONFIG['min_silence_duration_ms']}ms)")
log(f"Speak for {AIRI_CONFIG['min_speech_duration_ms']}ms+. You can interrupt playback.")

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
