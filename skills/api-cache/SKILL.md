# API Cache Skill

> API 响应缓存，基于 duckdb-memory
> 创建时间：2026-03-06

---

## 功能

- 💾 **响应缓存** - 减少重复 API 请求
- ⏰ **自动过期** - TTL 控制缓存有效期
- 📊 **命中统计** - 追踪缓存使用情况
- 🛡️ **缓存穿透保护** - getOrSet 原子操作
- 🧹 **自动清理** - 清理过期缓存

---

## 使用方式

### 基础用法

```typescript
import { createApiCache } from 'skills/api-cache/src/index.ts'

const cache = createApiCache(3600000)  // 1 小时默认 TTL
await cache.init()

// 设置缓存
await cache.set('weather-beijing', '/api/weather', { temp: 25 })

// 获取缓存
const weather = await cache.get('weather-beijing')
```

### getOrSet（推荐）

```typescript
// 自动处理缓存逻辑
const weather = await cache.getOrSet(
  'weather-beijing',
  '/api/weather',
  async () => {
    // 缓存未命中时执行
    return await fetchWeather('beijing')
  },
  1800000  // 30 分钟 TTL
)
```

### 自定义 TTL

```typescript
// 不同数据不同 TTL
await cache.set('user-123', '/api/user', userData, 86400000)  // 24 小时
await cache.set('news-latest', '/api/news', newsData, 300000)  // 5 分钟
```

### 缓存统计

```typescript
const stats = await cache.getStats()
console.log(`
总缓存：${stats.total}
总命中：${stats.hits}
端点分布：${JSON.stringify(stats.endpoints)}
`)
```

### 清理过期

```typescript
// 手动清理
const cleaned = await cache.cleanup()
console.log(`清理了 ${cleaned} 个过期缓存`)

// 或定期清理（heartbeat 中）
setInterval(() => cache.cleanup(), 60000)  // 每分钟
```

---

## API 参考

| 方法 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `init()` | - | Promise<void> | 初始化 |
| `get(key)` | string | Promise<T\|null> | 获取缓存 |
| `set(key, endpoint, response, ttl?)` | string, string, any, number | Promise<void> | 设置缓存 |
| `getOrSet(key, endpoint, fetchFn, ttl?)` | string, string, Function, number | Promise<T> | 获取或设置 |
| `delete(key)` | string | Promise<void> | 删除 |
| `clear()` | - | Promise<void> | 清空 |
| `cleanup()` | - | Promise<number> | 清理过期 |
| `getStats()` | - | Promise<Stats> | 统计 |
| `has(key)` | string | Promise<boolean> | 检查存在 |
| `keys()` | - | Promise<string[]> | 所有键 |

---

## 整合示例

### 天气 API 缓存

```typescript
const cache = createApiCache(1800000)  // 30 分钟
await cache.init()

async function getWeather(city: string) {
  return cache.getOrSet(
    `weather-${city}`,
    '/api/weather',
    async () => await fetch(`/api/weather?city=${city}`),
    1800000
  )
}
```

### LLM 响应缓存

```typescript
const cache = createApiCache(86400000)  // 24 小时

async function chatWithCache(prompt: string) {
  return cache.getOrSet(
    `llm-${crypto.randomUUID()}`,  // 或用 hash(prompt)
    '/api/llm/chat',
    async () => await callLLM(prompt),
    86400000
  )
}
```

### heartbeat 缓存检查

```typescript
// 在 heartbeat 中
const stats = await cache.getStats()
if (stats.hits > 100) {
  console.log(`缓存命中率良好：${stats.hits} 次命中`)
}

// 清理过期
const cleaned = await cache.cleanup()
if (cleaned > 0) {
  console.log(`清理了 ${cleaned} 个过期缓存`)
}
```

---

## 最佳实践

### 1. 键命名规范

```typescript
// 推荐格式
`{endpoint}:{params}`
`weather:beijing`
`user:123`
`llm:hash(prompt)`
```

### 2. TTL 策略

| 数据类型 | 推荐 TTL |
|----------|----------|
| 天气 | 15-30 分钟 |
| 新闻 | 5-15 分钟 |
| 用户数据 | 1-24 小时 |
| 配置数据 | 24 小时+ |
| LLM 响应 | 1-24 小时 |

### 3. 缓存穿透保护

```typescript
// 始终使用 getOrSet 而非手动 get+set
const data = await cache.getOrSet(key, endpoint, fetchFn)
```

---

## 注意事项

1. **内存限制**: 大量缓存时注意内存使用
2. **定期清理**: 建议 heartbeat 时调用 cleanup()
3. **键冲突**: 确保键的唯一性（可用 hash）
4. **TTL 选择**: 根据数据更新频率调整

---

## 未来扩展

- [ ] LRU 淘汰策略
- [ ] 缓存预热
- [ ] 分布式缓存支持
- [ ] 压缩存储

---

**创建者**: xiaoxiaohuang 🐤
**时间**: 2026-03-06
**依赖**: duckdb-memory
