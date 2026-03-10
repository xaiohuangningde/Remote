# -*- coding: utf-8 -*-
"""
Qwen3-TTS 桥接 - 子进程调用
避免依赖冲突，独立运行
"""

import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Optional
import numpy as np


class Qwen3TTSBridge:
    """
    Qwen3-TTS 桥接器
    
    通过子进程调用独立的 Qwen3-TTS 环境，避免依赖冲突
    """
    
    def __init__(
        self,
        python_path: Optional[str] = None,
        model_dir: Optional[str] = None,
    ):
        """
        初始化桥接器
        
        Args:
            python_path: Python 解释器路径 (conda 环境)
            model_dir: 模型路径
        """
        self.python_path = python_path or sys.executable
        self.model_dir = model_dir or r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\Qwen\Qwen3-TTS-12Hz-1___7B-CustomVoice"
        self.sample_rate = 24000
        
        # 创建临时脚本
        self.temp_script = Path(tempfile.gettempdir()) / "qwen3_tts_runner.py"
        self._create_runner_script()
    
    def _create_runner_script(self):
        """创建 TTS 运行脚本"""
        script = '''
import sys
import json
import numpy as np
import soundfile as sf

def run_tts(text, speaker, language, output_path):
    """运行 TTS 合成"""
    try:
        import torch
        from qwen_tts import Qwen3TTSModel
        
        model = Qwen3TTSModel.from_pretrained(
            sys.argv[1],
            device_map="cpu",
            dtype=torch.float32,
        )
        
        wavs, sr = model.generate_custom_voice(
            text=text,
            language=language,
            speaker=speaker,
        )
        
        audio = wavs[0].flatten()
        sf.write(output_path, audio, sr)
        
        print(json.dumps({
            "success": True,
            "output": output_path,
            "duration": len(audio) / sr
        }))
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))

if __name__ == "__main__":
    model_dir = sys.argv[1]
    text = sys.argv[2]
    speaker = sys.argv[3]
    language = sys.argv[4]
    output_path = sys.argv[5]
    
    run_tts(text, speaker, language, output_path)
'''
        self.temp_script.write_text(script, encoding='utf-8')
    
    def synthesize(
        self,
        text: str,
        speaker: str = "Vivian",
        language: str = "Chinese",
        output_path: Optional[str] = None,
    ) -> Optional[str]:
        """
        语音合成
        
        Args:
            text: 输入文本
            speaker: 音色
            language: 语言
            output_path: 输出路径 (可选，默认临时文件)
        
        Returns:
            输出文件路径，失败返回 None
        """
        import tempfile
        
        if output_path is None:
            fd, output_path = tempfile.mkstemp(suffix='.wav')
        
        # 调用子进程
        cmd = [
            self.python_path,
            str(self.temp_script),
            self.model_dir,
            text,
            speaker,
            language,
            output_path,
        ]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60,
            )
            
            # 解析输出
            for line in result.stdout.splitlines():
                if line.strip().startswith('{'):
                    import json
                    data = json.loads(line)
                    if data.get('success'):
                        print(f"[TTS] 合成成功：{data['output']}, 时长={data['duration']:.2f}s")
                        return output_path
                    else:
                        print(f"[TTS] 合成失败：{data.get('error')}")
                        return None
            
            print(f"[TTS] 未知错误：{result.stderr}")
            return None
            
        except subprocess.TimeoutExpired:
            print(f"[TTS] 合成超时")
            return None
        except Exception as e:
            print(f"[TTS] 错误：{e}")
            return None
    
    def synthesize_to_array(
        self,
        text: str,
        speaker: str = "Vivian",
        language: str = "Chinese",
    ) -> Optional[np.ndarray]:
        """
        合成并返回 numpy 数组
        
        Args:
            text: 输入文本
            speaker: 音色
            language: 语言
        
        Returns:
            音频数组，失败返回 None
        """
        output_path = self.synthesize(text, speaker, language)
        
        if output_path is None:
            return None
        
        try:
            import soundfile as sf
            audio, sr = sf.read(output_path)
            self.sample_rate = sr
            
            # 清理临时文件
            Path(output_path).unlink(missing_ok=True)
            
            return audio
            
        except Exception as e:
            print(f"[TTS] 读取失败：{e}")
            return None


# 测试
if __name__ == "__main__":
    print("=" * 60)
    print("  Qwen3-TTS 桥接测试")
    print("=" * 60)
    
    tts = Qwen3TTSBridge()
    
    print("\n测试合成...")
    text = "你好，我是 Qwen3-TTS 语音合成系统。"
    
    audio = tts.synthesize_to_array(text, speaker="Vivian")
    
    if audio is not None:
        print(f"成功！音频长度：{len(audio) / 24000:.2f}s")
    else:
        print("合成失败")
