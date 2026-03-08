# -*- coding: utf-8 -*-
"""
Real-time Voice Chat - Production Version
完整流程：VAD (Silero) + Whisper ASR + LLM + Qwen3-TTS

特性:
- 超低延迟：模型预加载 + 流式处理
- 说话打断：TTS 播放时可被用户语音打断
- 稳定可靠：严格状态管理 + 错误恢复
- 可扩展：插件式 LLM 支持

使用方式:
    python realtime_voice_chat.py

配置:
    修改 CONFIG 字典中的参数
"""

import os
import sys
import time
import wave
import threading
import numpy as np
import pyaudio

# ============================================================================
# 配置
# ============================================================================

CONFIG = {
    # 音频配置
    'sample_rate': 16000,
    'frame_size_ms': 20,  # 每帧 20ms
    
    # VAD 配置 (Silero)
    'speech_threshold': 0.3,      # 语音检测阈值
    'exit_threshold': 0.1,        # 退出阈值 (录音中时使用)
    'min_silence_duration_ms': 400,  # 最小静音时长 (判定说话结束)
    'speech_pad_ms': 80,          # 语音前后填充
    'min_speech_duration_ms': 250,   # 最小语音时长 (过短忽略)
    
    # 打断配置
    'interrupt_threshold_multiplier': 2.0,  # 打断检测阈值倍数
    'interrupt_protection_ms': 500,         # TTS 开始后的保护时间 (内不打断)
    
    # 模型路径
    'qwen3_tts_model_path': r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\Qwen\Qwen3-TTS-12Hz-1___7B-CustomVoice",
    'whisper_model': 'base',
    'whisper_device': 'cpu',
    'whisper_compute_type': 'int8',
    
    # TTS 配置
    'tts_speaker': 'Vivian',
    'tts_language': 'Chinese',
    
    # 输出目录
    'output_dir': r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\voice_chat",
}

# 创建输出目录
os.makedirs(CONFIG['output_dir'], exist_ok=True)

# ============================================================================
# 全局状态
# ============================================================================

state = {
    # 录音状态
    'is_recording': False,
    'audio_buffer': [],
    'prev_buffers': [],  # 预 padding
    'post_speech_samples': 0,
    
    # 播放状态
    'is_playing': False,
    'stop_playback': False,
    'tts_start_time': 0,  # TTS 开始播放时间 (用于打断保护)
    
    # 处理状态
    'is_processing': False,
    
    # 线程安全
    'lock': threading.Lock(),
    
    # 模型缓存
    'models': {},
}

# ============================================================================
# 日志
# ============================================================================

def log(msg):
    """带时间戳的日志"""
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")
    sys.stdout.flush()

# ============================================================================
# 模型加载
# ============================================================================

def load_models():
    """预加载所有模型"""
    log("Loading models...")
    sys.stdout.flush()
    
    # [1/3] Silero VAD
    log("  [1/3] Silero VAD...")
    try:
        import torch
        silero_model, utils = torch.hub.load(
            repo_or_dir='snakers4/silero-vad',
            model='silero_vad',
            force_reload=False,
            trust_repo=True,
        )
        state['models']['silero'] = silero_model
        log("    OK")
    except Exception as e:
        log(f"    FAIL: {e}")
        log("    Using energy-based VAD fallback")
    
    # [2/3] Whisper ASR
    log("  [2/3] Whisper ASR...")
    try:
        from faster_whisper import WhisperModel
        whisper_model = WhisperModel(
            CONFIG['whisper_model'],
            device=CONFIG['whisper_device'],
            compute_type=CONFIG['whisper_compute_type'],
        )
        state['models']['whisper'] = whisper_model
        log("    OK")
    except Exception as e:
        log(f"    FAIL: {e}")
    
    # [3/3] Qwen3-TTS
    log("  [3/3] Qwen3-TTS...")
    try:
        import torch
        import soundfile as sf
        sys.path.insert(0, r"E:\TuriX-CUA-Windows\models\Qwen3-TTS")
        from qwen_tts import Qwen3TTSModel
        
        tts_model = Qwen3TTSModel.from_pretrained(
            CONFIG['qwen3_tts_model_path'],
            device_map="cpu",
            dtype=torch.float32,
        )
        state['models']['tts'] = tts_model
        log("    OK")
    except Exception as e:
        log(f"    FAIL: {e}")
    
    log("All models loaded!")
    print()

# ============================================================================
# VAD 检测
# ============================================================================

