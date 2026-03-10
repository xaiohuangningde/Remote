"""
VAD 流式检测演示脚本

功能:
- 从麦克风实时检测语音
- 从 WAV 文件检测语音
- 实时显示检测结果

使用方式:
    # 从麦克风实时检测
    python -m skills.realtime-voice-chat.demo_vad --mic
    
    # 从 WAV 文件检测
    python -m skills.realtime-voice-chat.demo_vad --file test.wav
    
    # 指定采样率
    python -m skills.realtime-voice-chat.demo_vad --mic --sample-rate 16000
"""

import asyncio
import argparse
import numpy as np
from pathlib import Path
from datetime import datetime
import logging
import sys

# 添加父目录到路径
sys.path.insert(0, str(Path(__file__).parent))

from vad_streaming import VADStreaming, VADConfig, create_vad

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s'
)
logger = logging.getLogger(__name__)


def timestamp():
    """获取时间戳"""
    return datetime.now().strftime("%H:%M:%S")


class VADDemo:
    """VAD 演示"""
    
    def __init__(self, mode: str, file_path: str = None, sample_rate: int = 16000):
        self.mode = mode
        self.file_path = file_path
        self.sample_rate = sample_rate
        self.vad: VADStreaming = None
        self.stats = {
            'speech_starts': 0,
            'speech_ends': 0,
            'total_samples': 0,
            'speech_duration_ms': 0,
        }
        
        # 语音状态跟踪
        self._speech_start_time = None
        self._speech_buffer = None
    
    async def setup(self):
        """初始化"""
        print("\n" + "=" * 60)
        print("VAD 流式检测演示")
        print("=" * 60)
        
        config = VADConfig(
            sample_rate=self.sample_rate,
            speech_threshold=0.3,
            exit_threshold=0.1,
            min_silence_duration_ms=400,
            speech_pad_ms=80,
            min_speech_duration_ms=250,
        )
        
        print(f"\n配置:")
        print(f"  采样率：{config.sample_rate} Hz")
        print(f"  语音阈值：{config.speech_threshold}")
        print(f"  最小静默时长：{config.min_silence_duration_ms} ms")
        print(f"  模式：{self.mode}")
        
        self.vad = await create_vad(config)
        
        # 注册事件回调
        self.vad.on('speech-start', self._on_speech_start)
        self.vad.on('speech-end', self._on_speech_end)
        self.vad.on('speech-ready', self._on_speech_ready)
        
        print("\n事件监听已注册")
        print("-" * 60)
    
    def _on_speech_start(self):
        """语音开始回调"""
        self.stats['speech_starts'] += 1
        self._speech_start_time = datetime.now()
        print(f"[{timestamp()}] 🎤 语音开始")
    
    def _on_speech_end(self):
        """语音结束回调"""
        self.stats['speech_ends'] += 1
        if self._speech_start_time:
            duration = (datetime.now() - self._speech_start_time).total_seconds() * 1000
            self.stats['speech_duration_ms'] += duration
            print(f"[{timestamp()}] 🤐 语音结束 (时长：{duration:.1f}ms)")
    
    def _on_speech_ready(self, data):
        """语音就绪回调"""
        buffer = data['buffer']
        duration = data['duration']
        samples = data['samples']
        print(f"[{timestamp()}] 📝 语音就绪 ({samples} 采样点，{duration:.1f}ms)")
    
    async def run_mic(self):
        """从麦克风检测"""
        print("\n🎙️  开始麦克风实时检测...")
        print("按 Ctrl+C 停止\n")
        
        try:
            # 尝试导入 pyaudio
            import pyaudio
        except ImportError:
            print("❌ pyaudio 未安装，请运行：pip install pyaudio")
            print("或使用 --file 模式测试 WAV 文件")
            return
        
        # 配置音频
        chunk_size = 512
        audio_format = pyaudio.paFloat32
        channels = 1
        
        pa = pyaudio.PyAudio()
        
        try:
            # 查找支持的采样率
            sample_rate = self.sample_rate
            try:
                stream = pa.open(
                    format=audio_format,
                    channels=channels,
                    rate=sample_rate,
                    input=True,
                    frames_per_buffer=chunk_size
                )
            except Exception as e:
                print(f"⚠️  {sample_rate}Hz 不可用，尝试 44100Hz")
                sample_rate = 44100
                stream = pa.open(
                    format=audio_format,
                    channels=channels,
                    rate=sample_rate,
                    input=True,
                    frames_per_buffer=chunk_size
                )
                # 更新 VAD 配置
                self.vad.update_config(sample_rate=sample_rate)
            
            print(f"✅ 音频流已打开 (采样率：{sample_rate}Hz, 块大小：{chunk_size})")
            print("请开始说话...\n")
            
            # 开始处理
            while True:
                try:
                    # 读取音频
                    data = stream.read(chunk_size, exception_on_overflow=False)
                    
                    # 转换为 numpy 数组
                    audio = np.frombuffer(data, dtype=np.float32)
                    
                    # 处理
                    state = await self.vad.process_audio(audio)
                    
                    # 更新统计
                    self.stats['total_samples'] += len(audio)
                    
                    # 实时显示概率（每 10 块显示一次）
                    if self.stats['total_samples'] % (chunk_size * 10) == 0:
                        status = "🎤" if state.is_speaking else "🤐"
                        print(f"[{timestamp()}] {status} VAD 概率：{state.speech_prob:.3f}", 
                              end='\r', flush=True)
                
                except KeyboardInterrupt:
                    print("\n")
                    break
                except Exception as e:
                    print(f"\n⚠️  音频读取错误：{e}")
                    continue
            
        finally:
            stream.stop_stream()
            stream.close()
            pa.terminate()
    
    async def run_file(self):
        """从 WAV 文件检测"""
        if not self.file_path:
            print("❌ 请指定文件路径：--file <path.wav>")
            return
        
        file_path = Path(self.file_path)
        if not file_path.exists():
            print(f"❌ 文件不存在：{file_path}")
            return
        
        print(f"\n📁 加载文件：{file_path}")
        
        try:
            # 尝试导入 scipy
            from scipy.io import wavfile
        except ImportError:
            print("❌ scipy 未安装，请运行：pip install scipy")
            return
        
        # 读取 WAV 文件
        sr, audio = wavfile.read(file_path)
        
        print(f"  采样率：{sr} Hz")
        print(f"  时长：{len(audio) / sr:.2f} 秒")
        print(f"  采样点数：{len(audio)}")
        
        # 如果是立体声，转换为单声道
        if len(audio.shape) > 1:
            print("  转换为单声道...")
            audio = audio.mean(axis=1)
        
        # 归一化到 [-1, 1]
        if audio.dtype == np.int16:
            audio = audio.astype(np.float32) / 32768.0
        elif audio.dtype == np.int32:
            audio = audio.astype(np.float32) / 2147483648.0
        elif audio.dtype == np.float32 or audio.dtype == np.float64:
            audio = audio.astype(np.float32)
            max_val = np.max(np.abs(audio))
            if max_val > 1.0:
                audio = audio / max_val
        
        # 更新 VAD 采样率（如果文件采样率不同）
        if sr != self.sample_rate:
            print(f"  更新 VAD 采样率：{sr} Hz")
            self.vad.update_config(sample_rate=sr)
        
        # 分块处理
        chunk_size = 512
        print(f"\n▶️  开始处理 (块大小：{chunk_size} 采样点)...")
        print("-" * 60)
        
        num_chunks = 0
        for i in range(0, len(audio), chunk_size):
            chunk = audio[i:i + chunk_size]
            
            # 填充到 512（如果需要）
            if len(chunk) < chunk_size:
                chunk = np.pad(chunk, (0, chunk_size - len(chunk)))
            
            # 处理
            state = await self.vad.process_audio(chunk)
            num_chunks += 1
            
            # 显示进度
            progress = (i + len(chunk)) / len(audio) * 100
            status = "🎤" if state.is_speaking else "🤐"
            print(f"[{timestamp()}] {status} 进度：{progress:.1f}% "
                  f"(概率：{state.speech_prob:.3f})", end='\r', flush=True)
        
        print("\n" + "-" * 60)
        print(f"✅ 处理完成，共 {num_chunks} 块")
    
    def print_stats(self):
        """打印统计信息"""
        print("\n" + "=" * 60)
        print("统计信息")
        print("=" * 60)
        print(f"  语音开始次数：{self.stats['speech_starts']}")
        print(f"  语音结束次数：{self.stats['speech_ends']}")
        print(f"  总处理采样：{self.stats['total_samples']}")
        print(f"  总语音时长：{self.stats['speech_duration_ms']:.1f} ms")
        
        if self.stats['total_samples'] > 0:
            duration_sec = self.stats['total_samples'] / self.sample_rate
            print(f"  总时长：{duration_sec:.2f} 秒")
        
        print("=" * 60)
    
    async def run(self):
        """运行演示"""
        try:
            await self.setup()
            
            if self.mode == "mic":
                await self.run_mic()
            elif self.mode == "file":
                await self.run_file()
            
            self.print_stats()
            
        except KeyboardInterrupt:
            print("\n\n⚠️  用户中断")
            self.print_stats()
        except Exception as e:
            print(f"\n❌ 错误：{e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


async def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description="VAD 流式检测演示",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 从麦克风实时检测
  python -m skills.realtime-voice-chat.demo_vad --mic
  
  # 从 WAV 文件检测
  python -m skills.realtime-voice-chat.demo_vad --file test.wav
  
  # 指定采样率
  python -m skills.realtime-voice-chat.demo_vad --mic --sample-rate 16000
        """
    )
    
    parser.add_argument(
        "--mic",
        action="store_true",
        help="从麦克风实时检测"
    )
    
    parser.add_argument(
        "--file",
        type=str,
        help="WAV 文件路径"
    )
    
    parser.add_argument(
        "--sample-rate",
        type=int,
        default=16000,
        help="采样率 (默认：16000)"
    )
    
    args = parser.parse_args()
    
    # 确定模式
    if args.mic and args.file:
        print("⚠️  不能同时使用 --mic 和 --file，默认使用 --file")
        mode = "file"
    elif args.file:
        mode = "file"
    elif args.mic:
        mode = "mic"
    else:
        print("❌ 请指定模式：--mic 或 --file")
        parser.print_help()
        sys.exit(1)
    
    demo = VADDemo(
        mode=mode,
        file_path=args.file,
        sample_rate=args.sample_rate
    )
    
    await demo.run()


if __name__ == "__main__":
    asyncio.run(main())
