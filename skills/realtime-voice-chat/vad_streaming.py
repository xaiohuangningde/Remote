"""
VAD Streaming Module - Silero VAD ONNX 流式语音活动检测

独立模块，不依赖其他模块。
支持流式音频输入 (512 采样分块)，状态保持，事件回调。
"""

import logging
import numpy as np
from typing import Callable, Literal, Dict, Any, Optional
from dataclasses import dataclass, field
from pathlib import Path
import asyncio

try:
    import onnxruntime as ort
except ImportError:
    ort = None

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class VADConfig:
    """VAD 配置参数 (参考 Airi Web)"""
    sample_rate: int = 16000
    speech_threshold: float = 0.3      # 语音开始阈值
    exit_threshold: float = 0.1        # 语音结束阈值 (录音状态下使用)
    min_silence_duration_ms: int = 400
    speech_pad_ms: int = 80
    min_speech_duration_ms: int = 250
    max_buffer_duration: int = 30
    new_buffer_size: int = 512
    model_path: str = "skills/vad/models/silero_vad.onnx"


@dataclass
class VADState:
    """VAD 当前状态"""
    is_speaking: bool = False
    speech_prob: float = 0.0
    buffer_samples: int = 0
    post_speech_samples: int = 0
    total_samples: int = 0


class VADStreaming:
    """
    流式 VAD 检测器
    
    使用 Silero VAD ONNX 模型进行实时语音活动检测。
    支持 512 采样分块输入，保持 RNN 状态连续性。
    """
    
    def __init__(self, config: VADConfig = None):
        """
        初始化 VAD 流式检测器
        
        Args:
            config: VAD 配置，使用默认配置如果为 None
        """
        if ort is None:
            raise ImportError("onnxruntime 未安装，请运行：pip install onnxruntime")
        
        self.config = config or VADConfig()
        self._session: Optional[ort.InferenceSession] = None
        self._state: np.ndarray = np.zeros((2, 1, 128), dtype=np.float32)
        self._sr: np.ndarray = np.array([self.config.sample_rate], dtype=np.int64)
        
        # 音频缓冲区
        max_samples = self.config.max_buffer_duration * self.config.sample_rate
        self._buffer = np.zeros(max_samples, dtype=np.float32)
        self._buffer_pointer = 0
        
        # 状态跟踪
        self._is_recording = False
        self._post_speech_samples = 0
        self._prev_buffers: list[np.ndarray] = []
        
        # 事件回调
        self._event_callbacks: Dict[str, list[Callable]] = {
            'speech-start': [],
            'speech-end': [],
            'speech-ready': [],
        }
        
        # 推理锁，确保顺序执行
        self._inference_lock = asyncio.Lock()
        
        # 当前状态
        self._vad_state = VADState()
        
        logger.info(f"VADStreaming 初始化完成，采样率：{self.config.sample_rate}Hz")
    
    def _get_model_path(self) -> Path:
        """获取模型路径，支持多种查找方式"""
        # 尝试配置的路径
        model_path = Path(self.config.model_path)
        
        # 如果是绝对路径且存在，直接返回
        if model_path.is_absolute() and model_path.exists():
            return model_path
        
        # 尝试相对于当前工作目录
        if model_path.exists():
            return model_path
        
        # 尝试相对于脚本所在目录
        script_dir = Path(__file__).parent
        relative_path = script_dir / ".." / "vad" / "models" / "silero_vad.onnx"
        if relative_path.exists():
            return relative_path.resolve()
        
        # 尝试常见路径
        common_paths = [
            Path("skills/vad/models/silero_vad.onnx"),
            Path("models/silero_vad.onnx"),
            Path(__file__).parent / "models" / "silero_vad.onnx",
        ]
        
        for path in common_paths:
            if path.exists():
                return path.resolve()
        
        raise FileNotFoundError(
            f"未找到 VAD 模型文件。请确保 silero_vad.onnx 存在于以下位置之一:\n"
            f"- {self.config.model_path}\n"
            f"- skills/vad/models/silero_vad.onnx\n"
            f"- 或配置 model_path 参数"
        )
    
    async def initialize(self) -> None:
        """
        初始化 ONNX 推理会话
        
        Raises:
            FileNotFoundError: 模型文件不存在
            ImportError: onnxruntime 未安装
        """
        if self._session is not None:
            logger.warning("VAD 已经初始化")
            return
        
        model_path = self._get_model_path()
        logger.info(f"加载 VAD 模型：{model_path}")
        
        try:
            # 创建推理会话
            session_options = ort.SessionOptions()
            session_options.intra_op_num_threads = 1
            session_options.inter_op_num_threads = 1
            
            self._session = ort.InferenceSession(
                str(model_path),
                sess_options=session_options,
                providers=['CPUExecutionProvider']
            )
            
            # 验证输入输出
            inputs = self._session.get_inputs()
            outputs = self._session.get_outputs()
            
            logger.info(f"模型输入：{[(i.name, i.shape) for i in inputs]}")
            logger.info(f"模型输出：{[(o.name, o.shape) for o in outputs]}")
            
            logger.info("VAD 模型加载成功")
            
        except Exception as e:
            logger.error(f"加载 VAD 模型失败：{e}")
            raise
    
    def on(self, event: Literal['speech-start', 'speech-end', 'speech-ready'], 
           callback: Callable) -> None:
        """
        注册事件回调
        
        Args:
            event: 事件名称
            callback: 回调函数
            
        Raises:
            ValueError: 不支持的事件类型
        """
        if event not in self._event_callbacks:
            raise ValueError(f"不支持的事件类型：{event}。支持的事件：{list(self._event_callbacks.keys())}")
        
        self._event_callbacks[event].append(callback)
        logger.debug(f"注册事件回调：{event}")
    
    def _emit(self, event: str, data: Any = None) -> None:
        """触发事件回调"""
        callbacks = self._event_callbacks.get(event, [])
        for callback in callbacks:
            try:
                if data is not None:
                    callback(data)
                else:
                    callback()
            except Exception as e:
                logger.error(f"事件回调 {event} 执行失败：{e}")
    
    async def process_audio(self, audio: np.ndarray) -> VADState:
        """
        处理音频分块，检测语音活动
        
        参考 Airi Web 实现:
        - 使用 inferenceChain 保证顺序执行
        - 录音状态下使用 exitThreshold (更低，更难退出)
        - 完整的状态机管理
        """
        if self._session is None:
            raise RuntimeError("VAD 模型未初始化，请先调用 initialize()")
        
        # 验证和预处理音频
        audio = self._preprocess_audio(audio)
        
        # 执行 VAD 推理
        is_speech = await self._detect_speech(audio)
        
        # 更新状态
        self._vad_state.total_samples += len(audio)
        
        # 计算派生常量
        sample_rate_ms = self.config.sample_rate / 1000
        min_silence_duration_samples = int(self.config.min_silence_duration_ms * sample_rate_ms)
        speech_pad_samples = int(self.config.speech_pad_ms * sample_rate_ms)
        min_speech_duration_samples = int(self.config.min_speech_duration_ms * sample_rate_ms)
        max_prev_buffers = int(np.ceil(speech_pad_samples / self.config.new_buffer_size))
        
        was_recording = self._is_recording
        
        # 如果不在录音且当前不是语音，存储到前缀缓冲区 (Airi 逻辑)
        if not was_recording and not is_speech:
            if len(self._prev_buffers) >= max_prev_buffers:
                self._prev_buffers.pop(0)
            self._prev_buffers.append(audio.copy())
            return self._vad_state
        
        # 检查缓冲区溢出
        remaining = len(self._buffer) - self._buffer_pointer
        if len(audio) >= remaining:
            # 缓冲区满，处理现有数据
            self._buffer[self._buffer_pointer:self._buffer_pointer + remaining] = audio[:remaining]
            self._buffer_pointer += remaining
            
            # 处理语音片段并重置
            overflow = audio[remaining:]
            self._process_speech_segment(overflow)
            return self._vad_state
        else:
            # 添加到缓冲区
            self._buffer[self._buffer_pointer:self._buffer_pointer + len(audio)] = audio
            self._buffer_pointer += len(audio)
        
        # 处理语音检测 (Airi 逻辑)
        if is_speech:
            if not self._is_recording:
                # 语音开始
                self._is_recording = True
                self._post_speech_samples = 0
                self._vad_state.is_speaking = True
                self._emit('speech-start')
                logger.debug("检测到语音开始")
            else:
                self._post_speech_samples = 0
            return self._vad_state
        
        # 当前不是语音，但之前在录音
        self._post_speech_samples += len(audio)
        self._vad_state.post_speech_samples = self._post_speech_samples
        
        # 检查静默是否足够长以结束语音
        if self._post_speech_samples >= min_silence_duration_samples:
            # 检查语音片段是否足够长
            if self._buffer_pointer < min_speech_duration_samples:
                # 太短，重置不处理
                self._reset()
                return self._vad_state
            
            # 处理语音片段
            self._process_speech_segment()
        
        return self._vad_state
    
    def _preprocess_audio(self, audio: np.ndarray) -> np.ndarray:
        """预处理音频数据"""
        # 展平为一维数组
        if audio.ndim > 1:
            audio = audio.flatten()
        
        # 验证长度
        if len(audio) == 0:
            raise ValueError("音频数据为空")
        
        # 转换为 float32
        audio = audio.astype(np.float32)
        
        # 归一化到 [-1, 1]
        max_val = np.max(np.abs(audio))
        if max_val > 1.0:
            audio = audio / max_val
        
        return audio
    
    def detect_speech(self, audio: np.ndarray) -> bool:
        """
        同步语音检测 (用于非异步环境)
        
        参考 Airi Web 实现：
        - 使用 inferenceChain 保证顺序执行
        - 录音状态下使用 exitThreshold (更低，更难退出)
        """
        if self._session is None:
            self._session = ort.InferenceSession(str(self._get_model_path()))
        
        # Silero VAD 需要正确的 state shape: [2, batch, 128]
        ort_inputs = {
            'input': audio[np.newaxis, :].astype(np.float32),  # [1, 512]
            'sr': self._sr,  # [1]
            'state': self._state  # [2, 1, 128]
        }
        outputs = self._session.run(None, ort_inputs)
        speech_prob = float(outputs[0][0, 0])  # [[prob]]
        
        # 更新 state - 注意输出是 stateN
        if len(outputs) > 1:
            self._state = outputs[1].copy()
        
        # 关键：录音状态下使用更低的退出阈值 (参考 Airi)
        if self._is_recording:
            is_speech = speech_prob >= self.config.exit_threshold
        else:
            is_speech = speech_prob > self.config.speech_threshold
        
        return is_speech
    
    async def _detect_speech(self, audio: np.ndarray) -> bool:
        """
        检测音频是否包含语音
        
        Args:
            audio: 预处理后的音频数据
            
        Returns:
            bool: 是否检测到语音
        """
        # 准备输入
        input_tensor = audio.reshape(1, -1)
        
        # 使用锁确保顺序推理
        async with self._inference_lock:
            try:
                outputs = self._session.run(
                    None,
                    {
                        'input': input_tensor,
                        'state': self._state,
                        'sr': self._sr,
                    }
                )
                
                # 更新状态
                self._state = outputs[1]
                
                # 获取语音概率
                speech_prob = float(outputs[0][0, 0])
                self._vad_state.speech_prob = speech_prob
                
                logger.debug(f"VAD 概率：{speech_prob:.3f}")
                
                # 应用阈值
                return (
                    speech_prob > self.config.speech_threshold
                    or (self._is_recording and speech_prob >= self.config.exit_threshold)
                )
                
            except Exception as e:
                logger.error(f"VAD 推理失败：{e}")
                return False
    
    def _process_speech_segment(self, overflow: Optional[np.ndarray] = None) -> None:
        """
        处理完整的语音片段
        
        Args:
            overflow: 溢出缓冲区的数据
        """
        sample_rate_ms = self.config.sample_rate / 1000
        speech_pad_samples = int(self.config.speech_pad_ms * sample_rate_ms)
        
        # 计算时长
        duration_ms = (self._buffer_pointer / self.config.sample_rate) * 1000
        overflow_length = len(overflow) if overflow is not None else 0
        
        # 创建最终缓冲区（带前缀填充）
        prev_length = sum(len(b) for b in self._prev_buffers)
        final_buffer = np.zeros(prev_length + self._buffer_pointer + speech_pad_samples, dtype=np.float32)
        
        # 添加前缀缓冲区
        offset = 0
        for prev in self._prev_buffers:
            final_buffer[offset:offset + len(prev)] = prev
            offset += len(prev)
        
        # 添加主语音片段（带后缀填充）
        end_idx = offset + self._buffer_pointer + speech_pad_samples
        final_buffer[offset:end_idx] = self._buffer[:self._buffer_pointer + speech_pad_samples]
        
        # 触发事件
        self._emit('speech-end')
        self._emit('speech-ready', {
            'buffer': final_buffer,
            'duration': duration_ms,
            'samples': len(final_buffer),
        })
        
        logger.info(f"语音片段就绪，时长：{duration_ms:.1f}ms, 采样点：{len(final_buffer)}")
        
        # 重置
        self._reset(overflow_length)
        if overflow is not None:
            self._buffer[:overflow_length] = overflow
    
    def _reset(self, offset: int = 0) -> None:
        """重置 VAD 状态"""
        self._buffer[offset:] = 0
        self._buffer_pointer = offset
        self._is_recording = False
        self._post_speech_samples = 0
        self._prev_buffers = []
        self._vad_state.is_speaking = False
        self._vad_state.buffer_samples = offset
        self._vad_state.post_speech_samples = 0
    
    def get_state(self) -> Dict[str, Any]:
        """
        获取当前 VAD 状态（用于调试）
        
        Returns:
            dict: 状态信息
        """
        return {
            'is_speaking': self._vad_state.is_speaking,
            'speech_prob': self._vad_state.speech_prob,
            'buffer_samples': self._buffer_pointer,
            'post_speech_samples': self._post_speech_samples,
            'total_samples': self._vad_state.total_samples,
            'is_initialized': self._session is not None,
            'config': {
                'sample_rate': self.config.sample_rate,
                'speech_threshold': self.config.speech_threshold,
                'min_silence_duration_ms': self.config.min_silence_duration_ms,
            }
        }
    
    def update_config(self, **kwargs) -> None:
        """
        更新配置参数
        
        Args:
            **kwargs: 要更新的配置项
        """
        for key, value in kwargs.items():
            if hasattr(self.config, key):
                setattr(self.config, key, value)
                logger.debug(f"更新配置：{key} = {value}")
            else:
                logger.warning(f"未知配置项：{key}")
        
        # 如果采样率变化，更新相关参数
        if 'sample_rate' in kwargs:
            self._sr = np.array([self.config.sample_rate], dtype=np.int64)
            max_samples = self.config.max_buffer_duration * self.config.sample_rate
            self._buffer = np.zeros(max_samples, dtype=np.float32)
            self._buffer_pointer = 0


