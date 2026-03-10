/**
 * OSINT Toolkit - 开源情报收集工具统一封装
 * 
 * @module osint-toolkit
 * @author xiaoxiaohuang
 * @created 2026-03-08
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { writeFile, readFile, mkdir } from 'fs/promises'
import { tmpdir } from 'os'

const execAsync = promisify(exec)

// ============ 类型定义 ============

export interface OSINTConfig {
  abuseipdbKey?: string
  shodanKey?: string
  censysId?: string
  censysSecret?: string
  timeout?: number
  maxConcurrency?: number
  userAgent?: string
}

export interface SherlockResult {
  username: string
  found: number
  platforms: Array<{
    name: string
    url: string
    status: 'found' | 'not_found' | 'error'
    httpStatus?: number
  }>
  timestamp: string
  rawOutput?: string
}

export interface AbuseIPDBReport {
  ipAddress: string
  abuseConfidenceScore: number
  totalReports: number
  lastReportedAt: string
  usageType?: string
  reports: Array<{
    reportedAt: string
    comment: string
    categories: number[]
    reporterId: number
  }>
}

export interface ShodanSearchResult {
  total: number
  matches: Array<{
    ip: string
    port: number
    org: string
    product: string
    version: string
    os?: string
    timestamp: string
  }>
}

export interface ShodanHostInfo {
  ip: string
  ports: number[]
  org: string
  isp: string
  os?: string
  hostnames: string[]
  country: string
  city: string
  lastUpdate: string
}

export interface CensysSearchResult {
  total: number
  results: Array<{
    ip: string
    services: Array<{
      port: number
      service: string
      transportProtocol: string
    }>
    operatingSystem?: string
  }>
}

export class OSINTError extends Error {
  type: 'rate_limit' | 'auth' | 'network' | 'not_found' | 'unknown'
  statusCode?: number

  constructor(message: string, type: OSINTError['type'] = 'unknown', statusCode?: number) {
    super(message)
    this.name = 'OSINTError'
    this.type = type
    this.statusCode = statusCode
  }
}

// ============ Sherlock 封装 ============

export class SherlockClient {
  private timeout: number
  private maxConcurrency: number

  constructor(timeout = 10000, maxConcurrency = 50) {
    this.timeout = timeout
    this.maxConcurrency = maxConcurrency
  }

  /**
   * 搜索用户名
   */
  async search(username: string): Promise<SherlockResult> {
    try {
      // 检查 sherlock 是否已安装
      await this.checkInstallation()

      // 创建临时文件存储结果
      const tempFile = join(tmpdir(), `sherlock_${Date.now()}.json`)

      // 执行 sherlock 命令
      const { stdout, stderr } = await execAsync(
        `sherlock "${username}" --json "${tempFile}" --timeout ${this.timeout / 1000}`,
        { timeout: this.timeout * 2 }
      )

      // 读取 JSON 结果
      const rawData = await readFile(tempFile, 'utf-8')
      const data = JSON.parse(rawData)

      // 解析结果
      const platforms = Object.entries(data).map(([name, info]: [string, any]) => ({
        name,
        url: info.url || `https://${name}.com/${username}`,
        status: info.status as 'found' | 'not_found' | 'error',
        httpStatus: info.http_status,
      }))

      const found = platforms.filter(p => p.status === 'found').length

      // 清理临时文件
      try {
        await execAsync(`rm "${tempFile}"`)
      } catch {
        // Windows 可能没有 rm 命令，忽略错误
      }

      return {
        username,
        found,
        platforms,
        timestamp: new Date().toISOString(),
        rawOutput: stdout,
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new OSINTError(
          'Sherlock 未安装。请运行：pip install sherlock-project',
          'not_found'
        )
      }
      if (error.killed || error.signal === 'SIGTERM') {
        throw new OSINTError('搜索超时', 'network')
      }
      throw new OSINTError(`Sherlock 搜索失败：${error.message}`, 'unknown')
    }
  }

  /**
   * 检查 Sherlock 是否已安装
   */
  private async checkInstallation(): Promise<void> {
    try {
      await execAsync('sherlock --version')
    } catch {
      throw new OSINTError(
        'Sherlock 未安装。请运行：pip install sherlock-project',
        'not_found'
      )
    }
  }
}

// ============ AbuseIPDB 封装 ============

export class AbuseIPDBClient {
  private apiKey: string
  private baseUrl = 'https://api.abuseipdb.com/api/v2'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * 查询 IP 信誉
   */
  async check(ip: string, options?: { maxAgeInDays?: number }): Promise<AbuseIPDBReport> {
    const url = new URL(`${this.baseUrl}/check`)
    url.searchParams.set('ipAddress', ip)
    if (options?.maxAgeInDays) {
      url.searchParams.set('maxAgeInDays', String(options.maxAgeInDays))
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Key': this.apiKey,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 429) {
        throw new OSINTError('AbuseIPDB 速率限制', 'rate_limit', 429)
      }
      if (response.status === 401 || response.status === 403) {
        throw new OSINTError('AbuseIPDB API Key 无效', 'auth', response.status)
      }
      throw new OSINTError(`AbuseIPDB 请求失败：${response.statusText}`, 'network', response.status)
    }

