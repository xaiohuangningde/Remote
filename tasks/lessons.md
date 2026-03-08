
## 2026-03-08 - Scripting

**Pattern**: PowerShell strips JSON quotes

**Solution**: Add regex fix to restore quotes before parsing



---
# Lessons Learned

## Correction Patterns

<!-- Record patterns from user corrections -->

## Workflow Rules

### 2026-03-04 - Initial Setup
- Use English for all documentation (except docs intended for user)
- Write plans to tasks/todo.md before implementation
- Use subagents liberally for research and parallel tasks
- Verify before marking complete

---

## 2026-03-05 - Airi 研究任务经验

### ✅ 成功策略

#### 1. Agent 式持续开发模式
**经验**: 不要用人类的"本周/下周"时间划分，改用：
- 状态文件 (`RESEARCH-STATE.json`) - 实时跟踪进度
- 任务队列 (`TASK-QUEUE.md`) - 动态优先级管理
- 开发日志 (`DEV-LOG.md`) - 自动记录每一步

**效果**: 可以随时中断/恢复，上下文不丢失

#### 2. 渐进式研究策略
**经验**: 先部署→再拆解→慢慢吸收，而不是：
- ❌ 一口气全部整合（容易搞崩系统）
- ✅ 先只读分析，提取有价值的模块
- ✅ 每个模块独立验证后再整合

**效果**: 系统安全，可随时回滚

#### 3. 问题诊断流程
**经验**: 遇到部署问题时：
1. 检查官方 CI 配置（发现只在 Linux 测试）
2. 检查 README 平台支持说明
3. 尝试 3-4 种解决方案后，评估替代方案
4. 不纠结，转向更高价值的工作

**效果**: 避免在环境问题上浪费时间

#### 4. 模块化提取方法
**经验**: 从大型项目中提取价值：
1. 识别高价值模块（stream-kit 80 行代码）
2. 复制到 `studied/` 目录
3. 创建学习笔记 (`NOTES.md`)
4. 设计整合方案（`stream-queue` 技能草案）

**效果**: 2 小时提取出可复用模块

### ❌ 遇到的问题

#### 1. pnpm workspace 在 Windows 上的兼容性问题
**现象**: bin 链接失败，vite 命令找不到
**尝试**: 4 种方案均未解决
**根因**: Airi 只在 Linux 上测试，pnpm 在 Windows 上有历史 bug
**教训**: 
- 先检查 CI 配置，了解开发环境
- 早期识别平台兼容性问题
- 及时转向替代方案（WSL2/在线演示/只读分析）

#### 2. 依赖版本冲突
**现象**: vite 8.0.0-beta 与其他插件版本不兼容
**教训**: 
- 使用 beta 版本的项目风险高
- 等待正式版更稳妥

### 🎯 可复用模式

#### 模式 1: 状态驱动开发
```json
{
  "status": "running|blocked|done",
  "currentTask": "...",
  "tasks": { "completed": [], "inProgress": [], "pending": [] },
  "blocker": { "issue": "...", "attempts": [] },
  "nextAction": "..."
}
```

#### 模式 2: 价值优先提取
```
识别高价值模块 → 复制到 studied/ → 写学习笔记 → 设计整合方案
```

#### 模式 3: 问题升级流程
```
尝试 1-2 次 → 检查官方文档/CI → 尝试 3-4 次 → 评估替代方案 → 转向
```

### 📋 新规则

1. **研究大型项目前，先检查 CI 配置** - 了解开发环境和测试平台
2. **优先提取独立模块** - 避免整体部署的复杂性
3. **用状态文件代替人类时间规划** - Agent 式持续开发
4. **遇到环境问题不超过 4 次尝试** - 及时转向替代方案
5. **每完成一个模块提取，立即写学习笔记** - 固化知识

---

## 2026-03-07 - 长时任务最佳实践 (Anthropic Claude Agent SDK)

