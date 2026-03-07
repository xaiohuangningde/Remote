# 📜 长时任务脚本工具

基于 Anthropic Claude Agent SDK 的长时任务最佳实践。

## 快速开始

### 1. 创建新任务

```powershell
# 基本用法
.\create-task.ps1 "实现用户登录功能"

# 指定任务 ID
.\create-task.ps1 "实现用户登录功能" -TaskId "feature-login-001"

# 不初始化 Git
.\create-task.ps1 "实现用户登录功能" -NoGit
```

**创建的文件**:
- `feature_list.json` - 功能清单（JSON 格式）
- `progress.txt` - 进度日志
- `tasks/<task-id>.md` - 任务详情

### 2. 初始化环境

```powershell
# 基本用法
.\init.ps1

# 指定任务 ID
.\init.ps1 -TaskId "feature-login-001"
```

**执行的操作**:
1. ✅ 检查工作目录和文件
2. ✅ 读取功能清单和进度日志
3. ✅ 检查 Git 状态
4. ✅ 安装依赖（npm install）
5. ✅ 启动开发服务器（可选）
6. ✅ 运行端到端测试（可选）

### 3. 开发功能

在 OpenClaw/evolver 中开始开发：

```bash
node index.js --task "实现 feature-login-001"
```

Evolver 会自动：
- 读取 `feature_list.json`
- 选择下一个待完成的功能
- 将功能转换为信号输入进化循环

### 4. 完成任务

```powershell
.\complete-task.ps1 "feature-login-001"
```

**执行的操作**:
1. ✅ 运行测试命令
2. ✅ 运行端到端测试
3. ✅ 更新 `feature_list.json` (passes: true)
4. ✅ Git 提交
5. ✅ 更新 `progress.txt`

### 5. 运行端到端测试

```powershell
# 测试所有未完成功能
.\test.e2e.ps1

# 测试指定功能
.\test.e2e.ps1 -TaskId "feature-login-001"
```

## 配置文件

### feature_list.json

```json
[
  {
    "id": "feature-001",
    "category": "functional",
    "description": "用户能打开新对话",
    "steps": [
      "导航到主界面",
      "点击'新对话'按钮",
      "验证新对话已创建"
    ],
    "passes": false,
    "testCommand": "npm test -- feature-001",
    "priority": 1,
    "createdAt": "2026-03-07 23:00:00"
  }
]
```

### progress.txt

```markdown
# 项目进度日志

## 2026-03-07 23:00:00 - 任务创建
- 任务 ID: feature-001
- 任务名称：用户能打开新对话
- 功能清单已创建
- 状态：待开发

---

## 2026-03-07 23:30:00 - 开始开发
开始处理功能：feature-001 - 用户能打开新对话

---

## 2026-03-07 23:45:00 - 任务完成 ✅
**任务 ID**: feature-001  
**任务名称**: 用户能打开新对话  
**状态**: 已完成

### 完成内容
- 功能实现完成
- 测试通过
- 代码已提交

---
```

## Evolver 整合

### 环境变量配置

在 `.env` 中启用长时任务支持：

```bash
# 长时任务支持（基于 Anthropic 最佳实践）
EVOLVE_LONG_RUNNING_TASK=true

# 功能清单路径
EVOLVE_FEATURE_LIST_PATH=feature_list.json

# 进度日志路径
EVOLVE_PROGRESS_PATH=progress.txt

# 每会话单功能模式（禁止一锅端）
EVOLVE_ONE_FEATURE_PER_SESSION=true

# 强制端到端测试
EVOLVE_REQUIRE_E2E_TEST=true
```

### 自动任务选择

启用后，evolver 会在每次循环开始时：

1. 读取 `feature_list.json`
2. 选择下一个 `passes: false` 的功能
3. 将功能描述转换为信号
4. 输入到进化循环
5. 完成后自动更新状态

## 最佳实践

### ✅ 推荐做法

1. **一次一个功能** - 不要试图一次性完成所有功能
2. **测试驱动** - 先写测试，再实现功能
3. **频繁提交** - 每完成一个小步骤就 git commit
4. **详细日志** - 在 `progress.txt` 记录每步进展
5. **端到端验证** - 每次会话前运行基础测试

### ❌ 避免做法

1. **一锅端** - 试图一次性实现多个功能
2. **跳过测试** - 不自测就标记完成
3. **不写日志** - 不记录进展，导致交接困难
4. **乱改清单** - 不要删除或修改已有测试步骤

## 故障排查

### 问题：feature_list.json 不存在

**解决**: 先运行 `create-task.ps1` 创建任务

### 问题：测试失败

**解决**:
1. 查看详细测试报告：`test-results/e2e-report-*.md`
2. 修复问题后重新运行 `complete-task.ps1`

### 问题：Git 提交失败

**解决**:
1. 检查 Git 配置：`git config user.name/email`
2. 手动提交：`git add . && git commit -m "..."`

## 参考资料

- [Anthropic: Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [LONG-RUNNING-AGENTS.md](../LONG-RUNNING-AGENTS.md) - 详细实施指南
