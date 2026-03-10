# Airi 项目整合方案

> **目标**: 直接采用 Airi 官方实现，最小化修改适配我们的环境  
> **原则**: 能用 Airi 的代码就直接用，不要重新发明轮子！  
> **时间**: 2026-03-06

---

## 📊 Airi 项目分析

### 项目结构

```
webai-example-realtime-voice-chat/
├── apps/
│   ├── vad/                    # 仅 VAD 演示
│   ├── vad-asr/                # VAD + ASR 演示
│   ├── vad-asr-chat/           # VAD + ASR + LLM 演示
│   ├── vad-asr-chat-tts/       # 完整版 (VAD + ASR + LLM + TTS) ⭐
│   └── sherpa-onnx-demo/       # Python 服务 (WebSocket API)
├── packages/                   # 共享库
└── package.json                # pnpm workspace
```

### 技术栈

| 组件 | Airi 选择 | 我们的选择 | 兼容性 |
|------|----------|-----------|--------|
| **前端** | TypeScript + Vue | TypeScript | ✅ 可复用 |
| **VAD** | Silero VAD (ONNX) | Silero VAD (PyTorch) | ⚠️ 不同实现 |
| **ASR** | sherpa-onnx (SenseVoice) | Whisper | ⚠️ 不同实现 |
| **TTS** | sherpa-onnx (VITS) | Qwen3-TTS | ⚠️ 不同实现 |
| **LLM** | WebAI API | Rules → Qwen API | ⚠️ 不同实现 |
| **音频** | Web Audio API | PyAudio | ⚠️ 不同平台 |

### 关键发现

1. **Airi 是 Web 优先**: 基于浏览器 (Web Audio API, WebAssembly)
2. **我们有 Python 生态**: PyAudio, PyTorch, Qwen3-TTS 本地
3. **架构理念一致**: VAD → ASR → LLM → TTS 流程
4. **Airi 有 Python 服务**: `sherpa-onnx-demo` 提供 WebSocket API

---

## 🎯 整合策略

### ❌ 不直接采用的原因

1. **平台不同**: Airi 是 Web 应用，我们是桌面/本地应用
2. **TTS 不同**: Airi 用 sherpa-onnx VITS，我们用 Qwen3-TTS
3. **ASR 不同**: Airi 用 sherpa-onnx，我们用 Whisper
4. **依赖不同**: Airi 需要 pnpm + TypeScript 构建，我们已有 Python 实现

### ✅ 可复用的部分

1. **架构设计**: VAD/ASR/LLM/TTS 分层思想
2. **VAD 逻辑**: Silero VAD 使用方式 (阈值、状态机)
3. **WebSocket API**: sherpa-onnx-demo 的 API 设计
4. **配置管理**: 模型下载、路径管理
5. **状态机**: 录音 → 处理 → 播放状态转换

### 🔧 需要适配的部分

1. **TTS 接口**: 将 Qwen3-TTS 适配到 Airi 的 TTS 接口
2. **ASR 接口**: 保持 Whisper，但采用 Airi 的流式处理
3. **音频后端**: 保持 PyAudio，参考 Airi 的打断逻辑
4. **配置系统**: 采用 Airi 的配置结构

---

## 📝 具体行动方案

### 方案 A: 参考 Airi 架构，优化现有代码 (推荐)

**时间**: 2-3 小时  
**改动**: 最小化

#### 步骤

1. **克隆 Airi 项目作为参考** (10 分钟)
```bash
git clone https://github.com/proj-airi/webai-example-realtime-voice-chat.git
cd webai-example-realtime-voice-chat
```

2. **分析 Airi 的核心逻辑** (30 分钟)
   - 查看 `apps/vad-asr-chat-tts/` 的状态机
   - 查看 `apps/sherpa-onnx-demo/` 的 WebSocket API
   - 提取 VAD 阈值、打断逻辑

3. **优化现有 `realtime_voice_chat.py`** (1 小时)
   - 采用 Airi 的 VAD 状态机
   - 优化打断保护逻辑
   - 改进配置管理

4. **测试验证** (30 分钟)
   - 运行 `python realtime_voice_chat.py`
   - 测试打断功能
   - 测试完整对话流程

#### 改动清单

