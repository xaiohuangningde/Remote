# -*- coding: utf-8 -*-
"""
Smart Voice Chat - 自动噪音基线校准
"""

import os
import sys
import time
import wave
import numpy as np
import pyaudio

SAMPLE_RATE = 16000
FRAME_SIZE = int(SAMPLE_RATE * 0.02)
SILENCE_THRESHOLD = 0.8  # 0.8 秒静音判定为说话结束
OUTPUT_DIR = r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\smart_chat"
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=" * 60)
print("  Smart Voice Chat")
print("=" * 60)
print("Calibrating noise floor (3s)...")
print("Please be QUIET!")
sys.stdout.flush()

# 校准：测量 3 秒环境噪音
p = pyaudio.PyAudio()
stream = p.open(
    format=pyaudio.paInt16,
    channels=1,
    rate=SAMPLE_RATE,
    input=True,
    frames_per_buffer=FRAME_SIZE,
)

noise_samples = []
for _ in range(int(3.0 / 0.02)):  # 3 秒
    data = stream.read(FRAME_SIZE, exception_on_overflow=False)
    audio_data = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32767.0
    energy = np.sqrt(np.mean(audio_data ** 2))
    noise_samples.append(energy)

# 计算噪音基线
noise_floor = np.percentile(noise_samples, 80)  # 80% 分位数作为噪音基线
THRESHOLD = max(noise_floor * 3, 0.005)  # 至少是噪音的 3 倍，最小 0.005

print(f"\nNoise floor: {noise_floor:.6f}")
print(f"Threshold: {THRESHOLD:.6f}")
print("\n" + "=" * 60)
print("  Listening... Speak now!")
print("=" * 60)
sys.stdout.flush()

audio_buffer = []

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

speech_started = False
last_voice_time = 0

try:
    while True:
        data = stream.read(FRAME_SIZE, exception_on_overflow=False)
        audio_data = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32767.0
        energy = np.sqrt(np.mean(audio_data ** 2))
        
        if energy > THRESHOLD:
            if not speech_started:
                speech_started = True
                log(f"SPEAK START (energy={energy:.6f})")
            audio_buffer.append(audio_data)
            last_voice_time = time.time()
        else:
            if speech_started:
                silence_duration = time.time() - last_voice_time
                if silence_duration > SILENCE_THRESHOLD:
                    log(f"SPEAK END ({silence_duration:.2f}s)")
                    log(f"Processing {len(audio_buffer)} frames...")
                    
                    # 保存录音
                    audio = np.concatenate(audio_buffer)
                    audio_path = os.path.join(OUTPUT_DIR, f"user_{int(time.time())}.wav")
                    save_audio(audio, audio_path)
                    log(f"Saved: {audio_path} ({len(audio)/SAMPLE_RATE:.2f}s)")
                    
                    # Whisper 识别
                    log("Recognizing...")
                    try:
                        sys.path.insert(0, r"C:\Users\12132\.openclaw\workspace\skills\whisper-local\src")
                        from index import transcribe
                        result = transcribe(audio_path, model='base', language='zh')
                        user_text = result.get('text', '')
                        
                        if user_text:
                            log(f"You said: {user_text}")
                        else:
                            log("No speech detected")
                            audio_buffer = []
                            speech_started = False
                            continue
                            
                    except Exception as e:
                        log(f"Whisper error: {e}")
                        audio_buffer = []
                        speech_started = False
                        continue
                    
                    # 生成回复
                    reply = f"我听到了：{user_text}" if user_text else "测试完成"
                    log(f"Reply: {reply}")
                    
                    # TTS
                    log("Synthesizing...")
                    try:
                        import torch
                        import soundfile as sf
                        from qwen_tts import Qwen3TTSModel
                        
                        if not hasattr(save_audio, 'model'):
                            log("Loading TTS model...")
                            save_audio.model = Qwen3TTSModel.from_pretrained(
                                r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\Qwen\Qwen3-TTS-12Hz-1___7B-CustomVoice",
                                device_map="cpu",
                                dtype=torch.float32,
                            )
                            log("Model loaded")
                        
                        wavs, sr = save_audio.model.generate_custom_voice(
                            text=reply,
                            language="Chinese",
                            speaker="Vivian",
                        )
                        
                        output_path = os.path.join(OUTPUT_DIR, f"reply_{int(time.time())}.wav")
                        sf.write(output_path, wavs[0], sr)
                        log(f"TTS saved: {output_path} ({len(wavs[0])/sr:.2f}s)")
                        
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
                    
                    audio_buffer = []
                    speech_started = False

except KeyboardInterrupt:
    log("\nStopping...")
finally:
    stream.stop_stream()
    stream.close()
    p.terminate()
    log("Bye!")
