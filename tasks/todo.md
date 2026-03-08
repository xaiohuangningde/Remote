# 待办事项

> Status: idle
> UpdatedAt: 2026-03-08T09:13:00+08:00
> Auto-sync: Enabled (sync-todo.js)

---



## In Progress



_No tasks in progress_

---

## Completed

> ID: auto-memory-impl
**Summary**: Scripts created and tested successfully

### ✅ Auto-Memory Implementation (2026-03-08 09:48)
**Status**: done
**Completed**: 
- auto-memory.js 脚本创建
- sync-todo.js 自动同步
- 测试通过



### ✅ 长时任务最佳实践整合 (2026-03-07 23:30)

**来源**: Anthropic Claude Agent SDK 工程博客

**完成项**:
- [x] 更新 `tasks/lessons.md` - 添加长时任务最佳实践章节
- [x] 创建 `evolver/LONG-RUNNING-AGENTS.md` - 详细实施指南
- [x] 更新 `evolver/.env` 配置
- [x] 创建脚本模板（init.ps1, create-task.ps1, complete-task.ps1, test.e2e.ps1）
- [x] 整合端到端测试流程（Playwright MCP）
- [x] 让 evolver 自动读取 feature_list.json
- [x] Git 提交并推送

**创建的文件**:
| 文件 | 说明 |
|------|------|
| `evolver/scripts/init.ps1` | 环境初始化（6.5KB） |
| `evolver/scripts/create-task.ps1` | 任务创建（5.7KB） |
| `evolver/scripts/complete-task.ps1` | 任务完成（6KB） |
| `evolver/scripts/test.e2e.ps1` | 端到端测试（7KB） |
| `evolver/scripts/README.md` | 使用文档（3KB） |
| `evolver/src/gep/longRunningTask.js` | 长时任务模块（8.3KB） |

**Git 提交**:
- workspace: `199da59` ✅ 已推送
- evolver: `264527b` ⚠️ 推送失败（无 upstream 权限）

**核心功能**:
- 双代理模式（Initializer + Coding Agent）
- JSON 功能清单防止模型乱改
- 每会话单功能避免一锅端
- 端到端测试验证
- Git 自动提交保证交接清晰
- Evolver 自动读取 feature_list.json

---



## Backlog



_No planned tasks_

---



## System Status

| System | Status |
|--------|--------|
| Evolver | Not running |
| Task Queue | Ready |
| Auto-Sync | ✅ Enabled (auto-todo-sync.js) |
| Auto-Memory | ✅ Enabled (auto-memory.js) |

---

## 状态驱动协议

### 任务状态标记格式
```markdown
> Status: running|blocked|done|pending
> UpdatedAt: YYYY-MM-DDTHH:mm:ss+08:00
> Next: [下一步具体动作]
> Attempts: [失败次数，可选]
```

### 状态变更即写入
- 任务开始 → 更新 Status=running + UpdatedAt
- 任务完成 → 更新 Status=done + 写 lessons.md
- 遇到阻塞 → 更新 Status=blocked + Attempts++
- 阻塞解决 → 更新 Status=running

### 汇报规则
- ✅ 任务完成 → 一次性通知
- ❌ 阻塞≥3 次 → 求助
- ⚠️ 严重问题 → 立即通知
- 普通更新 → 不汇报

---

## Commands

```powershell
# Manual sync
node tasks\sync-todo.js

# View state log
Get-Content tasks\state-driven-log.md
```
