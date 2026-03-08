# 语音功能 - 下一步测试计划

> 时间：2026-03-07 10:27  
> 状态：暂停 VAD 问题，测试其他组件

---

## 📋 测试优先级

### P0: 完整流程测试 (简单 VAD)

**目标**: 验证 ASR → LLM → TTS 流程

**修改**: 使用简单能量 VAD (阈值 0.01)

**测试步骤**:
1. 运行 `voice_chat_openclaw.py`
2. 说话测试
3. 观察输出：录音→识别→回复→播放

**验收标准**:
- [ ] 能检测到说话
- [ ] Whisper 能识别
- [ ] OpenClaw 能回复
- [ ] TTS 能播放

---

### P1: Whisper ASR 测试

**目标**: 验证语音识别准确性

**测试文件**: `test_local.py` 或 `chinese_asr.py`

**测试步骤**:
1. 播放测试音频
2. 运行 Whisper 识别
3. 对比识别结果

---

### P2: OpenClaw LLM 调用测试

**目标**: 确认 LLM 调用方式

**测试方式**:
1. CLI 调用测试
2. HTTP API (如果有)
3. 直接导入测试

---

### P3: TTS 播放测试

**目标**: 验证语音合成和播放

**测试方式**:
1. 系统 TTS (PowerShell)
2. Qwen3-TTS (如果有)
3. 其他 TTS 服务

---

## 🚀 立即执行

### 1. 修改为简单 VAD

```python
def vad_detect(audio_chunk):
    energy = np.sqrt(np.mean(np.array(audio_chunk) ** 2))
    return energy > 0.01
```

### 2. 运行测试

```bash
cd skills/realtime-voice-chat
python voice_chat_openclaw.py
```

### 3. 记录结果

记录每个环节的输出和耗时。

---

## 📊 预期结果

| 环节 | 预期耗时 | 说明 |
|------|---------|------|
| VAD 检测 | ~1ms | 能量计算 |
| 录音累积 | ~2-5s | 说话时长 |
| ASR 识别 | ~1-3s | Whisper |
| LLM 回复 | ~1-2s | OpenClaw |
| TTS 播放 | ~1-3s | 系统 TTS |
| **总计** | ~6-14s | 完整流程 |

---

**状态**: 准备执行 P0 测试
