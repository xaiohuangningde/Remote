# -*- coding: utf-8 -*-
"""
Debug Voice Chat - 详细日志
"""

import os
import sys
import time
import wave
import numpy as np
import pyaudio

SAMPLE_RATE = 16000
FRAME_SIZE = int(SAMPLE_RATE * 0.02)
SILENCE_THRESHOLD = 0.5
OUTPUT_DIR = r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\debug_chat"
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=" * 60)
print("  Debug Voice Chat")
print("=" * 60)
print("Press Ctrl+C to stop")
print()

audio_buffer = []
is_processing = False

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

log("Starting...")

p = pyaudio.PyAudio()
stream = p.open(
    format=pyaudio.paInt16,
    channels=1,
    rate=SAMPLE_RATE,
    input=True,
    frames_per_buffer=FRAME_SIZE,
)

log("Listening... Speak now!")

speech_started = False
last_voice_time = 0
frame_count = 0

try:
    while True:
        data = stream.read(FRAME_SIZE, exception_on_overflow=False)
        audio_data = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32767.0
        energy = np.sqrt(np.mean(audio_data ** 2))
        frame_count += 1
        
        # 每 50 帧显示一次状态 (1 秒)
        if frame_count % 50 == 0:
            log(f"Energy: {energy:.6f}, Buffer: {len(audio_buffer)} frames")
        
        if energy > 0.003:
            if not speech_started:
                speech_started = True
                log(f"Speech START (energy={energy:.6f})")
            audio_buffer.append(audio_data)
            last_voice_time = time.time()
        else:
            if speech_started:
                silence_duration = time.time() - last_voice_time
                if silence_duration > SILENCE_THRESHOLD:
                    log(f"Speech END ({silence_duration:.2f}s silence)")
                    log(f"Processing {len(audio_buffer)} frames...")
                    
                    # 保存录音
                    audio = np.concatenate(audio_buffer)
                    audio_path = os.path.join(OUTPUT_DIR, f"user_{int(time.time())}.wav")
                    save_audio(audio, audio_path)
                    log(f"Saved: {audio_path} ({len(audio)/SAMPLE_RATE:.2f}s)")
                    
                    audio_buffer = []
                    speech_started = False
                    
                    # 测试 Whisper
                    log("Testing Whisper...")
                    try:
                        sys.path.insert(0, r"C:\Users\12132\.openclaw\workspace\skills\whisper-local\src")
                        from index import transcribe
                        result = transcribe(audio_path, model='base', language='zh')
                        log(f"Whisper result: {result}")
                    except Exception as e:
                        log(f"Whisper error: {e}")
                    
                    # 测试 TTS
                    log("Testing TTS...")
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
                        
                        log("Generating speech...")
                        wavs, sr = save_audio.model.generate_custom_voice(
                            text="测试成功！",
                            language="Chinese",
                            speaker="Vivian",
                        )
                        output_path = os.path.join(OUTPUT_DIR, f"reply_{int(time.time())}.wav")
                        sf.write(output_path, wavs[0], sr)
                        log(f"TTS saved: {output_path}")
                        
                    except Exception as e:
                        log(f"TTS error: {e}")

except KeyboardInterrupt:
    log("Stopping...")
finally:
    stream.stop_stream()
    stream.close()
    p.terminate()
    log("Done")
