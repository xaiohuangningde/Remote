# WorldView MCP - 快速开始

> 全球实时监控情报系统

---

## 🚀 5 分钟上手

### 1. 确保 WorldView 服务运行

```bash
cd D:\projects\worldview
npm run dev:all
```

访问 http://localhost:5173 确认界面正常。

### 2. 在 OpenClaw 中使用

```typescript
import { createWorldView } from 'skills/worldview-mcp/src/index.ts'

const wv = await createWorldView()

// 查询航班
const flights = await wv.getFlights()

// 查询地震
const quakes = await wv.getEarthquakes({ minMagnitude: 5.0 })

// 追踪卫星
const iss = await wv.trackSatellite('ISS')
```

---

## 📊 典型用例

### OSINT 地震速报

```typescript
// 监控中国境内 5.0+ 地震
const quakes = await wv.getEarthquakes({ minMagnitude: 5.0, hours: 1 })

const chinaQuakes = quakes.filter(q => 
  q.latitude > 18 && q.latitude < 54 &&
  q.longitude > 73 && q.longitude < 135
)

if (chinaQuakes.length > 0) {
  console.log('地震警报:', chinaQuakes)
}
```

### 特殊航班监控

```typescript
const flights = await wv.getFlights()

// 筛选无航班号/航空公司的飞机
const unknown = flights.filter(f => 
  f.callsign === '' || f.airline === ''
)

console.log('不明航班:', unknown.length)
```

### ISS 过境预测

```typescript
const iss = await wv.trackSatellite('ISS')

if (iss?.nextPass) {
  console.log(`ISS 过境时间：${iss.nextPass.riseTime}`)
  console.log(`最大仰角：${iss.nextPass.maxElevation}°`)
}
```

---

## 🔧 配置

### 环境变量 (可选)

```bash
# .env
WORLDVIEW_BASE_URL=http://localhost:3001
WORLDVIEW_TIMEOUT=30000
AISSTREAM_API_KEY=你的 AIS API Key
```

### 运行时配置

```typescript
const wv = await createWorldView({
  baseUrl: 'http://localhost:3001',
  timeout: 30000,
  cache: {
    enabled: true,
    ttl: 60000  // 缓存 1 分钟
  }
})
```

---

## 📋 API 速查

| 方法 | 说明 | 示例 |
|------|------|------|
| `getFlights()` | 获取全球航班 | `await wv.getFlights()` |
| `getFlightsByRegion({lat,lon,radius})` | 按区域查询 | `await wv.getFlightsByRegion({lat:31.2, lon:121.4, radius:200})` |
| `findFlight({callsign})` | 按航班号搜索 | `await wv.findFlight({callsign:'CA123'})` |
| `getSatellites({group})` | 获取卫星 | `await wv.getSatellites({group:'starlink'})` |
| `trackSatellite(name)` | 追踪卫星 | `await wv.trackSatellite('ISS')` |
| `getEarthquakes({minMagnitude,hours})` | 获取地震 | `await wv.getEarthquakes({minMagnitude:5.0})` |
| `getShips({type})` | 获取船舶 | `await wv.getShips({type:'tanker'})` |
| `getCameras({city})` | 获取摄像头 | `await wv.getCameras({city:'london'})` |
| `healthCheck()` | 健康检查 | `await wv.healthCheck()` |

---

## ⚠️ 注意事项

1. **服务依赖** — 需要 WorldView 后端运行在 `localhost:3001`
2. **API Key** — 船舶追踪需要 AISStream.io API Key (可选)
3. **缓存** — 默认启用 60 秒缓存，可配置关闭

---

## 📖 完整文档

查看 `SKILL.md` 获取详细 API 文档和 OSINT 应用场景。

---

**更新时间**: 2026-03-08  
**版本**: 1.0.0
