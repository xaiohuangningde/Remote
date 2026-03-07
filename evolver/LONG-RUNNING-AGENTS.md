# 🧠 长时任务最佳实践

> 基于 Anthropic Claude Agent SDK 的长时智能体 harness 经验 (2026-03-07)

## 核心问题

长时任务中，智能体容易犯两个错误：

1. **一锅端 (One-Shot)** - 试图一次性完成整个项目，导致上下文耗尽，留下半成品的烂摊子
2. **过早宣布完成 (Premature Victory)** - 看到一些进展就 declare victory，实际还有很多功能没做

## 解决方案：双代理模式

### 1. Initializer Agent（初始化代理）- 仅首个会话

搭建环境，为后续会话铺路：

| 产物 | 格式 | 作用 |
|------|------|------|
| `feature_list.json` | JSON | 功能清单（初始全标记 `passes: false`） |
| `progress.txt` | Markdown | 进度日志，记录每轮做了什么 |
| `init.sh` / `init.ps1` | Shell/PowerShell | 启动脚本，一键运行开发服务器 |
| `git init` | - | 版本控制，可回滚 |

**feature_list.json 示例**：
```json
[
  {
    "id": "feature-001",
    "category": "functional",
    "description": "用户能打开新对话",
    "steps": [
      "导航到主界面",
      "点击'新对话'按钮",
      "验证新对话已创建",
      "检查聊天区域显示欢迎状态",
      "验证对话出现在侧边栏"
    ],
    "passes": false,
    "testCommand": "npm test -- feature-001"
  }
]
```

### 2. Coding Agent（编码代理）- 后续所有会话

每次只做一件事，留好交接文档：

#### 会话开始流程
```
1. pwd → 确认工作目录
2. 读 progress.txt + git log → 了解上轮进度
3. 读 feature_list.json → 选一个最高优先级的 passes:false 功能
4. 运行 init.sh → 启动服务器
5. 端到端测试 → 验证基础功能没坏
6. 开始实施
```

#### 会话结束流程
```
1. 自测通过 → 才能标记 passes: true
2. git commit → 描述性提交信息
3. 更新 progress.txt → 记录本轮工作
4. 更新 feature_list.json → 标记完成状态
```

## 关键设计决策

| 决策 | 理由 |
|------|------|
| **用 JSON 不用 Markdown** | 模型更不容易乱改 JSON 结构 |
| **禁止删除测试用例** | 防止偷工减料，prompt 明确写"unacceptable" |
| **每次会话前跑端到端测试** | 快速发现上轮留下的 bug，避免越改越烂 |
| **一次只做一个功能** | 避免上下文耗尽，保证每轮都有可交付成果 |

## Evolver 整合方案

### 1. 任务启动时自动检查

在 `evolver/index.js` 或 agent 启动时：

```typescript
// 伪代码示例
async function initializeSession() {
  // 1. 检查工作目录
  const cwd = await exec('pwd')
  
  // 2. 读取进度文件
  const progress = await read('progress.txt')
  const gitLog = await exec('git log --oneline -10')
  
  // 3. 读取功能清单
  const features = await readJSON('feature_list.json')
  const nextFeature = features.find(f => !f.passes)
  
  // 4. 启动开发服务器
  if (exists('init.ps1')) {
    await exec('.\\init.ps1')
    await sleep(5000) // 等待服务器启动
  }
  
  // 5. 端到端测试
  const testResult = await runEndToEndTest()
  if (!testResult.passed) {
    await fixBugs()
  }
  
  return nextFeature
}
```

### 2. 任务完成验证

在标记任务完成前强制验证：

