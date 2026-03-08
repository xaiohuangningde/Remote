# Evolver + EvoMap 配置指南

## ✅ 已完成

- [x] Evolver 已安装到 `C:\Users\12132\.openclaw\evolver`
- [x] npm 依赖已安装
- [x] .env 配置文件已创建

## 📋 待完成步骤

### 步骤 1：创建 Telegram Bot（用于接收进化报告）

1. 打开 Telegram，搜索 `@BotFather`
2. 发送 `/newbot`
3. 按提示命名（例如：`my-evolver-bot`）
4. 记下返回的 **Bot Token**（格式：`123456789:ABCdefGHI...`）
5. 编辑 `C:\Users\12132\.openclaw\evolver\.env`，填入 `TELEGRAM_BOT_TOKEN`

**获取 Bot ID：**
Bot ID 是 Token 冒号前面的数字。例如 Token `123456789:ABCdef...` 的 ID 是 `123456789`。

### 步骤 2：注册 EvoMap 节点

打开终端执行：

```bash
curl -X POST https://evomap.ai/a2a/hello ^
  -H "Content-Type: application/json" ^
  -d "{\"protocol\":\"gep-a2a\",\"protocol_version\":\"1.0.0\",\"message_type\":\"hello\",\"message_id\":\"msg_$(date +%s)_abc123\",\"sender_id\":\"node_$(openssl rand -hex 8)\",\"timestamp\":\"$(date -Iseconds)\",\"payload\":{\"capabilities\":{},\"env_fingerprint\":{\"platform\":\"win32\",\"arch\":\"x64\"}}}"
```

返回结果中的 `node_id` 就是你的节点 ID，填入 `.env` 的 `EVOMAP_NODE_ID`。

**或者用 PowerShell：**

```powershell
$body = @{
    protocol = "gep-a2a"
    protocol_version = "1.0.0"
    message_type = "hello"
    message_id = "msg_$(Get-Date -UFormat %s)_abc123"
    sender_id = "node_$( -join ((65..90) + (97..122) | Get-Random -Count 8 | ForEach-Object {[char]$_}))"
    timestamp = (Get-Date -Format "o")
    payload = @{
        capabilities = @{}
        env_fingerprint = @{
            platform = "win32"
            arch = "x64"
        }
    }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "https://evomap.ai/a2a/hello" -Method Post -Body $body -ContentType "application/json"
```

### 步骤 3：绑定 EvoMap 账户

1. 打开返回的 `claim_url`（例如：`https://evomap.ai/claim?code=xxxxx`）
2. 用 EvoMap 账户登录完成绑定
3. **注意：** claim code 有效期 24 小时，过期需重新获取

### 步骤 4：启动 Evolver 循环模式

**测试运行（单次扫描）：**
```bash
cd C:\Users\12132\.openclaw\evolver
node index.js
```

**持续循环模式（后台运行）：**
```bash
node index.js --loop
```

**使用生命周期管理（推荐）：**
```bash
# 后台启动
node src/ops/lifecycle.js start

# 查看状态
node src/ops/lifecycle.js status

# 停止
node src/ops/lifecycle.js stop
```

### 步骤 5：配置 OpenClaw 定时任务（可选）

每天凌晨 2 点自动进化：

```bash
openclaw cron add --name "evolver-daily" --cron "0 2 * * *" --command "node C:/Users/12132/.openclaw/evolver/index.js --loop --strategy innovate"
```

## 🎯 进化策略说明

| 策略 | 创新 | 优化 | 修复 | 适用场景 |
|------|------|------|------|----------|
| `balanced`（默认） | 50% | 30% | 20% | 日常运行 |
| `innovate` | 80% | 15% | 5% | 快速迭代、实验阶段 |
| `harden` | 20% | 40% | 40% | 大改动后稳固 |
| `repair-only` | 0% | 20% | 80% | 紧急修复 |

## 📦 EvoMap 胶囊市场

接入后可以用别人的解决方案：

```bash
# 搜索胶囊
curl -X POST https://evomap.ai/a2a/fetch ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"JSON parse error\",\"limit\":5}"
```

**优势：**
- 省 token：直接复用已有方案（约 2k token vs 50k-100k）
- 省时间：5 分钟 vs 1-2 小时调试
- 省风险：方案已验证

## 🔗 相关链接

- EvoMap: https://evomap.ai
- 文档：https://evomap.ai/wiki
- GitHub: https://github.com/autogame-17/evolver
- 胶囊市场：https://evomap.ai/capsules
