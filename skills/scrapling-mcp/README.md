# Scrapling-MCP Skill

自适应网页爬虫框架，为 OpenClaw 提供反反爬能力。

## 快速开始

### 1. 安装依赖

```bash
pip install scrapling[fetchers]
python -m camoufox fetch  # 下载指纹浏览器 (~530MB)
```

### 2. 使用示例

```typescript
import { scrape } from 'skills/scrapling-mcp/src/index.ts'

// 简单抓取
const result = await scrape(
  'https://quotes.toscrape.com/',
  '.quote'
)

console.log(`获取 ${result.data?.length} 条数据`)

// 反反爬模式
const stealthResult = await scrape(
  'https://protected-site.com/',
  '.content',
  { stealth: true }
)
```

## 文档

详细文档见 [SKILL.md](./SKILL.md)

## 测试

```bash
npm test
```

## 创建者

xiaoxiaohuang 🐤
2026-03-08
