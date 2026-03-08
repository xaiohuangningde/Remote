# -*- coding: utf-8 -*-
"""
Whisper 本地语音识别 - Python 版本
使用 faster-whisper (更快，CPU 友好)
"""

import os
import sys

def transcribe(audio_path, model='base', language='zh'):
    """
    使用 faster-whisper 转录音频
    
    Args:
        audio_path: 音频文件路径
        model: 模型大小 (tiny, base, small, medium, large)
        language: 语言代码 (zh, en, ja, ko 等)
    
    Returns:
        dict: {text, language, duration, segments}
    """
    try:
        from faster_whisper import WhisperModel
        
        # 加载模型
        model = WhisperModel(model, device="cpu", compute_type="int8")
        
        # 转录
        segments, info = model.transcribe(audio_path, language=language)
        
        # 收集结果
        text_segments = []
        for segment in segments:
            text_segments.append({
                'start': segment.start,
                'end': segment.end,
                'text': segment.text.strip()
            })
        
        full_text = " ".join([s['text'] for s in text_segments])
        
        result = {
            'text': full_text,
            'language': info.language,
            'duration': info.duration,
            'segments': text_segments
        }
        
        return result
        
    except ImportError:
        # 备用方案：使用 openai-whisper
        try:
            import whisper
            
            model = whisper.load_model(model)
            result = model.transcribe(audio_path, language=language)
            
            return {
                'text': result['text'].strip(),
                'language': result.get('language', language),
                'duration': result.get('segments', [{}])[-1].get('end', 0) if result.get('segments') else 0,
                'segments': [
                    {
                        'start': s['start'],
                        'end': s['end'],
                        'text': s['text'].strip()
                    }
                    for s in result.get('segments', [])
                ]
            }
            
        except Exception as e:
            print(f"Whisper 不可用：{e}", file=sys.stderr)
            return {
                'text': '',
                'language': language,
                'duration': 0,
                'segments': []
            }
    except Exception as e:
        print(f"转录失败：{e}", file=sys.stderr)
        return {
            'text': '',
            'language': language,
            'duration': 0,
            'segments': []
        }


def test():
    """测试函数"""
    import wave
    import numpy as np
    
    # 创建测试音频
    test_file = "test_whisper.wav"
    sample_rate = 16000
    duration = 2.0
    
    # 生成简单音频（静音，用于测试）
    audio = np.zeros(int(duration * sample_rate), dtype=np.float32)
    
    # 保存为 WAV
    with wave.open(test_file, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes((audio * 32767).astype(np.int16).tobytes())
    
    print("测试 Whisper 转录...")
    result = transcribe(test_file)
    print(f"结果：{result}")
    
    # 清理
    if os.path.exists(test_file):
        os.remove(test_file)
    
    return result


if __name__ == "__main__":
    test()
