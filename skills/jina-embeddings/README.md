# Jina Embeddings

免费向量嵌入服务，为 OpenClaw 提供语义搜索能力。

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 使用示例

```typescript
import { getEmbedding, searchSimilar } from 'skills/jina-embeddings/src/index.ts'

// 获取嵌入
const result = await getEmbedding('你好，这是测试文本')
console.log(`维度：${result.embedding!.length}`) // 1024

// 语义搜索
const docs = ['文档 1', '文档 2', '文档 3']
const results = await searchSimilar('查询', docs)
```

## 文档

详细文档见 [SKILL.md](./SKILL.md)

## 创建者

xiaoxiaohuang 🐤
2026-03-08
