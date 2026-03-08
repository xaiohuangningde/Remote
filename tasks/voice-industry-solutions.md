# 语音功能 - 行业解决方案分析

> 时间：2026-03-07 10:32  
> 参考：Airi Web、OpenAI Voice、Google AI 等

---

## 📊 Airi Web 实现分析

### 关键架构

```typescript
// Airi 的流式处理流程
VAD 检测 → ASR 流式转录 → LLM 流式回复 → TTS 逐句播放
```

### 延迟优化技术

#### 1. 流式 LLM 回复
```typescript
// 不是等完整回复，而是逐 token 处理
for await (const textPart of res.textStream) {
  context.sendEvent(llmChatCompletionsTokenEvent.with(textPart))
}
```

**效果**: 首个 token ~200ms 后即可开始 TTS

#### 2. 逐句 TTS 合成
```typescript
// 使用 <break/> 标记分句
const markerIndex = ttsSentenceBuffer.value.indexOf('<break/>')
if (markerIndex !== -1) {
  // 立即合成并播放这句，不等完整回复
  context.sendEvent(llmSentenceReadyEvent.with({ text: sentenceText }))
}
```

**效果**: 边生成边播放，无需等待完整回复

#### 3. 音频队列管理
```typescript
// TTS 音频队列，按顺序播放
const audioPlaybackQueue = ref<AudioBuffer[]>([])
const pendingAudioBuffers = ref<Map<number, AudioBuffer>>(new Map())
```

**效果**: 多句 TTS 预加载，无缝播放

---

## 🏆 业界最佳实践

### OpenAI Voice API

**架构**:
```
实时音频流 → VAD → Whisper Streaming → GPT-4o → TTS Streaming
     ↓           ↓         ↓              ↓           ↓
  20ms 块     实时检测   逐字转录      逐 token    流式音频
```

**延迟**:
- 首次响应：**~300ms**
- 连续对话：**~500ms**

**关键技术**:
1. **全链路流式** - 每个环节都是流式处理
2. **并行处理** - VAD/ASR/LLM/TTS 并行工作
3. **中断优化** - 用户说话时立即暂停 TTS

---

### Google AI Studio

**架构**:
```
音频流 → VAD → ASR (Streaming) → Gemini → TTS
              ↓                      ↓
         部分结果                 流式音频
```

**延迟**:
- 首次响应：**~400ms**
- ASR 延迟：**~100ms**

**关键技术**:
1. **部分 ASR 结果** - 边说边识别，不等完整句子
2. **LLM 预测** - 预测用户意图，提前生成回复
3. **TTS 预热** - LLM 开始生成时就预热 TTS

---

### ElevenLabs Conversational AI

**延迟**: **~200-400ms**

**关键技术**:
1. **专用 VAD 模型** - 针对对话优化
2. **增量 ASR** - 部分转录结果即可触发 LLM
3. **情感 TTS** - 根据 LLM 内容调整语调

---

## 🔍 关键差异对比

| 方案 | 首次响应 | 流式处理 | 并行度 | 打断支持 |
|------|---------|---------|--------|---------|
| **我们的实现** | ~2.5-5.5s | ❌ 批量 | 低 | ❌ 无 |
| **Airi Web** | ~1-2s | ✅ 逐句 | 中 | ✅ 有 |
| **OpenAI Voice** | ~300ms | ✅ 全链路 | 高 | ✅ 有 |
| **Google AI** | ~400ms | ✅ ASR+LLM | 高 | ✅ 有 |

---

## 💡 我们可以借鉴的

### 立即可做 (低成本)

#### 1. 流式 LLM 回复
```python
# 当前：等待完整回复
reply = await llm.chat(text)
await tts.speak(reply)

# 优化：逐句处理
async for sentence in llm.stream_chat(text):
    await tts.speak(sentence)  # 边生成边播放
```

**预期改进**: 首次响应减少 50%

#### 2. 语音打断
```python
# TTS 播放中检测到用户说话
if tts.is_playing() and vad.is_speaking():
    tts.pause()  # 立即暂停
    listen_user()  # 听用户说
```

**预期改进**: 用户体验大幅提升

#### 3. 部分 ASR 结果
```python
# 当前：等完整录音
text = asr.transcribe(full_audio)

# 优化：边说边识别
async for partial in asr.stream(audio_chunks):
    if len(partial) > 10:  # 有足够内容
        llm.start_processing(partial)  # 提前开始
```

**预期改进**: ASR→LLM 延迟减少 30%

---

### 中期优化 (中等成本)

#### 1. 全链路流式架构
```
音频流 → VAD → ASR 流式 → LLM 流式 → TTS 流式
  ↓      ↓      ↓         ↓         ↓
20ms   实时   逐字     逐 token   逐句
```

**预期改进**: 首次响应 ~1s

#### 2. LLM 预测
```python
# 用户说到一半就开始预测
if "你好" in partial_asr:
    llm.warmup("greeting")  # 预热问候场景
```

**预期改进**: LLM 延迟减少 30%

#### 3. TTS 流式合成
```python
# 不等完整文本，逐句合成
async for sentence in llm.stream():
    audio_chunk = await tts.synthesize_streaming(sentence)
    play(audio_chunk)
```

**预期改进**: TTS 延迟减少 50%

---

### 长期优化 (高成本)

#### 1. 专用硬件加速
- GPU: Whisper + LLM + TTS
- 预期：推理速度提升 5-10x

#### 2. 边缘计算
- 本地 VAD + ASR
- 云端 LLM + TTS
- 预期：网络延迟减少 50%

#### 3. 模型蒸馏
- 小模型替代大模型
- 预期：推理速度提升 3x

---

## 📋 我们的优化路线图

### 阶段 1: 立即可做 (今天)
- [ ] 流式 LLM 回复
- [ ] 语音打断逻辑
- [ ] TTS 异步播放 (已完成)

**预期**: 首次响应 ~1.5-3s

### 阶段 2: 本周
- [ ] 流式 ASR (部分结果)
- [ ] LLM 预测/预热
- [ ] TTS 流式合成

**预期**: 首次响应 ~800ms-1.5s

### 阶段 3: 本月
- [ ] 全链路流式架构
- [ ] GPU 加速
- [ ] 性能监控

**预期**: 首次响应 ~300-500ms

---

## 🎯 当前差距

| 环节 | 我们 | Airi | OpenAI |
|------|------|------|--------|
| VAD | 能量阈值 | Silero | 专用模型 |
| ASR | 批量 | 流式 | 流式 |
| LLM | 批量 | 流式 | 流式 |
| TTS | 异步 | 逐句 | 流式 |
| 打断 | ❌ | ✅ | ✅ |
| **首次响应** | ~2.5-5.5s | ~1-2s | ~300ms |

---

## 💡 结论

**我们当前水平**: 批量处理，延迟较高  
**Airi 水平**: 逐句流式，延迟中等  
**OpenAI 水平**: 全链路流式，延迟极低

**下一步**: 实现流式 LLM 回复和语音打断，可快速接近 Airi 水平

---

**状态**: 分析完成，准备实施  
**时间**: 2026-03-07 10:32
