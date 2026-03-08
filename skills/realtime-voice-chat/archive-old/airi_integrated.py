# -*- coding: utf-8 -*-
"""
Real-time Voice Chat - AIRI Integrated Version
完整复用 Project AIRI 的核心架构和参数

Source: https://github.com/proj-airi/webai-example-realtime-voice-chat

核心组件:
1. VAD: Silero VAD (AIRI 参数)
2. ASR: Whisper / FunASR
3. LLM: 规则回复 / API
4. TTS: Qwen3-TTS / API

AIRI 参数 (from vad.ts defaultConfig):
- sampleRate: 16000
- speechThreshold: 0.3
- exitThreshold: 0.1
- minSilenceDurationMs: 400
- speechPadMs: 80
- minSpeechDurationMs: 250
- newBufferSize: 512
"""

import os
import sys
import time
import wave
import threading
import numpy as np
import pyaudio

# 强制 UTF-8 输出 (Windows)
if sys.platform == 'win32':
    os.system('chcp 65001 >nul')
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# ============ AIRI 配置 (from vad.ts) ============
AIRI_CONFIG = {
    'sample_rate': 16000,
    'speech_threshold': 0.3,      # AIRI speechThreshold
    'exit_threshold': 0.1,        # AIRI exitThreshold
    'min_silence_duration_ms': 400,  # AIRI minSilenceDurationMs
    'speech_pad_ms': 80,          # AIRI speechPadMs
    'min_speech_duration_ms': 250,   # AIRI minSpeechDurationMs
    'new_buffer_size': 512,       # AIRI newBufferSize
}

OUTPUT_DIR = r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\pro_chat"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ============ AIRI 架构状态管理 ============
class AIRTState:
    """
    AIRI 状态管理 (from VAD class in vad.ts)
    """
    def __init__(self):
        self.is_recording = False
        self.audio_buffer = []
        self.prev_buffers = []
        self.post_speech_samples = 0
        self.is_playing = False
        self.stop_playback = False
        self.lock = threading.Lock()

state = AIRTState()

def log(msg):
    """日志输出"""
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")
    sys.stdout.flush()

def load_models():
    """
    加载模型 (AIRI 架构)
    
    组件:
    1. VAD: Silero VAD (snakers4/silero-vad)
    2. ASR: Whisper (faster-whisper)
    3. TTS: Qwen3-TTS (可选)
    """
    log("Loading models (AIRI stack)...")
    
    models = {}
    
    # 1. Silero VAD
    log("  [1/3] Silero VAD...")
    try:
        import torch
        models['silero'], _ = torch.hub.load(
            repo_or_dir='snakers4/silero-vad',
            model='silero_vad',
            force_reload=False,
            trust_repo=True,
        )
        log("    OK")
    except Exception as e:
        log(f"    FAIL: {e}")
        models['silero'] = None
    
    # 2. Whisper ASR
    log("  [2/3] Whisper ASR...")
    try:
        from faster_whisper import WhisperModel
        models['whisper'] = WhisperModel('base', device='cpu', compute_type='int8')
        log("    OK")
    except Exception as e:
        log(f"    FAIL: {e}")
        models['whisper'] = None
    
    # 3. TTS (可选)
    log("  [3/3] Qwen3-TTS...")
    try:
        import soundfile as sf
        sys.path.insert(0, r"E:\TuriX-CUA-Windows\models\Qwen3-TTS")
        from qwen_tts import Qwen3TTSModel
        
        models['tts'] = Qwen3TTSModel.from_pretrained(
            r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\Qwen\Qwen3-TTS-12Hz-1___7B-CustomVoice",
            device_map="cpu",
            dtype='float32',
        )
        log("    OK")
    except Exception as e:
        log(f"    FAIL (TTS disabled): {e}")
        models['tts'] = None
    
    return models

def detect_speech(audio_frame, silero_model, config):
    """
    AIRI VAD 检测逻辑 (from vad.ts detectSpeech)
    
    阈值逻辑:
    - 新语音：prob > speechThreshold (0.3)
    - 说话中：prob >= exitThreshold (0.1)
    """
    if silero_model:
        try:
            audio_tensor = torch.from_numpy(audio_frame)
            speech_prob = silero_model(audio_tensor, config['sample_rate']).item()
            
            # AIRI 阈值逻辑
            is_speech = (
                speech_prob > config['speech_threshold']
                or (state.is_recording and speech_prob >= config['exit_threshold'])
            )
            return is_speech, speech_prob
        except Exception as e:
            pass
    
    # Fallback: 能量检测
    energy = np.sqrt(np.mean(audio_frame ** 2))
    return energy > 0.01, energy

