"""
VAD Streaming Module - 流式语音活动检测

Silero VAD ONNX 实时语音检测模块。
"""

from .vad_streaming import (
    VADStreaming,
    VADConfig,
    VADState,
    create_vad,
    create_vad_sync,
)

__all__ = [
    "VADStreaming",
    "VADConfig",
    "VADState",
    "create_vad",
    "create_vad_sync",
]

__version__ = "1.0.0"
