# 🎵 Symphony System - 完整使用手册

> OpenClaw Symphony Auto-Matching System  
> 版本：0.2.0 | 状态：Phase 2 Core Complete (95%)  
> 最后更新：2026-03-09 15:15

---

## 📖 目录

1. [快速开始](#快速开始)
2. [系统架构](#系统架构)
3. [配置指南](#配置指南)
4. [API 参考](#api-参考)
5. [使用示例](#使用示例)
6. [故障排查](#故障排查)
7. [最佳实践](#最佳实践)

---

## 🚀 快速开始

### 5 分钟上手

#### 1. 安装依赖
```bash
cd skills/symphony-core
npm install
```

#### 2. 配置 GitHub Token
```bash
# 方式 1: 环境变量
$env:GITHUB_TOKEN="ghp_xxx"

# 方式 2: OpenClaw secrets
openclaw secrets set GITHUB_TOKEN ghp_xxx
```

#### 3. 创建 WORKFLOW.md
```yaml
---
tracker:
  kind: github
  api_key: ${GITHUB_TOKEN}
  project_slug: your-org/your-repo

polling:
  interval_ms: 30000  # 30 秒

agent:
  max_concurrent_agents: 3
---

你正在处理 GitHub issue {{ issue.identifier }}。

## 任务
{{ issue.title }}

## 描述
{{ issue.description }}

## 要求
1. 分析需求
2. 实现解决方案
3. 提交代码
```

#### 4. 启动 Symphony
```typescript
import { createSymphony } from 'skills/symphony-core/src/index.ts'

const symphony = await createSymphony({
  workflowPath: './WORKFLOW.md',
  httpPort: 8765,  // Dashboard 端口
})

await symphony.start()
console.log('Symphony 已启动！')
```

#### 5. 监控状态
- HTTP Dashboard: http://localhost:8765
- 日志文件：`memory/2026-03-09.md`

---

## 🏗️ 系统架构

### 核心组件

```
┌─────────────────────────────────────────────┐
│            Symphony Core                    │
├─────────────────────────────────────────────┤
│  WorkflowLoader → ConfigLayer → Orchestrator │
│       ↓              ↓              ↓        │
│   YAML 解析      配置验证      任务调度      │
└─────────────────────────────────────────────┘
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
GitHub Adapter    Workspace Manager
    ↓                   ↓
Issue 轮询         工作空间创建
```

### 工作流程

```
GitHub Issues
     ↓
[轮询] 每 30 秒检查
     ↓
[过滤] 未处理的 open issues
     ↓
[分发] 创建子代理
     ↓
[执行] 在工作空间中处理
     ↓
[提交] PR + 更新 issue
     ↓
[记录] 写入日志
```

---

## ⚙️ 配置指南

### WORKFLOW.md 完整配置

```yaml
---
# Issue 追踪器配置
tracker:
  kind: github  # 或 linear
  endpoint: https://api.github.com/graphql
  api_key: ${GITHUB_TOKEN}
  project_slug: owner/repo
  active_states: ["open"]
  terminal_states: ["closed"]
  labels: ["bug", "feature"]  # 可选，过滤标签

# 轮询配置
polling:
  interval_ms: 30000  # 30 秒

# 工作空间配置
workspace:
  root: ./symphony_workspaces
  # 钩子配置
  hooks:
    after_create: |
      git clone --depth 1 https://github.com/owner/repo.git .
      npm install
    before_run: npm run build
    after_run: echo "Done"
    timeout_ms: 60000

# 智能体配置
agent:
  max_concurrent_agents: 3
  max_turns: 20
  max_retry_backoff_ms: 300000  # 5 分钟
  # 按状态控制并发
  max_concurrent_agents_by_state:
    open: 3
    in_progress: 2

# Codex 配置
codex:
  command: openclaw subagent run
  approval_policy: auto
  turn_timeout_ms: 3600000  # 1 小时
  stall_timeout_ms: 300000  # 5 分钟
---

# Prompt 模板
你正在处理 {{ issue.identifier }}。

**标题**: {{ issue.title }}
**标签**: {{ issue.labels | join(', ') }}

请完成以下任务：
{{ issue.description }}
```

### 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `GITHUB_TOKEN` | GitHub API Token | `ghp_xxx` |
| `SYMPHONY_LOG_LEVEL` | 日志级别 | `debug`, `info`, `warn` |
| `SYMPHONY_WORKSPACE_ROOT` | 工作空间根目录 | `./workspaces` |

---

## 📚 API 参考

### createSymphony(options)

创建 Symphony 实例。

```typescript
interface CreateSymphonyOptions {
  workflowPath?: string      // WORKFLOW.md 路径，默认 './WORKFLOW.md'
  httpPort?: number          // HTTP Dashboard 端口，0 表示禁用
  sessions_spawn?: Function  // OpenClaw sessions_spawn 注入
  sessions_send?: Function   // OpenClaw sessions_send 注入
}
```

**示例**:
```typescript
const symphony = await createSymphony({
  workflowPath: './WORKFLOW.md',
  httpPort: 8765,
})
```

---

### symphony.start()

启动轮询循环。

```typescript
await symphony.start()
```

**行为**:
1. 初始化 GitHub adapter 和 workspace manager
2. 验证配置
3. 启动 HTTP Dashboard（如果启用）
4. 开始轮询（每 30 秒）
5. 立即执行一次轮询

---

### symphony.stop()

停止轮询，等待运行中任务完成。

```typescript
await symphony.stop()
```

---

### symphony.getSnapshot()

获取运行时快照。

```typescript
interface RuntimeSnapshot {
  running: RunningEntry[]      // 运行中的任务
  retrying: RetryEntry[]       // 重试中的任务
  completed: string[]          // 已完成的 issue IDs
  codex_totals: {
    input_tokens: number
    output_tokens: number
    total_tokens: number
    seconds_running: number
  }
}
```

**示例**:
```typescript
const snapshot = await symphony.getSnapshot()
console.log(`运行中：${snapshot.running.length}`)
console.log(`Token 使用：${snapshot.codex_totals.total_tokens}`)
```

---

### symphony.triggerPoll()

手动触发一次轮询。

```typescript
await symphony.triggerPoll()
```

**用途**: 测试或紧急处理新 issues

---

### symphony.isRunning()

检查是否运行中。

```typescript
if (symphony.isRunning()) {
  console.log('Symphony 正在运行')
}
```

---

## 💡 使用示例

### 示例 1: 基础用法

```typescript
import { createSymphony } from 'skills/symphony-core/src/index.ts'

async function main() {
  const symphony = await createSymphony()
  await symphony.start()
  
  // 运行 1 小时
  await new Promise(resolve => setTimeout(resolve, 3600000))
  
  await symphony.stop()
}

main()
```

---

### 示例 2: 监控状态

```typescript
const symphony = await createSymphony({ httpPort: 8765 })
await symphony.start()

// 每 5 分钟打印状态
setInterval(async () => {
  const snapshot = await symphony.getSnapshot()
  console.log(`[${new Date().toISOString()}]`)
  console.log(`  运行中：${snapshot.running.length}`)
  console.log(`  Token: ${snapshot.codex_totals.total_tokens}`)
}, 300000)
```

---

### 示例 3: 错误处理

```typescript
try {
  await symphony.start()
} catch (error) {
  if (error.name === 'ConfigError') {
    console.error('配置错误:', error.message)
  } else if (error.name === 'GitHubError') {
    console.error('GitHub API 错误:', error.message)
  } else {
    console.error('未知错误:', error)
  }
}
```

---

### 示例 4: 自定义 Subagent

```typescript
const symphony = await createSymphony({
  sessions_spawn: async (task) => {
    // 自定义 subagent 启动逻辑
    return await myCustomSpawn(task)
  },
})
```

---

## 🔧 故障排查

### 问题 1: GitHub API 限流

**症状**: `GitHub API rate limit exceeded`

**解决**:
```yaml
polling:
  interval_ms: 60000  # 增加到 60 秒
```

或升级 GitHub Token 限流。

---

### 问题 2: Subagent 无法启动

**症状**: `sessions_spawn is not defined`

**解决**: 确保在 OpenClaw 会话中运行，或注入 `sessions_spawn`:
```typescript
const symphony = await createSymphony({
  sessions_spawn: globalThis.sessions_spawn,
})
```

---

### 问题 3: 工作空间创建失败

**症状**: `Workspace creation failed`

**检查**:
1. 工作空间根目录是否存在
2. 磁盘空间是否充足
3. 钩子脚本是否正确

**解决**:
```yaml
workspace:
  root: ./symphony_workspaces  # 确保路径正确
  hooks:
    after_create: |
      echo "Debug: Creating workspace..."
      git clone ...
```

---

### 问题 4: Issue 未捕获

**症状**: GitHub 有 open issues，但 Symphony 未处理

**检查**:
1. WORKFLOW.md 中 `project_slug` 是否正确
2. `active_states` 是否包含 `"open"`
3. GitHub Token 是否有权限

**调试**:
```typescript
const snapshot = await symphony.getSnapshot()
console.log('Issues:', snapshot.running)
```

---

## 📊 最佳实践

### 1. 配置管理

✅ **推荐**:
```yaml
tracker:
  api_key: ${GITHUB_TOKEN}  # 使用环境变量
```

❌ **不推荐**:
```yaml
tracker:
  api_key: ghp_xxx  # 硬编码 token
```

---

### 2. 并发控制

根据项目规模调整：
```yaml
agent:
  max_concurrent_agents: 3  # 小项目
  max_concurrent_agents: 10 # 大项目
```

---

### 3. 日志管理

启用详细日志：
```bash
$env:SYMPHONY_LOG_LEVEL="debug"
```

定期清理：
```bash
# 每周清理旧日志
find memory/ -name "*.md" -mtime +7 -delete
```

---

### 4. 错误恢复

配置重试：
```yaml
agent:
  max_retry_backoff_ms: 300000  # 5 分钟
```

监控重试队列：
```typescript
const snapshot = await symphony.getSnapshot()
if (snapshot.retrying.length > 5) {
  console.warn('大量任务重试，检查系统状态')
}
```

---

### 5. 性能优化

**批量 API 调用**:
```typescript
// 一次获取多个 issue 状态
const states = await github.fetchIssueStates(issueIds)
```

**缓存 Workflows**:
```typescript
const workflow = await loader.load()  // 自动缓存
```

---

## 📈 监控和告警

### HTTP Dashboard

访问：http://localhost:8765

**指标**:
- 运行中任务数
- 重试队列长度
- Token 使用量
- 系统健康状态

---

### 日志文件

位置：`memory/日期.md`

**搜索**:
```bash
grep "Symphony" memory/2026-03-09.md
```

---

### 告警集成（待实现）

```yaml
alerts:
  feishu_webhook: ${FEISHU_WEBHOOK}
  telegram_chat_id: ${TELEGRAM_CHAT_ID}
  conditions:
    - retry_queue > 10
    - error_rate > 0.1
```

---

## 🎯 下一步

### Phase 7 (优化)
- [ ] Feishu/Telegram 告警
- [ ] Linear 适配器
- [ ] 批量 API 优化

### Phase 8 (扩展)
- [ ] Web Dashboard 可视化
- [ ] 多仓库支持
- [ ] 自定义工作流

---

## 📚 相关资源

- [设计文档](./docs/SYMPHONY-DESIGN.md)
- [测试报告](./skills/symphony-core/PHASE2-TEST-REPORT.md)
- [GitHub 仓库](https://github.com/xaiohuangningde/symphony-test)
- [Symphony SPEC v1](https://github.com/openai/symphony-spec)

---

**Symphony System v0.2.0** | 🥷 xiaoxiaohuang
