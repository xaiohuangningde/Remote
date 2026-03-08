# 语音系统开发任务计划

**创建时间**: 2026-03-07 11:45
**状态**: `in_progress`
**优先级**: High

---

## 🎯 目标

创建完整的实时语音对话系统 (VAD → ASR → LLM → TTS)，基于 Airi 架构本地化。

**参考**: https://github.com/proj-airi/webai-example-realtime-voice-chat

---

## 📋 阶段规划

### Phase 1: 项目结构 ✅
- [x] 验证技术可行性 (已完成)
- [x] 创建项目目录 `skills/voice-system/`
- [x] 初始化 package.json / requirements.txt
- [x] 创建基础目录结构
- [x] 包含 Airi 官方完整代码

### Phase 2: 核心模块 ✅ (Airi 官方已实现)
- [x] VAD 模块 - Silero VAD (`src/libs/vad/`)
- [x] 音频采集 - Web Audio API (`src/composables/audio-context.ts`)
- [x] ASR 模块 - Whisper API (配置中)
- [x] TTS 模块 - 需桥接 Qwen3-TTS

### Phase 3: Python 桌面版 ✅ 测试完成
- [x] 创建项目结构 `skills/voice-system-python/`
- [x] 实现 VAD 模块 - Silero ONNX (200 行)
- [x] 实现音频采集 - PyAudio + asyncio (150 行)
- [x] 实现主流程 - 核心框架 (150 行)
- [x] VAD 测试 - 通过 ✅
- [x] 麦克风测试 - 通过 ✅ (29.7fps)
- [x] VAD+ 麦克风集成测试 - 通过 ✅
- [ ] 集成 Whisper ASR (下一步)
- [ ] 集成 Qwen3-TTS
- [ ] 端到端测试

---

## 📝 决策记录

| 决策 | 原因 | 时间 |
|------|------|------|
| 使用 Silero VAD | ONNX 推理快，Airi 已验证 | 2026-03-07 |
| 本地 Qwen3-TTS | 无需 API 密钥，离线运行 | 2026-03-07 |

---

## ⚠️ 遇到的问题

| 问题 | 尝试 | 解决状态 |
|------|------|---------|
| 无 | - | - |

---

## 📂 相关文件

- `tasks/voice-project-state.md` - 技术验证报告
- `skills/realtime-voice-chat/` - 现有代码
- `skills/qwen3-tts/` - TTS 模型