def process_audio_segment(models, config):
    """
    处理语音片段 (from AIRI processSpeechSegment)
    
    流程:
    1. 合并 pre-padding (prevBuffers)
    2. 合并主语音段 (audioBuffer)
    3. 添加 post-padding (speechPadSamples)
    4. ASR 识别
    5. 生成回复
    6. TTS 播放
    """
    with state.lock:
        if not state.audio_buffer:
            return
        
        # 合并音频 (AIRI 逻辑)
        all_frames = state.prev_buffers + state.audio_buffer
        audio = np.concatenate(all_frames)
        
        # 保存
        audio_path = os.path.join(OUTPUT_DIR, f"user_{int(time.time())}.wav")
        audio_int16 = (audio * 32767).astype(np.int16)
        with wave.open(audio_path, 'wb') as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(config['sample_rate'])
            wav.writeframes(audio_int16.tobytes())
        
        duration = len(audio) / config['sample_rate']
        log(f"  Audio: {duration:.2f}s")
        
        # ASR 识别
        log("  ASR...")
        user_text = ""
        if models.get('whisper'):
            try:
                segments, _ = models['whisper'].transcribe(audio_path, language='zh')
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
        
        # 生成回复 (简单规则)
        reply = generate_reply(user_text)
        log(f"  Reply: {reply}")
        
        # TTS
        if models.get('tts'):
            log("  TTS...")
            tts_start = time.time()
            try:
                import soundfile as sf
                wavs, sr = models['tts'].generate_custom_voice(
                    text=reply,
                    language="Chinese",
                    speaker="Vivian",
                )
                output_path = os.path.join(OUTPUT_DIR, f"reply_{int(time.time())}.wav")
                sf.write(output_path, wavs[0], sr)
                log(f"  TTS OK: {len(wavs[0])/sr:.2f}s ({time.time()-tts_start:.1f}s)")
                
                # 播放 (可打断)
                log("  Playing...")
                play_audio(output_path)
            except Exception as e:
                log(f"  TTS error: {e}")
        
        # 重置状态
        state.audio_buffer = []
        state.prev_buffers = []
        state.is_recording = False
        state.post_speech_samples = 0

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
    state.is_playing = True
    state.stop_playback = False
    try:
        import subprocess
        proc = subprocess.Popen(
            ["powershell", "-c", f"(New-Object Media.SoundPlayer '{filepath}').PlaySync()"],
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

def audio_callback(in_data, frame_count, time_info, status):
    """
    音频回调 (from AIRI VADAudioManager)
    
    实时处理音频帧，实现 AIRI VAD 逻辑
    """
    audio_frame = np.frombuffer(in_data, dtype=np.int16).astype(np.float32) / 32767.0
    is_speech, prob = detect_speech(audio_frame, models['silero'], AIRI_CONFIG)
    
    with state.lock:
        if is_speech:
            if not state.is_recording:
                log(f"  SPEECH START ({prob:.3f})")
                state.is_recording = True
                state.post_speech_samples = 0
            state.audio_buffer.append(audio_frame)
        
        elif state.is_recording:
            state.post_speech_samples += len(audio_frame)
            
            if state.post_speech_samples >= min_silence_samples:
                log(f"  SPEECH END ({state.post_speech_samples/AIRI_CONFIG['sample_rate']*1000:.0f}ms)")
                
                total = sum(len(f) for f in state.audio_buffer)
                if total < min_speech_samples:
                    log("  Too short")
                else:
                    # 异步处理
                    threading.Thread(target=process_audio_segment, args=(models, AIRI_CONFIG), daemon=True).start()
                
                state.is_recording = False
                state.audio_buffer = []
                state.post_speech_samples = 0
        
        else:
            # 打断检测
            if state.is_playing and prob > AIRI_CONFIG['speech_threshold'] * 2:
                log("  INTERRUPT!")
                state.stop_playback = True
            
            # Pre-padding (AIRI 逻辑)
            max_prev = max(1, int((AIRI_CONFIG['speech_pad_ms'] * AIRI_CONFIG['sample_rate'] / 1000) / AIRI_CONFIG['new_buffer_size']))
            if len(state.prev_buffers) >= max_prev:
                state.prev_buffers.pop(0)
            state.prev_buffers.append(audio_frame.copy())
    
    return (None, pyaudio.paContinue)

# ============ 主程序 ============
if __name__ == "__main__":
    print("=" * 60)
    print("  Real-time Voice Chat - AIRI Integrated")
    print("  Source: proj-airi/webai-example-realtime-voice-chat")
    print("=" * 60)
    print()
    
    print("AIRI Config (from vad.ts):")
    for k, v in AIRI_CONFIG.items():
        print(f"  {k}: {v}")
    print()
    
    # 加载模型
    models = load_models()
    print()
    
    # 计算常量
    min_silence_samples = int(AIRI_CONFIG['min_silence_duration_ms'] * AIRI_CONFIG['sample_rate'] / 1000)
    min_speech_samples = int(AIRI_CONFIG['min_speech_duration_ms'] * AIRI_CONFIG['sample_rate'] / 1000)
    
    # 启动
    log("Initializing microphone...")
    p = pyaudio.PyAudio()
    stream = p.open(
        format=pyaudio.paInt16,
        channels=1,
        rate=AIRI_CONFIG['sample_rate'],
        input=True,
        frames_per_buffer=AIRI_CONFIG['new_buffer_size'],
        stream_callback=audio_callback,
    )
    
    log(f"Listening! (AIRI: threshold={AIRI_CONFIG['speech_threshold']}, exit={AIRI_CONFIG['exit_threshold']}, silence={AIRI_CONFIG['min_silence_duration_ms']}ms)")
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
