# -*- coding: utf-8 -*-
"""
长时间录音 + 自动剪辑

功能:
1. 录制 30 秒
2. 使用简单能量 VAD 检测语音段
3. 剪辑出有语音的部分
4. 保存剪辑后的音频
"""

import pyaudio
import wave
import numpy as np
import sys
import time

print("=" * 60)
print("  长时间录音 + 自动剪辑")
print("=" * 60)
print()

# 录音参数
SAMPLE_RATE = 16000
DURATION = 30  # 30 秒
CHUNK_SIZE = int(SAMPLE_RATE * 0.02)

# VAD 参数 (简单能量)
ENERGY_THRESHOLD = 0.01
MIN_SPEECH_DURATION = 0.3  # 最小语音段 0.3 秒
MIN_SILENCE = 0.5  # 静音阈值

print(f"准备录制 {DURATION} 秒...")
print()

# 倒计时
for i in range(3, 0, -1):
    print(f"{i}...")
    sys.stdout.flush()
    time.sleep(1)

print()
print("开始录音！请说话 (可以说多句话):")
print("  \"你好，这是第一句测试。\"")
print("  (停顿 1 秒)")
print("  \"这是第二句，看看效果如何。\"")
print("  (停顿 1 秒)")
print("  \"最后一句，测试语音识别。\"")
print()
print("录音中：", end="", flush=True)

# 录音
p = pyaudio.PyAudio()
stream = p.open(
    format=pyaudio.paInt16,
    channels=1,
    rate=SAMPLE_RATE,
    input=True,
    frames_per_buffer=CHUNK_SIZE
)

frames = []
energies = []  # 记录每块的能量

for i in range(int(DURATION / 0.02)):
    data = stream.read(CHUNK_SIZE, exception_on_overflow=False)
    frames.append(data)
    
    # 计算能量
    audio = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0
    energy = np.sqrt(np.mean(audio ** 2))
    energies.append(energy)
    
    # 显示进度
    if i % 25 == 0:
        elapsed = i * 0.02
        print(f"{elapsed:.1f}s ", end="", flush=True)

print(" 完成!")
sys.stdout.flush()

stream.stop_stream()
stream.close()
p.terminate()

# 保存完整录音
full_file = "record_full.wav"
with wave.open(full_file, 'wb') as wav:
    wav.setnchannels(1)
    wav.setsampwidth(2)
    wav.setframerate(SAMPLE_RATE)
    wav.writeframes(b''.join(frames))

print(f"\n完整录音已保存：{full_file}")
print(f"时长：{DURATION}s")
print(f"平均能量：{np.mean(energies):.6f}")
print(f"最大能量：{np.max(energies):.6f}")

# ========== VAD 检测 ==========
print("\n" + "=" * 60)
print("  VAD 语音段检测")
print("=" * 60)

# 检测语音段
speech_segments = []
in_speech = False
speech_start = 0
min_speech_chunks = int(MIN_SPEECH_DURATION / 0.02)
silence_chunks = int(MIN_SILENCE / 0.02)
silence_count = 0

for i, energy in enumerate(energies):
    is_speech = energy > ENERGY_THRESHOLD
    
    if is_speech and not in_speech:
        # 语音开始
        in_speech = True
        speech_start = i
        silence_count = 0
    elif in_speech:
        if is_speech:
            silence_count = 0
        else:
            silence_count += 1
            
            # 检查是否语音结束
            if silence_count >= silence_chunks:
                # 语音结束
                speech_end = i - silence_count
                duration = (speech_end - speech_start) * 0.02
                
                if duration >= MIN_SPEECH_DURATION:
                    speech_segments.append((speech_start, speech_end, duration))
                    print(f"检测到语音段 [{len(speech_segments)}]: {speech_start*0.02:.1f}s - {speech_end*0.02:.1f}s (时长：{duration:.2f}s)")
                
                in_speech = False
                speech_start = 0
                silence_count = 0

# 检查最后一段
if in_speech:
    speech_end = len(energies)
    duration = (speech_end - speech_start) * 0.02
    if duration >= MIN_SPEECH_DURATION:
        speech_segments.append((speech_start, speech_end, duration))
        print(f"检测到语音段 [{len(speech_segments)}]: {speech_start*0.02:.1f}s - {speech_end*0.02:.1f}s (时长：{duration:.2f}s)")

print(f"\n共检测到 {len(speech_segments)} 个语音段")

# ========== 剪辑并保存 ==========
if len(speech_segments) > 0:
    print("\n" + "=" * 60)
    print("  剪辑并保存")
    print("=" * 60)
    
    # 合并所有语音段
    clipped_audio = []
    for start, end, duration in speech_segments:
        start_sample = start * CHUNK_SIZE
        end_sample = end * CHUNK_SIZE
        
        # 读取对应音频
        full_audio = np.frombuffer(b''.join(frames), dtype=np.int16).astype(np.float32) / 32768.0
        segment = full_audio[start_sample:end_sample]
        clipped_audio.append(segment)
        
        # 添加小段静音分隔
        silence = np.zeros(int(SAMPLE_RATE * 0.1), dtype=np.float32)
        clipped_audio.append(silence)
    
    # 合并
    final_audio = np.concatenate(clipped_audio)
    
    # 保存
    clipped_file = "record_clipped.wav"
    with wave.open(clipped_file, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes((final_audio * 32767).astype(np.int16).tobytes())
    
    print(f"剪辑后音频：{clipped_file}")
    print(f"原始时长：{DURATION}s")
    print(f"剪辑后时长：{len(final_audio)/SAMPLE_RATE:.2f}s")
    print(f"压缩率：{100 - len(final_audio)/SAMPLE_RATE/DURATION*100:.1f}%")
    
    # 测试 Silero VAD
    print("\n" + "=" * 60)
    print("  Silero VAD 测试 (剪辑后)")
    print("=" * 60)
    
    try:
        from vad_streaming import VADStreaming, VADConfig
        
        vad_config = VADConfig(
            sample_rate=SAMPLE_RATE,
            speech_threshold=0.15,
            exit_threshold=0.05,
        )
        
        vad = VADStreaming(vad_config)
        
        speech_frames = 0
        total_frames = 0
        
        CHUNK = 512
        for i in range(0, len(final_audio) - CHUNK, CHUNK):
            chunk = final_audio[i:i+CHUNK]
            is_speech = vad.detect_speech(chunk)
            
            if is_speech:
                speech_frames += 1
            total_frames += 1
        
        ratio = speech_frames / total_frames * 100 if total_frames > 0 else 0
        
        print(f"语音帧：{speech_frames}/{total_frames} ({ratio:.1f}%)")
        
        if ratio > 5:
            print("\n[OK] Silero VAD 检测到语音!")
        else:
            print("\n[WARN] Silero VAD 检测到的语音较少")
    
    except Exception as e:
        print(f"VAD 测试失败：{e}")
    
    print("\n" + "=" * 60)
    print("  下一步")
    print("=" * 60)
    print("1. 测试完整流程:")
    print(f"   (使用剪辑后的音频 {clipped_file})")
    print()
    print("2. 运行 ASR 测试:")
    print(f"   python -c \"from chinese_asr import transcribe; print(transcribe('{clipped_file}'))\"")
    print()
    print("3. 运行 VAD 准确性对比:")
    print("   python test_vad_accuracy.py")
    print("=" * 60)

else:
    print("\n[WARN] 未检测到语音段")
    print("可能是:")
    print("  1. 说话声音太小")
    print("  2. 环境太安静")
    print("  3. 能量阈值太高")

sys.stdout.flush()
