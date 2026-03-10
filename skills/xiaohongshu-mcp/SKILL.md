---
name: xiaohongshu-mcp
version: 1.0.0
description: 小红书 MCP 工具封装 - 自动化发布、搜索、评论
license: MIT
---

# xiaohongshu-mcp

小红书 MCP 工具封装，支持自动化运营。

## 快速开始

### 方式一：一键安装

```bash
cd ~/openclaw/workspace/skills/xiaohongshu-mcp
./setup.sh
```

### 方式二：手动下载

从 [GitHub Releases](https://github.com/xpzouying/xiaohongshu-mcp/releases) 下载对应平台的压缩包：

| 平台 | 文件 |
|------|------|
| macOS Apple Silicon | xiaohongshu-mcp-darwin-arm64.tar.gz |
| macOS Intel | xiaohongshu-mcp-darwin-amd64.tar.gz |
| Windows x64 | xiaohongshu-mcp-windows-amd64.zip |
| Linux x64 | xiaohongshu-mcp-linux-amd64.tar.gz |
| Linux ARM64 | xiaohongshu-mcp-linux-arm64.tar.gz |

解压后得到：
- `xiaohongshu-mcp-*` - MCP 服务主程序
- `xiaohongshu-login-*` - 登录工具

### 登录

```bash
# Linux
./xiaohongshu-login-linux-amd64

# macOS
./xiaohongshu-login-darwin-arm64
```

会打开浏览器，扫码登录小红书。登录成功后 cookies 会保存在 `~/.xiaohongshu/cookies.json`。

### 启动 MCP 服务

```bash
# Linux
./xiaohongshu-mcp-linux-amd64

# macOS
./xiaohongshu-mcp-darwin-arm64
```

## 使用方式

### 1. 在 Claude Code / Cursor 中使用

配置 `claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "xiaohongshu": {
      "command": "/path/to/xiaohongshu-mcp-darwin-arm64"
    }
  }
}
```

### 2. 通过 HTTP API 调用

启动时加 `--http` 参数：

```bash
./xiaohongshu-mcp-darwin-arm64 --http :3000
```

然后调用：
```bash
curl -X POST http://localhost:3000/push_note \
  -H "Content-Type: application/json" \
  -d '{"title":"标题","content":"正文","images":["/path/to/image.jpg"]}'
```

### 3. 通过 Node.js 调用

```javascript
import { startMCP, pushNote, search } from './index.js';

await startMCP();

// 发布笔记
await pushNote('标题', '正文', ['/path/to/image.jpg'], ['标签']);

// 搜索
const results = await search('关键词');
```

## 可用工具

| 工具 | 说明 | 参数 |
|------|------|------|
| `check_login` | 检查登录状态 | - |
| `push_note` | 发布图文笔记 | title, content, images[], tags[] |
| `push_video` | 发布视频笔记 | title, content, video_path, tags[] |
| `search` | 搜索笔记 | keyword, page? |
| `list_notes` | 获取推荐流 | page? |
| `get_note_detail` | 获取笔记详情 | note_id, xsec_token |
| `post_comment` | 评论 | note_id, xsec_token, content |
| `get_user` | 获取用户主页 | user_id, xsec_token |

## 笔记规范

- **标题**：≤ 20 字
- **正文**：≤ 1000 字
- **图片**：推荐本地路径
- **Tags**：建议添加，可提升流量

## 运营建议

- 每天发帖 ≤ 50 篇
- 建议先实名认证
- 避免引流、纯搬运
- 注意违禁词检查

## 风险提示

- 非官方 API，存在账号风险
- 作者使用一年多无封号，仅有 Cookies 过期情况
- 且用且珍惜

## 项目地址

- GitHub: https://github.com/xpzouying/xiaohongshu-mcp
- 博客: https://www.haha.ai/xiaohongshu-mcp
