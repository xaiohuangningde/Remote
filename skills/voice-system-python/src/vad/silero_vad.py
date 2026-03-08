# -*- coding: utf-8 -*-
"""
Silero VAD - Python 实现
基于 Airi 官方逻辑，使用 ONNX 推理
"""

import numpy as np
from typing import Optional, Callable
from pathlib import Path

# Silero VAD ONNX 模型路径
MODEL_PATH = Path(r"C:\Users\12132\.openclaw\workspace\models\silero_vad.onnx")


class SileroVAD:
    """Silero VAD 推理引擎"""
    
    def __init__(self, sample_rate: int = 16000):
        self.sample_rate = sample_rate
        self.session = None
        self.state = None
        self._load_model()
    
    def _load_model(self):
        """加载 ONNX 模型"""
        try:
            import onnxruntime as ort
            
            model_path = str(MODEL_PATH)
            if not Path(model_path).exists():
                raise FileNotFoundError(f"VAD 模型不存在：{model_path}")
            
            self.session = ort.InferenceSession(model_path)
            
            # 初始化状态 (shape: [2, 1, 128])
            self.state = np.zeros((2, 1, 128), dtype=np.float32)
            
            print(f"[VAD] 模型加载成功：{model_path}")
        except Exception as e:
            print(f"[VAD] 模型加载失败：{e}")
            raise
    
    def process(self, audio: np.ndarray) -> float:
        """
        处理音频块，返回语音概率
        
        Args:
            audio: 音频数据 (shape: [1, 512], dtype: float32)
        
        Returns:
            语音概率 (0-1 之间)
        """
        if self.session is None:
            raise RuntimeError("VAD 模型未加载")
        
        # 准备输入
        ort_inputs = {
            'input': audio.astype(np.float32),
            'sr': np.array(self.sample_rate, dtype=np.int64),
            'state': self.state,
        }
        
        # 推理
        outputs = self.session.run(None, ort_inputs)
        speech_prob = outputs[0][0, 0]  # shape: [1, 1]
        self.state = outputs[1]  # 更新状态
        
        return speech_prob
    
    def reset(self):
        """重置状态"""
        self.state = np.zeros((2, 1, 128), dtype=np.float32)


class VADProcessor:
    """
    VAD 处理器 - 管理语音检测状态机
    
    参考 Airi 官方实现：
    - speechThreshold: 0.3 (开始录音)
    - exitThreshold: 0.1 (结束录音)
    - minSilenceDurationMs: 400 (最小静音时长)
    """
    
    def __init__(
        self,
        sample_rate: int = 16000,
        speech_threshold: float = 0.005,  # 降低阈值适应低音量麦克风
        exit_threshold: float = 0.001,    # 降低退出阈值
        min_silence_duration_ms: int = 400,
        speech_pad_ms: int = 80,
        min_speech_duration_ms: int = 250,
    ):
        self.vad = SileroVAD(sample_rate)
        self.sample_rate = sample_rate
        self.speech_threshold = speech_threshold
        self.exit_threshold = exit_threshold
        self.min_silence_samples = int(min_silence_duration_ms * sample_rate / 1000)
        self.speech_pad_samples = int(speech_pad_ms * sample_rate / 1000)
        self.min_speech_samples = int(min_speech_duration_ms * sample_rate / 1000)
        
        # 状态
        self.is_recording = False
        self.post_speech_samples = 0
        self.speech_start_sample = 0
        self.current_sample = 0
        
        # 回调
        self.on_speech_start: Optional[Callable] = None
        self.on_speech_end: Optional[Callable] = None
        self.on_speech_ready: Optional[Callable] = None
        
        # 音频缓冲
        self.audio_buffer = []
        self.pre_speech_buffer = []
    
    def process_chunk(self, audio: np.ndarray) -> Optional[np.ndarray]:
        """
        处理音频块
        
        Args:
            audio: 音频数据 (shape: [512] or [1, 512])
        
        Returns:
            如果语音结束，返回完整语音段；否则返回 None
        """
        # 确保 shape 正确
        if audio.ndim == 1:
            audio = audio.reshape(1, -1)
        
        # 处理 VAD
        speech_prob = self.vad.process(audio)
        self.current_sample += len(audio[0])
        
        # 状态机
        if speech_prob > self.speech_threshold and not self.is_recording:
            # 检测到语音开始
            self._on_speech_start()
        
        if self.is_recording:
            # 录音中
            self.audio_buffer.append(audio[0])
            
            if speech_prob < self.exit_threshold:
                # 可能语音结束
                self.post_speech_samples += len(audio[0])
                
                if self.post_speech_samples >= self.min_silence_samples:
                    # 确认语音结束
                    return self._on_speech_end()
            else:
                # 仍在说话
                self.post_speech_samples = 0
        else:
            # 录音前，保存预语音缓冲
            self.pre_speech_buffer.append(audio[0])
            if len(self.pre_speech_buffer) > 10:  # 保留约 5 秒
                self.pre_speech_buffer.pop(0)
        
        return None
    
    def _on_speech_start(self):
        """语音开始"""
        self.is_recording = True
        self.audio_buffer = self.pre_speech_buffer.copy()
        self.pre_speech_buffer = []
        self.post_speech_samples = 0
        self.speech_start_sample = self.current_sample
        
        if self.on_speech_start:
            self.on_speech_start()
        
        print(f"[VAD] 检测到语音开始 (sample: {self.speech_start_sample})")
    
    def _on_speech_end(self) -> np.ndarray:
        """语音结束，返回完整音频"""
        self.is_recording = False
        
        # 合并音频
        audio_data = np.concatenate(self.audio_buffer)
        
        # 验证最小时长
        if len(audio_data) < self.min_speech_samples:
            print(f"[VAD] 语音太短 ({len(audio_data)} < {self.min_speech_samples})，忽略")
            self.audio_buffer = []
            return None
        
        # 添加语音填充
        padding = np.zeros(self.speech_pad_samples * 2, dtype=np.float32)
        audio_with_pad = np.concatenate([padding[:self.speech_pad_samples], audio_data, padding[self.speech_pad_samples:]])
        
        duration = len(audio_data) / self.sample_rate
        print(f"[VAD] 检测到语音结束，时长：{duration:.2f}s")
        
        if self.on_speech_end:
            self.on_speech_end()
        
        if self.on_speech_ready:
            self.on_speech_ready(audio_with_pad)
        
        # 重置缓冲
        self.audio_buffer = []
        self.pre_speech_buffer = []
        
        return audio_with_pad
    
    def reset(self):
        """重置所有状态"""
        self.vad.reset()
        self.is_recording = False
        self.audio_buffer = []
        self.pre_speech_buffer = []
        self.post_speech_samples = 0


# 测试代码
if __name__ == "__main__":
    print("测试 Silero VAD...")
    
    vad = VADProcessor()
    
    # 模拟音频输入
    test_audio = np.random.randn(512).astype(np.float32) * 0.1
    
    for i in range(100):
        result = vad.process_chunk(test_audio)
        if result is not None:
            print(f"检测到语音段 #{i}: shape={result.shape}")
    
    print("测试完成")
