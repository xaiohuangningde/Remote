# OpenClaw Symphony 协议设计

> 基于 OpenAI Symphony SPEC.md v1 设计
> 适配 OpenClaw 架构的任务编排协议
> 创建时间：2026-03-08

---

## 1. 核心设计原则

### 1.1 Symphony 解决的四大问题

| 问题 | Symphony 方案 | OpenClaw 映射 |
|------|-------------|--------------|
| 手动脚本执行 | Daemon 工作流 | `evolver` cron + `orchestrator` |
| 智能体隔离 | 每任务工作空间 | `subagent` 隔离会话 |
| 策略版本控制 | `WORKFLOW.md` 仓库内配置 | `tasks/todo.md` + `HEARTBEAT.md` |
| 可观测性 | 结构化日志 + Dashboard | `memory/日期.md` + `session_status` |

### 1.2 设计哲学

```
OpenClaw Symphony = Symphony 协议 × OpenClaw 原生能力

- 不重复造轮子：复用现有技能 (subagent-queue, orchestrator, todo-manager)
- 保持轻量：不需要持久化数据库，状态恢复基于文件系统
- 仓库即配置：WORKFLOW.md 版本化，动态热加载
- 隔离执行：每个任务独立工作空间 + 独立会话
```

---

## 2. 架构对比与映射

### 2.1 组件映射表

| Symphony 组件 | OpenClaw 对应 | 实现状态 | 改造需求 |
|--------------|--------------|---------|---------|
| **Workflow Loader** | `planning-with-files` | ✅ 已有 | 增加 YAML front matter 解析 |
| **Config Layer** | `HEARTBEAT.md` + `tools.json` | ⚠️ 部分 | 增加类型化配置 getters |
| **Issue Tracker Client** | `github` skill + `gh-issues` | ✅ 已有 | 增加 Linear/GitHub 轮询 |
| **Orchestrator** | `orchestrator` + `subagent-queue` | ✅ 已有 | 增加状态机 + 重试队列 |
| **Workspace Manager** | 文件系统 + `exec` | ⚠️ 部分 | 增加工作空间生命周期钩子 |
| **Agent Runner** | `sessions_spawn` | ✅ 已有 | 增加 app-server 协议封装 |
| **Status Surface** | `session_status` + 消息推送 | ⚠️ 部分 | 增加 HTTP dashboard (可选) |
| **Logging** | `memory/日期.md` | ✅ 已有 | 增加结构化日志格式 |

### 2.2 架构分层

```
┌─────────────────────────────────────────────────────────┐
│                    Policy Layer                         │
│  WORKFLOW.md (YAML front matter + prompt template)      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                 Configuration Layer                     │
│  Typed config getters + env resolution + validation     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Coordination Layer                     │
│  Orchestrator: poll tick, dispatch, retry, reconcile    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    Execution Layer                      │
│  Workspace lifecycle + subagent session management      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   Integration Layer                     │
│  GitHub/Linear API adapters + normalization             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Observability Layer                    │
│  Structured logs + memory files + status snapshots      │
└─────────────────────────────────────────────────────────┘
```

---

## 3. 核心领域模型

### 3.1 Issue (任务)

```typescript
interface Issue {
  // 标识符
  id: string;           // GitHub issue ID 或 Linear ID
  identifier: string;   // 人类可读标识，如 "GH-123" 或 "ABC-123"
  
  // 内容
  title: string;
  description: string | null;
  
  // 元数据
  priority: number | null;  // 1-4，越小优先级越高
  state: string;            // 状态：Todo, In Progress, Done, etc.
  labels: string[];         // 小写标签列表
  branch_name: string | null;
  url: string | null;
  
  // 依赖关系
  blocked_by: BlockerRef[];
  
  // 时间戳
  created_at: string | null;
  updated_at: string | null;
}

interface BlockerRef {
  id: string | null;
  identifier: string | null;
  state: string | null;
}
```

### 3.2 Workflow Definition (WORKFLOW.md)