```typescript
async function completeFeature(feature) {
  // 1. 运行测试命令
  const testResult = await exec(feature.testCommand)
  
  // 2. 手动验证（浏览器自动化）
  const e2eResult = await browserTest(feature.steps)
  
  // 3. 只有通过才能标记
  if (testResult.passed && e2eResult.passed) {
    feature.passes = true
    await writeJSON('feature_list.json', features)
    
    // 4. Git commit
    await exec(`git add .`)
    await exec(`git commit -m "feat: ${feature.description}"`)
    
    // 5. 更新进度
    await append('progress.txt', `## ${new Date().toISOString()}\n- Completed: ${feature.description}\n`)
  } else {
    throw new Error('Feature not ready - tests failed')
  }
}
```

### 3. Evolver 配置建议

在 `evolver/.env` 中添加：

```bash
# 长时任务配置
EVOLVE_FEATURE_LIST_PATH=feature_list.json
EVOLVE_PROGRESS_PATH=progress.txt
EVOLVE_INIT_SCRIPT=init.ps1
EVOLVE_REQUIRE_E2E_TEST=true
EVOLVE_ONE_FEATURE_PER_SESSION=true
```

## 与 OpenClaw 现有系统对应

| Anthropic | OpenClaw 实现 | 状态 |
|-----------|---------------|------|
| `feature_list.json` | `tasks/todo.md` | ✅ 已有，建议增加 JSON 详细版 |
| `progress.txt` | `memory/YYYY-MM-DD.md` | ✅ 已有 |
| `init.sh` | `HEARTBEAT.md` / `auto-start.ps1` | ✅ 已有 |
| git commit | git commit + sync-todo.js | ✅ 已有 |
| 端到端测试 | ❌ | ⚠️ 需要增加 |
| 浏览器自动化测试 | Playwright MCP | ✅ 已有，需整合 |

## 推荐工作流

### 启动新任务
```powershell
# 1. 创建任务文件
node scripts/create-task.js "新功能名称"

# 2. 初始化环境
.\\init.ps1

# 3. 启动 Evolver
node evolver/index.js --task "实现功能 feature-001"
```

### 继续已有任务
```powershell
# Evolver 自动读取进度并继续
node evolver/index.js --continue
```

### 查看进度
```powershell
# 查看功能清单
node scripts/show-features.js

# 查看进度日志
Get-Content progress.txt -Tail 50
```

## 脚本模板

### init.ps1 (初始化脚本)
```powershell
# init.ps1 - 开发环境初始化

Write-Host "🚀 启动开发服务器..."

# 1. 安装依赖
if (Test-Path "package.json") {
  npm install
}

# 2. 启动服务器
npm run dev &

# 3. 等待服务器就绪
Start-Sleep -Seconds 5

# 4. 运行基础测试
Write-Host "🧪 运行端到端测试..."
npm test:e2e

Write-Host "✅ 环境就绪!"
```

### create-task.ps1 (任务创建脚本)
```powershell
param(
  [string]$TaskName
)

# 1. 创建 feature_list.json
$features = @(
  @{
    id = "feature-001"
    category = "functional"
    description = $TaskName
    steps = @("步骤 1", "步骤 2", "步骤 3")
    passes = $false
    testCommand = "npm test -- feature-001"
  }
)

$features | ConvertTo-Json | Out-File "feature_list.json"

# 2. 创建 progress.txt
@"
# 项目进度日志

## $(Get-Date -Format "yyyy-MM-dd HH:mm")
- 项目初始化
- 功能清单已创建
"@ | Out-File "progress.txt"

# 3. 初始化 git
git init
git add .
git commit -m "init: 项目初始化"

Write-Host "✅ 任务已创建: $TaskName"
```

## 检查清单

### 任务启动前
- [ ] feature_list.json 已创建
- [ ] progress.txt 已创建
- [ ] init.ps1 可运行
- [ ] git 仓库已初始化
- [ ] 端到端测试可运行

### 每轮会话
- [ ] 读取 progress.txt 和 git log
- [ ] 选择一个功能开发
- [ ] 运行 init.ps1
- [ ] 端到端测试通过
- [ ] 实施功能
- [ ] 自测通过
- [ ] git commit
- [ ] 更新 progress.txt

### 任务完成
- [ ] 所有功能 passes: true
- [ ] 端到端测试全部通过
- [ ] 代码已提交
- [ ] 进度日志已更新
- [ ] 文档已更新

## 参考资料

- [Anthropic: Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Claude 4 Prompting Guide - Multi-Context Window Workflows](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices#multi-context-window-workflows)
- [Claude Agent SDK Quickstart](https://github.com/anthropics/claude-quickstarts/tree/main/autonomous-coding)