### 核心问题
长时任务中，智能体容易犯两个错误：
1. **一锅端** - 试图一次性完成整个项目，导致上下文耗尽，留下半成品的烂摊子
2. **过早宣布完成** - 看到一些进展就 declare victory，实际还有很多功能没做

### 解决方案：双代理模式

#### 1. Initializer Agent（初始化代理）- 仅首个会话
搭建环境，为后续会话铺路：

| 产物 | 格式 | 作用 |
|------|------|------|
| `feature_list.json` | JSON | 功能清单（200+ 条目，初始全标记 `passes: false`） |
| `progress.txt` | Markdown | 进度日志，记录每轮做了什么 |
| `init.sh` | Shell | 启动脚本，一键运行开发服务器 |
| `git init` | - | 版本控制，可回滚 |

**feature_list.json 示例**：
```json
{
  "category": "functional",
  "description": "New chat button creates a fresh conversation",
  "steps": [
    "Navigate to main interface",
    "Click the 'New Chat' button",
    "Verify a new conversation is created"
  ],
  "passes": false
}
```

#### 2. Coding Agent（编码代理）- 后续所有会话
每次只做一件事，留好交接文档：

**会话开始**：
1. `pwd` - 确认工作目录
2. 读 `progress.txt` + `git log` - 了解上轮进度
3. 读 `feature_list.json` - 选一个最高优先级的 `passes: false` 功能
4. 运行 `init.sh` - 启动服务器
5. **端到端测试** - 验证基础功能没坏

**会话结束**：
1. 自测通过才能标记 `passes: true`
2. `git commit` - 描述性提交信息
3. 更新 `progress.txt` - 记录本轮工作

### 关键设计决策

| 决策 | 理由 |
|------|------|
| **用 JSON 不用 Markdown** | 模型更不容易乱改 JSON 结构 |
| **禁止删除测试用例** | 防止偷工减料，prompt 明确写"unacceptable" |
| **每次会话前跑端到端测试** | 快速发现上轮留下的 bug，避免越改越烂 |
| **一次只做一个功能** | 避免上下文耗尽，保证每轮都有可交付成果 |

### 与我们的系统对应

| Anthropic | OpenClaw 实现 | 改进空间 |
|-----------|---------------|----------|
| `feature_list.json` | `tasks/todo.md` | ✅ 可增加 JSON 格式的详细测试步骤 |
| `progress.txt` | `memory/YYYY-MM-DD.md` | ✅ 已有，可增加每轮 summary |
| `init.sh` | `HEARTBEAT.md` / `auto-start.ps1` | ✅ 已有 |
| git commit | git commit + sync-todo.js | ✅ 已有 |
| 端到端测试 | ❌ 缺失 | ⚠️ 需要增加 |

### 可复用模式

#### 模式 1: 任务启动检查清单
```markdown
1. [ ] 读 tasks/todo.md 选最高优先级任务
2. [ ] 读 memory/ 昨天 + 今天的记录
3. [ ] 运行 init.sh / auto-start.ps1
4. [ ] 端到端测试基础功能
5. [ ] 开始实施
```

#### 模式 2: 任务完成验证清单
```markdown
1. [ ] 自测通过（运行测试/手动验证）
2. [ ] git commit（描述性信息）
3. [ ] 更新 todo.md 状态
4. [ ] 写 progress summary 到 memory/
```

#### 模式 3: 功能清单格式（JSON）
```json
{
  "id": "feature-001",
  "description": "用户能打开新对话",
  "steps": ["步骤 1", "步骤 2", "步骤 3"],
  "passes": false,
  "testCommand": "npm test -- feature-001"
}
```

### 📋 新规则

6. **长时任务必须用 JSON 功能清单** - 防止模型乱改结构
7. **每次会话开始前跑端到端测试** - 快速发现遗留 bug
8. **一次只做一个功能** - 禁止一锅端
9. **自测通过才能标记完成** - 禁止 premature completion
10. **每轮结束必须 git commit + 进度总结** - 保证交接清晰
