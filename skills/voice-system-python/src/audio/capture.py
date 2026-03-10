# -*- coding: utf-8 -*-
"""
音频采集 - PyAudio + asyncio
基于已验证的 PyAudio + asyncio 集成模式
"""

import asyncio
import numpy as np
import pyaudio
from typing import Callable, Optional
from pathlib import Path


class AudioCapture:
    """
    音频采集器 - PyAudio 流式采集
    
    参数:
        sample_rate: 采样率 (16000 Hz)
        channels: 通道数 (1 单声道)
        frame_size: 帧大小 (512 采样点 = 32ms @ 16kHz)
    """
    
    def __init__(
        self,
        sample_rate: int = 16000,
        channels: int = 1,
        frame_size: int = 512,
    ):
        self.sample_rate = sample_rate
        self.channels = channels
        self.frame_size = frame_size
        
        self.pyaudio = None
        self.stream = None
        self.is_running = False
        
        # 回调
        self.on_audio: Optional[Callable[[np.ndarray], None]] = None
        
        # 统计
        self.frames_captured = 0
        self.last_frame_time = 0
    
    def start(self):
        """启动音频采集"""
        self.pyaudio = pyaudio.PyAudio()
        
        def callback(in_data, frame_count, time_info, status):
            """PyAudio 回调 - 在单独线程运行"""
            if self.is_running and self.on_audio:
                try:
                    # 转换为 numpy array
                    audio = np.frombuffer(in_data, dtype=np.float32)
                    
                    # 直接调用 (不依赖 asyncio 事件循环)
                    self.on_audio(audio)
                    
                    self.frames_captured += 1
                except Exception as e:
                    print(f"[Audio] 回调错误：{e}")
            
            return (None, pyaudio.paContinue)
        
        self.stream = self.pyaudio.open(
            format=pyaudio.paFloat32,
            channels=self.channels,
            rate=self.sample_rate,
            input=True,
            frames_per_buffer=self.frame_size,
            stream_callback=callback
        )
        
        self.is_running = True
        self.stream.start_stream()
        
        print(f"[Audio] 采集启动：{self.sample_rate}Hz, {self.frame_size} samples/frame")
    
    def stop(self):
        """停止音频采集"""
        self.is_running = False
        
        if self.stream:
            self.stream.stop_stream()
            self.stream.close()
            self.stream = None
        
        if self.pyaudio:
            self.pyaudio.terminate()
            self.pyaudio = None
        
        print(f"[Audio] 采集停止，共捕获 {self.frames_captured} 帧")
    
    def __enter__(self):
        self.start()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.stop()


class AsyncAudioCapture:
    """
    异步音频采集器 - 集成到 asyncio 事件循环
    
    使用方式:
        async with AsyncAudioCapture() as capture:
            await asyncio.sleep(30)  # 采集 30 秒
    """
    
    def __init__(
        self,
        sample_rate: int = 16000,
        channels: int = 1,
        frame_size: int = 512,
    ):
        self.capture = AudioCapture(sample_rate, channels, frame_size)
        self.queue = asyncio.Queue()
        self.is_running = False
    
    async def start(self):
        """启动异步采集"""
        self.is_running = True
        
        def on_audio(audio: np.ndarray):
            """音频回调"""
            if self.is_running:
                # 放入队列
                try:
                    self.queue.put_nowait(audio)
                except asyncio.QueueFull:
                    pass  # 队列满，丢弃
        
        self.capture.on_audio = on_audio
        self.capture.start()
        
        print("[AsyncAudio] 异步采集启动")
    
    async def stop(self):
        """停止异步采集"""
        self.is_running = False
        self.capture.stop()
        
        print("[AsyncAudio] 异步采集停止")
    
    async def read(self) -> np.ndarray:
        """读取一帧音频"""
        return await self.queue.get()
    
    async def __aenter__(self):
        await self.start()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.stop()


# 测试代码
async def test_async_capture():
    """测试异步采集"""
    print("测试异步音频采集...")
    
    async with AsyncAudioCapture() as capture:
        start_time = asyncio.get_event_loop().time()
        
        for i in range(100):
            audio = await capture.read()
            elapsed = asyncio.get_event_loop().time() - start_time
            rate = (i + 1) / elapsed if elapsed > 0 else 0
            
            print(f"帧 #{i+1}: shape={audio.shape}, 实时率={rate:.1f} frames/s")
            
            if i >= 100:
                break
    
    print("测试完成")


if __name__ == "__main__":
    asyncio.run(test_async_capture())
