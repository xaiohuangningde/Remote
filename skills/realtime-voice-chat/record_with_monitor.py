# -*- coding: utf-8 -*-
"""录音并实时显示能量"""

import pyaudio
import wave
import numpy as np
import sys
import time

print('=' * 60)
print('  录音测试 - 实时能量监控')
print('=' * 60)
print('按 Ctrl+C 停止录音')
print()
print('请现在开始说话："你好，这是测试"')
print()
sys.stdout.flush()

SAMPLE_RATE = 16000
CHUNK_SIZE = int(SAMPLE_RATE * 0.02)  # 20ms

p = pyaudio.PyAudio()
stream = p.open(
    format=pyaudio.paInt16,
    channels=1,
    rate=SAMPLE_RATE,
    input=True,
    frames_per_buffer=CHUNK_SIZE
)

frames = []
max_energy = 0
start_time = time.time()

try:
    while True:
        data = stream.read(CHUNK_SIZE, exception_on_overflow=False)
        frames.append(data)
        
        # 计算能量
        audio = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0
        energy = np.sqrt(np.mean(audio ** 2))
        
        if energy > max_energy:
            max_energy = energy
        
        # 每 0.5 秒显示一次
        elapsed = time.time() - start_time
        if int(elapsed * 100) % 50 == 0:
            bar = '█' * int(energy * 100) + '░' * (10 - int(energy * 100))
            print(f'\r[{int(elapsed):2d}s] 能量：{energy:.4f} 最大：{max_energy:.4f} [{bar}]', end='', flush=True)
        
        # 自动停止 (10 秒)
        if elapsed > 10:
            print('\n\n10 秒到，停止录音')
            break
            
except KeyboardInterrupt:
    print('\n\n用户中断')

sys.stdout.flush()

stream.stop_stream()
stream.close()
p.terminate()

# 保存
if len(frames) > 0:
    output_file = 'test_real_speech.wav'
    with wave.open(output_file, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(b''.join(frames))
    
    print(f'\n录音已保存：{output_file}')
    print(f'录音时长：{len(frames) * CHUNK_SIZE / SAMPLE_RATE:.2f}s')
    print(f'最大能量：{max_energy:.6f}')
    
    if max_energy > 0.01:
        print('OK: 检测到清晰音频!')
    else:
        print('WARN: 最大能量也低，可能环境太安静')
    
    sys.stdout.flush()
else:
    print('没有录音数据')
    sys.exit(1)
