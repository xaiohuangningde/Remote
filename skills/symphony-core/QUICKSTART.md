# Symphony 快速开始指南

> 5 分钟上手 OpenClaw Symphony 任务编排系统

---

## 1️⃣ 准备工作

### 获取 GitHub Token

1. 访问 https://github.com/settings/tokens
2. 创建新的 Personal Access Token
3. 勾选权限：`repo`（完整仓库权限）
4. 复制 token，保存为环境变量

```bash
# Windows PowerShell
$env:GITHUB_TOKEN = "ghp_xxxxxxxxxxxx"

# 或添加到 .env 文件
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

---

## 2️⃣ 创建 WORKFLOW.md

在项目根目录创建 `WORKFLOW.md`：

```markdown
---
tracker:
  kind: github
  project_slug: your-org/your-repo
  api_key: $GITHUB_TOKEN
  active_states: ["open"]
  terminal_states: ["closed"]

polling:
  interval_ms: 30000

workspace:
  root: ./symphony_workspaces

agent:
  max_concurrent_agents: 3
  max_turns: 20
---

你正在处理 GitHub issue **{{ issue.identifier }}**。

## 标题
{{ issue.title }}

## 描述
{{ issue.description }}

## 要求
1. 分析任务需求
2. 实现解决方案
3. 编写测试
4. 提交 PR

完成后请提供工作证明（代码改动 + 测试结果）。
```

**替换**:
- `your-org/your-repo` → 你的 GitHub 仓库

---

## 3️⃣ 安装依赖

```bash
cd skills/symphony-core
npm install js-yaml liquidjs chokidar
```

---

## 4️⃣ 启动 Symphony

### 方式 1: TypeScript 直接运行

```typescript
import { createSymphony } from 'skills/symphony-core/src/index.ts'

const symphony = await createSymphony({
  workflowPath: './WORKFLOW.md',
})

await symphony.start()
console.log('Symphony started!')

// 查看状态
const snapshot = await symphony.getSnapshot()
console.log(snapshot)
```

### 方式 2: OpenClaw 会话

```
/ sessions_spawn task="启动 Symphony" runtime="subagent"
```

---

## 5️⃣ 验证运行

### 检查工作空间

```bash
ls -la ./symphony_workspaces/
# 应该看到以 issue identifier 命名的目录
```

### 查看日志

```bash
# 结构化日志输出到控制台
# 格式：[Orchestrator] Dispatched GH-123 → session_key
```

### 查询状态

```typescript
const snapshot = await symphony.getSnapshot()

console.log(`运行中任务：${snapshot.counts.running}`)
console.log(`重试队列：${snapshot.counts.retrying}`)

for (const task of snapshot.running) {
  console.log(`- ${task.issue_identifier}: ${task.turn_count} turns`)
}
```

---

## 🐛 故障排查

### 问题 1: "Configuration validation failed"

**原因**: 缺少必填配置

**解决**:
```yaml
# 检查 WORKFLOW.md
tracker:
  api_key: $GITHUB_TOKEN  # 确保 GITHUB_TOKEN 环境变量存在
  project_slug: owner/repo  # 确保格式正确
```

### 问题 2: "No issues found"

**原因**: 仓库没有 open 状态的 issues

**解决**:
- 创建一个测试 issue
- 或检查 `active_states` 配置

### 问题 3: "Hook failed: after_create"

**原因**: git clone 失败（权限/网络）

**解决**:
```yaml
hooks:
  after_create: |
    # 使用 HTTPS 而非 SSH
    git clone https://github.com/owner/repo.git .
```

---

## 📚 下一步

- 📖 阅读 `docs/SYMPHONY-DESIGN.md` 了解完整设计
- 🔧 自定义 `WORKFLOW.md` 配置你的工作流
- 🧪 编写测试用例
- 📊 添加 HTTP dashboard（可选）

---

## 🎯 核心概念速查

| 概念 | 说明 |
|------|------|
| **WORKFLOW.md** | 任务编排配置文件（YAML + prompt） |
| **Orchestrator** | 核心调度器，负责任务分发 |
| **Workspace** | 每个任务的隔离工作目录 |
| **Hook** | 生命周期脚本（git clone, npm install 等） |
| **Tick** | 轮询周期（默认 30 秒） |
| **Reconciliation** | 协调运行中任务的状态同步 |

---

**版本**: 0.1.0  
**更新时间**: 2026-03-08
