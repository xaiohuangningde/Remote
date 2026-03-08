# autonomous-tasks Skill

## 目标驱动自主任务执行系统

结合目标驱动模式 + 多 Agent 协作，实现：
- 用户定义长期目标
- Agent 每天自动生成可执行任务
- 多 PM subagents 并行执行
- 文件协调避免冲突

---

## 文件结构

```
workspace/
├── autonomous/
│   ├── GOALS.md        # 用户目标（长期）
│   ├── STATE.yaml      # 任务状态（唯一事实源）
│   └── WORKFLOW.md     # 工作流说明
├── memory/
│   └── tasks-log.md    # 完成日志（只追加）
└── tasks/
    └── *.md            # 任务详情（可选）
```

---

## 激活命令

| 命令 | 作用 |
|------|------|
| "开始自主任务" | 读取目标，生成今日任务，启动 PM agents |
| "今天完成了什么" | 查看今日完成的任务 |
| "任务进度" | 查看 STATE.yaml 状态 |
| "添加目标：xxx" | 向 GOALS.md 添加新目标 |

---

## 主 Agent 工作流（CEO 模式）

### 1. 读取目标
```
读取 autonomous/GOALS.md
```

### 2. 生成今日任务（4-5 个）
每个任务必须：
- 具体、可执行
- 今天内能完成
- 关联到某个目标类别

### 3. 分配给 PM agents
```
sessions_spawn(
  label="pm-{type}-{task-id}",
  task="执行：{task-title}。完成后更新 STATE.yaml 和 tasks-log.md",
  mode="run"
)
```

### 4. 汇总汇报
向用户发送今日任务列表和进度。

---

## PM Agent 工作流

### 执行步骤
1. 读取 STATE.yaml 找到自己的任务
2. 执行任务（调用工具）
3. 更新 STATE.yaml：`status: done`
4. 追加 tasks-log.md：`- ✅ {task-id}: {title}`
5. 汇报完成

### 关键规则
- **只能追加** tasks-log.md，不能修改已有行
- 每个任务只由一个 agent 负责
- 遇到阻塞时更新 `blocked_by` 字段

---

## STATE.yaml 格式

```yaml
project: autonomous-goals
updated: 2026-03-04T22:37:00+08:00

today_tasks:
  - id: task-001
    title: "搜索 OpenClaw 自主任务方案"
    status: in_progress  # pending/in_progress/done/blocked
    owner: pm-research
    goal_category: 职业发展
    started: 2026-03-04T09:00:00+08:00
    completed: null
    notes: ""

active_pms:
  - label: pm-research-001
    task_id: task-001
    spawned: 2026-03-04T09:00:00+08:00

blocked_tasks: []
next_actions:
  - "等待 pm-research 完成任务"
```

---

## 防止 Race Condition

### 文件写入权限
| 文件 | 主 Agent | PM agents |
|------|----------|-----------|
| GOALS.md | ✅ 可修改 | ❌ 禁止 |
| STATE.yaml | ✅ 可修改 | ⚠️ 只能改自己负责的任务 |
| tasks-log.md | ❌ 不写 | ✅ **只能追加** |

### 追加日志格式
```markdown
## 2026-03-04
- ✅ task-001: 搜索 OpenClaw 自主任务方案 → research/openclaw-autonomous.md
- ✅ task-002: 创建任务管理文件 → tasks/todo.md
```

---

## 心跳集成

在 `HEARTBEAT.md` 中添加：
```markdown
- 检查 autonomous/STATE.yaml 是否有 pending 任务
- 如果有，继续执行或汇报进度
- 如果全部完成，生成新任务（如果还有目标未完成）
```

---

## 示例对话

**用户：** 开始自主任务

**主 Agent：**
1. 读取 GOALS.md（假设用户已填写目标）
2. 生成 4 个今日任务：
   - task-001: 研究 OpenClaw 自主任务技能
   - task-002: 创建任务管理文件结构
   - task-003: 编写 PM agent 指令模板
   - task-004: 测试 subagent spawn 流程
3. Spawn 4 个 PM agents
4. 回复："已启动 4 个任务，预计 30 分钟内完成"

**PM Agent（task-001）：**
1. 执行搜索
2. 写入 `research/openclaw-autonomous.md`
3. 更新 STATE.yaml：`status: done`
4. 追加 tasks-log.md
5. 汇报完成

**主 Agent（汇总）：**
"今日 4 个任务已完成 3 个：
- ✅ task-001: 研究完成 → research/openclaw-autonomous.md
- ✅ task-002: 文件已创建 → tasks/todo.md
- 🔄 task-003: 进行中（pm-content 执行中）
- ⏳ task-004: 等待中"

---

## 首次使用设置

1. 用户编辑 `autonomous/GOALS.md` 填写目标
2. 发送 "开始自主任务"
3. 系统自动生成任务并执行

---

## 调试

### 查看日志
```bash
cat memory/tasks-log.md
```

### 查看状态
```bash
cat autonomous/STATE.yaml
```

### 重置系统
```bash
# 清空今日任务，保留日志
# 编辑 STATE.yaml，清空 today_tasks
```
