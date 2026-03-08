---
# OpenClaw Symphony 工作流配置
# 最后更新：2026-03-08 21:48

tracker:
  kind: github
  endpoint: https://api.github.com/graphql
  api_key: ${GITHUB_TOKEN}  # 从环境变量读取
  project_slug: openclaw/openclaw  # 临时使用 OpenClaw 官方仓库测试
  active_states: ["open"]
  terminal_states: ["closed"]

polling:
  interval_ms: 30000  # 30 秒轮询一次

workspace:
  root: ./symphony_workspaces

hooks:
  after_create: |
    # 工作空间创建后执行
    git clone --depth 1 https://github.com/your-org/your-repo.git .
    npm install --prefer-offline
  before_run: |
    # 每次运行前执行
    npm run build
  after_run: |
    # 运行后执行（失败也忽略）
    echo "Run completed"
  timeout_ms: 60000

agent:
  max_concurrent_agents: 3
  max_turns: 20
  max_retry_backoff_ms: 300000  # 5 分钟

codex:
  command: openclaw subagent run
  approval_policy: auto
  turn_timeout_ms: 3600000  # 1 小时
  stall_timeout_ms: 300000  # 5 分钟无响应视为停滞
---

# Prompt 模板

你正在处理 GitHub issue **{{ issue.identifier }}**。

## 任务信息

- **标题**: {{ issue.title }}
- **状态**: {{ issue.state }}
- **标签**: {{ issue.labels | join(', ') }}
- **创建时间**: {{ issue.created_at }}

## 描述

{{ issue.description }}

## 要求

1. 分析任务需求
2. 实现解决方案
3. 编写测试验证
4. 提交代码并更新 issue 状态

## 工作证明

完成后请提供：
- ✅ 代码改动摘要
- ✅ 测试结果
- ✅ CI 状态（如果适用）

---

**注意**: 如果遇到困难或需要人工审核，请在 issue 中添加评论说明。
