# Agent Reach Skill

让 AI Agent 能够搜索和读取互联网内容的工具集。

## 工具

### 全网搜索 (Exa)
```
mcporter call exa.web_search_exa --query "搜索内容"
```

### 代码搜索
```
mcporter call exa.get_code_context_exa --query "代码搜索内容"
```

### 读任意网页
```
curl https://r.jina.ai/URL
```

### YouTube 视频字幕
```
yt-dlp --dump-json URL
```

### GitHub 搜索
```
gh search repos "关键词"
gh repo view owner/repo
```

### RSS 订阅
用 Python feedparser 模块读取 RSS/Atom 源。

### Twitter/X (需要 Cookie)
```
bird tweet URL
```
需要先配置: agent-reach configure twitter-cookies "auth_token=xxx; ct0=yyy"

## 诊断
```
agent-reach doctor
```

## 当前状态
- ✅ Exa 全网搜索 (mcporter)
- ✅ GitHub CLI
- ✅ RSS/任意网页 (Jina)
- ⚠️ YouTube (yt-dlp 已装)
- ⚠️ Twitter (需要 Cookie)
- ❌ 小红书/抖音 (需要 MCP)
