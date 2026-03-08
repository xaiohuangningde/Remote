# WorldView MCP Skill

> 全球实时监控情报系统 — 航班/卫星/地震/船舶/CCTV 数据聚合

---

## 📦 技能信息

| 属性 | 值 |
|------|------|
| **名称** | worldview-mcp |
| **版本** | 1.0.0 |
| **类型** | OSINT 情报收集 |
| **数据源** | WorldView 本地服务 |
| **更新频率** | 实时 (2 秒 -5 分钟) |

---

## 🎯 功能概述

WorldView 技能封装了全球实时监控平台的 API，提供以下数据层：

| 数据层 | 用途 | 更新频率 |
|--------|------|----------|
| ✈️ 航班 | 全球 ~6500 架飞机实时追踪 | 5-20 秒 |
| 🛰️ 卫星 | 卫星轨道位置预测 | 2 秒 |
| 🌋 地震 | 全球地震监测 (USGS) | 60 秒 |
| 🚢 船舶 | AIS 船舶追踪 | 30 秒 |
| 📹 CCTV | 城市交通摄像头 | 5 分钟 |

---

## 📋 API 参考

### 初始化

```typescript
import { createWorldView } from 'skills/worldview-mcp/src/index.ts'

const wv = await createWorldView({
  baseUrl: 'http://localhost:3001',  // 后端 API 地址
  timeout: 30000                      // 请求超时 (毫秒)
})
```

---

### 航班查询

#### 获取全球航班
```typescript
const flights = await wv.getFlights()
// 返回：Flight[] (约 6500 条)
```

#### 按区域查询航班
```typescript
const flights = await wv.getFlightsByRegion({
  lat: 31.2,      // 纬度 (上海)
  lon: 121.4,     // 经度
  radius: 200     // 半径 (公里)
})
```

#### 按航班号搜索
```typescript
const flight = await wv.findFlight({
  callsign: 'CA123'  // 航班号
})
```

#### 航班数据结构
```typescript
interface Flight {
  icao24: string       // ICAO 24 位地址
  callsign: string     // 航班号
  registration: string // 注册号
  aircraftType: string // 机型
  latitude: number     // 纬度
  longitude: number    // 经度
  altitude: number     // 高度 (米)
  velocity: number     // 速度 (米/秒)
  heading: number      // 航向 (度)
  verticalRate: number // 垂直速度
  originAirport: string // 起飞机场
  destAirport: string   // 目的地机场
  airline: string      // 航空公司
}
```

---

### 卫星查询

#### 获取所有卫星
```typescript
const satellites = await wv.getSatellites()
```

#### 按类别筛选
```typescript
const stations = await wv.getSatellites({ group: 'stations' })  // 空间站
const starlink = await wv.getSatellites({ group: 'starlink' })  // Starlink
```

#### 追踪特定卫星
```typescript
const iss = await wv.trackSatellite('ISS')
```

#### 卫星数据结构
```typescript
interface Satellite {
  name: string         // 卫星名称
  noradId: number      // NORAD ID
  latitude: number     // 当前纬度
  longitude: number    // 当前经度
  altitude: number     // 轨道高度 (公里)
  velocity: number     // 轨道速度 (公里/秒)
  period: number       // 轨道周期 (分钟)
  inclination: number  // 轨道倾角 (度)
  nextPass?: {         // 下次过境预测 (可选)
    riseTime: Date
    setTime: Date
    duration: number   // 可见时长 (秒)
    maxElevation: number // 最大仰角 (度)
  }
}
```

---

### 地震查询

#### 获取最近地震
```typescript
const earthquakes = await wv.getEarthquakes()
```

#### 按震级筛选
```typescript
const major = await wv.getEarthquakes({
  minMagnitude: 5.0,   // 最小震级
  hours: 24            // 时间范围 (小时)
})
```

#### 按区域查询
```typescript
const quakes = await wv.getEarthquakesByRegion({
  lat: 35.0,
  lon: 140.0,
  radius: 500,         // 半径 (公里)
  minMagnitude: 4.0
})
```

#### 地震数据结构
```typescript
interface Earthquake {
  id: string           // USGS ID
  magnitude: number    // 震级
  latitude: number     // 震中纬度
  longitude: number    // 震中经度
  depth: number        // 深度 (公里)
  time: Date           // 发生时间
  location: string     // 位置描述
  tsunami: boolean     // 海啸预警
  url: string          // USGS 详情页
}
```

---

### 船舶查询

#### 获取全球船舶
```typescript
const ships = await wv.getShips()
```

#### 按港口查询
```typescript
const ships = await wv.getShipsByPort({
  port: 'shanghai',    // 港口名称
  radius: 50           // 半径 (公里)
})
```

#### 按类型筛选
```typescript
const tankers = await wv.getShips({ type: 'tanker' })     // 油轮
const cargo = await wv.getShips({ type: 'cargo' })        // 货轮
const passenger = await wv.getShips({ type: 'passenger' }) // 客轮
```

#### 船舶数据结构
```typescript
interface Ship {
  mmsi: string         // MMSI 编号
  imo: string          // IMO 编号
  name: string         // 船名
  callsign: string     // 呼号
  type: string         // 船舶类型
  latitude: number     // 纬度
  longitude: number    // 经度
  course: number       // 航向 (度)
  speed: number        // 速度 (节)
  destination: string  // 目的地
  eta?: Date           // 预计到达时间
  length: number       // 船长 (米)
  width: number        // 船宽 (米)
  draft: number        // 吃水 (米)
}
```

