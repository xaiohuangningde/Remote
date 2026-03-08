# -*- coding: utf-8 -*-
"""
Qwen3-TTS 流式生成测试
测试是否支持边生成边播放
"""

import os
import torch
import time
from threading import Thread

model_dir = r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\Qwen\Qwen3-TTS-12Hz-1___7B-CustomVoice"

def test_streaming_generation():
    """测试流式生成能力"""
    try:
        print("[INFO] Importing qwen_tts...")
        from qwen_tts import Qwen3TTSModel
        import soundfile as sf
        
        print("[INFO] Loading model...")
        model = Qwen3TTSModel.from_pretrained(
            model_dir,
            device_map="cpu",
            dtype=torch.float32,
        )
        
        print("[SUCCESS] Model loaded!")
        
        # 测试文本（长句，适合测试流式）
        test_text = "你好，我是 Qwen3-TTS。这是一个流式语音合成测试。如果流式功能正常，你应该能很快听到第一个字，而不需要等待整个句子生成完成。"
        
        print(f"\n[TEST]: {test_text}")
        print("[INFO] Starting generation...")
        
        start_time = time.time()
        
        # 方案 1: 尝试官方流式参数（如果支持）
        # wavs, sr = model.generate_custom_voice(
        #     text=test_text,
        #     language="Chinese",
        #     speaker="Vivian",
        #     streaming=True,  # 假设参数
        # )
        
        # 方案 2: 分句生成（模拟流式）
        sentences = test_text.split('。')
        sentences = [s + '。' for s in sentences if s.strip()]
        
        print(f"[INFO] Split into {len(sentences)} sentences")
        
        all_audio = []
        sr = None
        
        for i, sentence in enumerate(sentences):
            sentence_start = time.time()
            print(f"[INFO] Generating sentence {i+1}/{len(sentences)}: {sentence[:20]}...")
            
            wavs, sr = model.generate_custom_voice(
                text=sentence,
                language="Chinese",
                speaker="Vivian",
            )
            
            all_audio.append(wavs[0])
            sentence_time = time.time() - sentence_start
            print(f"[OK] Sentence {i+1} done ({sentence_time:.2f}s), audio shape: {wavs[0].shape}")
        
        # 合并所有音频
        import numpy as np
        full_audio = np.concatenate(all_audio)
        
        total_time = time.time() - start_time
        
        # 保存
        output_path = r"E:\TuriX-CUA-Windows\models\Qwen3-TTS\streaming_test.wav"
        sf.write(output_path, full_audio, sr)
        
        print(f"\n[SUCCESS] Streaming test complete!")
        print(f"[INFO] Total time: {total_time:.2f}s")
        print(f"[INFO] Audio duration: {len(full_audio)/sr:.2f}s")
        print(f"[INFO] Speed ratio: {len(full_audio)/sr / total_time:.2f}x")
        print(f"[OK] Output saved to: {output_path}")
        
        return True
        
    except Exception as e:
        print(f"[FAIL] Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("[START] Qwen3-TTS Streaming Test...")
    test_streaming_generation()
