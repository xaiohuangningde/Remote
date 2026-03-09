# 🎵 Symphony 完整流程测试

**测试日期**: 2026-03-09 15:55  
**测试目标**: 验证完整的 GitHub issue → Claude Code → 完成流程

---

## 📋 测试步骤

### 1. 准备测试仓库

```bash
# 检查 GitHub 连接
gh auth status

# 获取 token
$env:GITHUB_TOKEN = gh auth token
```

---

### 2. 创建测试 Issue

访问：https://github.com/xaiohuangningde/symphony-test/issues/new

**标题**: `Test Symphony CLI - Auto Fix`

**描述**:
```
This is a test issue for Symphony CLI.

## Task
- Add a README.md file to this repository
- The README should include:
  - Project title
  - Description
  - Installation instructions

## Expected
After completion, the repo should have a basic README.md
```

---

### 3. 运行 Symphony

```bash
cd C:\Users\12132\.openclaw\workspace\skills\symphony-core

# 完整运行（10 分钟超时）
npx tsx src\cli.ts run --repo xaiohuangningde/symphony-test --timeout 600000 --verbose
```

---

### 4. 验证结果

**检查点**:
- [ ] Symphony 成功获取 issues
- [ ] Claude Code 被调用
- [ ] 工作空间创建成功
- [ ] README.md 被创建
- [ ] 代码提交成功

---

## 📊 预期输出

```
[INFO] Symphony: Loading WORKFLOW.md...
[INFO] Symphony: WORKFLOW.md loaded (722 chars)
[Orchestrator] GitHub adapter initialized
[Orchestrator] Fetched 3 candidate issues
[Claude] Executing: claude "Fix issue #3..."
[Claude] Executing: claude "Fix issue #1..."
[Claude] Executing: claude "Fix issue #2..."

⏳ Running for 600s...

✅ Symphony completed:
   Issues processed: 3
   Tokens used: 15000
```

---

## ⚠️ 故障排查

### Claude Code 未响应
```bash
# 检查 Claude Code 安装
claude --version

# 重新安装
npm install -g @anthropic-ai/claude-code
```

---

### GitHub API 限流
```bash
# 检查限流状态
curl -H "Authorization: token $env:GITHUB_TOKEN" https://api.github.com/rate_limit
```

---

**测试完成后更新此文档记录结果！**