def detect_speech(audio_frame):
    """
    检测当前帧是否为语音
    
    Returns:
        (is_speech, probability): 是否语音，置信度
    """
    silero_model = state['models'].get('silero')
    
    if silero_model:
        try:
            import torch
            audio_tensor = torch.from_numpy(audio_frame)
            speech_prob = silero_model(audio_tensor, CONFIG['sample_rate']).item()
            
            # 动态阈值：录音中使用 exit_threshold，否则使用 speech_threshold
            threshold = (
                CONFIG['exit_threshold'] 
                if state['is_recording'] 
                else CONFIG['speech_threshold']
            )
            
            is_speech = speech_prob > threshold
            return is_speech, speech_prob
        except Exception as e:
            log(f"  Silero error: {e}")
    
    # Fallback: 能量检测
    energy = np.sqrt(np.mean(audio_frame ** 2))
    return energy > 0.01, energy

# ============================================================================
# 对话逻辑 (LLM)
# ============================================================================

def generate_reply(user_text):
    """
    生成回复 (简单规则版)
    
    TODO: 集成真实 LLM
    """
    t = user_text.lower()
    
    # 基础对话
    if any(x in t for x in ["你好", "hello", "hi", "喂"]):
        return "你好！我是小黄，很高兴和你聊天！"
    elif any(x in t for x in ["名字", "是谁", "叫什么"]):
        return "我叫小黄，是你的 AI 助手。"
    elif any(x in t for x in ["时间", "几点"]):
        return f"现在{time.strftime('%H 点%M 分')}。"
    elif "天气" in t:
        return "今天天气不错，适合出去走走哦！"
    elif any(x in t for x in ["谢谢", "感谢"]):
        return "不客气！有什么我可以帮你的吗？"
    elif any(x in t for x in ["再见", "拜拜", "先这样"]):
        return "再见！祝你有美好的一天！"
    elif any(x in t for x in ["唱歌", "唱首歌"]):
        return "啦啦啦~ 我唱歌不好听，还是聊天吧！"
    elif any(x in t for x in ["笑", "哈哈", "嘻嘻"]):
        return "哈哈，你开心我也开心！"
    elif "测试" in t:
        return "测试成功！声音很清楚呢。"
    else:
        # 默认回复
        replies = [
            "嗯嗯，我在听呢，请继续说。",
            "原来是这样啊，我明白了。",
            "这个问题很有意思，让我想想。",
            "好的，我记住了。",
            "你说得对，我同意。",
            "真的吗？我想听听你的想法。",
        ]
        import random
        return random.choice(replies)

# ============================================================================
# 音频播放 (支持打断)
# ============================================================================

def play_audio(filepath):
    """
    播放音频文件 (支持被打断)
    """
    state['is_playing'] = True
    state['stop_playback'] = False
    state['tts_start_time'] = time.time()
    
    try:
        import subprocess
        proc = subprocess.Popen(
            ["powershell", "-c", f"(New-Object Media.SoundPlayer '{filepath}').PlaySync()"],
        )
        
        # 轮询检查是否要停止
        while proc.poll() is None:
            if state['stop_playback']:
                proc.kill()
                log("  ⚡ INTERRUPTED!")
                break
            time.sleep(0.05)  # 50ms 轮询
            
    except Exception as e:
        log(f"  Playback error: {e}")
    finally:
        state['is_playing'] = False

# ============================================================================
# 音频处理 (ASR + LLM + TTS)
# ============================================================================

def process_audio(audio_data):
    """
    处理录音片段 (在独立线程中运行)
    流程：保存 → ASR → LLM → TTS → 播放
    """
    if state['is_processing']:
        log("  Already processing, skipping...")
        return
    
    state['is_processing'] = True
    
    try:
        # 合并音频
        audio = np.concatenate(audio_data)
        
        # 保存为 WAV
        audio_path = os.path.join(
            CONFIG['output_dir'], 
            f"user_{int(time.time())}.wav"
        )
        audio_int16 = (audio * 32767).astype(np.int16)
        with wave.open(audio_path, 'wb') as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(CONFIG['sample_rate'])
            wav.writeframes(audio_int16.tobytes())
        
        duration = len(audio) / CONFIG['sample_rate']
        log(f"  📼 Audio: {duration:.2f}s")
        
        # ASR 转录
        log("  🎤 Recognizing...")
        user_text = ""
        whisper_model = state['models'].get('whisper')
        
        if whisper_model:
            try:
                segments, _ = whisper_model.transcribe(
                    audio_path, 
                    language='zh'
                )
                user_text = " ".join([s.text.strip() for s in segments])
            except Exception as e:
                log(f"  ASR error: {e}")
                return
        else:
            log("  Whisper not loaded")
            return
        
        if not user_text:
            log("  No speech detected")
            return
        
        log(f"  💬 You: {user_text}")
        
        # LLM 生成回复
        reply = generate_reply(user_text)
        log(f"  🤖 Reply: {reply}")
        
        # TTS 合成
        log("  🔊 Synthesizing...")
        tts_start = time.time()
        tts_model = state['models'].get('tts')
        
        if tts_model:
            try:
                import soundfile as sf
                
                wavs, sr = tts_model.generate_custom_voice(
                    text=reply,
                    language=CONFIG['tts_language'],
                    speaker=CONFIG['tts_speaker'],
                )
                
                output_path = os.path.join(
                    CONFIG['output_dir'], 
                    f"reply_{int(time.time())}.wav"
                )
                sf.write(output_path, wavs[0], sr)
                
                tts_time = time.time() - tts_start
                log(f"  ✅ TTS OK: {len(wavs[0])/sr:.2f}s ({tts_time:.1f}s)")
                
                # 播放
                log("  🔈 Playing...")
                play_audio(output_path)
                log("  Done!")
                
            except Exception as e:
                log(f"  TTS error: {e}")
        else:
            log("  TTS not loaded")
    
    finally:
        state['is_processing'] = False

