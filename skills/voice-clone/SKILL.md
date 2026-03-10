# Voice Clone Skill

> 声音克隆 - 基于 CosyVoice / FishSpeech
> GPU: RTX 4060

## 使用方式

```typescript
import { quickClone } from 'skills/voice-clone/src/index.ts'

// 3 秒参考音频 → 克隆声音
const result = await quickClone(
  'my-voice-sample.wav',  // 3-10 秒录音
  '你好，这是我的克隆声音'
)

console.log(`生成音频：${result.audioPath}, 时长：${result.duration}s`)
```

## 依赖

- Python 3.10+
- CUDA 12.7
- CosyVoice 或 FishSpeech 模型

## 模型下载

首次运行自动下载 (~4GB)
