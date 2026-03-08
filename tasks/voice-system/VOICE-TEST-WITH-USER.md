# 与用户测试语音系统报告

**时间**: 2026-03-07 12:45
**测试者**: 小黄 + li

---

## 测试目标

与用户实时测试语音系统功能

---

## 测试结果

### ✅ 成功项

| 组件 | 状态 | 说明 |
|------|------|------|
| 代码框架 | ✅ 完成 | 1000 行 Python |
| VAD 模型加载 | ✅ 完成 | Silero ONNX |
| 音频采集 | ✅ 完成 | PyAudio 23fps |
| 麦克风硬件 | ✅ 正常 | 检测到输入 |

### ⚠️ 问题项

| 问题 | 影响 | 原因 |
|------|------|------|
| VAD 检测失败 | 无法检测语音 | Silero VAD 对低音量不敏感 |
| 麦克风音量低 | 最大 0.0128 | 硬件/驱动限制 |
| CosyVoice 依赖 | TTS 无法使用 | gradio==5.4.0 不存在 |

---

## 详细分析

### VAD 检测问题

**现象**:
- 麦克风测试：正常 (有输入)
- VAD 检测：失败 (0 段语音)
- 音量范围：0.000035 - 0.012791

**原因**:
Silero VAD 是神经网络模型，训练数据是清晰语音。
它对以下情况不敏感：
1. 低音量输入 (<0.05)
2. 背景噪声大
3. 麦克风质量差

**解决方案**:

#### 方案 A: 简单能量 VAD (推荐)
```python
# 不用 Silero，用简单能量检测
def simple_vad(audio, threshold=0.003):
    return np.abs(audio).mean() > threshold
```
- 优点：灵敏度高，可调节
- 缺点：容易误触发

#### 方案 B: 音频放大
```python
# 放大音频信号
audio_amplified = audio * 10  # 放大 10 倍
```
- 优点：保持 Silero 准确性
- 缺点：可能引入噪声

#### 方案 C: 更换麦克风
- 优点：根本解决
- 缺点：需要硬件

---

### CosyVoice 依赖问题

**错误**: `gradio==5.4.0` 不存在

**影响**: 无法使用 CosyVoice 3.0

**当前方案**: 使用 Qwen3-TTS 桥接

---

## 当前可用功能

| 功能 | 状态 | 可用性 |
|------|------|--------|
| VAD (Silero) | ✅ 代码完成 | ⚠️ 需高音量 |
| 音频采集 | ✅ 完成 | ✅ 正常 |
| ASR (Whisper) | ⏳ 已安装 | ⏳ 待集成 |
| TTS (Qwen3) | ✅ 桥接完成 | ⏳ 需独立环境 |
| TTS (CosyVoice) | ⏸️ 依赖问题 | ❌ 不可用 |

---

## 改进计划

### 立即可做 (今天)

1. **实现简单能量 VAD**
   - 作为 Silero 的备选
   - 可调节阈值
   
2. **音频放大**
   - 在 VAD 前放大信号
   - 测试效果

3. **Whisper ASR 集成**
   - 已安装，待集成
   - 测试识别效果

### 中期优化 (本周)

1. **创建独立 conda 环境**
   - 专用于 TTS
   - 避免依赖冲突

2. **等待 CosyVoice 修复**
   - 关注官方更新
   - 或手动修改依赖

### 长期建议

1. **升级麦克风**
   - USB 麦克风
   - 更好的信噪比

---

## 演示代码

### 简单能量 VAD

```python
import numpy as np

class SimpleVAD:
    def __init__(self, threshold=0.003):
        self.threshold = threshold
        self.is_speaking = False
        self.silence_count = 0
    
    def process(self, audio):
        amplitude = np.abs(audio).mean()
        
        if amplitude > self.threshold:
            self.is_speaking = True
            self.silence_count = 0
            return "speaking"
        else:
            self.silence_count += 1
            if self.silence_count > 10 and self.is_speaking:
                self.is_speaking = False
                return "speech_end"
            return "silent"
```

---

## 结论

**语音系统核心框架完成**，但受限于：
1. 麦克风音量低 → VAD 检测困难
2. CosyVoice 依赖 → TTS 暂不可用

**建议**:
1. 先用简单能量 VAD 替代 Silero
2. 继续集成 Whisper ASR
3. Qwen3-TTS 桥接已就绪

---

**报告者**: 小黄 🐤
**时间**: 2026-03-07 12:45
