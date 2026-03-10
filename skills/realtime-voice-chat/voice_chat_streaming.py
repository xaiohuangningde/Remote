# -*- coding: utf-8 -*-
"""
实时语音对话 - 流式版本 (Airi Web 本地化)

功能:
- VAD 流式检测 (Silero VAD ONNX)
- Whisper 流式 ASR
- LLM 流式回复 (逐句)
- TTS 流式播放 (队列管理)
- 语音打断 (TTS 播放中暂停)

参考：Airi Web (vad-asr-chat-tts)
"""

import os
import sys
import time
import wave
import threading
import numpy as np
import pyaudio
from queue import Queue, Empty
from typing import Optional, List
from dataclasses import dataclass

# 导入已有模块
from vad_streaming import VADStreaming, VADConfig

# 配置
SAMPLE_RATE = 16000
FRAME_SIZE = int(SAMPLE_RATE * 0.02)  # 20ms (512 采样点)
SILENCE_THRESHOLD = 0.3  # 秒 (Airi: 400ms)
MIN_RECORDING_DURATION = 0.5  # 秒

# VAD 配置 (Airi 参数)
vad_config = VADConfig(
    sample_rate=SAMPLE_RATE,
    speech_threshold=0.3,
    exit_threshold=0.1,
    min_silence_duration_ms=int(SILENCE_THRESHOLD * 1000),
)

# 全局状态
class SharedState:
    def __init__(self):
        self.is_speaking = False  # TTS 是否在播放
        self.is_processing = False  # 是否在 processing
        self.is_listening = True  # 是否在监听
        self.audio_buffer: List[float] = []
        self.last_voice_time = 0.0
        self.tts_queue: Queue = Queue()  # TTS 播放队列
        self.vad: Optional[VADStreaming] = None
        self.interrupt_requested = False  # 是否请求打断

state = SharedState()

def print_status(text):
    """打印状态 (无 emoji)"""
    print(f"[系统] {text}")
    sys.stdout.flush()

