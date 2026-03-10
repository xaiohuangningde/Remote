# Web Fetch Skill - 网页转 Markdown

将网页转换为 Markdown 格式的工具集。

## 使用方法

### 方法1: markdown.new (首选)
在网址前添加 `markdown.new/`
```
https://markdown.new/https://example.com
```

### 方法2: defuddle.md
如果 markdown.new 不支持，尝试:
```
https://defuddle.md/https://example.com
```

### 方法3: Jina Reader
使用 Jina AI 的读取器:
```
https://r.jina.ai/https://example.com
```

### 方法4: Scrapling (最后手段)
如果以上都不行，使用 Scrapling 爬虫:

```bash
# 安装
pip install scrapling

# 使用
scrapling https://example.com --markdown
```

## 优先级
1. markdown.new - Cloudflare 站点
2. r.jina.ai - 通用
3. defuddle.md - 备用
4. scrapling - 最后手段

## 示例

将小红书文章转为 Markdown:
```
https://r.jina.ai/https://www.xiaohongshu.com/explore/xxx
```

## 状态
- ✅ markdown.new
- ✅ r.jina.ai  
- ✅ defuddle.md
- ⚠️ scrapling (需要安装)
