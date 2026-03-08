# 语音系统架构 - 快速参考

> 精简版架构指南 | 配合 `ARCHITECTURE.md` 使用

---

## 📊 架构图 (简化版)

```
┌─────────────────────────────────────────────────────────────┐
│                    VoiceChatOrchestrator                    │
│                     (编排器 - 核心大脑)                      │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
   ┌─────────┐        ┌─────────┐        ┌─────────┐
   │   VAD   │        │   ASR   │        │   TTS   │
   │ Service │        │ Service │        │ Service │
   └────┬────┘        └────┬────┘        └────┬────┘
        │                  │                  │
   ┌────┴────┐        ┌────┴────┐        ┌────┴────┐
   │ Silero  │        │Whisper  │        │ Qwen3   │
   │ WebRTC  │        │ Azure   │        │ Edge    │
   └─────────┘        └─────────┘        └─────────┘
                            │
                       ┌────┴────┐
                       │   LLM   │
                       │ Service │
                       └────┬────┘
                        ┌───┴───┐
                        │Rules  │
                        │Qwen   │
                        │GLM    │
                        └───────┘
```

---

## 🔄 数据流 (5 步)

```
用户说话 → VAD 检测 → ASR 转写 → LLM 回复 → TTS 播放
   │                                              │
   └────────────── 打断检测 ←─────────────────────┘
```

### 详细流程

```
1. 🎤 用户说话
   └─> AudioBackend 采集音频帧 (每 20ms)

2. 🔍 VAD 检测
   └─> Silero 判断是否语音 (概率 > 0.3)
   └─> 是：开始录音 | 否：继续监听

3. 📝 ASR 转写
   └─> 用户说完 (静音 400ms)
   └─> Whisper 转文字

4. 💬 LLM 回复
   └─> 规则/Qwen 生成回复文本

5. 🔊 TTS 播放
   └─> Qwen3 合成语音
   └─> 播放 (可被打断)
```

---

## 📦 组件接口 (核心)

### VoiceChatOrchestrator

```typescript
interface Orchestrator {
  init(): Promise<void>
  start(): Promise<void>
  stop(): Promise<void>
  getStatus(): VoiceChatStatus
  on(event, handler): void
}
```

### VAD Service

```typescript
interface VADService {
  init(config): Promise<void>
  detect(frame: Float32Array): {isSpeech: boolean, confidence: number}
  destroy(): Promise<void>
}
```

### ASR Service

```typescript
interface ASRService {
  init(config): Promise<void>
  transcribe(audio: Float32Array): Promise<{text: string}>
  destroy(): Promise<void>
}
```

### TTS Service

```typescript
interface TTSService {
  init(config): Promise<void>
  synthesize(text: string): Promise<{audio: Float32Array}>
  synthesizeStream(text: string): AsyncGenerator  // 流式
  destroy(): Promise<void>
}
```

### LLM Service

```typescript
interface LLMService {
  init(config): Promise<void>
  generate(input: string, context): Promise<{text: string}>
  destroy(): Promise<void>
}
```

---

## 🎛️ 配置速查

```yaml
# 核心配置
audio:
  sampleRate: 16000      # 采样率
  frameSizeMs: 20        # 帧大小 (ms)

vad:
  provider: silero       # VAD 提供商
  speechThreshold: 0.3   # 语音检测阈值
  minSilenceDurationMs: 400  # 静音判定时间

asr:
  provider: whisper      # ASR 提供商
  model: base            # 模型大小
  language: auto         # 自动检测

tts:
  provider: qwen3        # TTS 提供商
  speaker: Vivian        # 音色
  stream: false          # 是否流式

llm:
  provider: rules        # LLM 提供商 (初始用 rules)

interrupt:
  enabled: true          # 启用打断
  protectionMs: 500      # 保护时间 (ms)
```

---

## 🔀 状态机

