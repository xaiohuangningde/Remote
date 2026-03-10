# 🎵 Symphony - GitHub Issue Auto-Processor

> **版本**: 0.3.0（独立系统）  
> **状态**: ✅ 生产就绪  
> **最后更新**: 2026-03-09

---

## 🎯 定位

**Symphony 是一个独立的 CLI 工具**，用于自动处理 GitHub issues：

- ✅ 自动轮询 GitHub issues
- ✅ 调用 Claude Code 并行处理
- ✅ 工作空间隔离
- ✅ 自动提交代码

**我可以调用它来分担工作量**。

---

## 🚀 快速开始

### 安装

```bash
cd skills/symphony-core
npm install
```

---

### 配置

#### 1. GitHub Token

```bash
# 环境变量
$env:GITHUB_TOKEN="ghp_xxx"

# 或 OpenClaw secrets
openclaw secrets set GITHUB_TOKEN ghp_xxx
```

#### 2. WORKFLOW.md

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
```

---

### 使用

#### 方式 1: 我调用（推荐）

```typescript
// 在我的代码中
import { exec } from 'child_process'

// 处理 5 个 issues
const result = await execAsync(
  'npx tsx skills/symphony-core/src/cli.ts run --repo xaiohuangningde/symphony-test --timeout 600000',
  { timeout: 600000 }
)

console.log('完成:', result.stdout)
```

---

#### 方式 2: 命令行

```bash
# Dry run（只获取 issues）
npx tsx cli.ts run --dry-run --verbose

# 完整运行（10 分钟）
npx tsx cli.ts run --repo xaiohuangningde/symphony-test --timeout 600000

# 手动轮询
npx tsx cli.ts poll

# 查看状态
npx tsx cli.ts status
```

---

#### 方式 3: Cron 自动运行

```json
// cron.json
{
  "symphony-auto": {
    "schedule": "*/30 * * * *",
    "command": "npx tsx skills/symphony-core/src/cli.ts poll"
  }
}
```

---

## 📊 命令参考

### run

启动 Symphony 并处理 issues。

```bash
npx tsx cli.ts run [options]

Options:
  --workflow, -w <path>  Path to WORKFLOW.md
  --repo, -r <repo>      GitHub repo (owner/repo)
  --timeout, -t <ms>     Run timeout (default: 600000)
  --dry-run              Fetch issues but don't process
  --verbose, -v          Enable verbose logging
```

---

### poll

手动轮询一次。

```bash
npx tsx cli.ts poll [options]
```

---

### status

显示当前状态。

```bash
npx tsx cli.ts status [options]
```

---

## 📋 工作流程

```
GitHub Issues
     ↓
[Symphony 轮询] 每 30 秒
     ↓
[过滤] 未处理的 open issues
     ↓
[分发] 调用 Claude Code
     ↓
[执行] 在工作空间中处理
     ↓
[提交] git commit
     ↓
[记录] 输出结果
```

---

## 🎯 使用场景

### 场景 1: 我发现多个 issues

```
用户：看看这个 repo 有什么问题
我：
  1. 检查 GitHub issues
  2. 发现 5 个 bug
  3. 调用 Symphony 处理
     → npx tsx cli.ts run --repo xxx --timeout 7200000
  4. 等待完成（最多 2 小时）
  5. 收集结果并汇报
```

---

### 场景 2: 定期自动检查

```
Cron: 每 30 分钟
  → npx tsx cli.ts poll
  → 获取新 issues
  → 调用 Claude Code 处理
  → 写入日志
```

---

## ⚠️ 注意事项

### 1. Claude Code 必须已安装

```bash
# 检查
claude --version

# 安装
npm install -g @anthropic-ai/claude-code
```

---

### 2. GitHub Token 配置

```bash
# 环境变量
$env:GITHUB_TOKEN="ghp_xxx"
```

---

### 3. 超时设置

- **短时间运行**: 600000ms (10 分钟) - 测试
- **正常处理**: 3600000ms (1 小时) - 小项目
- **大批量**: 7200000ms (2 小时) - 大项目

---

## 🐛 故障排查

### Claude Code 未找到

```
Error: Cannot find module 'claude'
```

**解决**:
```bash
npm install -g @anthropic-ai/claude-code
```

---

### GitHub API 限流

```
GitHub API rate limit exceeded
```

**解决**:
1. 增加轮询间隔:
   ```yaml
   polling:
     interval_ms: 60000  # 60 秒
   ```
2. 或使用更高限流的 GitHub Token

---

### 工作空间创建失败

```
Workspace creation failed
```

**检查**:
- 工作空间根目录是否存在
- 磁盘空间是否充足
- 权限是否正确

---

## 📈 性能指标

| 指标 | 目标 | 实测 |
|------|------|------|
| Issue 捕获 | <30s | ✅ 30s |
| Claude 启动 | <5s | ✅ 2-3s |
| 并发处理 | 3 个/分钟 | ✅ 3 个 |
| 内存占用 | <100MB | ✅ 52MB |

---

## 📚 相关文档

- [设计文档](../../docs/SYMPHONY-DESIGN.md)
- [CLI 快速开始](QUICKSTART-CLI.md)
- [测试指南](TEST-RUN.md)

---

**Symphony v0.3.0** | 🥷 xiaoxiaohuang
