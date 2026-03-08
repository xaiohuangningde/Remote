/**
 * WorldView MCP Skill - 全球实时监控情报系统
 * 
 * 封装 WorldView 平台的 API，提供航班/卫星/地震/船舶/CCTV 数据查询
 * 
 * @package worldview-mcp
 * @version 1.0.0
 */

// ==================== 类型定义 ====================

export interface Flight {
  icao24: string
  callsign: string
  registration: string
  aircraftType: string
  latitude: number
  longitude: number
  altitude: number
  velocity: number
  heading: number
  verticalRate: number
  originAirport: string
  destAirport: string
  airline: string
}

export interface Satellite {
  name: string
  noradId: number
  latitude: number
  longitude: number
  altitude: number
  velocity: number
  period: number
  inclination: number
  nextPass?: {
    riseTime: Date
    setTime: Date
    duration: number
    maxElevation: number
  }
}

export interface Earthquake {
  id: string
  magnitude: number
  latitude: number
  longitude: number
  depth: number
  time: Date
  location: string
  tsunami: boolean
  url: string
}

export interface Ship {
  mmsi: string
  imo: string
  name: string
  callsign: string
  type: string
  latitude: number
  longitude: number
  course: number
  speed: number
  destination: string
  eta?: Date
  length: number
  width: number
  draft: number
}

export interface Camera {
  id: string
  name: string
  city: string
  country: string
  latitude: number
  longitude: number
  url: string
  thumbnail: string
  status: 'online' | 'offline'
}

export interface WorldViewConfig {
  baseUrl?: string
  timeout?: number
  cache?: {
    enabled?: boolean
    ttl?: number
  }
}

export interface HealthStatus {
  status: 'ok' | 'error'
  cache?: {
    hits: number
    misses: number
    size: number
  }
  uptime?: number
}

// ==================== 缓存管理 ====================

class Cache {
  private store: Map<string, { data: any; expiry: number }> = new Map()
  private enabled: boolean
  private ttl: number

  constructor(enabled: boolean = true, ttl: number = 60000) {
    this.enabled = enabled
    this.ttl = ttl
  }

  get(key: string): any | null {
    if (!this.enabled) return null
    
    const item = this.store.get(key)
    if (!item) return null
    
    if (Date.now() > item.expiry) {
      this.store.delete(key)
      return null
    }
    
    return item.data
  }

  set(key: string, data: any): void {
    if (!this.enabled) return
    
    this.store.set(key, {
      data,
      expiry: Date.now() + this.ttl
    })
  }

  clear(): void {
    this.store.clear()
  }

  stats(): { hits: number; misses: number; size: number } {
    return {
      hits: 0,
      misses: 0,
      size: this.store.size
    }
  }
}

// ==================== WorldView 客户端 ====================

export class WorldViewClient {
  private baseUrl: string
  private timeout: number
  private cache: Cache

  constructor(config: WorldViewConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:3001'
    this.timeout = config.timeout || 30000
    this.cache = new Cache(
      config.cache?.enabled ?? true,
      config.cache?.ttl ?? 60000
    )
  }