```yaml
---
# YAML front matter
tracker:
  kind: github  # 或 linear
  endpoint: https://api.github.com/graphql
  api_key: $GITHUB_TOKEN
  project_slug: my-org/my-repo
  active_states: ["open"]
  terminal_states: ["closed", "done"]

polling:
  interval_ms: 30000  # 30 秒

workspace:
  root: ./symphony_workspaces  # 或使用 $VAR

hooks:
  after_create: |
    git clone git@github.com:my-org/my-repo.git .
    npm install
  before_run: |
    npm run build
  after_run: echo "Done"
  timeout_ms: 60000

agent:
  max_concurrent_agents: 5
  max_turns: 20
  max_retry_backoff_ms: 300000  # 5 分钟

codex:
  command: openclaw subagent run
  approval_policy: auto  # OpenClaw 自定义
  turn_timeout_ms: 3600000
  stall_timeout_ms: 300000
---

# Markdown prompt template
你正在处理 GitHub issue {{ issue.identifier }}。

## 标题
{{ issue.title }}

## 描述
{{ issue.description }}

## 标签
{{ issue.labels | join(', ') }}

请完成此任务并提供工作证明。
```

### 3.3 Orchestrator Runtime State

```typescript
interface OrchestratorState {
  // 配置
  poll_interval_ms: number;
  max_concurrent_agents: number;
  
  // 运行中任务
  running: Map<string, RunningEntry>;  // issue_id → running entry
  
  // 已声明任务（防止重复分发）
  claimed: Set<string>;  // issue_id set
  
  // 重试队列
  retry_attempts: Map<string, RetryEntry>;  // issue_id → retry entry
  
  // 已完成（仅用于统计）
  completed: Set<string>;
  
  // 指标
  codex_totals: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    seconds_running: number;
  };
}

interface RunningEntry {
  issue_id: string;
  issue_identifier: string;
  workspace_path: string;
  session_key: string;  // OpenClaw 会话 key
  started_at: number;
  status: 'running' | 'paused' | 'stalled';
  last_event_at: number | null;
  turn_count: number;
  error?: string;
}

interface RetryEntry {
  issue_id: string;
  identifier: string;
  attempt: number;  // 1-based
  due_at_ms: number;
  error: string | null;
}
```

### 3.4 任务状态机

```
┌─────────────┐
│  Unclaimed  │ ← 初始状态，等待分发
└──────┬──────┘
       │ dispatch
       ↓
┌─────────────┐
│   Claimed   │ ← 已保留，防止重复分发
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
   ↓       ↓
┌──────────┐   ┌─────────────┐
│ Running  │   │ RetryQueued │
└────┬─────┘   └──────┬──────┘
     │                │
     │ exit           │ timer fired
     ↓                ↓
┌─────────────────────────┐
│       Released          │ ← 终端状态，claim 释放
└─────────────────────────┘
```

### 3.5 Run Attempt 生命周期

```
1. PreparingWorkspace  → 准备工作空间
2. BuildingPrompt      → 构建 prompt
3. LaunchingAgent      → 启动 subagent
4. InitializingSession → 初始化会话
5. StreamingTurn       → 执行 turn
6. Finishing           → 完成清理
7. Succeeded           → 成功
8. Failed              → 失败
9. TimedOut            → 超时
10. Stalled            → 停滞
11. CanceledByReconcile → 被 reconciliation 取消
```

---

## 4. 核心流程设计

### 4.1 Poll Loop (轮询循环)

```typescript
async function pollLoop() {
  while (true) {
    // 1. Reconciliation (协调运行中任务)
    await reconcile();
    
    // 2. Validation (验证配置)
    const validation = await validateWorkflow();
    if (!validation.ok) {
      log.error(`Dispatch skipped: ${validation.error}`);
      await sleep(poll_interval_ms);
      continue;
    }
    
    // 3. Fetch candidates (获取候选任务)
    const candidates = await fetchCandidateIssues();
    
    // 4. Sort by priority (按优先级排序)
    candidates.sort(byPriority);
    
    // 5. Dispatch (分发直到槽位用完)
    const availableSlots = max_concurrent_agents - running.size;
    for (const issue of candidates.slice(0, availableSlots)) {
      await dispatch(issue);
    }
    
    // 6. Notify observability (通知观测系统)
    emitStateChange();
    
    await sleep(poll_interval_ms);
  }
}
```

### 4.2 Dispatch Eligibility (分发资格)

任务必须满足**所有**条件才能被分发：

1. ✅ 有 `id`, `identifier`, `title`, `state`
2. ✅ 状态在 `active_states` 且不在 `terminal_states`
3. ✅ 不在 `running` 中
4. ✅ 不在 `claimed` 中
5. ✅ 全局并发槽位可用
6. ✅ 按状态的并发槽位可用（如果配置了）
7. ✅ 如果是 `Todo` 状态，没有非终端阻塞任务