```python
# 采用 Airi 的 VAD 状态机 (从 Airi 项目复制)
class VadStateMachine:
    """参考 Airi 的 VAD 状态管理"""
    IDLE = 'idle'
    SPEAKING = 'speaking'
    SILENT = 'silent'
    
# 优化打断逻辑 (采用 Airi 的保护机制)
CONFIG = {
    'interrupt_protection_ms': 500,  # Airi 使用 500ms
    'speech_threshold': 0.3,          # Airi 默认阈值
    'min_silence_duration_ms': 400,   # Airi 默认静音时间
}
```

---

### 方案 B: 完全采用 Airi Python 服务 + 适配 Qwen3-TTS

**时间**: 4-6 小时  
**改动**: 中等

#### 步骤

1. **运行 Airi sherpa-onnx-demo** (30 分钟)
```bash
cd apps/sherpa-onnx-demo
pixi run start
# 访问 http://localhost:8000/
```

2. **修改 TTS 端点** (1 小时)
   - 保留 ASR WebSocket (`/asr`)
   - 修改 TTS WebSocket (`/tts`) 调用 Qwen3-TTS

3. **创建 TypeScript 前端** (2 小时)
   - 参考 `apps/vad-asr-chat-tts/`
   - 修改 TTS 调用为本地 Python 服务

4. **集成到 OpenClaw** (1 小时)
   - 创建 Skill 封装
   - 添加配置项

#### 架构图

```
┌─────────────────┐
│  TypeScript UI  │  ← 参考 Airi 前端
└────────┬────────┘
         │ WebSocket
         ▼
┌─────────────────┐
│  Python Server  │  ← Airi sherpa-onnx-demo
│  (WebSocket)    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌──────┐  ┌──────┐
│Whisper│  │Qwen3 │  ← 我们的模型
│ ASR  │  │ TTS  │
└──────┘  └──────┘
```

---

### 方案 C: Fork Airi 项目，替换 TTS/ASR

**时间**: 1-2 天  
**改动**: 最大

#### 步骤

1. **Fork Airi 项目**
```bash
git clone https://github.com/proj-airi/webai-example-realtime-voice-chat.git
cd webai-example-realtime-voice-chat
```

2. **替换 TTS 后端** (4 小时)
   - 修改 `apps/vad-asr-chat-tts/` 的 TTS 调用
   - 集成 Qwen3-TTS Python 服务

3. **替换 ASR 后端** (2 小时)
   - 保持 sherpa-onnx 或替换为 Whisper

4. **构建和测试** (2 小时)
```bash
pnpm i
pnpm -F @proj-airi/vad-asr-chat-tts dev
```

---

## 🎯 推荐方案：方案 A

**理由**:
1. ✅ **最快**: 2-3 小时完成
2. ✅ **最小改动**: 保持现有 Python 代码
3. ✅ **已验证**: 现有代码已能运行
4. ✅ **可迭代**: 后续可逐步采用 Airi 的优化

**不推荐方案 C 的原因**:
- ❌ 需要学习 Airi 的构建系统 (pnpm, TypeScript)
- ❌ Web 应用与桌面应用场景不同
- ❌ 我们的 Qwen3-TTS 是本地模型，Airi 是 WebAssembly
- ❌ **重复造轮子**: 我们已经有 7 个版本的 Python 代码

---

## 📋 立即执行清单 (方案 A)

### 1. 克隆 Airi 项目参考 (5 分钟)
```bash
cd D:\projects
git clone https://github.com/proj-airi/webai-example-realtime-voice-chat.git
```

### 2. 提取 Airi 的关键配置 (15 分钟)

从 Airi 项目复制以下配置到我们的 `CONFIG`:

```python
# 从 Airi 的 apps/vad-asr-chat-tts/ 提取
CONFIG = {
    # VAD 配置 (Airi 默认值)
    'speech_threshold': 0.3,
    'exit_threshold': 0.1,
    'min_silence_duration_ms': 400,
    'speech_pad_ms': 80,
    'min_speech_duration_ms': 250,
    
    # 打断配置 (Airi 保护机制)
    'interrupt_protection_ms': 500,
    'interrupt_threshold_multiplier': 2.0,
    
    # 音频配置
    'sample_rate': 16000,
    'frame_size_ms': 20,
}
```

### 3. 采用 Airi 的状态机 (30 分钟)

参考 Airi 的状态转换逻辑，优化我们的 `audio_callback`:

