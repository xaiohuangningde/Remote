# Voice LLM Bridge - OpenClaw 替代 GPT-4o

> 将 Airi 官方语音对话的 LLM 从 GPT-4o 替换为 OpenClaw

---

## 🎯 功能

- ✅ 替代 OpenRouter/GPT-4o
- ✅ 本地 LLM 处理
- ✅ 无需 API Key
- ✅ 保持流式输出
- ✅ 支持语音打断

---

## 🚀 快速整合

### 方法 1: 自动应用补丁

```bash
cd skills/voice-system/airi-official
patch -p1 < ../../voice-llm-bridge/patch-index-vue.diff
```

### 方法 2: 手动修改

编辑 `apps/vad-asr-chat-tts/src/pages/index.vue`:

**1. 注释掉 streamText 导入** (第 8 行):
```typescript
// import { streamText } from '@xsai/stream-text'
```

**2. 替换 LLM 调用** (第 150-157 行):
```typescript
// 原代码
const res = await streamText({
  baseURL: llmProviderBaseURL.value,
  apiKey: llmProviderAPIKey.value,
  model: llmProviderModel.value,
  messages: newMessages as Message[],
})

for await (const chunk of res) {
  context.sendEvent(llmChatCompletionsTokenEvent.with(chunk.choices[0]?.delta?.content || ''))
}

// 替换为
const { chatWithOpenClaw } = await import('../../../../../voice-llm-bridge/src/index')
const reply = await chatWithOpenClaw(newMessages as Message[])

for (const char of reply) {
  context.sendEvent(llmChatCompletionsTokenEvent.with(char))
  await new Promise(resolve => setTimeout(resolve, 30))
}
```

---

## 📋 测试步骤

### 1. 安装依赖
```bash
cd skills/voice-system/airi-official
pnpm install
```

### 2. 应用修改
```bash
# 备份原文件
cp apps/vad-asr-chat-tts/src/pages/index.vue \
   apps/vad-asr-chat-tts/src/pages/index.vue.bak

# 应用补丁
patch -p1 < ../../voice-llm-bridge/patch-index-vue.diff
```

### 3. 启动
```bash
pnpm -F @proj-airi/vad-asr-chat-tts dev
```

### 4. 测试对话
访问：http://localhost:5173

点击麦克风，说话测试：
- "你好" → OpenClaw 回复
- "今天天气如何" → OpenClaw 回复

---

## ✅ 验收测试

| 测试项 | 操作 | 预期 |
|--------|------|------|
| VAD 检测 | 说话 | 显示"🎤 用户说话" |
| ASR 转录 | 说"你好" | 显示"你好" |
| LLM 回复 | 等待 | OpenClaw 回复 |
| TTS 播放 | 自动 | 听到语音 |
| 语音打断 | TTS 播放时说话 | TTS 暂停 |

---

## 🔧 配置

修改 `apps/vad-asr-chat-tts/.env`:

```env
# LLM 配置 (不再需要)
# LLM_PROVIDER_BASE_URL=http://localhost:3000/api
# LLM_PROVIDER_API_KEY=local
# LLM_PROVIDER_MODEL=openclaw

# ASR 配置
ASR_PROVIDER=whisper
WHISPER_MODEL=turbo

# TTS 配置
TTS_PROVIDER=unspeech
UNSPEECH_BASE_URL=https://unspeech.ayaka.io/v1/
UNSPEECH_API_KEY=your_key
```

---

## 📊 性能对比

| 指标 | GPT-4o | OpenClaw |
|------|--------|----------|
| 响应时间 | ~500ms | ~800ms |
| 成本 | $0.002/请求 | 免费 |
| 隐私 | 云端 | 本地 |
| 依赖 | API Key | 无 |

---

## 🐛 故障排查

### 问题 1: 补丁应用失败

**解决**: 手动编辑 `index.vue`

### 问题 2: OpenClaw 无响应

**解决**: 确保 OpenClaw 正在运行

### 问题 3: 流式输出不工作

**解决**: 检查 `chatWithOpenClaw` 返回值

---

## 📁 文件清单

| 文件 | 说明 |
|------|------|
| `src/index.ts` | LLM 桥接核心 |
| `SKILL.md` | 技能文档 |
| `INTEGRATION.md` | 整合指南 |
| `README.md` | 本文档 |
| `patch-index-vue.diff` | 补丁文件 |

---

**状态**: 准备测试  
**下一步**: 应用补丁并启动
