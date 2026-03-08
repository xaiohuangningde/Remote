# 语音测试快速指南

## 🚀 快速开始

### 1. 准备配置

编辑 `ai-companion/config/volcengine.json`:

```json
{
  "accessKeyId": "YOUR_KEY_ID",
  "accessKeySecret": "YOUR_KEY_SECRET",
  "tts": { "appId": "...", "accessToken": "..." },
  "asr": { "appId": "...", "accessToken": "..." }
}
```

获取凭据：https://console.volcengine.com

### 2. 运行测试

```bash
# TTS 测试
node skills/volcano-voice/test/tts-test.js all

# ASR 测试
node skills/whisper-local/test/asr-test.js all

# 完整流程测试
node skills/realtime-voice-chat/test/flow-test.js all
```

## 📁 文件结构

```
workspace/
├── ai-companion/config/
│   └── volcengine.json          # 火山引擎配置
├── skills/
│   ├── volcano-voice/test/
│   │   ├── tts-test.js          # TTS 测试脚本
│   │   └── output/              # TTS 输出音频
│   ├── whisper-local/test/
│   │   ├── asr-test.js          # ASR 测试脚本
│   │   └── output/              # ASR 输出文件
│   └── realtime-voice-chat/test/
│       ├── flow-test.js         # 完整流程测试
│       └── output/              # 流程测试输出
└── tasks/
    └── voice-test-plan.md       # 详细测试计划
```

## 🧪 测试模式

### TTS 测试

| 模式 | 命令 | 说明 |
|------|------|------|
| 单句 | `node tts-test.js single` | 测试单句合成 |
| 批量 | `node tts-test.js batch` | 测试批量处理 |
| 队列 | `node tts-test.js queue` | 测试队列管理 |
| 全部 | `node tts-test.js all` | 运行所有测试 |

### ASR 测试

| 模式 | 命令 | 说明 |
|------|------|------|
| Whisper | `node asr-test.js whisper` | 本地 Whisper |
| 火山 | `node asr-test.js volcano` | 火山引擎 ASR |
| 全部 | `node asr-test.js all` | 运行所有测试 |

### 流程测试

| 模式 | 命令 | 说明 |
|------|------|------|
| 模拟 | `node flow-test.js mock` | 模拟数据 |
| 多轮 | `node flow-test.js multi` | 多轮对话 |
| 全部 | `node flow-test.js all` | 运行所有测试 |

## ✅ 检查清单

测试前确认：

- [ ] Node.js v18+ 已安装
- [ ] 配置文件已填写凭据
- [ ] Python 3.8+ 已安装 (用于 Whisper)
- [ ] Whisper 已安装 (`pip install openai-whisper`)

## 🐛 常见问题

**配置缺失**: 脚本会自动检测并给出友好提示

**Whisper 未安装**: 可选，仅影响本地 ASR 测试

**API 错误**: 检查火山引擎凭据是否正确

## 📊 输出位置

- TTS 音频：`skills/volcano-voice/test/output/`
- ASR 文本：`skills/whisper-local/test/output/`
- 测试报告：查看控制台输出

---

**详细文档**: `tasks/voice-test-plan.md`
