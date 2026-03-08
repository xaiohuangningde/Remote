# 整合 Airi Web + OpenClaw LLM

> 将 Airi 官方语音对话的 LLM 替换为 OpenClaw

---

## 🎯 架构

```
┌─────────────────────────────────────┐
│         Airi Web UI                 │
│  ┌─────┐  ┌─────┐  ┌─────┐        │
│  │ VAD │→ │ ASR │→ │ TTS │        │
│  └─────┘  └─────┘  └─────┘        │
│                      ↑              │
└──────────────────────┼──────────────┘
                       │
                       ↓
              ┌─────────────────┐
              │ OpenClaw LLM    │
              │ (sessions_spawn)│
              └─────────────────┘
```

---

## 📋 整合步骤

### 步骤 1: 复制 Airi 代码到 OpenClaw

```bash
# 已存在
skills/voice-system/airi-official/
```

### 步骤 2: 修改 LLM 调用

编辑 `skills/voice-system/airi-official/apps/vad-asr-chat-tts/src/pages/index.vue`

**找到** (约 180 行):
```typescript
const res = await streamText({
  baseURL: llmProviderBaseURL.value,
  apiKey: llmProviderAPIKey.value,
  model: llmProviderModel.value,
  messages: newMessages,
})
```

**替换为**:
```typescript
// 调用 OpenClaw LLM
import { streamChatWithOpenClaw } from '../../../../../voice-llm-bridge/src/index'

const reply = await streamChatWithOpenClaw(newMessages)

// 模拟流式输出
for await (const token of reply) {
  context.sendEvent(llmChatCompletionsTokenEvent.with(token))
}

context.sendEvent(llmChatCompletionsEndedEvent.with(streamingMessage.value.content!))
return
```

### 步骤 3: 修改配置 UI

编辑 `FieldInput.vue` 组件，添加 OpenClaw 配置选项：

```vue
<FieldInput
  v-model="llmProviderBaseURL"
  label="LLM Provider Base URL"
  placeholder="http://localhost:3000/api"
/>
```

### 步骤 4: 启动测试

```bash
cd skills/voice-system/airi-official
pnpm install
pnpm -F @proj-airi/vad-asr-chat-tts dev
```

访问：http://localhost:5173

---

## 🔧 快速修改脚本

```bash
# 1. 备份原文件
cp apps/vad-asr-chat-tts/src/pages/index.vue \
   apps/vad-asr-chat-tts/src/pages/index.vue.bak

# 2. 替换 LLM 调用 (使用 sed 或手动编辑)
# 搜索：streamText({
# 替换为：streamChatWithOpenClaw(messages)
```

---

## ✅ 验收标准

| 测试项 | 预期结果 |
|--------|---------|
| 说话检测 | ✅ VAD 触发 |
| ASR 转录 | ✅ 显示文字 |
| LLM 回复 | ✅ OpenClaw 回复 |
| TTS 播放 | ✅ 语音输出 |
| 语音打断 | ✅ 说话时暂停 TTS |

---

## 📊 优势

| 方面 | 原方案 (GPT-4o) | 新方案 (OpenClaw) |
|------|----------------|------------------|
| 成本 | $0.002/请求 | ✅ 免费 |
| 延迟 | ~500ms | ~800ms |
| 隐私 | 数据发送 OpenAI | ✅ 本地处理 |
| 定制 | 有限 | ✅ 完全可控 |
| 依赖 | 需要 API Key | ✅ 无需配置 |

---

## 🐛 可能的问题

### 1. 流式输出不工作

**解决**: 确保 `streamChatWithOpenClaw` 使用 `async generator`

### 2. 响应太慢

**解决**: 调整 OpenClaw 模型或使用更快的模型

### 3. 上下文丢失

**解决**: 传递完整的 `messages` 数组

---

## 📁 文件清单

| 文件 | 状态 | 说明 |
|------|------|------|
| `voice-llm-bridge/src/index.ts` | ✅ 已创建 | LLM 桥接 |
| `voice-llm-bridge/SKILL.md` | ✅ 已创建 | 技能文档 |
| `voice-llm-bridge/INTEGRATION.md` | ✅ 本文档 | 整合指南 |
| `airi-official/apps/vad-asr-chat-tts/src/pages/index.vue` | ⏳ 待修改 | 主界面 |

---

**下一步**: 修改 `index.vue` 的 LLM 调用