  private async request<T>(endpoint: string, cacheKey?: string): Promise<T> {
    // 检查缓存
    if (cacheKey) {
      const cached = this.cache.get(cacheKey)
      if (cached) return cached as T
    }

    const url = `${this.baseUrl}${endpoint}`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      // 缓存结果
      if (cacheKey) {
        this.cache.set(cacheKey, data)
      }

      return data as T
    } finally {
      clearTimeout(timeoutId)
    }
  }

  // ==================== 航班查询 ====================

  async getFlights(): Promise<Flight[]> {
    return this.request<Flight[]>('/api/flights', 'flights:all')
  }

  async getFlightsByRegion(params: {
    lat: number
    lon: number
    radius: number
  }): Promise<Flight[]> {
    const cacheKey = `flights:region:${params.lat},${params.lon},${params.radius}`
    const flights = await this.request<Flight[]>('/api/flights', cacheKey)
    
    // 按距离过滤
    return flights.filter(flight => {
      const distance = this.calculateDistance(
        params.lat, params.lon,
        flight.latitude, flight.longitude
      )
      return distance <= params.radius
    })
  }

  async findFlight(params: { callsign: string }): Promise<Flight | null> {
    const flights = await this.getFlights()
    return flights.find(f => 
      f.callsign.toUpperCase() === params.callsign.toUpperCase()
    ) || null
  }

  // ==================== 卫星查询 ====================

  async getSatellites(params?: { group?: string }): Promise<Satellite[]> {
    const group = params?.group || 'all'
    const cacheKey = `satellites:${group}`
    
    const url = params?.group 
      ? `/api/satellites?group=${params.group}`
      : '/api/satellites'
    
    return this.request<Satellite[]>(url, cacheKey)
  }

  async trackSatellite(name: string): Promise<Satellite | null> {
    const satellites = await this.getSatellites()
    return satellites.find(s => 
      s.name.toUpperCase() === name.toUpperCase()
    ) || null
  }

  // ==================== 地震查询 ====================

  async getEarthquakes(params?: {
    minMagnitude?: number
    hours?: number
  }): Promise<Earthquake[]> {
    const cacheKey = `earthquakes:${params?.minMagnitude || 0}:${params?.hours || 24}`
    const earthquakes = await this.request<Earthquake[]>('/api/earthquakes', cacheKey)
    
    // 过滤
    return earthquakes.filter(q => {
      if (params?.minMagnitude && q.magnitude < params.minMagnitude) return false
      if (params?.hours) {
        const hoursAgo = new Date(Date.now() - params.hours * 60 * 60 * 1000)
        if (new Date(q.time) < hoursAgo) return false
      }
      return true
    })
  }

  async getEarthquakesByRegion(params: {
    lat: number
    lon: number
    radius: number
    minMagnitude?: number
  }): Promise<Earthquake[]> {
    const earthquakes = await this.getEarthquakes({
      minMagnitude: params.minMagnitude
    })
    
    return earthquakes.filter(q => {
      const distance = this.calculateDistance(
        params.lat, params.lon,
        q.latitude, q.longitude
      )
      return distance <= params.radius
    })
  }

  // ==================== 船舶查询 ====================

  async getShips(params?: { type?: string }): Promise<Ship[]> {
    const cacheKey = `ships:${params?.type || 'all'}`
    const url = params?.type
      ? `/api/ships?type=${params.type}`
      : '/api/ships'
    
    return this.request<Ship[]>(url, cacheKey)
  }

  async getShipsByPort(params: {
    port: string
    radius?: number
  }): Promise<Ship[]> {
    // TODO: 根据港口名称查询坐标
    const ships = await this.getShips()
    return ships // 简化实现
  }

  // ==================== CCTV 查询 ====================

  async getCameras(params?: { city?: string }): Promise<Camera[]> {
    const cacheKey = `cameras:${params?.city || 'all'}`
    const url = params?.city
      ? `/api/cctv?city=${params.city}`
      : '/api/cctv'
    
    return this.request<Camera[]>(url, cacheKey)
  }

  async getCameraImage(params: {
    cameraId: string
    format?: 'jpeg' | 'png'
  }): Promise<Blob> {
    const url = `${this.baseUrl}/api/cctv/image/${params.cameraId}`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.blob()
    } finally {
      clearTimeout(timeoutId)
    }
  }

  // ==================== 健康检查 ====================

  async healthCheck(): Promise<HealthStatus> {
    return this.request<HealthStatus>('/api/health')
  }

  // ==================== 工具方法 ====================

  private calculateDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number {
    const R = 6371 // 地球半径 (公里)
    const dLat = this.toRad(lat2 - lat1)
    const dLon = this.toRad(lon2 - lon1)
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRad(degrees: number): number {
    return degrees * Math.PI / 180
  }

  // ==================== 缓存管理 ====================

  clearCache(): void {
    this.cache.clear()
  }

  getCacheStats(): { size: number } {
    return this.cache.stats()
  }
}

// ==================== 工厂函数 ====================

export async function createWorldView(
  config: WorldViewConfig = {}
): Promise<WorldViewClient> {
  const client = new WorldViewClient(config)
  
  // 验证连接
  try {
    await client.healthCheck()
  } catch (error) {
    console.warn('WorldView 服务可能未运行:', error)
  }
  
  return client
}

export default createWorldView
