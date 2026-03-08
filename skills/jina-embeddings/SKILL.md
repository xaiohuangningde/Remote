# Jina Embeddings Skill

> 免费向量嵌入服务，替代阿里云 DashScope
> 创建时间：2026-03-08

---

## 功能

- 🔗 **向量嵌入** - 文本转换为 1024 维向量
- 🔍 **语义搜索** - 基于相似度查找相关文本
- 📊 **相似度计算** - 余弦相似度算法
- ✅ **API 检查** - 验证 API 密钥有效性
- 🆓 **免费额度** - 约 100 万 tokens/月

---

## 配置

API 密钥已配置在 `skills/jina-embeddings/src/index.ts`:
```typescript
const JINA_API_KEY = 'jina_...'
```

如需更新密钥，直接修改该文件即可。

---

## 使用方式

### 基础嵌入

```typescript
import { getEmbedding } from 'skills/jina-embeddings/src/index.ts'

const result = await getEmbedding('你好，这是测试文本')

if (result.success) {
  console.log(`嵌入维度：${result.embedding!.length}`) // 1024
  console.log(`消耗 tokens: ${result.tokens}`)
} else {
  console.error(`失败：${result.error}`)
}
```

### 批量嵌入

```typescript
import { getEmbeddings } from 'skills/jina-embeddings/src/index.ts'

const result = await getEmbeddings(['文本 1', '文本 2', '文本 3'])
```

### 语义搜索

```typescript
import { searchSimilar } from 'skills/jina-embeddings/src/index.ts'

const documents = [
  '今天天气很好',
  '我喜欢吃苹果',
  '编程很有趣'
]

const results = await searchSimilar('天气不错', documents, 2)

results.forEach(r => {
  console.log(`${r.text} - 相似度：${r.score.toFixed(3)}`)
})
```

### 自定义相似度计算

```typescript
import { getEmbedding, cosineSimilarity } from 'skills/jina-embeddings/src/index.ts'

const a = await getEmbedding('文本 A')
const b = await getEmbedding('文本 B')

if (a.success && b.success) {
  const score = cosineSimilarity(a.embedding!, b.embedding!)
  console.log(`相似度：${score.toFixed(3)}`)
}
```

### 检查 API 密钥

```typescript
import { checkApiKey } from 'skills/jina-embeddings/src/index.ts'

const result = await checkApiKey()
console.log(result.valid ? '密钥有效' : `无效：${result.error}`)
```

---

## CLI 使用

```bash
# 测试 API 密钥
node skills/jina-embeddings/src/index.ts test

# 获取嵌入
node skills/jina-embeddings/src/index.ts embed 你好，这是测试
```

---

## API 参考

| 方法 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `getEmbedding(text)` | string | EmbeddingResult | 获取单个嵌入 |
| `getEmbeddings(texts)` | string[] | EmbeddingResult | 批量获取嵌入 |
| `cosineSimilarity(a, b)` | number[], number[] | number | 计算余弦相似度 |
| `searchSimilar(query, docs, limit)` | string, string[], number | Promise[] | 语义搜索 |
| `checkApiKey()` | - | Promise<{valid, error}> | 检查密钥 |

### EmbeddingResult 结构

```typescript
interface EmbeddingResult {
  success: boolean
  embedding?: number[]      // 1024 维向量
  error?: string            // 错误信息
  tokens?: number           // 消耗 tokens
}
```

---

## 整合示例

### 记忆搜索

```typescript
import { searchSimilar } from 'skills/jina-embeddings/src/index.ts'

async function searchMemories(query: string, memories: Memory[]) {
  const texts = memories.map(m => m.text)
  const results = await searchSimilar(query, texts, 5)
  
  return results.map(r => ({
    ...memories[r.index],
    score: r.score
  }))
}
```

### 文档去重

```typescript
import { getEmbedding, cosineSimilarity } from 'skills/jina-embeddings/src/index.ts'

async function removeDuplicates(documents: string[], threshold = 0.95) {
  const embeddings = await Promise.all(
    documents.map(doc => getEmbedding(doc))
  )
  
  const unique: string[] = []
  
  for (let i = 0; i < documents.length; i++) {
    const isDuplicate = unique.some(doc => {
      const emb = embeddings.find((_, idx) => idx === i)
      const uniqueEmb = embeddings.find((_, idx) => idx === unique.indexOf(doc))
      return cosineSimilarity(emb!.embedding!, uniqueEmb!.embedding!) > threshold
    })
    
    if (!isDuplicate) {
      unique.push(documents[i])
    }
  }
  
  return unique
}
```

### heartbeat 记忆检查

```typescript
// 在 heartbeat 中
import { searchSimilar } from 'skills/jina-embeddings/src/index.ts'

const memories = ['记忆 1', '记忆 2', '记忆 3']
const query = '用户偏好'

const results = await searchSimilar(query, memories, 3)
console.log('相关记忆:', results)
```

---

## 最佳实践

### 1. 文本预处理

```typescript
// 去除多余空白，提高嵌入质量
function preprocess(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

const embedding = await getEmbedding(preprocess('  多个  空格  '))
```

### 2. 批量处理

```typescript
// 批量比单个更高效
const texts = ['文本 1', '文本 2', '文本 3']
const result = await getEmbeddings(texts)
```

### 3. 缓存嵌入

```typescript
// 避免重复计算
const cache = new Map<string, number[]>()

async function getCachedEmbedding(text: string) {
  if (cache.has(text)) {
    return cache.get(text)!
  }
  
  const result = await getEmbedding(text)
  if (result.success) {
    cache.set(text, result.embedding!)
  }
  return result.embedding
}
```

### 4. 错误处理

```typescript
const result = await getEmbedding(text)
if (!result.success) {
  console.warn('嵌入失败:', result.error)
  // 降级方案：使用空向量或跳过
}
```

---

## 额度管理

| 项目 | 限制 |
|------|------|
| 免费额度 | ~100 万 tokens/月 |
| 模型 | jina-embeddings-v3 |
| 维度 | 1024 |
| 最大输入 | 8192 tokens |

**监控建议**:
```typescript
let totalTokens = 0

async function trackedEmbedding(text: string) {
  const result = await getEmbedding(text)
  if (result.success) {
    totalTokens += result.tokens || 0
    console.log(`本月已用：${totalTokens} tokens`)
  }
  return result
}
```

---

## 注意事项

1. **API 密钥安全**: 不要提交到公开仓库
2. **网络依赖**: 需要互联网连接
3. **速率限制**: 免费账户有 QPS 限制
4. **错误重试**: 网络错误时建议重试

---

## 故障排除

### 401 Unauthorized
```
错误：Incorrect API key provided
解决：检查 API 密钥是否正确
```

### 429 Too Many Requests
```
错误：Rate limit exceeded
解决：等待几秒后重试，或减少请求频率
```

### 500 Server Error
```
错误：Internal server error
解决：稍后重试，或联系 Jina 支持
```

---

## 相关资源

- [Jina AI 官网](https://jina.ai/)
- [嵌入文档](https://jina.ai/embeddings)
- [模型卡片](https://jina.ai/models/jina-embeddings-v3)
- [Dashboard](https://dashboard.jina.ai/)

---

**创建者**: xiaoxiaohuang 🐤
**时间**: 2026-03-08
**API Provider**: Jina AI
**测试状态**: ✅ 待验证
