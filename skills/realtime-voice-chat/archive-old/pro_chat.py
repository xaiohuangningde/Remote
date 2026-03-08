# -*- coding: utf-8 -*-
"""
Professional Voice Chat - 基于 Project AIRI 架构
VAD (Silero) + Whisper + LLM + Qwen3-TTS
"""

import os
import sys
import time
import wave
import numpy as np
import pyaudio
import torch

# 配置 (根据环境调整)
CONFIG = {
    'sample_rate': 16000,
    'speech_threshold': 0.01,  # 降低阈值适配环境
    'exit_threshold': 0.005,   # 退出阈值
    'min_silence_duration_ms': 600,  # 增加静音时间
    'speech_pad_ms': 80,       # 前后填充
    'min_speech_duration_ms': 500,  # 增加最短语音时长
    'max_buffer_duration': 30,  # 最大缓冲 (秒)
}

OUTPUT_DIR = r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\pro_chat"
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=" * 60)
print("  Professional Voice Chat")
print("  Based on Project AIRI Architecture")
print("=" * 60)
print()

# 加载 Silero VAD 模型
print("Loading Silero VAD model...")
sys.stdout.flush()

try:
    silero_model, utils = torch.hub.load(
        repo_or_dir='snakers4/silero-vad',
        model='silero_vad',
        force_reload=False,
        trust_repo=True,
    )
    get_speech_timestamps = utils[0]
    print("[OK] Silero VAD loaded")
except Exception as e:
    print(f"[WARN] Silero VAD failed: {e}")
    print("Using energy-based VAD fallback")
    silero_model = None
    get_speech_timestamps = None

sys.stdout.flush()

# 音频配置
SAMPLE_RATE = CONFIG['sample_rate']
FRAME_SIZE = int(SAMPLE_RATE * 0.02)  # 20ms

# 状态
audio_buffer = []
is_recording = False
post_speech_samples = 0
prev_buffers = []

def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")
    sys.stdout.flush()