    const data = await response.json()
    return data.data
  }

  /**
   * 批量查询 IP
   */
  async batchCheck(ips: string[]): Promise<AbuseIPDBReport[]> {
    const url = `${this.baseUrl}/check-bulk`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Key': this.apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ IPs: ips }),
    })

    if (!response.ok) {
      if (response.status === 429) {
        throw new OSINTError('AbuseIPDB 速率限制', 'rate_limit', 429)
      }
      throw new OSINTError(`AbuseIPDB 批量查询失败：${response.statusText}`, 'network', response.status)
    }

    const data = await response.json()
    return data.data
  }

  /**
   * 举报 IP
   */
  async report(ip: string, categories: number[], comment?: string): Promise<void> {
    const url = `${this.baseUrl}/report`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Key': this.apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ip,
        categories,
        comment,
      }),
    })

    if (!response.ok) {
      throw new OSINTError(`AbuseIPDB 举报失败：${response.statusText}`, 'network', response.status)
    }
  }
}

// ============ Shodan 封装 ============

export class ShodanClient {
  private apiKey: string
  private baseUrl = 'https://api.shodan.io'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * 搜索设备
   */
  async search(query: string): Promise<ShodanSearchResult> {
    const url = `${this.baseUrl}/shodan/host/search?key=${this.apiKey}&query=${encodeURIComponent(query)}`

    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 429) {
        throw new OSINTError('Shodan 速率限制', 'rate_limit', 429)
      }
      if (response.status === 401) {
        throw new OSINTError('Shodan API Key 无效', 'auth', 401)
      }
      throw new OSINTError(`Shodan 搜索失败：${response.statusText}`, 'network', response.status)
    }

    const data = await response.json()
    return {
      total: data.total,
      matches: data.matches.map((m: any) => ({
        ip: m.ip_str,
        port: m.port,
        org: m.org || m.isp,
        product: m.product,
        version: m.version,
        os: m.os,
        timestamp: m.timestamp,
      })),
    }
  }

  /**
   * 查询主机信息
   */
  async host(ip: string): Promise<ShodanHostInfo> {
    const url = `${this.baseUrl}/shodan/host/${ip}?key=${this.apiKey}`

    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 404) {
        throw new OSINTError(`Shodan 未找到主机：${ip}`, 'not_found', 404)
      }
      if (response.status === 401) {
        throw new OSINTError('Shodan API Key 无效', 'auth', 401)
      }
      throw new OSINTError(`Shodan 主机查询失败：${response.statusText}`, 'network', response.status)
    }

    const data = await response.json()
    return {
      ip: data.ip_str,
      ports: data.ports,
      org: data.org,
      isp: data.isp,
      os: data.os,
      hostnames: data.hostnames || [],
      country: data.country_name,
      city: data.city,
      lastUpdate: data.last_update,
    }
  }
}

// ============ Censys 封装 ============

export class CensysClient {
  private apiId: string
  private apiSecret: string
  private baseUrl = 'https://search.censys.io/api/v2'

  constructor(apiId: string, apiSecret: string) {
    this.apiId = apiId
    this.apiSecret = apiSecret
  }

  /**
   * 搜索主机
   */
  async searchHost(query: string): Promise<CensysSearchResult> {
    const url = `${this.baseUrl}/hosts/search?q=${encodeURIComponent(query)}&per_page=100`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.apiId}:${this.apiSecret}`).toString('base64')}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 429) {
        throw new OSINTError('Censys 速率限制', 'rate_limit', 429)
      }
      if (response.status === 401) {
        throw new OSINTError('Censys API 凭证无效', 'auth', 401)
      }
      throw new OSINTError(`Censys 搜索失败：${response.statusText}`, 'network', response.status)
    }

    const data = await response.json()
    return {
      total: data.result?.total || 0,
      results: (data.result?.hits || []).map((h: any) => ({
        ip: h.ip,
        services: h.services?.map((s: any) => ({
          port: s.port,
          service: s.service_name,
          transportProtocol: s.transport_protocol,
        })) || [],
        operatingSystem: h.operating_system?.name,
      })),
    }
  }

  /**
   * 搜索证书
   */
  async searchCertificates(query: string): Promise<any[]> {
    const url = `${this.baseUrl}/certificates/search?q=${encodeURIComponent(query)}&per_page=100`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.apiId}:${this.apiSecret}`).toString('base64')}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new OSINTError(`Censys 证书搜索失败：${response.statusText}`, 'network', response.status)
    }

    const data = await response.json()
    return data.result?.hits || []
  }
}

// ============ 统一入口 ============

export interface OSINTClient {
  sherlock: SherlockClient
  abuseipdb?: AbuseIPDBClient
  shodan?: ShodanClient
  censys?: CensysClient
}

export async function createOSINT(config?: OSINTConfig): Promise<OSINTClient> {
  const client: OSINTClient = {
    sherlock: new SherlockClient(config?.timeout, config?.maxConcurrency),
  }

  if (config?.abuseipdbKey) {
    client.abuseipdb = new AbuseIPDBClient(config.abuseipdbKey)
  }

  if (config?.shodanKey) {
    client.shodan = new ShodanClient(config.shodanKey)
  }

  if (config?.censysId && config?.censysSecret) {
    client.censys = new CensysClient(config.censysId, config.censysSecret)
  }

  return client
}

export { OSINTError }
