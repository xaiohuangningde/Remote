# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

## 存储偏好

- **默认安装位置**: D 盘
- **原因**: C 盘空间紧张
- **工作目录**: `D:\openclaw\` 或 `D:\projects\`

---

## 🌐 浏览器自动化使用指南 (2026-03-06)

### 适用场景
- 需要登录的网站（X/Twitter、GitHub 某些页面）
- 动态 JS 渲染的内容（SPA、React/Vue 应用）
- 需要交互的页面（填表、点击、导航）

### 标准流程

```
1. browser.open(url) → 拿到 targetId
2. browser.screenshot(targetId, fullPage=true) → 人类查看
3. browser.act(targetId, kind=evaluate, fn=JS) → 机器提取内容
```

### 关键技巧

| 技巧 | 说明 |
|------|------|
| **复用 targetId** | 拿到 targetId 后在后续调用中保持同一个标签页 |
| **screenshot 捕获渲染后内容** | 适合人类查看完整页面 |
| **evaluate 执行 JS 最强大** | `document.body.innerText` 或查询特定元素 |
| **snapshot 只返回 DOM 结构** | 动态加载的内容可能看不到 |

### 示例 JS 提取函数

```javascript
// 提取完整文本
() => document.body.innerText

// 提取推文内容
() => {
  const tweets = document.querySelectorAll('[data-testid="tweetText"]');
  return Array.from(tweets).map(t => t.innerText).join('\n\n---\n\n');
}

// 提取文章正文
() => {
  const main = document.querySelector('article [lang]') || document.querySelector('[data-testid="tweetText"]');
  return main ? main.innerText : document.body.innerText.substring(0, 5000);
}
```

### 失败处理
- `web_fetch` 失败 → 尝试 `browser`
- `web_search` API 失效 → 尝试 `browser` 直接访问
- 页面需要登录 → 用 `browser`（可以复用已登录的 Chrome 会话）

---

### 成功案例

#### 1. X/Twitter 访问 (2026-03-06)
- 链接：https://x.com/systematicls/status/2028814227004395561
- 流程：open → screenshot → evaluate
- 提取：完整推文内容（《How To Be A World-Class Agentic Engineer》）

#### 2. 小红书访问 (2026-03-06)
- 链接：https://www.xiaohongshu.com/explore
- 流程：open → snapshot → screenshot → evaluate
- 提取：笔记列表、标题、点赞数、分类标签
- 发现：4 篇 OpenClaw 相关笔记

**详细报告**: `research/xiaohongshu-browser-access-success.md`

---

## 🎤 我的语音能力

> 这是我的"装备"之一 —— 像说话一样自然

### 核心能力

| 能力 | 说明 | 状态 |
|------|------|------|
| **TTS (语音合成)** | 文字转语音，支持多情感 | ⏳ 待配置 |
| **ASR (语音识别)** | 语音转文字 | ⏳ 待配置 |
| **VAD (语音打断)** | 用户说话时自动暂停 | ⏳ 待配置 |
| **RTC (实时通话)** | 实时语音对话 | ⏳ 待配置 |

### 配置方式

**凭据管理**: 火山引擎账号 → 访问密钥 → 填入下方

```json
{
  "accessKeyId": "你的 AccessKeyID",
  "accessKeySecret": "你的 AccessKeySecret",
  "rtc": { "appId": "", "appKey": "" },
  "asr": { "appId": "", "accessToken": "" },
  "llm": { "endpointId": "", "apiKey": "" },
  "tts": { "appId": "", "accessToken": "" },
  "microphone": { "deviceName": "Realtek Audio" }
}
```

**配置文件**: `ai-companion/config/volcengine.json`

**获取凭据**: https://console.volcengine.com

### 使用方式

```typescript
// 我可以直接调用
await tts.synthesize({ text: '你好，这是语音合成测试' })

// 或者批量处理
await Promise.all([
  tts.synthesize({ text: '第一条' }),
  tts.synthesize({ text: '第二条' }),
])
```

### 免费额度

| 服务 | 免费额度 |
|------|---------|
| RTC | 6000 分钟/月 |
| ASR | 6000 分钟/月 |
| 豆包 LLM | 50 万 Tokens/月 |
| TTS | 需充值 |

---

## 📦 技能库

### stream-queue (任务队列核心)

从 Airi 项目提取的流式任务队列模块。

**位置**: `skills/stream-queue/`

**功能**:
- 事件驱动的异步任务队列
- 自动错误处理和隔离
- 多处理器链式支持
- 自定义事件通知

**使用示例**:
```typescript
import { createQueue } from 'skills/stream-queue/src/queue.ts'

const queue = createQueue<{ text: string }>({
  handlers: [
    async (ctx) => {
      console.log('处理:', ctx.data.text)
      ctx.emit('custom-event', 'data')
      return 'result'
    }
  ]
})

queue.on('error', (payload, error) => console.error(error))
queue.on('result', (payload, result) => console.log(result))
queue.onHandlerEvent('custom-event', (data) => console.log(data))

queue.enqueue({ text: 'Hello' })
```

### volcano-voice 整合

**更新时间**: 2026-03-06
**整合内容**: 使用 stream-queue 管理 TTS 请求队列

**位置**: `skills/volcano-voice/`

**新增功能**:
- TTS 请求自动排队
- 批量处理支持
- 队列状态查询
- 队列清空能力

**使用示例**:
```typescript
import { TTSService } from 'skills/volcano-voice/src/index.ts'

