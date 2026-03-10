/**
 * Jina Embeddings Skill
 * 免费向量嵌入服务，替代阿里云 DashScope
 * 
 * @module jina-embeddings
 * @author xiaoxiaohuang
 * @created 2026-03-08
 * @see https://jina.ai/embeddings
 */

import fetch from 'node-fetch'

// ============================================================================
// Configuration
// ============================================================================

const JINA_API_KEY = 'jina_915da7f007de49faad253005ba152b544RJs682_YbLAEGONbu6jggTs1bp-'
const JINA_API_URL = 'https://api.jina.ai/v1/embeddings'
const JINA_MODEL = 'jina-embeddings-v3'

// ============================================================================
// Types
// ============================================================================

export interface JinaEmbeddingResponse {
  model: string
  object: 'list'
  usage: {
    total_tokens: number
  }
  data: Array<{
    object: 'embedding'
    index: number
    embedding: number[]
  }>
}

export interface EmbeddingResult {
  success: boolean
  embedding?: number[]
  error?: string
  tokens?: number
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * 获取文本的向量嵌入
 * 
 * @param text - 输入文本
 * @returns 嵌入向量 (1024 维)
 * 
 * @example
 * ```typescript
 * const embedding = await getEmbedding('你好，这是测试文本')
 * console.log(embedding.length) // 1024
 * ```
 */
export async function getEmbedding(text: string): Promise<EmbeddingResult> {
  try {
    const response = await fetch(JINA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JINA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: JINA_MODEL,
        input: [text],
        normalized: true,
        encoding_format: 'float'
      })
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: error.message || `HTTP ${response.status}`
      }
    }

    const data: JinaEmbeddingResponse = await response.json()
    
    return {
      success: true,
      embedding: data.data[0].embedding,
      tokens: data.usage.total_tokens
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '请求失败'
    }
  }
}

/**
 * 批量获取嵌入
 * 
 * @param texts - 文本数组
 * @returns 嵌入向量数组
 * 
 * @example
 * ```typescript
 * const embeddings = await getEmbeddings(['文本 1', '文本 2'])
 * ```
 */
export async function getEmbeddings(texts: string[]): Promise<EmbeddingResult> {
  try {
    const response = await fetch(JINA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JINA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: JINA_MODEL,
        input: texts,
        normalized: true,
        encoding_format: 'float'
      })
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: error.message || `HTTP ${response.status}`
      }
    }

    const data: JinaEmbeddingResponse = await response.json()
    
    return {
      success: true,
      embedding: data.data.map(d => d.embedding).flat(),
      tokens: data.usage.total_tokens
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '请求失败'
    }
  }
}

/**
 * 计算余弦相似度
 * 
 * @param a - 向量 A
 * @param b - 向量 B
 * @returns 相似度 (-1 到 1)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('向量维度不匹配')
  }
  
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0)
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
  
  return dot / (normA * normB)
}

/**
 * 搜索最相似的文本
 * 
 * @param query - 查询文本
 * @param documents - 文档数组
 * @param limit - 返回数量
 * @returns 排序后的结果
 * 
 * @example
 * ```typescript
 * const docs = ['文档 1', '文档 2', '文档 3']
 * const results = await searchSimilar('查询', docs)
 * ```
 */
export async function searchSimilar(
  query: string,
  documents: string[],
  limit: number = 5
): Promise<Array<{ index: number; text: string; score: number }>> {
  // 获取查询嵌入
  const queryResult = await getEmbedding(query)
  if (!queryResult.success || !queryResult.embedding) {
    throw new Error(queryResult.error || '获取查询嵌入失败')
  }

  // 获取所有文档嵌入
  const docResults = await Promise.all(
    documents.map(doc => getEmbedding(doc))
  )

  // 计算相似度
  const results = documents
    .map((text, index) => {
      const docResult = docResults[index]
      if (!docResult.success || !docResult.embedding) {
        return null
      }
      
      const score = cosineSimilarity(queryResult.embedding!, docResult.embedding)
      return { index, text, score }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return results
}

/**
 * 检查 API 密钥是否有效
 */
export async function checkApiKey(): Promise<{ valid: boolean; error?: string }> {
  const result = await getEmbedding('test')
  return {
    valid: result.success,
    error: result.error
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

if (import.meta.vitest === undefined && process.argv[1]?.includes('jina-embeddings')) {
  const [, , command, ...args] = process.argv
  
  if (command === 'test') {
    checkApiKey().then(result => {
      console.log(JSON.stringify(result, null, 2))
    })
  } else if (command === 'embed' && args[0]) {
    getEmbedding(args.join(' ')).then(result => {
      console.log(JSON.stringify(result, null, 2))
    })
  } else {
    console.log(`
Jina Embeddings CLI

Usage:
  node skills/jina-embeddings/src/index.ts test
  node skills/jina-embeddings/src/index.ts embed <text>

Examples:
  node skills/jina-embeddings/src/index.ts test
  node skills/jina-embeddings/src/index.ts embed 你好，这是测试
`)
  }
}