```python
# Airi 的状态机逻辑
class VoiceChatState:
    IDLE = 'idle'           # 等待用户说话
    LISTENING = 'listening' # VAD 检测中
    RECORDING = 'recording' # 录音中
    PROCESSING = 'processing' # ASR → LLM → TTS
    PLAYING = 'playing'     # 播放中
    INTERRUPTING = 'interrupting' # 打断中
```

### 4. 优化打断逻辑 (30 分钟)

采用 Airi 的打断保护机制:

```python
# Airi 的打断逻辑
if state['is_playing']:
    protection_time = (time.time() - state['tts_start_time']) * 1000
    
    if protection_time > CONFIG['interrupt_protection_ms']:
        interrupt_threshold = (
            CONFIG['speech_threshold'] * 
            CONFIG['interrupt_threshold_multiplier']
        )
        
        if prob > interrupt_threshold:
            log("  ⚡ INTERRUPT DETECTED!")
            state['stop_playback'] = True
```

### 5. 测试验证 (30 分钟)

```bash
# 运行测试
python skills/realtime-voice-chat/test_quick.py

# 运行语音聊天
python skills/realtime-voice-chat/realtime_voice_chat.py

# 测试打断
# 1. 说话触发回复
# 2. 在 TTS 播放时再次说话
# 3. 验证是否成功打断
```

---

## 📚 Airi 项目关键文件参考

### 1. VAD 状态机
**位置**: `apps/vad-asr-chat-tts/src/composables/useVAD.ts`
**用途**: 参考 Silero VAD 的状态管理逻辑

### 2. WebSocket API
**位置**: `apps/sherpa-onnx-demo/main.py`
**用途**: 参考 ASR/TTS 的 API 设计

### 3. 配置管理
**位置**: `apps/vad-asr-chat-tts/src/config.ts`
**用途**: 参考阈值、超时等配置

### 4. 音频处理
**位置**: `apps/vad-asr-chat-tts/src/audio/`
**用途**: 参考音频缓冲、播放逻辑

---

## ⚠️ 注意事项

### 不要做的

1. ❌ **不要重写 VAD 逻辑**: 我们已有 Silero VAD 实现
2. ❌ **不要替换 ASR**: Whisper 已经很好
3. ❌ **不要替换 TTS**: Qwen3-TTS 是我们的核心
4. ❌ **不要转为 Web 应用**: 我们是桌面/本地应用

### 要做的

1. ✅ **参考 Airi 的状态机**: 更清晰的状态管理
2. ✅ **参考 Airi 的打断逻辑**: 更准确的打断检测
3. ✅ **参考 Airi 的配置**: 更合理的默认值
4. ✅ **参考 Airi 的 API 设计**: 未来可扩展 WebSocket

---

## 🚀 快速开始

### 立即执行 (1 小时内完成)

```bash
# 1. 克隆 Airi 项目参考
cd D:\projects
git clone https://github.com/proj-airi/webai-example-realtime-voice-chat.git

# 2. 查看 Airi 的配置
cd webai-example-realtime-voice-chat
cat apps/vad-asr-chat-tts/src/config.ts

# 3. 查看 Airi 的状态机
cat apps/vad-asr-chat-tts/src/composables/useVoiceChat.ts

# 4. 优化我们的代码
cd C:\Users\12132\.openclaw\workspace\skills\realtime-voice-chat
# 编辑 realtime_voice_chat.py，采用 Airi 的配置和状态机

# 5. 测试
python test_quick.py
python realtime_voice_chat.py
```

---

## 📊 对比总结

| 维度 | Airi 项目 | 我们的项目 | 整合策略 |
|------|----------|-----------|----------|
| **平台** | Web (浏览器) | 桌面 (Python) | 保持 Python |
| **VAD** | Silero (ONNX) | Silero (PyTorch) | 参考状态机 |
| **ASR** | sherpa-onnx | Whisper | 保持 Whisper |
| **TTS** | sherpa-onnx VITS | Qwen3-TTS | 保持 Qwen3 |
| **LLM** | WebAI API | Rules → Qwen | 保持现有 |
| **音频** | Web Audio API | PyAudio | 保持 PyAudio |
| **架构** | 分层清晰 | 单文件 | 参考分层 |

**结论**: 参考 Airi 的架构设计，保持我们的技术栈！

---

**创建时间**: 2026-03-06 22:50  
**架构师**: 小黄 🐤  
**推荐方案**: 方案 A (参考 Airi，优化现有代码)  
**预计时间**: 2-3 小时