### 4.3 Retry & Backoff (重试与退避)

```typescript
// 退避公式
function calculateBackoff(attempt: number): number {
  // 正常 continuation 重试：固定 1 秒
  if (exitReason === 'normal') {
    return 1000;
  }
  
  // 失败重试：指数退避
  const baseDelay = 10000;  // 10 秒
  const maxBackoff = 300000;  // 5 分钟
  return Math.min(baseDelay * Math.pow(2, attempt - 1), maxBackoff);
}
```

### 4.4 Reconciliation (协调)

每个 tick 都要运行，分为两部分：

**Part A: Stall Detection (停滞检测)**
```typescript
for (const [issueId, entry] of running) {
  const elapsed = now() - (entry.last_event_at ?? entry.started_at);
  if (elapsed > stall_timeout_ms) {
    terminateWorker(issueId);
    scheduleRetry(issueId, 'stalled');
  }
}
```

**Part B: Tracker State Refresh (任务状态刷新)**
```typescript
const states = await fetchIssueStates(running.keys());
for (const [issueId, state] of states) {
  if (isTerminal(state)) {
    terminateWorker(issueId);
    cleanupWorkspace(issueId);
  } else if (isActive(state)) {
    updateIssueSnapshot(issueId, state);
  } else {
    terminateWorker(issueId);  // 非活跃非终端，不清理工作空间
  }
}
```

---

## 5. 工作空间管理

### 5.1 布局

```
<workspace.root>/
├── <sanitized_issue_identifier_1>/
│   ├── .git/
│   ├── src/
│   └── ...
├── <sanitized_issue_identifier_2>/
└── ...
```

### 5.2 Workspace Key  sanitization

```typescript
function sanitizeWorkspaceKey(identifier: string): string {
  // 只允许 [A-Za-z0-9._-]，其他字符替换为 _
  return identifier.replace(/[^A-Za-z0-9._-]/g, '_');
}

// 示例
"GH-123: Fix bug" → "GH-123_Fix_bug"
"Issue/测试" → "Issue_测试"
```

### 5.3 生命周期钩子

| 钩子 | 触发时机 | 失败处理 |
|------|---------|---------|
| `after_create` | 工作空间首次创建 | 中止创建 |
| `before_run` | 每次运行前 | 中止本次运行 |
| `after_run` | 每次运行后 | 记录日志，忽略 |
| `before_remove` | 删除工作空间前 | 记录日志，忽略 |

### 5.4 安全不变量

```typescript
// Invariant 1: 只在工作空间内运行
assert(cwd === workspace_path);

// Invariant 2: 工作空间必须在 root 内
const normalizedWorkspace = normalize(workspace_path);
const normalizedRoot = normalize(workspace_root);
assert(normalizedWorkspace.startsWith(normalizedRoot));

// Invariant 3: workspace key 已清理
assert(/^[A-Za-z0-9._-]+$/.test(workspace_key));
```

---

## 6. Subagent 集成协议

### 6.1 会话启动握手

```typescript
// 1. 创建 subagent 会话
const session = await sessions_spawn({
  task: renderedPrompt,
  mode: 'session',  // 持久会话
  runtime: 'subagent',
  label: issue.identifier,
  cwd: workspace_path,
});

// 2. 监听进度
session.on('message', (msg) => {
  emitEvent({
    event: 'agent_update',
    session_key: session.key,
    message: msg,
    timestamp: Date.now(),
  });
});

// 3. 等待完成
const result = await session.waitForCompletion({
  timeout: turn_timeout_ms,
});
```

### 6.2 Continuation Turns (连续执行)

```typescript
// 第一次 turn：完整 prompt
await sessions_spawn({
  task: fullPrompt,
  sessionKey: existingSessionKey,  // 复用会话
});

// 后续 turns：仅 continuation guidance
await sessions_send({
  sessionKey: existingSessionKey,
  message: '继续完成剩余任务，重点关注测试覆盖。',
});
```

### 6.3 事件映射

| Subagent 事件 | Symphony 事件 |
|--------------|--------------|
| `session_started` | `session_started` |
| `progress` | `notification` |
| `completed` | `turn_completed` |
| `failed` | `turn_failed` |
| `timeout` | `turn_timeout` |

---

## 7. GitHub 集成 (替代 Linear)

### 7.1 API 映射

| Linear 概念 | GitHub 对应 |
|------------|------------|
| Project | Repository |
| Issue | Issue |
| State (Todo/In Progress/Done) | State (open/closed) + Labels |
| Blocker | `blocked-by` label 或 Projects 依赖 |

