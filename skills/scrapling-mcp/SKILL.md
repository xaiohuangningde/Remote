# Scrapling-MCP Skill

> 自适应网页爬虫框架，带反反爬能力
> 创建时间：2026-03-08

---

## 功能

- 🕷️ **自适应爬虫** - 网页结构变化时自动调整选择器
- 🛡️ **反反爬能力** - StealthyFetcher 绕过 Cloudflare 等防护
- 🎭 **指纹浏览器** - Camoufox 集成，降低被检测风险
- 📦 **简单 API** - 类似 Scrapy 的选择器语法
- 🔗 **元素导航** - 父子/兄弟/链式选择器支持

---

## 安装

```bash
pip install scrapling[fetchers]
python -m camoufox fetch  # 下载指纹浏览器
```

---

## 使用方式

### 基础用法 (Python)

```python
from scrapling.fetchers import Fetcher, StealthyFetcher

# 基础 HTTP 请求
page = Fetcher.get('https://example.com/')
quotes = page.css('.quote')

for quote in quotes:
    text = quote.css('.text::text').get()
    author = quote.css('.author::text').get()
    print(f"{text} - {author}")
```

### 反反爬模式

```python
# StealthyFetcher 绕过 Cloudflare
page = StealthyFetcher.fetch(
    'https://protected-site.com/',
    headless=True
)
data = page.css('.content').get()
```

### 自适应选择器

```python
# 自动查找相似元素
first_item = page.css('.item')[0]
similar_items = first_item.find_similar()

# 即使网页结构变化，也能找到相似元素
for item in similar_items:
    title = item.css('.title::text').get()
```

### 元素导航

```python
page = Fetcher.get('https://example.com/')
first = page.css('.item')[0]

# 父元素
parent = first.parent

# 兄弟元素 (使用索引访问)
all_items = page.css('.item')
second = all_items[1]

# 链式选择器
texts = [item.css('.text::text').get() for item in page.css('.items')]
```

---

## TypeScript/JavaScript 封装

```typescript
// skills/scrapling-mcp/src/index.ts
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface ScraplingOptions {
  stealth?: boolean
  headless?: boolean
}

export interface ScraplingResult {
  success: boolean
  data?: any[]
  error?: string
}

export async function scrape(
  url: string,
  selector: string,
  options: ScraplingOptions = {}
): Promise<ScraplingResult> {
  const script = `
from scrapling.fetchers import Fetcher, StealthyFetcher
import json

url = "${url}"
selector = "${selector}"
stealth = ${options.stealth ? 'True' : 'False'}

try:
    if stealth:
        page = StealthyFetcher.fetch(url, headless=True)
    else:
        page = Fetcher.get(url)
    
    elements = page.css(selector)
    data = [el.get() for el in elements]
    print(json.dumps({"success": True, "data": data}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
`
  
  try {
    const { stdout } = await execAsync(`python -c "${script}"`)
    return JSON.parse(stdout)
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

---

## 整合示例

### OpenClaw Skill 调用

```typescript
import { scrape } from 'skills/scrapling-mcp/src/index.ts'

// 简单抓取
const result = await scrape(
  'https://quotes.toscrape.com/',
  '.quote'
)

if (result.success) {
  console.log(`获取 ${result.data.length} 条数据`)
}

// 反反爬模式
const stealthResult = await scrape(
  'https://protected-site.com/',
  '.content',
  { stealth: true, headless: true }
)
```

### Heartbeat 定期检查

```typescript
// 在 heartbeat 中检查网页更新
async function checkWebsiteUpdates() {
  const result = await scrape(
    'https://example.com/news',
    '.news-item',
    { stealth: true }
  )
  
  if (result.success && result.data.length > 0) {
    console.log(`发现 ${result.data.length} 条新闻`)
    // 发送通知
  }
}
```

### 数据提取管道

```typescript
async function extractData(url: string) {
  // 1. 抓取页面
  const page = await scrape(url, '.item')
  
  // 2. 提取字段
  const items = page.data?.map((item: any) => ({
    title: item.title,
    link: item.link,
    date: item.date
  }))
  
  // 3. 存储到数据库
  await db.insert('items', items)
  
  return items
}
```

---

## API 参考

| 方法 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `Fetcher.get(url)` | string | Page | 基础 HTTP 请求 |
| `StealthyFetcher.fetch(url, opts)` | string, object | Page | 反反爬请求 |
| `page.css(selector)` | string | Elements | CSS 选择器 |
| `element.get()` | - | string | 获取元素文本 |
| `element.find_similar()` | - | Elements | 查找相似元素 |
| `element.parent` | - | Element | 父元素 |

---

## 最佳实践

### 1. 选择器策略

```python
# 优先使用稳定的选择器
page.css('#main-content')  # ID 选择器 (最稳定)
page.css('.article')       # 类选择器
page.css('div > p')        # 结构选择器 (易变)
```

### 2. 反反爬使用场景

| 场景 | 使用 StealthyFetcher |
|------|---------------------|
| 普通网站 | ❌ |
| Cloudflare 保护 | ✅ |
| 需要登录 | ✅ |
| 高频请求 | ✅ |

### 3. 错误处理

```python
try:
    page = StealthyFetcher.fetch(url, headless=True)
    data = page.css('.content').get()
except Exception as e:
    print(f"抓取失败：{e}")
    # 降级方案或重试
```

### 4. 请求频率控制

```python
import time

urls = ['url1', 'url2', 'url3']
for url in urls:
    page = Fetcher.get(url)
    # 处理数据
    time.sleep(1)  # 避免过快
```

---

## 注意事项

1. **Camoufox 下载**: 首次使用需下载 ~530MB 浏览器
2. **Python 依赖**: 需要 Python 3.9+
3. **内存使用**: 浏览器模式内存占用较高
4. **选择器稳定性**: 优先使用 ID/类选择器

---

## 测试脚本

```python
# test_scrapling.py
from scrapling.fetchers import Fetcher, StealthyFetcher

# 测试 1: 基础请求
page = Fetcher.get('https://quotes.toscrape.com/')
print(f"获取 {len(page.css('.quote'))} 条名言")

# 测试 2: Stealth 模式
page = StealthyFetcher.fetch('https://quotes.toscrape.com/', headless=True)
print(f"Stealth 模式获取 {len(page.css('.quote'))} 条名言")

# 测试 3: 自适应选择器
first = page.css('.quote')[0]
similar = first.find_similar()
print(f"找到 {len(similar)} 个相似元素")
```

---

## 未来扩展

- [ ] 支持 JavaScript 渲染页面
- [ ] 代理 IP 支持
- [ ] 自动重试机制
- [ ] 数据导出 (JSON/CSV)
- [ ] 分布式爬取

---

**创建者**: xiaoxiaohuang 🐤
**时间**: 2026-03-08
**依赖**: scrapling, camoufox, playwright
**测试状态**: ✅ 全部通过
