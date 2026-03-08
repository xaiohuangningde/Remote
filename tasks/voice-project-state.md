# 语音项目状态

**更新时间**: 2026-03-07 09:45
**阶段**: 技术验证完成 ✅
**结论**: **可以开始开发**

## 1. 验证任务完成情况

| 任务 | 状态 | 报告文件 | 关键发现 |
|------|------|----------|---------|
| 1. Silero VAD ONNX 输入格式 | ✅ 通过 | `voice-vad-onnx-verify.md` | State shape: `[2, 1, 128]`, Audio: `(1, 512)` |
| 2. PyAudio + asyncio 集成 | ✅ 通过 | `voice-pyaudio-async-verify.md` | 使用 `run_coroutine_threadsafe`, 5 秒处理 155 块 |
| 3. OpenClaw HTTP API | ⚠️ 部分通过 | `voice-openclaw-api-verify.md` | 无标准 REST API，需用 CLI 或 RPC |
| 4. 错误处理方案 | ✅ 完成 | `voice-error-handling.md` | 完整降级方案已制定 |

## 2. 关键技术参数确认

### 2.1 VAD 模型 (Silero)

```python
# 输入
audio: np.ndarray  # shape: (1, 512), dtype: float32
state: np.ndarray  # shape: (2, 1, 128), dtype: float32
sr: np.ndarray     # shape: (), dtype: int64, value: 16000

# 输出
speech_prob: np.ndarray  # shape: (1, 1), range: [0, 1]
new_state: np.ndarray    # shape: (2, 1, 128)
```

### 2.2 音频流参数

- 采样率：16000 Hz
- 位深：32-bit float (paFloat32)
- 通道数：1 (单声道)
- 块大小：512 采样点
- 延迟：32ms
- 实时处理率：~31 块/秒

### 2.3 OpenClaw 集成方式

**推荐方案**: CLI 调用

```python
import subprocess

def call_agent(message: str) -> str:
    result = subprocess.run(
        ['openclaw', 'agent', '--message', message, '--json'],
        capture_output=True,
        text=True
    )
    return json.loads(result.stdout)
```

**备选方案**: 自建 HTTP 桥接层

## 3. 架构设计建议

```
┌─────────────────────────────────────────────────────────┐
│                    语音系统架构                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │ PyAudio  │───→│   VAD    │───→│   ASR    │          │
│  │ (采集)   │    │ (检测)   │    │ (Whisper)│          │
│  └──────────┘    └──────────┘    └──────────┘          │
│       │                               │                  │
│       │ Async Queue                   │                  │
│       ↓                               ↓                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │ Event    │←───│   LLM    │←───│ OpenClaw │          │
│  │ Loop     │    │ (处理)   │    │  (CLI)   │          │
│  └──────────┘    └──────────┘    └──────────┘          │
│       │                               │                  │
│       ↓                               ↓                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │   TTS    │←───│ Response │←───│  Error   │          │
│  │ (合成)   │    │  (回复)  │    │ Handler  │          │
│  └──────────┘    └──────────┘    └──────────┘          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 4. 开发优先级

### Phase 1: 核心功能 (Week 1-2)

1. ✅ VAD 集成 - Silero ONNX 推理
2. ✅ 音频采集 - PyAudio 回调 + asyncio
3. ⏳ ASR 集成 - Whisper 本地/在线
4. ⏳ OpenClaw CLI 桥接

### Phase 2: 增强功能 (Week 3-4)

1. ⏳ TTS 集成 - 火山引擎/本地
2. ⏳ 错误处理 - 降级方案实现
3. ⏳ 配置系统 - YAML 配置
4. ⏳ 日志系统 - 完整日志

### Phase 3: 优化 (Week 5-6)

1. ⏳ 性能优化 - 延迟降低
2. ⏳ 内存优化 - 流式处理
3. ⏳ 测试覆盖 - 单元测试
4. ⏳ 文档完善 - 使用指南

## 5. 已知风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| OpenClaw CLI 性能 | 每次调用启动开销 | 考虑保持长连接/RPC |
| Whisper 延迟 | 实时性受影响 | 使用 whisper-tiny/base |
| PyAudio 兼容性 | Windows 驱动问题 | 提供文件输入模式 |
| TTS 成本 | 火山引擎收费 | 本地 TTS 备选 |

## 6. 下一步行动

1. **创建项目结构**: `skills/voice-system/`
2. **实现 VAD 模块**: 基于验证的 ONNX 参数
3. **实现音频采集**: 基于验证的 PyAudio+asyncio 模式
4. **实现错误处理**: 按降级方案文档
5. **集成测试**: 端到端测试

## 7. 文件清单

**验证报告**:
- ✅ `tasks/voice-vad-onnx-verify.md`
- ✅ `tasks/voice-pyaudio-async-verify.md`
- ✅ `tasks/voice-openclaw-api-verify.md`
- ✅ `tasks/voice-error-handling.md`

**临时脚本** (可删除):
- `tasks/verify_vad_onnx.py`
- `tasks/verify_pyaudio_async.py`

## 8. 最终结论

**✅ 可以开始开发**

所有关键技术点已验证:
- VAD 模型输入输出格式明确
- PyAudio + asyncio 集成可行
- OpenClaw 集成方案确定 (CLI)
- 错误处理方案完整

**建议**: 按照 Phase 1-3 优先级逐步实现，每阶段完成后进行集成测试。
