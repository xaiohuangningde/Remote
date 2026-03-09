# Symphony 快速入门指南

> 🎵 自动化处理 GitHub Issues 的智能编排系统

---

## 🚀 5 分钟快速开始

### 1️⃣ 安装依赖

```bash
cd skills/symphony-core
npm install
```

### 2️⃣ 配置 GitHub Token

**方式 A: 环境变量（推荐）**

```bash
# PowerShell
$env:GITHUB_TOKEN = "github_pat_xxx"
$env:WORKSPACE_ROOT = "C:\Users\12132\.openclaw\workspace"

# Bash
export GITHUB_TOKEN="github_pat_xxx"
export WORKSPACE_ROOT="/path/to/workspace"
```

**方式 B: 直接编辑 WORKFLOW.md**

```yaml
tracker:
  kind: github
  api_key: "github_pat_xxx"  # 直接填入
  project_slug: "your-username/your-repo"
```

**获取 GitHub Token**:
1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 勾选权限：`repo` (Full control of private repositories)
4. 生成并复制 token

### 3️⃣ 编辑 WORKFLOW.md

```yaml
---
tracker:
  kind: github
  project_slug: "your-username/your-repo"  # 改成你的仓库
  api_key: $GITHUB_TOKEN

polling:
  interval_ms: 30000  # 30 秒轮询一次

workspace:
  root: "${WORKSPACE_ROOT}"

agent:
  max_concurrent_agents: 3  # 最多同时运行 3 个 agent
---

你正在处理 GitHub issue {{ issue.identifier }}...

请完成以下任务：
{{ issue.title }}

描述：{{ issue.description }}
```

### 4️⃣ 运行测试

```bash
# 独立测试（不需要 OpenClaw 会话）
npx tsx test-phase2-standalone.ts

# 完整测试（需要 OpenClaw 会话）
npx tsx test-phase2-integration.ts
```

### 5️⃣ 启动 Symphony

**在 OpenClaw 主会话中**:

```typescript
import { createSymphony } from 'skills/symphony-core/src/index.ts'

const symphony = await createSymphony({
  workflowPath: './WORKFLOW.md',
  httpPort: 8765,  // 可选：HTTP 监控端口
})

await symphony.start()
console.log('🎵 Symphony 已启动')
console.log('📊 监控面板：http://localhost:8765')
```

或者使用启动脚本：

```bash
npx tsx start.ts
```

---

## 📊 监控面板

启动后访问 http://localhost:8765 查看：

- **运行中任务**: 当前正在处理的 issues
- **重试队列**: 等待重试的任务
- **Token 使用**: Codex 消耗的 tokens
- **手动触发**: 立即执行轮询

**API 端点**:
- `GET /status` - 服务状态
- `GET /snapshot` - 运行时快照
- `POST /trigger-poll` - 手动触发轮询

---

## 🎯 使用示例

### 示例 1: 自动修复 Bug

1. 在 GitHub 创建 issue:
   ```
   Title: Fix login button not responding
   Labels: bug, priority-1
   ```

2. Symphony 自动检测到 issue

3. 创建 subagent 处理任务

4. Subagent 分析代码并修复

5. 自动提交 PR

### 示例 2: 批量处理任务

```yaml
agent:
  max_concurrent_agents: 5  # 同时处理 5 个任务
```

Symphony 会并行处理多个 issues，提高效率。

---

## 🔧 配置选项

### Tracker 配置

```yaml
tracker:
  kind: github              # 或 'linear'
  endpoint: https://api.github.com/graphql
  api_key: $GITHUB_TOKEN
  project_slug: owner/repo
  active_states: ["open"]   # 处理哪些状态
  terminal_states: ["closed"]  # 终止状态
```

### 轮询配置

```yaml
polling:
  interval_ms: 30000  # 30 秒
```

### 工作空间配置

```yaml
workspace:
  root: "${WORKSPACE_ROOT}"
  prefix: "symphony-workspace"
  cleanup_on_complete: true  # 完成后清理
```

### Agent 配置

```yaml
agent:
  max_concurrent_agents: 10        # 最大并发数
  max_turns: 20                    # 每个 agent 最大轮次
  max_retry_backoff_ms: 300000     # 最大重试延迟 (5 分钟)
  
  # 按状态限制并发
  max_concurrent_agents_by_state:
    open: 5
    in_progress: 3
```