---

### CCTV 查询

#### 获取摄像头列表
```typescript
const cameras = await wv.getCameras()
```

#### 按城市筛选
```typescript
const london = await wv.getCameras({ city: 'london' })
const austin = await wv.getCameras({ city: 'austin' })
const sydney = await wv.getCameras({ city: 'sydney' })
```

#### 获取摄像头画面
```typescript
const image = await wv.getCameraImage({
  cameraId: 'abc123',
  format: 'jpeg'       // 'jpeg' | 'png'
})
```

#### CCTV 数据结构
```typescript
interface Camera {
  id: string           // 摄像头 ID
  name: string         // 名称
  city: string         // 城市
  country: string      // 国家
  latitude: number     // 纬度
  longitude: number    // 经度
  url: string          // 视频流 URL
  thumbnail: string    // 缩略图 URL
  status: 'online' | 'offline'
}
```

---

### 健康检查

```typescript
const status = await wv.healthCheck()
// 返回：{ status: 'ok', cache: {...}, uptime: number }
```

---

## 🔧 配置选项

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `WORLDVIEW_BASE_URL` | WorldView 后端 API 地址 | `http://localhost:3001` |
| `WORLDVIEW_TIMEOUT` | 请求超时 (毫秒) | `30000` |
| `AISSTREAM_API_KEY` | AIS 船舶追踪 API Key | (可选) |

### 运行时配置

```typescript
const wv = await createWorldView({
  baseUrl: 'http://localhost:3001',
  timeout: 30000,
  cache: {
    enabled: true,
    ttl: 60000  // 缓存 TTL (毫秒)
  }
})
```

---

## 📊 OSINT 应用场景

### 1. 地震速报
```typescript
// 监控中国境内 5.0+ 地震
const quakes = await wv.getEarthquakes({
  minMagnitude: 5.0,
  hours: 1
})

const chinaQuakes = quakes.filter(q => 
  q.latitude > 18 && q.latitude < 54 &&
  q.longitude > 73 && q.longitude < 135
)

if (chinaQuakes.length > 0) {
  await sendAlert(chinaQuakes)  // 发送警报
}
```

### 2. 特殊航班监控
```typescript
// 监控政府专机/军用飞机
const flights = await wv.getFlights()

const specialFlights = flights.filter(f => 
  f.callsign.startsWith('VIP') ||
  f.callsign.startsWith('ARMY') ||
  f.aircraftType === 'E4B' ||    // 空军一号备用机
  f.aircraftType === 'C32'       // 政府专机
)
```

### 3. 卫星过境预测
```typescript
// ISS 过境上海预测
const iss = await wv.trackSatellite('ISS')

if (iss.nextPass) {
  console.log(`ISS 下次过境：${iss.nextPass.riseTime}`)
  console.log(`最大仰角：${iss.nextPass.maxElevation}°`)
  console.log(`可见时长：${iss.nextPass.duration}秒`)
}
```

### 4. 船舶异常检测
```typescript
// 检测关闭 AIS 的船只 (数据缺失)
const ships = await wv.getShips()

const suspicious = ships.filter(s => 
  s.speed === 0 && s.destination === '' &&
  s.type === 'tanker'  // 油轮
)
```

---

## 🧪 测试

```bash
cd skills/worldview-mcp
npm test
```

### 测试用例
- ✅ 健康检查
- ✅ 航班查询
- ✅ 卫星追踪
- ✅ 地震查询
- ✅ 船舶查询 (需 API Key)

---

## 📝 使用示例

### 完整示例：OSINT 情报收集

```typescript
import { createWorldView } from 'skills/worldview-mcp/src/index.ts'

async function collectIntel() {
  const wv = await createWorldView()
  
  // 1. 收集地震数据
  const quakes = await wv.getEarthquakes({ minMagnitude: 5.0 })
  
  // 2. 收集特殊航班
  const flights = await wv.getFlights()
  const specialFlights = flights.filter(f => 
    f.airline === '' || f.originAirport === ''
  )
  
  // 3. 收集船舶数据
  const ships = await wv.getShips({ type: 'tanker' })
  
  // 4. 生成报告
  const report = {
    timestamp: new Date().toISOString(),
    earthquakes: quakes.length,
    specialFlights: specialFlights.length,
    tankers: ships.length,
    details: { quakes, specialFlights, ships }
  }
  
  return report
}

// 运行
const intel = await collectIntel()
console.log(JSON.stringify(intel, null, 2))
```

---

## ⚠️ 注意事项

1. **服务依赖** — 需要 WorldView 后端服务运行在 `localhost:3001`
2. **API Key** — 船舶追踪需要 AISStream.io API Key (可选)
3. **速率限制** — 建议缓存结果，避免频繁请求
4. **数据延迟** — 各数据源更新频率不同 (2 秒 -5 分钟)

---

## 🔗 相关资源

- **GitHub**: https://github.com/kevtoe/worldview
- **Live Demo**: https://worldview.kt-o.com
- **API 文档**: http://localhost:3001/api/health

---

**创建时间**: 2026-03-08  
**版本**: 1.0.0  
**状态**: ✅ 可用