### 7.2 GraphQL Query 示例

```graphql
# 获取候选 issues
query GetCandidateIssues($repo: String!, $owner: String!, $states: [IssueState!]) {
  repository(name: $repo, owner: $owner) {
    issues(states: $states, first: 50, orderBy: {field: CREATED_AT, direction: ASC}) {
      nodes {
        id
        number
        title
        body
        state
        createdAt
        updatedAt
        labels(first: 10) {
          nodes { name }
        }
      }
    }
  }
}

# 刷新运行中 issues 状态
query GetIssueStates($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on Issue {
      id
      state
    }
  }
}
```

### 7.3 状态映射

```typescript
const stateMapping = {
  // GitHub → Symphony
  'open': 'active',
  'closed': 'terminal',
  
  // 使用 labels 细化状态
  'status: todo': 'Todo',
  'status: in progress': 'In Progress',
  'status: done': 'Done',
};
```

---

## 8. 配置规范

### 8.1 配置优先级

```
1. CLI 启动参数 (最高优先级)
2. WORKFLOW.md YAML front matter
3. 环境变量 ($VAR 展开)
4. 内置默认值 (最低优先级)
```

### 8.2 必填字段验证

```typescript
interface ValidationErrors {
  missing_workflow_file?: true;
  workflow_parse_error?: { line: number; message: string };
  missing_tracker_api_key?: true;
  missing_tracker_project_slug?: true;
  codex_command_empty?: true;
}

function validateBeforeDispatch(): ValidationErrors | null {
  // 1. WORKFLOW.md 存在且可解析
  // 2. tracker.kind 支持
  // 3. tracker.api_key 存在（$ 展开后）
  // 4. tracker.project_slug 存在（如果需要）
  // 5. codex.command 非空
}
```

### 8.3 动态热加载

```typescript
// 监听 WORKFLOW.md 变化
watchFile('WORKFLOW.md', async () => {
  try {
    const newWorkflow = await loadWorkflow();
    
    // 更新配置（不影响运行中会话）
    poll_interval_ms = newWorkflow.config.polling?.interval_ms ?? 30000;
    max_concurrent_agents = newWorkflow.config.agent?.max_concurrent_agents ?? 10;
    
    log.info('Workflow reloaded successfully');
  } catch (err) {
    log.error(`Reload failed, keeping old config: ${err.message}`);
  }
});
```

---

## 9. 可观测性设计

### 9.1 结构化日志格式

```json
{
  "timestamp": "2026-03-08T13:30:00Z",
  "level": "info",
  "component": "orchestrator",
  "issue_id": "12345",
  "issue_identifier": "GH-123",
  "action": "dispatch",
  "outcome": "success",
  "details": {
    "workspace": "./symphony_workspaces/GH-123",
    "session_key": "abc123"
  }
}
```

### 9.2 Runtime Snapshot API (可选)

```typescript
interface RuntimeSnapshot {
  generated_at: string;
  counts: {
    running: number;
    retrying: number;
  };
  running: Array<{
    issue_id: string;
    issue_identifier: string;
    state: string;
    session_key: string;
    turn_count: number;
    started_at: string;
    last_event_at: string;
    tokens: {
      input_tokens: number;
      output_tokens: number;
      total_tokens: number;
    };
  }>;
  retrying: Array<{
    issue_id: string;
    identifier: string;
    attempt: number;
    due_at: string;
    error: string;
  }>;
  codex_totals: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    seconds_running: number;
  };
}
```

### 9.3 记忆文件整合

```markdown
# memory/2026-03-08.md

## Symphony 运行记录

### 运行中任务
- GH-123: Fix login bug (session: abc123, turns: 5)
- GH-124: Add unit tests (session: def456, turns: 3)

### 重试队列
- GH-120: API timeout (attempt 2, retry at 14:00)

### 今日统计
- 完成任务：8
- 总 token 消耗：125,000
- 平均运行时长：23 分钟
```

---

## 10. 实现路线图

### Phase 1: 核心编排器 (1-2 周)

- [ ] 实现 `WORKFLOW.md` 加载器（YAML front matter + prompt template）
- [ ] 实现配置层（typed getters + env resolution）
- [ ] 实现 GitHub issue 轮询器
- [ ] 实现 orchestrator 状态机
- [ ] 实现 subagent 启动协议

