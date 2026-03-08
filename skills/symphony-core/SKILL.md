# symphony-core - OpenClaw Symphony 核心编排器

> 基于 Symphony SPEC v1 设计的任务编排核心

## 功能

- 📋 **WORKFLOW.md 加载器** - 解析 YAML front matter + prompt template
- ⚙️ **配置层** - 类型化配置 getters + 环境变量解析
- 🔄 **Orchestrator** - 轮询、分发、重试、协调状态机
- 📊 **运行时状态** - 内存中权威状态管理

## 使用示例

```typescript
import { createSymphony } from 'skills/symphony-core/src/index.ts'

const symphony = await createSymphony({
  workflowPath: './WORKFLOW.md',
})

// 启动轮询
await symphony.start()

// 查询状态
const snapshot = await symphony.getSnapshot()
console.log(`运行中：${snapshot.running.length}`)

// 停止
await symphony.stop()
```

## 配置示例 (WORKFLOW.md)

```yaml
---
tracker:
  kind: github
  project_slug: your-org/your-repo
  api_key: $GITHUB_TOKEN

polling:
  interval_ms: 30000

workspace:
  root: ./symphony_workspaces

agent:
  max_concurrent_agents: 3
  max_turns: 20
---

你正在处理 GitHub issue {{ issue.identifier }}...
```

## API

### `createSymphony(options)`

创建 Symphony 实例

```typescript
interface CreateOptions {
  workflowPath?: string;  // WORKFLOW.md 路径，默认 ./WORKFLOW.md
}
```

### `symphony.start()`

启动轮询循环

### `symphony.stop()`

停止轮询，等待运行中任务完成

### `symphony.getSnapshot()`

获取运行时快照

```typescript
interface RuntimeSnapshot {
  running: RunningEntry[];
  retrying: RetryEntry[];
  codex_totals: TokenTotals;
}
```

## 状态机

```
Unclaimed → Claimed → Running → Released
                      ↓
                RetryQueued → Released
```

## 文件结构

```
skills/symphony-core/
├── SKILL.md
├── src/
│   ├── index.ts          # 统一入口
│   ├── workflow-loader.ts # WORKFLOW.md 加载
│   ├── config.ts         # 配置层
│   ├── orchestrator.ts   # 核心编排器
│   └── types.ts          # 类型定义
├── test/
│   └── core.test.ts
└── package.json
```

## 依赖

- `js-yaml` - YAML 解析
- `liquidjs` - Prompt 模板渲染
- `chokidar` - 文件监听（热加载）

## 状态

🚧 开发中

---

**版本**: 0.1.0  
**创建时间**: 2026-03-08  
**基于**: OpenAI Symphony SPEC v1