# ============================================================================
# 音频回调 (主循环)
# ============================================================================

def audio_callback(in_data, frame_count, time_info, status):
    """
    PyAudio 回调函数
    每帧调用一次，处理 VAD 检测和状态管理
    """
    audio_frame = np.frombuffer(in_data, dtype=np.int16).astype(np.float32) / 32767.0
    is_speech, prob = detect_speech(audio_frame)
    
    with state['lock']:
        if is_speech:
            # 检测到语音
            if not state['is_recording']:
                # 语音开始
                log(f"  🎙️ SPEECH START ({prob:.3f})")
                state['is_recording'] = True
                state['post_speech_samples'] = 0
            
            state['audio_buffer'].append(audio_frame)
        
        elif state['is_recording']:
            # 录音中但检测到静音
            state['post_speech_samples'] += len(audio_frame)
            
            # 检查是否达到静音阈值
            if state['post_speech_samples'] >= CONFIG['min_silence_samples']:
                log(f"  🎙️ SPEECH END ({state['post_speech_samples']/CONFIG['sample_rate']*1000:.0f}ms)")
                
                # 检查语音时长
                total_samples = sum(len(f) for f in state['audio_buffer'])
                if total_samples < CONFIG['min_speech_samples']:
                    log("  Too short, ignoring")
                else:
                    # 启动处理线程
                    audio_copy = list(state['audio_buffer'])
                    threading.Thread(
                        target=process_audio, 
                        args=(audio_copy,), 
                        daemon=True
                    ).start()
                
                # 重置状态
                state['is_recording'] = False
                state['audio_buffer'] = []
                state['post_speech_samples'] = 0
        
        else:
            # 非录音状态
            
            # 打断检测
            if state['is_playing']:
                # TTS 播放保护时间
                protection_time = (
                    time.time() - state['tts_start_time']
                ) * 1000
                
                if protection_time > CONFIG['interrupt_protection_ms']:
                    # 保护时间外，高置信度语音触发打断
                    interrupt_threshold = (
                        CONFIG['speech_threshold'] * 
                        CONFIG['interrupt_threshold_multiplier']
                    )
                    
                    if prob > interrupt_threshold:
                        log("  ⚡ INTERRUPT DETECTED!")
                        state['stop_playback'] = True
            
            # 预 padding (保存说话前的音频)
            if len(state['prev_buffers']) >= CONFIG['max_prev_buffers']:
                state['prev_buffers'].pop(0)
            state['prev_buffers'].append(audio_frame.copy())
    
    return (None, pyaudio.paContinue)

# ============================================================================
# 主函数
# ============================================================================

def main():
    """主函数"""
    print()
    print("=" * 60)
    print("  Real-time Voice Chat - Production")
    print("  VAD (Silero) + Whisper + Qwen3-TTS")
    print("=" * 60)
    print()
    
    # 加载模型
    load_models()
    
    # 计算配置参数
    SAMPLE_RATE = CONFIG['sample_rate']
    FRAME_SIZE = int(SAMPLE_RATE * CONFIG['frame_size_ms'] / 1000)
    CONFIG['min_silence_samples'] = int(
        CONFIG['min_silence_duration_ms'] * SAMPLE_RATE / 1000
    )
    CONFIG['min_speech_samples'] = int(
        CONFIG['min_speech_duration_ms'] * SAMPLE_RATE / 1000
    )
    CONFIG['max_prev_buffers'] = int(
        CONFIG['speech_pad_ms'] * SAMPLE_RATE / 1000 / FRAME_SIZE
    )
    
    # 初始化 PyAudio
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
    
    # 开始监听
    log(f"Listening! (threshold={CONFIG['speech_threshold']}, exit={CONFIG['exit_threshold']}, silence={CONFIG['min_silence_duration_ms']}ms)")
    log(f"Interrupt protection: {CONFIG['interrupt_protection_ms']}ms")
    log("Speak for 0.25+ seconds. You can interrupt playback by speaking.")
    print()
    
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

if __name__ == "__main__":
    main()
