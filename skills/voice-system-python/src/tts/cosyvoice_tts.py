# -*- coding: utf-8 -*-
"""
Qwen3-TTS 引擎 - 通义千问开源 TTS
支持 10 种语言、多种音色、情感控制
"""

import sys
from pathlib import Path
from typing import Optional, Generator
import numpy as np

# Qwen3-TTS 路径
QWEN3_PATH = Path(r"E:\TuriX-CUA-Windows\models\Qwen3-TTS")


class Qwen3TTS:
    """
    Qwen3-TTS 引擎
    
    特性:
    - 支持 10 种语言：中文、英文、日文、韩文、德文、法文、俄文、葡萄牙文、西班牙文、意大利文
    - 支持多种音色：Vivian/Serena/Uncle_Fu/Dylan/Eric/Ryan/Aiden/Ono_Anna/Sohee
    - 支持情感控制
    - 流式输出
    """
    
    def __init__(
        self,
        model_dir: Optional[str] = None,
    ):
        """
        初始化 Qwen3-TTS
        
        Args:
            model_dir: 模型路径，默认使用本地路径
        """
        self.model = None
        self.sample_rate = 24000
        
        if model_dir is None:
            model_dir = r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\Qwen\Qwen3-TTS-12Hz-1___7B-CustomVoice"
        
        self.model_dir = model_dir
        self._load_model()
    
    def _load_model(self):
        """加载 Qwen3-TTS 模型"""
        try:
            import torch
            from qwen_tts import Qwen3TTSModel
            
            print(f"[Qwen3-TTS] 加载模型：{self.model_dir}")
            self.model = Qwen3TTSModel.from_pretrained(
                self.model_dir,
                device_map="cpu",
                dtype=torch.float32,
            )
            print(f"[Qwen3-TTS] 模型加载成功")
            
        except Exception as e:
            print(f"[Qwen3-TTS] 模型加载失败：{e}")
            raise
    
    def list_speakers(self) -> list:
        """列出可用音色"""
        speakers = [
            "Vivian",     # 明亮、略带锐气的年轻女声 (中文)
            "Serena",     # 温暖柔和的年轻女声 (中文)
            "Uncle_Fu",   # 音色低沉醇厚的成熟男声 (中文)
            "Dylan",      # 清晰自然的北京青年男声 (中文)
            "Eric",       # 活泼、略带沙哑明亮感的成都男声 (中文/四川方言)
            "Ryan",       # 富有节奏感的动态男声 (英文)
            "Aiden",      # 清晰中频的阳光美式男声 (英文)
            "Ono_Anna",   # 轻快灵活的俏皮日语女声 (日文)
            "Sohee",      # 富含情感的温暖韩语女声 (韩文)
        ]
        print(f"[Qwen3-TTS] 可用音色：{speakers}")
        return speakers
    
    def synthesize(
        self,
        text: str,
        speaker: str = "Vivian",
        language: str = "Chinese",
        stream: bool = False,
    ) -> Generator[np.ndarray, None, None]:
        """
        语音合成
        
        Args:
            text: 输入文本
            speaker: 音色 (Vivian/Serena/Uncle_Fu/Dylan/Eric/Ryan/Aiden/Ono_Anna/Sohee)
            language: 语言 (Chinese/English/Japanese/Korean 等)
            stream: 是否流式输出 (暂不支持)
        
        Yields:
            音频片段 (numpy array)
        """
        if self.model is None:
            raise RuntimeError("Qwen3-TTS 模型未加载")
        
        try:
            wavs, sr = self.model.generate_custom_voice(
                text=text,
                language=language,
                speaker=speaker,
            )
            
            audio = wavs[0].flatten()
            yield audio
            
        except Exception as e:
            print(f"[Qwen3-TTS] 合成失败：{e}")
            raise
    
    def save_audio(
        self,
        audio: np.ndarray,
        output_path: str,
    ):
        """
        保存音频为 WAV 文件
        
        Args:
            audio: 音频数据
            output_path: 输出路径
        """
        import soundfile as sf
        
        sf.write(output_path, audio, self.sample_rate)
        print(f"[Qwen3-TTS] 音频已保存：{output_path}")


# 测试代码
if __name__ == "__main__":
    print("=" * 60)
    print("  Qwen3-TTS 测试")
    print("=" * 60)
    
    # 初始化
    tts = Qwen3TTS()
    
    # 列出音色
    print("\n可用音色:")
    speakers = tts.list_speakers()
    
    # 测试合成
    print("\n测试合成...")
    text = "你好，我是 Qwen3-TTS 语音合成系统。"
    
    audio_chunks = []
    for chunk in tts.synthesize(text, speaker="Vivian", language="Chinese"):
        audio_chunks.append(chunk)
    
    if audio_chunks:
        full_audio = np.concatenate(audio_chunks)
        output_path = str(QWEN3_PATH / "test_voice_system.wav")
        tts.save_audio(full_audio, output_path)
        print(f"\n测试完成！音频已保存：{output_path}")
        print(f"音频长度：{len(full_audio) / 24000:.2f}s")
    else:
        print("合成失败")
