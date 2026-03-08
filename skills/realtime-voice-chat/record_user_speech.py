# -*- coding: utf-8 -*-
"""录制用户说话测试"""

import pyaudio
import wave
import numpy as np
import sys
import time

print("=" * 60)
print("  录音测试 - 请说话!")
print("=" * 60)
print()
print("准备录音...")
print()

# 倒计时
for i in range(3, 0, -1):
    print(f"{i}...")
    sys.stdout.flush()
    time.sleep(1)

print()
print("开始录音！请说：\"你好，这是测试，我想看看语音识别效果如何。\"")
print("(录音 5 秒)")
print()
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
print("录音中：", end="", flush=True)

for i in range(int(DURATION / 0.02)):
    data = stream.read(CHUNK_SIZE, exception_on_overflow=False)
    frames.append(data)
    if i % 25 == 0:
        print("█", end="", flush=True)

print(" 完成!")
sys.stdout.flush()

stream.stop_stream()
stream.close()
p.terminate()

# 保存
output_file = "user_speech_test.wav"
with wave.open(output_file, 'wb') as wav:
    wav.setnchannels(1)
    wav.setsampwidth(2)
    wav.setframerate(SAMPLE_RATE)
    wav.writeframes(b''.join(frames))

print(f"\n录音已保存：{output_file}")

# 分析
audio = np.frombuffer(b''.join(frames), dtype=np.int16).astype(np.float32) / 32768.0
energy = np.sqrt(np.mean(audio ** 2))
print(f"音频能量：{energy:.6f}")
print(f"音频范围：[{audio.min():.4f}, {audio.max():.4f}]")
print(f"录音时长：{len(audio)/SAMPLE_RATE:.2f}s")

if energy > 0.01:
    print("\n[OK] 检测到清晰音频!")
    print("能量足够，可以进行 VAD 测试")
else:
    print("\n[WARN] 音频能量较低")
    print("可能是环境安静或麦克风增益低")

sys.stdout.flush()

# VAD 测试
print("\n" + "=" * 60)
print("  VAD 测试")
print("=" * 60)

try:
    from vad_streaming import VADStreaming, VADConfig
    
    vad_config = VADConfig(
        sample_rate=SAMPLE_RATE,
        speech_threshold=0.3,
        exit_threshold=0.1,
    )
    
    vad = VADStreaming(vad_config)
    
    CHUNK = 512
    speech_frames = 0
    total_frames = 0
    
    for i in range(0, len(audio) - CHUNK, CHUNK):
        chunk = audio[i:i+CHUNK]
        is_speech = vad.detect_speech(chunk)
        
        if is_speech:
            speech_frames += 1
        
        total_frames += 1
    
    ratio = speech_frames / total_frames * 100 if total_frames > 0 else 0
    
    print(f"Silero VAD 检测:")
    print(f"  语音帧：{speech_frames}/{total_frames} ({ratio:.1f}%)")
    
    if speech_frames > 0:
        print("\n[OK] Silero VAD 检测到语音!")
        print("可以开始完整流程测试")
    else:
        print("\n[WARN] Silero VAD 未检测到语音")
        print("建议:")
        print("  1. 说话声音大一些")
        print("  2. 靠近麦克风")
        print("  3. 或暂时使用简单能量 VAD")
    
except Exception as e:
    print(f"VAD 测试失败：{e}")

sys.stdout.flush()

print("\n" + "=" * 60)
print("  下一步")
print("=" * 60)
print("运行完整流程测试:")
print("  python voice_chat_openclaw.py")
print()
print("或运行 VAD 准确性对比:")
print("  python test_vad_accuracy.py")
print("=" * 60)

sys.stdout.flush()
