# -*- coding: utf-8 -*-
"""
语音系统核心 - 主流程
VAD → ASR → LLM → TTS
"""

import asyncio
import numpy as np
from pathlib import Path
from typing import Optional

from .vad.silero_vad import VADProcessor
from .audio.capture import AsyncAudioCapture


class VoiceSystem:
    """
    实时语音系统
    
    流程:
    麦克风 → VAD 检测 → Whisper ASR → LLM → TTS → 扬声器
    """
    
    def __init__(self, config: Optional[dict] = None):
        self.config = config or {
            'speech_threshold': 0.005,  # 低音量麦克风默认值
            'exit_threshold': 0.001,
            'min_silence_ms': 400,
        }
        
        # 组件
        self.vad: Optional[VADProcessor] = None
        self.audio: Optional[AsyncAudioCapture] = None
        
        # 状态
        self.is_running = False
        self.is_processing = False
        
        # 回调
        self.on_speech_detected = None
        self.on_transcription = None
        self.on_reply = None
    
    async def start(self):
        """启动语音系统"""
        print("=" * 60)
        print("  语音系统启动")
        print("=" * 60)
        
        # 初始化 VAD (低音量优化)
        print("[系统] 初始化 VAD (低音量模式)...")
        self.vad = VADProcessor(
            speech_threshold=self.config.get('speech_threshold', 0.005),
            exit_threshold=self.config.get('exit_threshold', 0.001),
            min_silence_duration_ms=self.config.get('min_silence_ms', 400),
        )
        
        # 设置 VAD 回调
        self.vad.on_speech_ready = self._on_speech_ready
        
        # 初始化音频采集
        print("[系统] 初始化音频采集...")
        self.audio = AsyncAudioCapture()
        
        self.is_running = True
        print("[系统] 语音系统就绪，请说话...\n")
    
    async def stop(self):
        """停止语音系统"""
        self.is_running = False
        
        if self.audio:
            await self.audio.stop()
        
        print("\n[系统] 语音系统已停止")
    
    async def run(self):
        """运行主循环"""
        await self.start()
        
        try:
            async with self.audio:
                while self.is_running:
                    # 读取音频帧
                    audio_frame = await self.audio.read()
                    
                    # VAD 处理
                    speech_segment = self.vad.process_chunk(audio_frame)
                    
                    if speech_segment is not None:
                        # 检测到完整语音段
                        await self._process_speech(speech_segment)
        except KeyboardInterrupt:
            print("\n[系统] 用户中断")
        finally:
            await self.stop()
    
    def _on_speech_ready(self, audio: np.ndarray):
        """VAD 检测到完整语音段"""
        print(f"[VAD] 语音段就绪，时长：{len(audio) / 16000:.2f}s")
        
        if self.on_speech_detected:
            self.on_speech_detected(audio)
    
    async def _process_speech(self, audio: np.ndarray):
        """处理语音段：ASR → LLM → TTS"""
        if self.is_processing:
            print("[系统] 正在处理，跳过")
            return
        
        self.is_processing = True
        
        try:
            # 1. ASR - 语音识别
            print("\n[ASR] 开始识别...")
            text = await self._asr(audio)
            
            if not text:
                print("[ASR] 识别失败")
                return
            
            print(f"[ASR] 识别结果：{text}")
            
            if self.on_transcription:
                self.on_transcription(text)
            
            # 2. LLM - 生成回复
            print("[LLM] 生成回复...")
            reply = await self._llm(text)
            print(f"[LLM] 回复：{reply}")
            
            if self.on_reply:
                self.on_reply(reply)
            
            # 3. TTS - 语音合成
            print("[TTS] 合成语音...")
            await self._tts(reply)
            print("[TTS] 播放完成\n")
            
        except Exception as e:
            print(f"[错误] 处理失败：{e}")
        finally:
            self.is_processing = False
    
    async def _asr(self, audio: np.ndarray) -> str:
        """ASR - 语音识别"""
        # TODO: 集成 Whisper
        import whisper
        
        # 保存临时文件
        temp_path = Path(__file__).parent / "temp_audio.wav"
        audio_int16 = (audio * 32767).astype(np.int16)
        
        import wave
        with wave.open(str(temp_path), 'wb') as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(16000)
            wav.writeframes(audio_int16.tobytes())
        
        # 识别
        model = whisper.load_model("tiny")
        result = model.transcribe(str(temp_path), language="zh")
        
        # 清理
        temp_path.unlink(missing_ok=True)
        
        return result["text"].strip()
    
    async def _llm(self, text: str) -> str:
        """LLM - 生成回复"""
        # TODO: 集成 OpenClaw
        # 简单回复作为占位
        return f"我听到了：{text}。这是一个测试回复。"
    
    async def _tts(self, text: str):
        """TTS - 语音合成"""
        from .tts.qwen3_tts_bridge import Qwen3TTSBridge
        
        try:
            tts = Qwen3TTSBridge()
            audio = tts.synthesize_to_array(text, speaker="Vivian")
            
            if audio is not None:
                # 播放音频
                await self._play_audio(audio)
                print(f"[TTS] 播放完成，时长：{len(audio) / 24000:.2f}s")
            else:
                print("[TTS] 合成失败")
                
        except Exception as e:
            print(f"[TTS] 错误：{e}")
    
    async def _play_audio(self, audio: np.ndarray):
        """播放音频"""
        import pyaudio
        
        p = pyaudio.PyAudio()
        stream = p.open(
            format=pyaudio.paFloat32,
            channels=1,
            rate=24000,
            output=True
        )
        
        stream.write(audio.tobytes())
        stream.stop_stream()
        stream.close()
        p.terminate()


# 主程序
async def main():
    system = VoiceSystem({
        'speech_threshold': 0.3,
        'exit_threshold': 0.1,
    })
    
    await system.run()


if __name__ == "__main__":
    asyncio.run(main())