def save_audio(audio_data, filename):
    """保存为 16-bit PCM WAV 格式"""
    audio_int16 = (audio_data * 32767).astype(np.int16)
    with wave.open(filename, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(audio_int16.tobytes())
    log(f"  WAV saved: {len(audio_data)/SAMPLE_RATE:.2f}s, {audio_int16.dtype}")

def detect_speech(audio_frame):
    """使用 Silero VAD 检测语音"""
    if silero_model is not None:
        try:
            audio_tensor = torch.from_numpy(audio_frame)
            speech_prob = silero_model(audio_tensor, SAMPLE_RATE).item()
            return speech_prob > CONFIG['speech_threshold'], speech_prob
        except:
            pass
    
    # Fallback: 能量检测
    energy = np.sqrt(np.mean(audio_frame ** 2))
    return energy > 0.01, energy

def process_speech_segment():
    """处理完整的语音片段"""
    global audio_buffer, prev_buffers
    
    if len(audio_buffer) == 0:
        return
    
    log(f"Processing speech segment ({len(audio_buffer)} frames)")
    
    # 合并音频 (包含 pre-padding)
    all_frames = prev_buffers + audio_buffer
    audio = np.concatenate(all_frames)
    
    # 保存
    audio_path = os.path.join(OUTPUT_DIR, f"user_{int(time.time())}.wav")
    save_audio(audio, audio_path)
    log(f"Saved: {audio_path} ({len(audio)/SAMPLE_RATE:.2f}s)")
    
    # Whisper 识别
    log("Recognizing...")
    sys.stdout.flush()
    try:
        from faster_whisper import WhisperModel
        
        model = WhisperModel('base', device='cpu', compute_type='int8')
        segments, info = model.transcribe(audio_path, language='zh')
        
        user_text = ""
        for segment in segments:
            user_text += segment.text.strip()
        
        if user_text:
            log(f"You said: {user_text}")
        else:
            log("No speech detected")
            reset_state()
            return
            
    except Exception as e:
        log(f"Whisper error: {e}")
        import traceback
        traceback.print_exc()
        reset_state()
        return
    
    # 生成回复
    reply = generate_reply(user_text)
    log(f"Reply: {reply}")
    
    # TTS
    log("Synthesizing...")
    try:
        import soundfile as sf
        from qwen_tts import Qwen3TTSModel
        
        if not hasattr(process_speech_segment, 'model'):
            log("Loading TTS model...")
            process_speech_segment.model = Qwen3TTSModel.from_pretrained(
                r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\Qwen\Qwen3-TTS-12Hz-1___7B-CustomVoice",
                device_map="cpu",
                dtype=torch.float32,
            )
            log("Model loaded")
        
        wavs, sr = process_speech_segment.model.generate_custom_voice(
            text=reply,
            language="Chinese",
            speaker="Vivian",
        )
        
        output_path = os.path.join(OUTPUT_DIR, f"reply_{int(time.time())}.wav")
        sf.write(output_path, wavs[0], sr)
        log(f"TTS: {output_path} ({len(wavs[0])/sr:.2f}s)")
        
        # 播放
        log("Playing...")
        import subprocess
        subprocess.run(
            ["powershell", "-c", f"(New-Object Media.SoundPlayer '{output_path}').PlaySync()"],
            capture_output=True
        )
        log("Done!")
        
    except Exception as e:
        log(f"TTS error: {e}")
    
    reset_state()

def reset_state():
    global audio_buffer, is_recording, post_speech_samples, prev_buffers
    audio_buffer = []
    is_recording = False
    post_speech_samples = 0
    prev_buffers = []

def generate_reply(user_text):
    """生成回复"""
    user_text = user_text.lower()
    
    if "你好" in user_text or "hello" in user_text:
        return "你好！我是小黄，很高兴和你聊天！"
    elif "名字" in user_text:
        return "我叫小黄，是你的 AI 助手。"
    elif "时间" in user_text:
        return f"现在是{time.strftime('%H 点%M 分')}。"
    elif "谢谢" in user_text:
        return "不客气！有什么我可以帮你的吗？"
    elif "再见" in user_text:
        return "再见！祝你有美好的一天！"
    else:
        return f"我听到了：{user_text}"

# 主循环
log("Initializing microphone...")
p = pyaudio.PyAudio()
stream = p.open(
    format=pyaudio.paInt16,
    channels=1,
    rate=SAMPLE_RATE,
    input=True,
    frames_per_buffer=FRAME_SIZE,
)

log("Listening... Speak now!")
log(f"Config: threshold={CONFIG['speech_threshold']}, silence={CONFIG['min_silence_duration_ms']}ms")

min_silence_samples = CONFIG['min_silence_duration_ms'] * SAMPLE_RATE / 1000
speech_pad_samples = CONFIG['speech_pad_ms'] * SAMPLE_RATE / 1000
min_speech_samples = CONFIG['min_speech_duration_ms'] * SAMPLE_RATE / 1000
max_prev_buffers = int(speech_pad_samples / FRAME_SIZE)

try:
    while True:
        data = stream.read(FRAME_SIZE, exception_on_overflow=False)
        audio_frame = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32767.0
        
        # VAD 检测
        is_speech, prob = detect_speech(audio_frame)
        
        if is_speech:
            if not is_recording:
                # 语音开始
                log(f"SPEECH START (prob={prob:.3f})")
                is_recording = True
                post_speech_samples = 0
            
            audio_buffer.append(audio_frame)
        
        elif is_recording:
            # 静音中
            post_speech_samples += len(audio_frame)
            
            if post_speech_samples >= min_silence_samples:
                # 静音足够长，判定为说话结束
                log(f"SPEECH END (silence={post_speech_samples/SAMPLE_RATE*1000:.0f}ms)")
                
                # 检查语音时长
                total_samples = sum(len(f) for f in audio_buffer)
                if total_samples < min_speech_samples:
                    log("Too short, ignoring")
                    reset_state()
                    continue
                
                # 处理语音
                process_speech_segment()
        
        else:
            # 非录音状态，保存 pre-padding
            if len(prev_buffers) >= max_prev_buffers:
                prev_buffers.pop(0)
            prev_buffers.append(audio_frame.copy())

except KeyboardInterrupt:
    log("\nStopping...")
finally:
    stream.stop_stream()
    stream.close()
    p.terminate()
    log("Bye!")
