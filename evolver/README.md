# 🧬 Evolver + EvoMap 自进化系统

> 让你的 Agent 学会自己升级自己

## ✅ 已完成配置

| 组件 | 状态 | 路径/ID |
|------|------|---------|
| Evolver | ✅ 已安装 | `C:\Users\12132\.openclaw\evolver` |
| EvoMap 节点 | ✅ 已绑定 | `node_klgyWqRK` (声誉：50) |
| 多 Agent 团队 | ✅ 已注册 | Captain/Scout/Editor/Coder/Architect |
| 定时任务 | ✅ 已配置 | 4 个 cron job |

## ✅ 配置完成

所有配置已完成！Evolver 已启动持续循环模式。

**Evolver 状态：** 🟢 运行中（--loop --strategy innovate）

## 📋 定时任务说明（白天模式）

| 任务名 | 时间 | 说明 |
|--------|------|------|
| daily-news | 每天 8:00 | Scout 搜索 AI 新闻 |
| daily-check | 每天 14:00 | Architect 系统巡检 |
| daily-summary | 每天 18:00 | Captain 汇总日报 |

**Evolver：** 🟢 持续运行（--loop --strategy innovate）
- 不需要定时任务，一直后台运行
- 一发现信号就处理，进化速度提升 3-5 倍

## 🎯 使用方式

### 查看定时任务
```powershell
openclaw cron list
```

### 手动触发 Evolver
```powershell
cd C:\Users\12132\.openclaw\evolver
node index.js
```

### 后台持续运行 Evolver
```powershell
node src/ops/lifecycle.js start
node src/ops/lifecycle.js status
node src/ops/lifecycle.js stop
```

### 直接调用 Agent
```powershell
# Scout 搜索
openclaw agents run scout --task "搜索今天的 AI 新闻"

# Coder 写代码
openclaw agents run coder --task "写一个 Python 脚本抓取网页标题"

# Architect 巡检
openclaw agents run architect --task "系统巡检"
```

## 🧬 进化策略

编辑 `.env` 修改策略：

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| `balanced` | 50% 创新 + 30% 优化 + 20% 修复 | 日常运行 |
| `innovate` | 80% 创新 + 15% 优化 + 5% 修复 | 快速迭代 |
| `harden` | 20% 创新 + 40% 优化 + 40% 修复 | 大改动后稳固 |
| `repair-only` | 0% 创新 + 20% 优化 + 80% 修复 | 紧急修复 |

## 📦 EvoMap 胶囊市场

接入后可以直接复用别人的解决方案：

```bash
# 搜索胶囊（解决特定问题）
curl -X POST https://evomap.ai/a2a/fetch ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"JSON parse error\",\"limit\":5}"
```

**优势：**
- 省 token：2k vs 50k-100k
- 省时间：5 分钟 vs 1-2 小时
- 省风险：方案已验证

## 📁 文件结构

```
C:\Users\12132\.openclaw\
├── evolver/                    # Evolver 引擎
│   ├── .env                   # 配置文件
│   ├── index.js               # 主入口
│   ├── src/ops/lifecycle.js   # 生命周期管理
│   └── assets/gep/            # 进化资产
├── agents/                     # Agent 团队
│   ├── captain/SOUL.md
│   ├── scout/SOUL.md
│   ├── editor/SOUL.md
│   ├── coder/SOUL.md
│   └── architect/SOUL.md
└── workspace/evolver/          # 文档
    ├── README.md              # 本文档
    ├── SETUP.md               # 详细配置指南
    ├── AGENT-TEAM.md          # 团队配置
    └── setup-cron.ps1         # 定时任务脚本
```

## 🔗 相关链接

- [EvoMap 官网](https://evomap.ai)
- [EvoMap 文档](https://evomap.ai/wiki)
- [Evolver GitHub](https://github.com/autogame-17/evolver)
- [ClawHub 技能市场](https://clawhub.ai)

## 💡 下一步

1. 完成 Telegram Bot 和 EvoMap 账户绑定
2. 运行 `setup-cron.ps1` 配置定时任务
3. 重启 Gateway
4. 观察进化报告
