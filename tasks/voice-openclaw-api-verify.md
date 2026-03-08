# OpenClaw HTTP API 验证报告

**验证时间**: 2026-03-07 09:42
**测试目标**: 检查是否存在 HTTP API 端点 `/api/chat`

## 1. 端口扫描结果

OpenClaw Gateway 当前监听的端口:

| 端口 | 协议 | 说明 |
|------|------|------|
| 18789 | TCP | Gateway 主端口 (localhost) |
| 18790 | TCP | Web UI / WebChat |
| 18792 | TCP | Agent RPC (需要认证) |
| 18793 | TCP | 内部服务 |
| 18802 | TCP | 内部服务 |

## 2. HTTP 端点测试

### 2.1 测试 `/api/chat` (预期端点)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"你好"}]}'
```

**结果**: ❌ **端口 3000 无服务**

OpenClaw 默认不使用端口 3000。

### 2.2 测试实际端口

| 端点 | 端口 | 结果 |
|------|------|------|
| `/` | 18790 | ✅ 200 OK (HTML Web UI) |
| `/webchat` | 18790 | ✅ 200 OK (WebChat 界面) |
| `/api` | 18790 | ❌ 404 Not Found |
| `/` | 18792 | ❌ 401 Unauthorized (需要认证) |

### 2.3 发现的 HTTP 端点 (浏览器控制)

在代码中发现以下 POST 端点 (用于浏览器自动化):

- `/act` - 浏览器操作
- `/screenshot` - 截图
- `/navigate` - 导航
- `/pdf` - PDF 生成
- `/start`, `/stop` - 浏览器控制
- `/tabs/open`, `/tabs/focus` - 标签页管理

**但这些是浏览器控制 API，不是一般聊天 API**。

## 3. OpenClaw 架构分析

### 3.1 实际通信方式

OpenClaw **不使用 HTTP REST API** 进行主要通信。它使用:

1. **CLI 命令**: `openclaw agent --message "..."`
2. **RPC (内部)**: 通过 Unix Socket/TCP (端口 18792，需要认证)
3. **消息插件**: 通过 Telegram/WhatsApp/Discord 等渠道

### 3.2 与 Agent 交互的正确方式

```bash
# CLI 方式
openclaw agent --message "你好" --thinking high

# 或通过消息渠道
openclaw message send --to <channel> --message "你好"
```

### 3.3 如果需要 HTTP API

需要自行实现 HTTP 服务器，调用 OpenClaw CLI 或 RPC:

```javascript
// 方案 1: 调用 CLI
const { exec } = require('child_process');
exec('openclaw agent --message "你好"', (err, stdout) => {
  console.log(stdout);
});

// 方案 2: 使用 OpenClaw SDK (如果可用)
// 需要查看是否有 Node.js SDK
```

## 4. 结论

**验证结果**: ⚠️ **部分通过**

**关键发现**:
1. ❌ 不存在标准的 `/api/chat` HTTP 端点
2. ✅ OpenClaw Gateway 在运行 (端口 18789-18793)
3. ✅ 有 Web UI (端口 18790)
4. ✅ 有内部 RPC (端口 18792，需认证)
5. ❌ 没有公开的 REST API 用于聊天

**对语音项目的影响**:

语音系统不能简单地通过 HTTP POST 调用 OpenClaw。需要:

1. **方案 A**: 使用 CLI 调用 (`openclaw agent`)
2. **方案 B**: 使用 OpenClaw 内部 RPC (需要认证令牌)
3. **方案 C**: 通过消息渠道 (Telegram/WhatsApp 等)
4. **方案 D**: 自己实现 HTTP 桥接层

**推荐**: 方案 A (CLI) 或 方案 D (自建桥接)

## 5. 建议实现

```python
# 语音系统集成示例
import subprocess
import json

def call_openclaw_agent(message: str) -> str:
    """通过 CLI 调用 OpenClaw Agent"""
    result = subprocess.run(
        ['openclaw', 'agent', '--message', message, '--json'],
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        return json.loads(result.stdout)
    else:
        raise Exception(f"OpenClaw CLI failed: {result.stderr}")
```