def save_audio(audio_data: np.ndarray, filename: str):
    """保存音频为 WAV"""
    audio_int16 = (audio_data * 32767).astype(np.int16)
    with wave.open(filename, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(audio_int16.tobytes())

def transcribe_audio(audio_path: str) -> str:
    """Whisper 语音识别 (预加载模型)"""
    try:
        from faster_whisper import WhisperModel
        
        # 预加载模型
        if not hasattr(transcribe_audio, 'model'):
            print_status("加载 Whisper 模型...")
            transcribe_audio.model = WhisperModel("tiny", device="cpu", compute_type="float32")
        
        segments, info = transcribe_audio.model.transcribe(
            audio_path, 
            language="zh",
            vad_filter=True  # 使用 VAD 过滤静音
        )
        text = " ".join([s.text for s in segments])
        return text
    except Exception as e:
        print_status(f"识别失败：{e}")
        return ""

def generate_reply_streaming(user_text: str):
    """
    LLM 流式回复 (逐句生成)
    
    参考 Airi: 使用 <break/> 标记分句
    """
    try:
        # 方案 A: 如果有流式 LLM API
        # for sentence in llm.stream_chat(user_text):
        #     yield sentence
        
        # 方案 B: 简单回复 (临时)
        reply = generate_simple_reply(user_text)
        
        # 模拟流式：按句子分割
        sentences = reply.replace('。', '。<break/>').replace('!', '!<break/>').replace('?', '?<break/>').split('<break/>')
        for sentence in sentences:
            if sentence.strip():
                yield sentence.strip() + '.'
                
    except Exception as e:
        print_status(f"LLM 失败：{e}")
        yield "抱歉，我无法回答。"

def generate_simple_reply(user_text: str) -> str:
    """简单回复 (降级方案)"""
    user_text = user_text.lower()
    
    if "你好" in user_text or "hello" in user_text:
        return "你好！我是小黄，很高兴和你聊天！"
    elif "名字" in user_text or "是谁" in user_text:
        return "我叫小黄，是你的 AI 助手。"
    elif "时间" in user_text or "几点" in user_text:
        current_time = time.strftime("%H 点%M 分")
        return f"现在是{current_time}。"
    elif "天气" in user_text:
        return "今天天气不错，适合出去走走哦！"
    elif "谢谢" in user_text:
        return "不客气！有什么我可以帮你的吗？"
    elif "再见" in user_text or "拜拜" in user_text:
        return "再见！祝你有美好的一天！"
    else:
        return "嗯，我明白了。这是一个很有趣的话题！"

def synthesize_tts(text: str) -> Optional[np.ndarray]:
    """
    TTS 语音合成
    
    返回：音频数据 (float32, -1 to 1)
    """
    try:
        # 方案 A: 系统 TTS (临时)
        # 保存文本，调用 PowerShell
        import subprocess
        import tempfile
        
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            temp_file = f.name
        
        # 使用 PowerShell 合成并保存
        # (这里简化，实际需要调用 TTS API 或库)
        
        # 方案 B: 使用已有 TTS 技能
        # from tts_service import synthesize
        # audio = synthesize(text)
        
        # 临时：生成静音 (占位)
        audio = np.zeros(int(len(text) * 1000), dtype=np.float32)
        return audio
        
    except Exception as e:
        print_status(f"TTS 失败：{e}")
        return None

def play_audio_async(audio: np.ndarray, index: int):
    """
    异步播放音频 (支持打断)
    
    参考 Airi: 音频队列管理
    """
    try:
        p = pyaudio.PyAudio()
        stream = p.open(
            format=pyaudio.paFloat32,
            channels=1,
            rate=SAMPLE_RATE,
            output=True,
            frames_per_buffer=1024
        )
        
        state.is_speaking = True
        chunk_size = 1024
        
        for i in range(0, len(audio), chunk_size):
            # 检查是否请求打断
            if state.interrupt_requested:
                print_status("[打断] TTS 已暂停")
                state.interrupt_requested = False
                break
            
            chunk = audio[i:i+chunk_size]
            stream.write(chunk.astype(np.float32).tobytes())
        
        stream.stop_stream()
        stream.close()
        p.terminate()
        state.is_speaking = False
        
        print_status(f"[TTS] 播放完成 (索引:{index})")
        
    except Exception as e:
        print_status(f"播放失败：{e}")
        state.is_speaking = False

def tts_player_thread():
    """
    TTS 播放线程 (队列管理)
    
    参考 Airi: 按顺序播放，支持预加载
    """
    print_status("[TTS] 播放器已启动")
    audio_index = 0
    
    while state.is_listening:
        try:
            # 从队列获取音频
            audio = state.tts_queue.get(timeout=1.0)
            
            if audio is not None and len(audio) > 0:
                print_status(f"[TTS] 开始播放 (索引:{audio_index})")
                play_audio_async(audio, audio_index)
            
            audio_index += 1
            
        except Empty:
            # 队列为空，继续等待
            pass
        except Exception as e:
            print_status(f"TTS 播放错误：{e}")

def on_speech_start():
    """VAD 检测到语音开始"""
    print_status("[VAD] 语音开始")
    
    # 语音打断逻辑 (参考 Airi)
    if state.is_speaking:
        print_status("[打断] 检测到用户说话，暂停 TTS")
        state.interrupt_requested = True

def on_speech_end(audio_buffer: List[float]):
    """VAD 检测到语音结束"""
    print_status(f"[VAD] 语音结束 (录音：{len(audio_buffer)/SAMPLE_RATE:.1f}s)")
    
    if len(audio_buffer) < SAMPLE_RATE * MIN_RECORDING_DURATION:
        print_status(f"[跳过] 录音太短")
        return
    
    # 处理语音
    process_speech(audio_buffer)

def process_speech(audio_buffer: List[float]):
    """处理完整语音 (ASR → LLM → TTS)"""
    if state.is_processing:
        print_status("[跳过] 正在处理中")
        return
    
    state.is_processing = True
    
    try:
        # 1. 保存音频
        audio_np = np.array(audio_buffer, dtype=np.float32)
        temp_wav = "temp_voice.wav"
        save_audio(audio_np, temp_wav)
        print_status(f"[ASR] 录音完成 ({len(audio_buffer)/SAMPLE_RATE:.1f}s)")
        
        # 2. ASR 识别
        print_status("[ASR] 识别中...")
        text = transcribe_audio(temp_wav)
        
        if not text.strip():
            print_status("[ASR] 未识别到内容")
            return
        
        print_status(f"[ASR] 识别：{text}")
        
        # 3. LLM 流式回复
        print_status("[LLM] 生成回复...")
        for sentence in generate_reply_streaming(text):
            print_status(f"[LLM] 句子：{sentence}")
            
            # 4. TTS 合成并加入队列
            audio = synthesize_tts(sentence)
            if audio is not None:
                state.tts_queue.put(audio)
        
        print_status("[完成] 回复已加入队列")
        
    except Exception as e:
        print_status(f"处理失败：{e}")
    finally:
        state.is_processing = False

def vad_detection_thread():
    """VAD 检测线程 (实时监听)"""
    print_status("[VAD] 初始化...")
    
    # 初始化 VAD
    state.vad = VADStreaming(vad_config)
    print_status("[VAD] 就绪")
    
    # 初始化麦克风
    p = pyaudio.PyAudio()
    stream = p.open(
        format=pyaudio.paInt16,
        channels=1,
        rate=SAMPLE_RATE,
        input=True,
        frames_per_buffer=FRAME_SIZE
    )
    
    print_status("[VAD] 开始监听...")
    
    is_recording = False
    audio_buffer: List[float] = []
    post_speech_samples = 0
    
    try:
        while state.is_listening:
            # 读取音频
            chunk = stream.read(FRAME_SIZE, exception_on_overflow=False)
            audio_data = np.frombuffer(chunk, dtype=np.int16).astype(np.float32) / 32768.0
            
            # VAD 检测
            is_speaking = state.vad.detect_speech(audio_data)
            
            # 状态机 (参考 Airi)
            if is_speaking and not is_recording:
                # 语音开始
                is_recording = True
                post_speech_samples = 0
                on_speech_start()
            
            if is_recording:
                # 累积音频
                audio_buffer.extend(audio_data.tolist())
                
                if is_speaking:
                    post_speech_samples = 0
                else:
                    post_speech_samples += len(audio_data)
                    
                    # 检查是否语音结束
                    min_silence_samples = int(SILENCE_THRESHOLD * SAMPLE_RATE)
                    if post_speech_samples >= min_silence_samples:
                        # 语音结束
                        on_speech_end(audio_buffer)
                        is_recording = False
                        audio_buffer = []
                        post_speech_samples = 0
            
    except KeyboardInterrupt:
        print_status("\n[退出] 用户中断")
    finally:
        stream.stop_stream()
        stream.close()
        p.terminate()
        print_status("[VAD] 已停止")

def main():
    """主函数"""
    print_status("=" * 60)
    print_status("  实时语音对话 - 流式版本 (Airi Web 本地化)")
    print_status("=" * 60)
    print_status("功能：VAD 流式 + Whisper + LLM 流式 + TTS 队列 + 语音打断")
    print_status("按 Ctrl+C 退出")
    print_status()
    
    # 启动 TTS 播放线程
    tts_thread = threading.Thread(target=tts_player_thread, daemon=True)
    tts_thread.start()
    
    # 启动 VAD 检测线程
    vad_thread = threading.Thread(target=vad_detection_thread, daemon=True)
    vad_thread.start()
    
    # 等待退出
    try:
        while state.is_listening:
            time.sleep(1)
    except KeyboardInterrupt:
        print_status("\n退出中...")
        state.is_listening = False
        time.sleep(1)
    
    print_status("再见！")

if __name__ == "__main__":
    main()