```
IDLE ──start()──> LISTENING ──speech──> RECORDING
                                            │
                                    speech-end│
                                            ▼
                                      PROCESSING ──tts-ready──> PLAYING
                                            ▲                        │
                                            │              done/interrupt
                                            └────────────────────────┘
```

| 状态 | 说明 | 动作 |
|------|------|------|
| IDLE | 初始状态 | 等待启动 |
| LISTENING | 监听中 | VAD 实时检测 |
| RECORDING | 录音中 | 累积音频帧 |
| PROCESSING | 处理中 | ASR → LLM → TTS |
| PLAYING | 播放中 | 播放 TTS 音频，监听打断 |

---

## 🛠️ 技术选型

| 组件 | 默认 | 备选 |
|------|------|------|
| **VAD** | Silero | WebRTC |
| **ASR** | Whisper (local) | Azure Speech |
| **TTS** | Qwen3-TTS | Edge TTS |
| **LLM** | Rules (初始) | Qwen API |
| **Audio** | PyAudio | SoundDevice |
| **语言** | Python 核心 + TS 封装 | - |

---

## ⚡ 性能目标

| 指标 | 当前 (v2) | 目标 (v3) |
|------|----------|----------|
| 首句响应 | 3-4 秒 | <1 秒 (GPU) |
| 打断成功率 | ~90% | >95% |
| 内存占用 | ~500MB | <300MB |
| CPU 占用 | ~30% | <15% |

---

## 📁 目标文件结构

```
realtime-voice-chat/
├── src/                      # TypeScript 源码
│   ├── orchestrator.ts       # 编排器
│   ├── interfaces/           # 接口定义
│   └── services/             # 服务实现
├── python/                   # Python 核心
│   └── services/             # Python 服务
├── config/                   # 配置文件
├── tests/                    # 测试
└── docs/                     # 文档
    ├── ARCHITECTURE.md       # 完整架构
    └── QUICK_REF.md          # 本文件
```

---

## 🚀 实施步骤

### 阶段 1: 核心重构 (1-2 周)
- [ ] 定义接口 (interfaces/)
- [ ] 实现编排器 (orchestrator.ts)
- [ ] 实现状态管理器
- [ ] 实现配置系统

### 阶段 2: 服务实现 (2-3 周)
- [ ] VAD 服务 (Silero)
- [ ] ASR 服务 (Whisper)
- [ ] TTS 服务 (Qwen3)
- [ ] LLM 服务 (Rules → Qwen API)

### 阶段 3: 优化 (1-2 周)
- [ ] 流式 TTS
- [ ] GPU 加速
- [ ] 内存优化

### 阶段 4: 生产 (1 周)
- [ ] 错误恢复
- [ ] 日志监控
- [ ] 文档完善

---

## 🔗 关键决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 语言 | Python+TS | Python 音频生态 + TS 类型安全 |
| 架构 | 模块化 | 易扩展，可替换后端 |
| 并发 | threading | 简单直接，适合 CPU 密集 |
| 配置 | YAML | 人类可读，易修改 |

---

## 📞 快速开始 (开发)

```bash
# 1. 克隆/创建项目
cd skills/realtime-voice-chat

# 2. 安装依赖
pip install -r requirements.txt
npm install

# 3. 运行测试
python -m pytest tests/
npm run test

# 4. 启动服务
python python/orchestrator.py
# 或
npm run start
```

---

## 🆘 常见问题

**Q: 为什么不用纯 TypeScript?**  
A: 音频处理 (PyAudio)、ML 模型 (PyTorch) 生态在 Python 更成熟。

**Q: 为什么不用 asyncio?**  
A: 音频处理是 CPU 密集型，threading 更适合。asyncio 适合 I/O 密集。

**Q: 流式 TTS 必须吗?**  
A: 非必须，但可显著降低延迟 (从 2s → 0.5s)。

**Q: 如何替换 TTS 后端?**  
A: 实现 `TTSService` 接口，注册到工厂，修改配置。

---

**版本**: v3.0  
**更新**: 2026-03-06  
**完整文档**: `ARCHITECTURE.md`
