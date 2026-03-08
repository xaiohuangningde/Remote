# 多 Agent 团队配置指南

## 团队架构

| Agent | 角色 | 工作区路径 |
|-------|------|-----------|
| **Captain** | 队长 | `~/.openclaw/agents/captain` |
| **Scout** | 侦察兵 | `~/.openclaw/agents/scout` |
| **Editor** | 编辑 | `~/.openclaw/agents/editor` |
| **Coder** | 程序员 | `~/.openclaw/agents/coder` |
| **Architect** | 架构师 | `~/.openclaw/agents/architect` |
| **Evolver** | 进化引擎 | `~/.openclaw/evolver` |

## 注册 Agent

在 OpenClaw 中注册每个 Agent：

```bash
openclaw agents add "Captain" --workspace "~/.openclaw/agents/captain"
openclaw agents add "Scout" --workspace "~/.openclaw/agents/scout"
openclaw agents add "Editor" --workspace "~/.openclaw/agents/editor"
openclaw agents add "Coder" --workspace "~/.openclaw/agents/coder"
openclaw agents add "Architect" --workspace "~/.openclaw/agents/architect"
```

## 配置路由绑定

编辑 `~/.openclaw/openclaw.json`：

```json
{
  "agents": [
    {
      "id": "captain",
      "bindings": [
        { "channel": "telegram", "accountId": "YOUR_BOT_ID" }
      ]
    },
    {
      "id": "scout",
      "bindings": [
        { "channel": "telegram", "accountId": "YOUR_SCOUT_BOT_ID" }
      ]
    }
    // ... 其他 Agent
  ]
}
```

## 创建团队群聊（可选）

1. 在 Telegram 创建群聊
2. 把所有 Bot 拉进群
3. 获取群 ID（用 @userinfobot）
4. 在 `openclaw.json` 中配置 `groups` 字段

## 使用方式

### 方式 1：通过 Captain 统一调度（推荐）

用户只需和 Captain 对话，Captain 会自动分配任务：

```
用户 → Captain → 分配给 Scout/Editor/Coder → 汇总 → 用户
```

### 方式 2：直接调用单个 Agent

```bash
# 让 Scout 搜索新闻
openclaw agents run scout --task "搜索今天的 AI 新闻"

# 让 Coder 写代码
openclaw agents run coder --task "写一个 Python 脚本，抓取网页标题"

# 让 Architect 做系统巡检
openclaw agents run architect --task "系统巡检"
```

## 定时任务配置

### Scout 每日 AI 日报
```bash
openclaw cron add --name "daily-news" --cron "0 8 * * *" --command "openclaw agents run scout --task '搜索今天的 AI 新闻，输出结构化简报'"
```

### Architect 每日系统巡检
```bash
openclaw cron add --name "daily-check" --cron "0 14 * * *" --command "openclaw agents run architect --task '系统巡检，输出健康报告'"
```

### Evolver 进化循环
```bash
openclaw cron add --name "evolver-loop" --cron "0 2 * * *" --command "node C:/Users/12132/.openclaw/evolver/index.js --loop"
```

### 查看和管理定时任务
```bash
# 列出所有任务
openclaw cron list

# 手动触发
openclaw cron run <job-id>

# 禁用/启用
openclaw cron disable <job-id>
openclaw cron enable <job-id>
```

## 重启 Gateway

配置完成后重启：

```bash
openclaw gateway restart
```

**注意：** WSL 环境下如果 `systemctl` 不可用，用：
```bash
pkill -f openclaw
openclaw gateway start
```

## 验证

1. 在群里 @Captain Bot
2. 发送测试任务："搜索今天的 AI 新闻"
3. 检查 Scout 是否执行并汇报