async def create_vad(config: VADConfig = None) -> VADStreaming:
    """
    创建并初始化 VAD 流式检测器
    
    Args:
        config: VAD 配置
        
    Returns:
        VADStreaming: 已初始化的 VAD 检测器
    """
    vad = VADStreaming(config)
    await vad.initialize()
    return vad


# 同步版本（用于非异步场景）
def create_vad_sync(config: VADConfig = None) -> VADStreaming:
    """
    同步创建并初始化 VAD
    
    Args:
        config: VAD 配置
        
    Returns:
        VADStreaming: 已初始化的 VAD 检测器
    """
    vad = VADStreaming(config)
    # 在非异步环境中使用 asyncio.run
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # 在已有事件循环中（不常见）
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(loop.run_until_complete, vad.initialize())
                future.result()
        else:
            loop.run_until_complete(vad.initialize())
    except RuntimeError:
        # 没有事件循环，创建新的
        asyncio.run(vad.initialize())
    
    return vad


if __name__ == "__main__":
    # 简单测试
    import sys
    import os
    
    # 设置 UTF-8 编码
    os.environ['PYTHONUTF8'] = '1'
    
    async def test():
        print("VAD Streaming Module Test")
        print("=" * 50)
        
        try:
            vad = await create_vad()
            print("[OK] Model loaded successfully")
            
            # 测试状态
            state = vad.get_state()
            print(f"State: {state}")
            
            # 测试事件注册
            def on_start():
                print("[EVENT] speech-start")
            
            def on_end():
                print("[EVENT] speech-end")
            
            def on_ready(data):
                print(f"[EVENT] speech-ready ({data['samples']} samples)")
            
            vad.on('speech-start', on_start)
            vad.on('speech-end', on_end)
            vad.on('speech-ready', on_ready)
            
            print("\nEvent callbacks registered")
            
            # 测试推理（静音）
            silent_audio = np.zeros(512, dtype=np.float32)
            state = await vad.process_audio(silent_audio)
            print(f"\nSilent test - prob: {state.speech_prob:.3f}, speaking: {state.is_speaking}")
            
            print("\n[OK] All basic tests passed")
            
        except Exception as e:
            print(f"\n[ERROR] Test failed: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)
    
    asyncio.run(test())
