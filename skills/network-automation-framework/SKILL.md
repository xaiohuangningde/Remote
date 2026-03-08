# 网络/浏览器自动化技能框架

**创建时间**: 2026-03-06 12:15
**版本**: 1.0
**状态**: active

---

## 核心原则

**效率优先**: API > CLI > Skill > 浏览器自动化

**场景匹配**: 根据目标网站特性选择最合适的工具

**渐进降级**: 从轻量到重量，失败后自动切换下一层

---

## 技能分层架构

```
┌─────────────────────────────────────────────────────────┐
│                    用户请求                              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 1: API 直接调用 (最快，无 UI)                     │
│  - Exa Search (web_search_exa)                          │
│  - 小红书 MCP (push_note, search)                       │
│  - GitHub CLI (gh search, gh issue)                     │
└─────────────────────────────────────────────────────────┘
                          ↓ 失败/无 API
┌─────────────────────────────────────────────────────────┐
│  Layer 2: 轻量抓取 (无头，快速)                          │
│  - web_fetch (Readability 提取)                         │
│  - r.jina.ai (AI 读取器)                                │
│  - markdown.new (Cloudflare 站点)                       │
└─────────────────────────────────────────────────────────┘
                          ↓ 需要登录/JS 渲染
┌─────────────────────────────────────────────────────────┐
│  Layer 3: 浏览器自动化 (完整渲染，可交互)                 │
│  - browser (OpenClaw 内置)                              │
│  - BrowserWing (HTTP API)                               │
└─────────────────────────────────────────────────────────┘
```

---

## 工具选择决策树

```
需要访问网页内容？
    │
    ├─→ 有官方 API/MCP？
    │       │
    │       ├─ Yes → 用 API (Layer 1)
    │       │         例：小红书 MCP, GitHub CLI, Exa Search
    │       │
    │       └─ No → 继续 ↓
    │
    ├─→ 需要登录/JS 渲染/交互？
    │       │
    │       ├─ Yes → 浏览器自动化 (Layer 3)
    │       │         例：X/Twitter, 后台管理系统
    │       │
    │       └─ No → 轻量抓取 (Layer 2)
    │                 例：新闻文章，博客，文档
    │
    └─→ 需要搜索？
            │
            ├─ 通用搜索 → Exa (neural search)
            ├─ 代码搜索 → Exa code_search
            └─ 最新信息 → browser + 搜索引擎
```

---

## 各层详细指南

### Layer 1: API 直接调用

**特点**: 最快、最稳定、无 UI 开销

| 工具 | 适用场景 | 命令示例 |
|------|----------|----------|
| **Exa Search** | 通用搜索、新闻、公司、人物 | `mcporter call exa.web_search_exa(query="...")` |
| **小红书 MCP** | 发布笔记、搜索、评论 | `push_note(title, content, images, tags)` |
| **GitHub CLI** | Issues、PRs、CI、代码搜索 | `gh search repos "query"` |
| **Feishu** | 飞书消息、日历、文档 | `feishu message send ...` |

**优势**:
- ✅ 速度快（毫秒级）
- ✅ 稳定可靠
- ✅ 无需处理 UI 变化
- ✅ 可批量操作

**限制**:
- ❌ 需要 API 密钥/配置
- ❌ 功能受 API 限制

---

### Layer 2: 轻量抓取

**特点**: 无头、快速、适合静态内容

| 工具 | 适用场景 | 用法 |
|------|----------|------|
| **web_fetch** | 通用网页转 Markdown | `web_fetch(url, extractMode="markdown")` |
| **r.jina.ai** | AI 优化提取 | `https://r.jina.ai/https://example.com` |
| **markdown.new** | Cloudflare 站点 | `https://markdown.new/https://example.com` |
| **defuddle.md** | 备用提取器 | `https://defuddle.md/https://example.com` |

**优先级**:
1. `web_fetch` (内置，最方便)
2. `r.jina.ai` (AI 优化，适合长文)
3. `markdown.new` (Cloudflare 友好)
4. `defuddle.md` (备用)

**优势**:
- ✅ 快速（秒级）
- ✅ 无需浏览器
- ✅ 输出干净 Markdown

**限制**:
- ❌ 无法处理登录
- ❌ 无法执行 JS
- ❌ 动态内容可能丢失

---

### Layer 3: 浏览器自动化

**特点**: 完整渲染、可交互、处理登录

| 工具 | 适用场景 | 关键能力 |
|------|----------|----------|
| **browser (OpenClaw)** | 通用浏览器自动化 | open, snapshot, screenshot, act |
| **BrowserWing** | HTTP API 控制 | navigate, click, type, extract |

**标准流程** (OpenClaw browser):
```
1. browser.open(url) → 拿到 targetId
2. browser.screenshot(targetId, fullPage=true) → 人类查看
3. browser.act(targetId, kind=evaluate, fn=JS) → 提取内容
4. browser.act(targetId, kind=click/type) → 交互操作
```