### Codex 配置

```yaml
codex:
  command: "openclaw subagent run"  # 启动命令
  approval_policy: "auto"           # auto/manual
  turn_timeout_ms: 3600000          # 1 小时超时
  stall_timeout_ms: 300000          # 5 分钟停滞检测
```

---

## 📁 目录结构

```
skills/symphony-core/
├── SKILL.md                  # 技能说明
├── WORKFLOW.md               # 工作流配置
├── QUICKSTART.md             # 本文件
├── PHASE2-TEST-REPORT.md     # 测试报告
├── package.json
├── src/
│   ├── index.ts              # 统一入口
│   ├── orchestrator.ts       # 核心编排器
│   ├── config.ts             # 配置层
│   ├── workflow-loader.ts    # WORKFLOW.md 加载
│   ├── types.ts              # 类型定义
│   ├── http-server.ts        # HTTP 监控服务器
│   └── logger.ts             # 日志记录
├── test/
│   ├── core.test.ts          # 核心测试
│   ├── e2e-simple.test.ts    # 简化 E2E
│   └── workflow-loader.test.ts
└── test-phase2-standalone.ts # 独立测试
```

---

## 🐛 故障排查

### 问题 1: 配置验证失败

**错误**: `tracker.api_key is required`

**解决**:
```bash
# 检查环境变量
echo $env:GITHUB_TOKEN

# 或在 WORKFLOW.md 中直接配置
api_key: "github_pat_xxx"
```

### 问题 2: GitHub API 限流

**错误**: `GitHub API rate limit exceeded`

**解决**:
- 等待限流重置（查看 `X-RateLimit-Reset` 头）
- 增加轮询间隔
- 使用 GitHub App token（更高管制）

### 问题 3: 工作空间路径错误

**错误**: `Cannot create workspace at ${WORKSPACE_ROOT}`

**解决**:
```bash
# 设置环境变量
$env:WORKSPACE_ROOT = "C:\Users\12132\.openclaw\workspace"

# 或使用绝对路径
workspace:
  root: "C:/Users/12132/.openclaw/workspace"
```

### 问题 4: Subagent 无法启动

**错误**: `sessions_spawn is not defined`

**解决**: 确保在 OpenClaw 主会话中运行，而不是独立脚本。

---

## 📊 测试报告

运行测试查看完整报告：

```bash
npx tsx test-phase2-standalone.ts
```

**测试结果**: ✅ 10/10 通过

- ✅ WORKFLOW.md 加载
- ✅ 配置验证
- ✅ 编排器初始化
- ✅ 获取 issues
- ✅ 工作空间管理
- ✅ Prompt 构建
- ✅ 状态同步
- ✅ 运行时快照
- ✅ HTTP 服务器
- ✅ 重试队列

---

## 🎓 进阶使用

### 自定义 Prompt 模板

```markdown
---
# ... 配置 ...
---

# 任务指令

你是一个专业的软件工程师。请完成以下任务：

## Issue 信息
- **编号**: {{ issue.identifier }}
- **标题**: {{ issue.title }}
- **优先级**: {{ issue.priority }}
- **标签**: {{ issue.labels.join(', ') }}

## 要求
1. 分析代码结构
2. 实现解决方案
3. 编写测试
4. 更新文档

## 提交
完成后创建 Pull Request，标题格式：
`Fix: {{ issue.title }}`
```

### 钩子函数

```yaml
hooks:
  after_create: "echo '工作空间已创建'"
  before_run: "npm install"
  after_run: "npm test"
  before_remove: "rm -rf node_modules"
  timeout_ms: 60000
```

### 按标签过滤

在 WORKFLOW.md 中添加：

```yaml
tracker:
  labels: ["bug", "feature"]  # 只处理这些标签的 issues
```

---

## 🔗 相关资源

- [Symphony SPEC v1](https://github.com/OpenAI/symphony-spec)
- [OpenClaw 文档](https://openclaw.dev)
- [GitHub GraphQL API](https://docs.github.com/en/graphql)

---

## 💬 获取帮助

遇到问题？

1. 查看测试报告：`PHASE2-TEST-REPORT.md`
2. 检查进度：`PHASE2-PROGRESS.md`
3. 查看日志：`memory/YYYY-MM-DD.md`

---

**最后更新**: 2026-03-09  
**版本**: 0.2.0 (Phase 2)
