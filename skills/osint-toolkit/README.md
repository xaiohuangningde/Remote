# OSINT Toolkit - TypeScript 封装

> 开源情报收集工具统一入口

---

## 📦 安装

```bash
cd skills/osint-toolkit
npm install
```

### 依赖

```json
{
  "dependencies": {
    "node-fetch": "^3.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

## 🚀 快速开始

### 1. 基础使用 (无需 API Key)

```typescript
import { createOSINT } from './src/index.ts'

const osint = await createOSINT()

// 用户名追踪
const result = await osint.sherlock.search('target_username')
console.log(`找到 ${result.found} 个账号`)
```

### 2. 配置 API Key

```typescript
const osint = await createOSINT({
  abuseipdbKey: process.env.ABUSEIPDB_API_KEY,
  shodanKey: process.env.SHODAN_API_KEY,
})

// IP 信誉查询
const report = await osint.abuseipdb.check('1.2.3.4')
console.log(`滥用评分：${report.abuseConfidenceScore}`)
```

---

## 📚 API 文档

### Sherlock - 用户名追踪

```typescript
interface SherlockResult {
  username: string
  found: number
  platforms: Array<{
    name: string
    url: string
    status: 'found' | 'not_found' | 'error'
  }>
  timestamp: string
}

// 搜索
const result = await osint.sherlock.search(username: string)

// 带选项
const result = await osint.sherlock.search(username, {
  timeout: 10000,
  maxConcurrency: 50,
})
```

### AbuseIPDB - IP 信誉查询

```typescript
interface AbuseIPDBReport {
  ipAddress: string
  abuseConfidenceScore: number  // 0-100
  totalReports: number
  lastReportedAt: string
  reports: Array<{
    reportedAt: string
    comment: string
    categories: number[]
  }>
}

// 查询 IP
const report = await osint.abuseipdb.check(ip: string, options?: {
  maxAgeInDays?: number
})

// 批量查询
const reports = await osint.abuseipdb.batchCheck(ips: string[])
```

### Shodan - IoT 设备搜索

```typescript
interface ShodanSearchResult {
  total: number
  matches: Array<{
    ip: string
    port: number
    org: string
    product: string
    version: string
  }>
}

// 搜索
const result = await osint.shodan.search(query: string)

// 查询主机
const host = await osint.shodan.host(ip: string)
```

### Censys - 证书/主机搜索

```typescript
interface CensysSearchResult {
  total: number
  results: Array<{
    ip: string
    services: Array<{
      port: number
      service: string
    }>
    certificates: string[]
  }>
}

// 搜索主机
const result = await osint.censys.searchHost(query: string)

// 搜索证书
const certs = await osint.censys.searchCertificates(query: string)
```

---

## 🔧 配置选项

```typescript
interface OSINTConfig {
  // AbuseIPDB
  abuseipdbKey?: string
  
  // Shodan
  shodanKey?: string
  
  // Censys
  censysId?: string
  censysSecret?: string
  
  // 通用
  timeout?: number  // 默认 10000ms
  maxConcurrency?: number  // 默认 50
  userAgent?: string  // 默认 'OSINT-Toolkit/1.0'
}
```

---

## 📊 错误处理

```typescript
import { OSINTError } from './src/index.ts'

try {
  const result = await osint.sherlock.search('username')
} catch (error) {
  if (error instanceof OSINTError) {
    console.error(`OSINT 错误：${error.message}`)
    console.error(`类型：${error.type}`)  // 'rate_limit' | 'auth' | 'network'
  }
}
```

---

## 🧪 测试

```bash
# 运行测试
npm test

# 测试 Sherlock
npm test -- sherlock

# 测试 AbuseIPDB (需要 Key)
ABUSEIPDB_API_KEY=xxx npm test -- abuseipdb
```

---

## 📝 使用场景

### 1. 安全研究

```typescript
// 调查恶意 IP
const ip = '1.2.3.4'
const report = await osint.abuseipdb.check(ip)
if (report.abuseConfidenceScore > 50) {
  console.log('⚠️ 高风险 IP')
}
```

### 2. 用户背景调查

```typescript
// 检查用户名可用性/存在性
const platforms = await osint.sherlock.search('company_name')
console.log('已注册平台:', platforms.platforms.filter(p => p.status === 'found'))
```

### 3. 资产发现

```typescript
// 搜索公司暴露的服务
const assets = await osint.shodan.search('org:"Target Company"')
console.log(`发现 ${assets.total} 个暴露的服务`)
```

---

## ⚠️ 注意事项

1. **速率限制** - 遵守各平台 API 限制
2. **合法使用** - 仅用于授权的安全研究
3. **错误处理** - 网络请求可能失败，需重试
4. **隐私保护** - 不存储敏感个人信息

---

**创建时间**: 2026-03-08 20:43  
**维护者**: xiaoxiaohuang