**关键技巧**:
- 复用 `targetId` 保持在同一个标签页
- 用 `evaluate` 执行 JS 提取任意内容
- `screenshot` 捕获渲染后内容
- `snapshot` 获取 DOM 结构（aria refs）

**优势**:
- ✅ 处理登录状态
- ✅ 完整 JS 渲染
- ✅ 可模拟交互（点击、输入）
- ✅ 可截图验证

**限制**:
- ❌ 慢（10-30 秒）
- ❌ 资源消耗大
- ❌ UI 变化可能导致失败

---

## 成功经验总结

### ✅ X/Twitter 访问 (2026-03-06)

**挑战**: 需要登录，动态加载

**成功流程**:
```
web_fetch → ❌ 返回错误页面
web_search → ❌ API token 失效
browser.open → ✅ 拿到 targetId
browser.screenshot → ✅ 完整页面截图
browser.act/evaluate → ✅ JS 提取全文
```

**关键**: 复用 targetId，用 evaluate 执行 `document.body.innerText`

---

### ✅ 小红书运营 (历史经验)

**方式**: 小红书 MCP (专用 API)

**功能**:
- 发布图文/视频笔记
- 搜索笔记
- 评论互动
- 获取用户信息

**优势**: 比浏览器自动化快 10 倍，稳定可靠

---

### ✅ 小红书访问 (2026-03-06 新增)

**挑战**: 动态 JS 渲染，内容丰富

**成功流程**:
```
browser.open("https://www.xiaohongshu.com/explore")
  → targetId: BD4ACC1728DDADB22AA1429047279C8E
browser.snapshot → 获取 DOM 结构 (aria refs)
browser.screenshot → 验证人类可见内容
browser.act/evaluate → 提取文本内容
```

**提取内容**:
- 笔记标题、作者、点赞数
- 分类标签（推荐、穿搭、美食等）
- OpenClaw 相关笔记（4 篇）

**对比 MCP**:
| 维度 | MCP | Browser |
|------|-----|---------|
| 速度 | <1s | 10-30s |
| 配置 | 需要 cookies | 无需配置 |
| 场景 | 日常运营 | 临时访问/分析 |

**详细文档**: `research/xiaohongshu-browser-access-success.md`

---

## 故障排查流程

```
访问失败？
    │
    ├─→ 检查错误类型
    │       │
    │       ├─ 403/需要登录 → 升级到 Layer 3 (browser)
    │       ├─ 空白/内容缺失 → 可能是 JS 渲染 → Layer 3
    │       ├─ API token 失效 → 换工具或 Layer 2/3
    │       └─ 超时 → 增加 timeout 或换 Layer
    │
    ├─→ 尝试备用工具
    │       web_fetch → r.jina.ai → markdown.new → browser
    │
    └─→ 记录经验
            更新 TOOLS.md 或 tasks/lessons.md
```

---

## 最佳实践

### 1. 先问三个问题

1. **有 API 吗？** → 优先用 API
2. **需要登录/JS 吗？** → 需要则直接用 browser
3. **只是静态内容？** → web_fetch 最快

### 2. 渐进式降级

```python
def fetch_content(url):
    # Layer 1: API (如果有)
    if has_api(url):
        return api_fetch(url)
    
    # Layer 2: 轻量抓取
    try:
        return web_fetch(url)
    except:
        pass
    
    # Layer 3: 浏览器
    return browser_fetch(url)
```

### 3. 内容提取策略

| 内容类型 | 提取方法 |
|----------|----------|
| 文章正文 | `web_fetch` 或 `r.jina.ai/URL` |
| 推文/帖子 | `browser.act` + JS 查询 `[data-testid="tweetText"]` |
| 列表数据 | `browser.act` + JS `querySelectorAll` |
| 表单提交 | `browser.act` + `type` + `click` |

### 4. 错误处理

- 设置合理 timeout (10-30 秒)
- 捕获异常后尝试备用方案
- 记录失败原因到 lessons.md

---

## 工具配置清单

### 已配置
- [x] OpenClaw browser (内置)
- [x] web_fetch (内置)
- [x] Exa Search (需 API key)
- [x] 小红书 MCP (需登录)
- [x] GitHub CLI (需 gh auth)

### 可选配置
- [ ] BrowserWing (需启动服务)
- [ ] Playwright MCP (更强大的浏览器控制)

---

## 学习路径

### 初级 (已完成 ✅)
- [x] web_fetch 使用
- [x] browser.open + screenshot
- [x] browser.act + evaluate 提取内容

### 中级 (进行中 📚)
- [ ] browser.act + click 点击元素
- [ ] browser.act + type 输入文本
- [ ] 使用 aria refs 定位元素
- [ ] 处理 iframe

### 高级 (待学习)
- [ ] BrowserWing HTTP API
- [ ] Playwright MCP
- [ ] 批量操作 + 并行处理
- [ ] 反检测技巧

---

**Next**: 练习 click 和 type 操作，参考 `tasks/browser-automation-skill.md`
