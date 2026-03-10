# 🚀 Symphony 生产部署指南

**版本**: 0.3.0  
**日期**: 2026-03-09  
**状态**: ✅ 生产就绪

---

## 📋 部署清单

### 前置条件

- [ ] Node.js 已安装 (v22+)
- [ ] Claude Code 已安装 (`claude --version`)
- [ ] GitHub Token 已配置
- [ ] 测试仓库已创建

---

### Step 1: 安装依赖

```bash
cd C:\Users\12132\.openclaw\workspace\skills\symphony-core
npm install
```

---

### Step 2: 配置环境变量

```powershell
# PowerShell
$env:GITHUB_TOKEN = "ghp_xxx"
$env:WORKSPACE_ROOT = "C:\Users\12132\.openclaw\workspace"

# 或添加到系统环境变量（永久）
[System.Environment]::SetEnvironmentVariable(
  'GITHUB_TOKEN', 'ghp_xxx', 'User'
)
```

---

### Step 3: 配置 WORKFLOW.md

编辑 `C:\Users\12132\.openclaw\workspace\WORKFLOW.md`:

```yaml
---
tracker:
  kind: github
  api_key: ${GITHUB_TOKEN}
  project_slug: xaiohuangningde/symphony-test

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

---

### Step 4: 测试运行

```bash
# Dry run（验证配置）
npx tsx cli.ts run --dry-run --verbose

# 短时间测试（10 分钟）
npx tsx cli.ts run --repo xaiohuangningde/symphony-test --timeout 600000
```

---

### Step 5: 部署到 Cron（可选）

#### 方式 A: OpenClaw Cron

编辑 `cron.json`:

```json
{
  "symphony-auto": {
    "schedule": "*/30 * * * *",
    "command": "npx tsx skills/symphony-core/src/cli.ts poll",
    "cwd": "C:\\Users\\12132\\.openclaw\\workspace",
    "env": {
      "GITHUB_TOKEN": "${GITHUB_TOKEN}"
    }
  }
}
```

---

#### 方式 B: Windows Task Scheduler

```powershell
# 创建任务
$action = New-ScheduledTaskAction -Execute "npx" `
  -Argument "tsx skills/symphony-core/src/cli.ts poll" `
  -WorkingDirectory "C:\Users\12132\.openclaw\workspace"

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
  -RepetitionInterval (New-TimeSpan -Minutes 30)

$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME `
  -LogonType S4U -RunLevel Highest

Register-ScheduledTask -TaskName "Symphony" `
  -Action $action -Trigger $trigger -Principal $principal
```

---

### Step 6: 监控和日志

#### 日志文件

- **位置**: `C:\Users\12132\.openclaw\workspace\memory\日期.md`
- **格式**: 结构化 JSON

#### 查看实时日志

```bash
# PowerShell
Get-Content memory\2026-03-09.md -Wait -Tail 50
```

---

#### 检查运行状态

```bash
npx tsx cli.ts status
```

---

### Step 7: 验证部署

#### 检查点

- [ ] Symphony 成功启动
- [ ] GitHub issues 被获取
- [ ] Claude Code 被调用
- [ ] 工作空间被创建
- [ ] 代码被提交
- [ ] 日志被写入

---

#### 验证命令

```bash
# 检查 GitHub 连接
gh auth status

# 检查 Claude Code
claude --version

# 检查 Symphony 状态
npx tsx cli.ts status

# 查看日志
Get-Content memory\2026-03-09.md -Tail 100
```

---

## 🎯 生产环境配置

### 推荐配置

```yaml
# WORKFLOW.md
tracker:
  kind: github
  api_key: ${GITHUB_TOKEN}
  project_slug: your-org/your-repo
  labels: ["bug", "feature"]  # 只处理特定标签

polling:
  interval_ms: 60000  # 60 秒（生产环境）

agent:
  max_concurrent_agents: 3  # 最大并发
  max_turns: 20  # 每个任务最多 20 轮

codex:
  turn_timeout_ms: 3600000  # 1 小时超时
```

---

### 性能调优

| 参数 | 小项目 | 大项目 |
|------|--------|--------|
| `polling.interval_ms` | 30000 | 60000 |
| `agent.max_concurrent_agents` | 3 | 5 |
| `codex.turn_timeout_ms` | 1800000 | 3600000 |

---

## 🐛 故障排查

### 问题 1: Claude Code 未响应

```bash
# 检查安装
claude --version

# 重新安装
npm uninstall -g @anthropic-ai/claude-code
npm install -g @anthropic-ai/claude-code
```

---

### 问题 2: GitHub API 限流

```bash
# 检查限流状态
curl -H "Authorization: token $env:GITHUB_TOKEN" `
  https://api.github.com/rate_limit

# 解决：增加轮询间隔
# 编辑 WORKFLOW.md
polling:
  interval_ms: 120000  # 2 分钟
```

---

### 问题 3: 工作空间创建失败

```powershell
# 检查工作空间目录
Test-Path "$env:WORKSPACE_ROOT\symphony_workspaces"

# 创建目录（如果不存在）
New-Item -ItemType Directory `
  -Path "$env:WORKSPACE_ROOT\symphony_workspaces" -Force
```

---

## 📊 监控指标

### 关键指标

| 指标 | 正常值 | 告警值 |
|------|--------|--------|
| Issue 捕获延迟 | <30s | >60s |
| Claude 启动时间 | <5s | >10s |
| 并发处理数 | 3 个/分钟 | <1 个/分钟 |
| 内存占用 | <100MB | >500MB |
| 错误率 | <5% | >20% |

---

### 告警配置（待实现）

```yaml
# 未来版本
alerts:
  feishu_webhook: ${FEISHU_WEBHOOK}
  conditions:
    - error_rate > 0.2
    - retry_queue > 10
    - memory_usage > 500MB
```

---

## 📚 相关文档

- [README.md](README.md) - 完整使用指南
- [SKILL.md](SKILL.md) - 技术文档
- [QUICKSTART-CLI.md](QUICKSTART-CLI.md) - CLI 快速开始
- [TEST-RUN.md](TEST-RUN.md) - 测试指南

---

**部署完成！** 🎉

如有问题，查看日志文件或运行 `npx tsx cli.ts status --verbose`
