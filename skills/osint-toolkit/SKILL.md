# OSINT Toolkit - 开源情报工具包

> 开源情报收集工具封装，专注公开数据源

---

## 📦 工具清单

### 已封装

| 工具 | 类型 | API Key | 免费额度 | 状态 |
|------|------|---------|----------|------|
| **Sherlock** | 用户名追踪 | ❌ 无需 | 无限 | ✅ 可用 (v0.15.0) |
| **AbuseIPDB** | IP 信誉查询 | ✅ 需 Key | 1000 次/天 | ⏳ 待配置 |
| **Shodan** | IoT 设备搜索 | ✅ 需 Key | 100 次/月 | ⏳ 待配置 |
| **Censys** | 证书/主机搜索 | ✅ 需 Key | 250 次/月 | ⏳ 待配置 |

### 待封装

| 工具 | 用途 | 优先级 |
|------|------|--------|
| **Maigret** | 用户名追踪 + 报告 | ⭐⭐⭐ |
| **FOFA** | 资产测绘 | ⭐⭐⭐ |
| **VirusTotal** | 文件/URL 分析 | ⭐⭐ |
| **GreyNoise** | 背景噪声 IP | ⭐⭐ |

---

## 🎯 使用示例

### 用户名跨平台追踪 (Sherlock)

```typescript
import { createOSINT } from 'skills/osint-toolkit/src/index.ts'

const osint = await createOSINT()

// 搜索用户名
const result = await osint.sherlock.search('target_username')

console.log(`找到 ${result.found} 个相关账号`)
console.log('平台分布:', result.platforms)
```

### IP 信誉查询 (AbuseIPDB)

```typescript
const osint = await createOSINT({
  abuseipdbKey: 'your_api_key'
})

const report = await osint.abuseipdb.check('1.2.3.4', {
  maxAgeInDays: 90
})

console.log(`滥用评分：${report.abuseConfidenceScore}/100`)
console.log(`举报次数：${report.totalReports}`)
```

### IoT 设备搜索 (Shodan)

```typescript
const osint = await createOSINT({
  shodanKey: 'your_api_key'
})

// 搜索网络摄像头
const cameras = await osint.shodan.search('webcamxp')

// 查询 IP 信息
const ipInfo = await osint.shodan.host('1.2.3.4')
```

---

## 🔧 配置方式

### 环境变量

```bash
# .env 文件
ABUSEIPDB_API_KEY=xxx
SHODAN_API_KEY=xxx
CENSYS_API_ID=xxx
CENSYS_API_SECRET=xxx
```

### 代码配置

```typescript
const osint = await createOSINT({
  abuseipdbKey: 'xxx',
  shodanKey: 'xxx',
  censysId: 'xxx',
  censysSecret: 'xxx',
})
```

---

## 📊 API 免费额度

| 服务 | 免费额度 | 注册链接 |
|------|----------|----------|
| **AbuseIPDB** | 1000 次/天 | https://abuseipdb.com/api |
| **Shodan** | 100 次/月 | https://account.shodan.io/register |
| **Censys** | 250 次/月 | https://search.censys.io/register |
| **FOFA** | 需充值 | https://fofa.info/register |

---

## 🚀 Sherlock 使用说明

### 安装依赖

```bash
pip install sherlock-project
```

### 命令行使用

```bash
# 搜索用户名
sherlock target_username

# 输出到文件
sherlock target_username -o report.txt

# 指定网站
sherlock target_username --site twitter
```

### Python API 使用

```python
from sherlock_project.sherlock import sherlock

results = sherlock(
    username='target_username',
    site_data=None,
    query_source='local'
)
```

---

## 📋 最佳实践

### 1. 用户名追踪
- 先用 Sherlock 快速扫描 300+ 平台
- 对高价值目标用 Maigret 生成详细报告
- 注意速率限制，避免被封锁

### 2. IP 调查
- 先查 AbuseIPDB 看滥用历史
- 再用 Shodan 看开放端口和服务
- 结合 Censys 查证书关联

### 3. 资产发现
- FOFA/Shodan 语法：`port:80 country:"CN"`
- 用证书信息关联子域名
- 监控新暴露的资产

---

## ⚠️ 注意事项

1. **合法使用** - 仅用于授权的安全研究
2. **速率限制** - 遵守各平台 API 限制
3. **隐私保护** - 不收集/存储敏感个人信息
4. **数据准确性** - 公开数据可能有误，需交叉验证

---

## 📚 相关资源

- [Awesome OSINT](https://github.com/jivoi/awesome-osint) - 完整工具列表
- [OSINT Framework](https://osintframework.com/) - 分类工具框架
- [IntelTechniques](https://inteltechniques.com/tools.html) - OSINT 教程

---

**创建时间**: 2026-03-08 20:43  
**创建者**: xiaoxiaohuang  
**状态**: 🚧 开发中
