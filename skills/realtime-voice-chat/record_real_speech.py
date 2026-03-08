# -*- coding: utf-8 -*-
"""录制真实人声测试"""

import pyaudio
import wave
import numpy as np
import sys
import time

print('=' * 60)
print('  录音测试 - 请说话!')
print('=' * 60)
print('3 秒后开始录音...')
sys.stdout.flush()

# 倒计时
for i in range(3, 0, -1):
    print(f'{i}...')
    sys.stdout.flush()
    time.sleep(1)

print('开始录音！请说："你好，这是测试"')
sys.stdout.flush()

SAMPLE_RATE = 16000
DURATION = 5  # 5 秒
CHUNK_SIZE = int(SAMPLE_RATE * 0.02)

p = pyaudio.PyAudio()
stream = p.open(
    format=pyaudio.paInt16,
    channels=1,
    rate=SAMPLE_RATE,
    input=True,
    frames_per_buffer=CHUNK_SIZE
)

frames = []
print('录音中...', end='', flush=True)
for i in range(int(DURATION / 0.02)):
    data = stream.read(CHUNK_SIZE, exception_on_overflow=False)
    frames.append(data)
    if i % 50 == 0:
        print('.', end='', flush=True)

print(' 完成!')
sys.stdout.flush()

stream.stop_stream()
stream.close()
p.terminate()

# 保存
output_file = 'test_real_speech.wav'
with wave.open(output_file, 'wb') as wav:
    wav.setnchannels(1)
    wav.setsampwidth(2)
    wav.setframerate(SAMPLE_RATE)
    wav.writeframes(b''.join(frames))

print(f'\n录音已保存：{output_file}')

# 分析
audio = np.frombuffer(b''.join(frames), dtype=np.int16).astype(np.float32) / 32768.0
energy = np.sqrt(np.mean(audio ** 2))
print(f'音频能量：{energy:.6f}')
print(f'音频范围：[{audio.min():.4f}, {audio.max():.4f}]')

if energy > 0.01:
    print('OK: 检测到清晰音频!')
else:
    print('WARN: 音频能量低')

sys.stdout.flush()

print('\n现在测试 VAD...')
sys.stdout.flush()

# VAD 测试
import onnxruntime as ort

import os
model_path = os.path.join(os.path.dirname(__file__), '..', 'vad', 'models', 'silero_vad.onnx')
session = ort.InferenceSession(model_path)
state = np.zeros((2, 1, 128), dtype=np.float32)
sr = np.array([16000], dtype=np.int64)
CHUNK = 512

is_recording = False
SPEECH_THRESHOLD = 0.3
EXIT_THRESHOLD = 0.1
speech_detected = False

for i in range(0, len(audio) - CHUNK, CHUNK):
    chunk = audio[i:i+CHUNK]
    outputs = session.run(None, {
        'input': chunk[np.newaxis, :].astype(np.float32),
        'state': state,
        'sr': sr
    })
    prob = float(outputs[0][0, 0])
    state = outputs[1]
    
    # Airi 逻辑
    if is_recording:
        is_speech = prob >= EXIT_THRESHOLD
    else:
        is_speech = prob > SPEECH_THRESHOLD
    
    if is_speech and not is_recording:
        is_recording = True
        speech_detected = True
        print(f'Frame {i//CHUNK}: 语音开始 (prob={prob:.4f})')
    elif not is_speech and is_recording:
        is_recording = False
        print(f'Frame {i//CHUNK}: 语音结束 (prob={prob:.4f})')

print(f'\nVAD 检测结果:')
if speech_detected:
    print('OK: VAD 检测到语音!')
else:
    print('WARN: VAD 未检测到语音')

sys.stdout.flush()