const tts = new TTSService({ appId, accessToken })

// 单个请求（自动排队）
const result = await tts.synthesize({ text: '你好' })

// 批量请求
const results = await Promise.all([
  tts.synthesize({ text: '第一条' }),
  tts.synthesize({ text: '第二条' }),
])

// 队列管理
console.log('队列长度:', tts.getQueueLength())
tts.clearQueue() // 清空队列
```

**测试**:
- stream-queue: 5 个测试全部通过
- volcano-voice 整合：5 个测试全部通过

### duckdb-memory 技能 (2026-03-06 新增)

本地内存数据库，基于 DuckDB-WASM 架构。

**位置**: `skills/duckdb-memory/`

**功能**:
- SQL 查询支持
- 记忆系统（存储/搜索）
- 批量操作
- 表管理

**使用示例**:
```typescript
import { DuckDBMemory } from 'skills/duckdb-memory/src/index.ts'

const db = new DuckDBMemory()
await db.init()

// 创建表
await db.createTable('users', { id: 'VARCHAR', name: 'VARCHAR' })

// 插入数据
await db.insert('users', { id: '1', name: 'Alice' })

// 查询
const result = await db.select('users')

// 记忆系统
await db.storeMemory({ id: 'm1', content: '用户喜欢奶茶', tags: ['preference'] })
const memories = await db.searchMemories('奶茶')
```

**测试**: 4 个测试全部通过（模拟模式）

### memory-search-queue 技能 (2026-03-06 新增)

批量记忆搜索队列，基于 stream-queue。

**位置**: `skills/memory-search-queue/`

**功能**:
- 批量搜索自动排队
- 异步处理不阻塞
- 事件通知进度
- 错误自动隔离

**使用示例**:
```typescript
import { createMemorySearchQueue } from 'skills/memory-search-queue/src/index.ts'

const searchQueue = createMemorySearchQueue(memory_search)

// 批量搜索
const results = await searchQueue.searchBatch([
  { query: '用户偏好', limit: 5 },
  { query: '待办事项', limit: 5 },
  { query: '项目进度', limit: 5 },
])

// 监听事件
searchQueue.queue.on('drain', () => {
  console.log('所有搜索完成')
})
```

**测试**: 4 个测试全部通过

### subagent-queue 技能 (2026-03-06 新增)

子代理任务调度队列。

**位置**: `skills/subagent-queue/`

**功能**:
- 批量任务自动排队
- 优先级支持 (1-10)
- 进度实时追踪
- 错误自动隔离

**使用示例**:
```typescript
import { createSubagentQueue } from 'skills/subagent-queue/src/index.ts'

const agentQueue = createSubagentQueue(sessions_spawn)

// 批量分发任务
await agentQueue.spawnBatch([
  { task: '研究 X 项目', priority: 8 },
  { task: '分析 Y 代码', priority: 5 },
  { task: '编写 Z 文档', priority: 3 },
])

// 追踪进度
console.log('运行中:', agentQueue.getRunningCount())
```

**测试**: 4 个测试全部通过

### todo-manager 技能 (2026-03-06 新增)

待办事项管理器，整合 duckdb-memory + stream-queue。

**位置**: `skills/todo-manager/`

**功能**:
- CRUD 完整支持
- 自动执行 pending 任务
- 优先级排序
- 标签筛选
- 统计面板

**使用示例**:
```typescript
import { createTodoManager } from 'skills/todo-manager/src/index.ts'

const tm = createTodoManager(async (todo) => {
  // 执行逻辑
  return '完成'
})

await tm.init()

// 添加待办
await tm.addTodo({
  title: '研究 X 项目',
  status: 'pending',
  priority: 8,
  tags: ['research'],
})

// 获取统计
const stats = await tm.getCount()
console.log(`待处理：${stats.pending}`)
```

**测试**: 5 个测试全部通过

### api-cache 技能 (2026-03-06 新增)

API 响应缓存，减少重复请求。

**位置**: `skills/api-cache/`

**功能**:
- 响应缓存
- 自动过期 (TTL)
- 命中统计
- 缓存穿透保护 (getOrSet)
- 自动清理

**使用示例**:
```typescript
import { createApiCache } from 'skills/api-cache/src/index.ts'

const cache = createApiCache(3600000)
await cache.init()

// getOrSet 推荐用法
const weather = await cache.getOrSet(
  'weather-beijing',
  '/api/weather',
  async () => await fetchWeather('beijing'),
  1800000
)
```

**测试**: 5 个测试全部通过

### voice-clone 技能 (2026-03-06 新增)

声音克隆，基于 CosyVoice/FishSpeech，GPU 加速。

**位置**: `skills/voice-clone/`

**使用示例**:
```typescript
import { quickClone } from 'skills/voice-clone/src/index.ts'

const result = await quickClone(
  'my-voice.wav',
  '这是我的克隆声音'
)
```

### whisper-local 技能 (2026-03-06 新增)

本地语音识别，GPU 加速。

**位置**: `skills/whisper-local/`

---

## 📊 技能依赖关系

```
volcano-voice (TTS 服务)
    ↓ 使用
stream-queue (队列)
    ↑ 封装
memory-search-queue (搜索队列)

duckdb-memory (本地数据库)
    └── 独立使用
```

---

Add whatever helps you do your job. This is your cheat sheet.