### Phase 2: 工作空间与钩子 (1 周)

- [ ] 实现工作空间管理器
- [ ] 实现生命周期钩子执行
- [ ] 实现安全不变量检查

### Phase 3: 重试与协调 (1 周)

- [ ] 实现重试队列 + 指数退避
- [ ] 实现 reconciliation (stall detection + state refresh)
- [ ] 实现 startup cleanup

### Phase 4: 可观测性 (1 周)

- [ ] 实现结构化日志
- [ ] 实现 runtime snapshot API
- [ ] 实现 memory 文件自动记录

### Phase 5: 优化与扩展 (可选)

- [ ] HTTP dashboard (Phoenix LiveView 风格)
- [ ] Linear 适配器
- [ ] 客户端工具扩展 (linear_graphql 类似物)

---

## 11. 与现有 OpenClaw 技能整合

### 11.1 可直接复用的技能

| 技能 | 用途 | 改造需求 |
|------|------|---------|
| `orchestrator` | 多智能体编排 | 增加状态机追踪 |
| `subagent-queue` | 子代理队列 | 增加工作空间绑定 |
| `github` | GitHub API | 增加 issue 轮询 |
| `gh-issues` | 自动修复 issues | 集成到 dispatch 流程 |
| `planning-with-files` | 任务规划 | 增加 WORKFLOW.md 支持 |
| `todo-manager` | 待办管理 | 作为候选任务源 |

### 11.2 需要新建的技能

| 技能 | 用途 | 优先级 |
|------|------|-------|
| `symphony-core` | 核心编排器 | ⭐⭐⭐ |
| `symphony-workflow` | WORKFLOW.md 加载 | ⭐⭐⭐ |
| `symphony-github` | GitHub 适配器 | ⭐⭐⭐ |
| `symphony-workspace` | 工作空间管理 | ⭐⭐ |
| `symphony-observe` | 可观测性组件 | ⭐ |

---

## 12. 关键决策记录

### 12.1 为什么用 GitHub 而非 Linear？

**决策**: 优先支持 GitHub Issues

**理由**:
1. OpenClaw 已在 GitHub 生态
2. 用户已有 `github` skill 和 `gh` CLI
3. 减少外部依赖（Linear 需要额外 API key）
4. GitHub GraphQL API 功能完整

### 12.2 为什么用 subagent 而非 Codex？

**决策**: 使用 OpenClaw `sessions_spawn` 而非 Codex app-server

**理由**:
1. Codex 需要额外安装和配置
2. subagent 已是 OpenClaw 原生能力
3. 协议更简单（不需要 JSON-RPC over stdio）
4. 可以直接复用现有技能生态

### 12.3 为什么不需要持久化数据库？

**决策**: 保持无状态设计，基于文件系统恢复

**理由**:
1. 符合 Symphony SPEC 设计哲学
2. 简化部署和维护
3. 重启恢复基于 GitHub 状态 + 工作空间目录
4. 运行时状态内存中即可，不需要持久化

---

## 13. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| GitHub API 限流 | 轮询失败 | 增加缓存 + 指数退避 |
| subagent 会话泄漏 | 资源耗尽 | 增加 session 超时 + 清理 |
| 工作空间膨胀 | 磁盘占用 | 定期清理 terminal 任务工作空间 |
| 配置错误导致误分发 | 执行错误任务 | 增加 dispatch validation + dry-run 模式 |

---

## 14. 下一步行动

### 立即可做

1. **创建技能骨架**
   ```bash
   mkdir -p skills/symphony-core/{src,test}
   mkdir -p skills/symphony-workflow/{src,test}
   mkdir -p skills/symphony-github/{src,test}
   ```

2. **编写 WORKFLOW.md 模板**
   ```bash
   cat > WORKFLOW.md.example << 'EOF'
   ---
   tracker:
     kind: github
     project_slug: your-org/your-repo
   agent:
     max_concurrent_agents: 3
   ---
   
   你正在处理 GitHub issue {{ issue.identifier }}...
   EOF
   ```

3. **实现核心状态机**
   - 从 `orchestrator` skill 扩展
   - 增加 issue 状态追踪

### 本周目标

- [ ] 完成 `symphony-core` 原型
- [ ] 实现 GitHub issue 轮询
- [ ] 端到端测试（单个 issue 自动完成）

---

**文档状态**: Draft v1  
**创建者**: xiaoxiaohuang  
**最后更新**: 2026-03-08 21:30
