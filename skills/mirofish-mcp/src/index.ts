/**
 * MiroFish MCP - 群体智能预测引擎封装
 * 
 * @see https://github.com/mirofish-ai/mirofish
 * @see D:\projects\MiroFish
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const execAsync = promisify(exec)

// ============================================================================
// 配置
// ============================================================================

const DEFAULT_CONFIG = {
  baseUrl: 'http://localhost:5001',
  frontendUrl: 'http://localhost:3000',
  projectDir: 'D:\\projects\\MiroFish',
  timeout: 300000, // 5 分钟超时（prepare 可能很慢）
  pollInterval: 5000, // 轮询间隔 5 秒
}

export interface MiroFishConfig {
  baseUrl?: string
  frontendUrl?: string
  projectDir?: string
  timeout?: number
  pollInterval?: number
}

// ============================================================================
// 类型定义
// ============================================================================

export interface Project {
  projectId: string
  name: string
  description?: string
  status: 'created' | 'building' | 'ready'
  graphId?: string
}

export interface Graph {
  graphId: string
  projectId: string
  nodes: number
  edges: number
  status: 'building' | 'ready' | 'failed'
}

export interface Simulation {
  simulationId: string
  projectId: string
  graphId: string
  name: string
  status: 'created' | 'preparing' | 'ready' | 'running' | 'completed' | 'failed'
  maxRounds: number
  currentRound?: number
}

export interface SimulationStatus {
  simulationId: string
  status: string
  currentRound: number
  totalRounds: number
  progress: number
  events?: SimulationEvent[]
}

export interface SimulationEvent {
  round: number
  entityId: string
  entityName: string
  action: string
  description: string
  timestamp: string
}

export interface QuickSimulateOptions {
  name: string
  seedFile: string
  maxRounds?: number
  description?: string
  onProgress?: (status: SimulationStatus) => void
}

export interface MiroFishError extends Error {
  code: string
  details?: any
}

// ============================================================================
// 工具函数
// ============================================================================

function createError(code: string, message: string, details?: any): MiroFishError {
  const error = new Error(message) as MiroFishError
  error.code = code
  error.details = details
  return error
}

async function httpPost<T>(url: string, data: any): Promise<T> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      throw createError(
        `HTTP_${response.status}`,
        `HTTP error: ${response.status}`,
        { url, status: response.status }
      )
    }
    
    return await response.json()
  } catch (error) {
    if ((error as any).code) throw error
    throw createError('NETWORK_ERROR', `Network error: ${(error as Error).message}`, error)
  }
}

async function httpGet<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw createError(
        `HTTP_${response.status}`,
        `HTTP error: ${response.status}`,
        { url, status: response.status }
      )
    }
    
    return await response.json()
  } catch (error) {
    if ((error as any).code) throw error
    throw createError('NETWORK_ERROR', `Network error: ${(error as Error).message}`, error)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================================
// MiroFish 主类
// ============================================================================

export class MiroFish {
  private config: typeof DEFAULT_CONFIG

  constructor(config: MiroFishConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // --------------------------------------------------------------------------
  // 项目管理
  // --------------------------------------------------------------------------

  async createProject(options: { name: string; description?: string }): Promise<Project> {
    const response = await httpPost<{ project: Project }>(
      `${this.config.baseUrl}/api/project/create`,
      options
    )
    return response.project
  }

  async uploadSeedFile(options: { projectId: string; filePath?: string; fileContent?: string }): Promise<void> {
    const { projectId, filePath, fileContent } = options
    
    if (filePath && !fileContent) {
      // 读取本地文件
      const fullPath = join(this.config.projectDir, filePath)
      if (!existsSync(fullPath)) {
        throw createError('FILE_NOT_FOUND', `File not found: ${fullPath}`)
      }
      throw createError('NOT_IMPLEMENTED', 'File upload not implemented yet - use fileContent instead')
    }
    
    if (!fileContent) {
      throw createError('MISSING_CONTENT', 'Either filePath or fileContent is required')
    }
    
    // TODO: 实现文件上传 API
    throw createError('NOT_IMPLEMENTED', 'File upload not implemented yet')
  }

  async buildGraph(options: { projectId: string; llmModel?: string }): Promise<Graph> {
    const response = await httpPost<{ graph: Graph }>(
      `${this.config.baseUrl}/api/graph/build`,
      {
        projectId: options.projectId,
        llmModel: options.llmModel || 'minimax',
      }
    )
    return response.graph
  }

  // --------------------------------------------------------------------------
  // 仿真管理
  // --------------------------------------------------------------------------

  async createSimulation(options: {
    projectId: string
    graphId: string
    name: string
    maxRounds?: number
  }): Promise<Simulation> {
    const response = await httpPost<{ simulation: Simulation }>(
      `${this.config.baseUrl}/api/simulation/create`,
      {
        projectId: options.projectId,
        graphId: options.graphId,
        name: options.name,
        maxRounds: options.maxRounds || 20,
      }
    )
    return response.simulation
  }

  async prepareSimulation(options: { simulationId: string }): Promise<{ taskId: string }> {
    const response = await httpPost<{ taskId: string; status: string }>(
      `${this.config.baseUrl}/api/simulation/prepare`,
      { simulationId: options.simulationId }
    )
    return { taskId: response.taskId }
  }

  async getPrepareStatus(options: { simulationId: string }): Promise<{
    status: 'pending' | 'processing' | 'ready' | 'failed'
    progress?: number
    error?: string
  }> {
    const response = await httpPost<{
      status: string
      progress?: number
      error?: string
    }>(
      `${this.config.baseUrl}/api/simulation/prepare/status`,
      { simulationId: options.simulationId }
    )
    return response
  }

  async waitForReady(options: { simulationId: string; timeout?: number }): Promise<void> {
    const timeout = options.timeout || this.config.timeout
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      const status = await this.getPrepareStatus({ simulationId: options.simulationId })
      
      if (status.status === 'ready') {
        return
      }
      
      if (status.status === 'failed') {
        throw createError('PREPARE_FAILED', `Preparation failed: ${status.error}`, status)
      }
      
      await sleep(this.config.pollInterval)
    }
    
    throw createError('TIMEOUT', `Timeout waiting for simulation to be ready`, {
      simulationId: options.simulationId,
      timeout,
    })
  }

  async startSimulation(options: { simulationId: string }): Promise<void> {
    await httpPost(
      `${this.config.baseUrl}/api/simulation/start`,
      { simulationId: options.simulationId }
    )
  }

  async runSimulation(options: { simulationId: string }): Promise<void> {
    // 一键启动：自动处理 prepare → wait → start
    await this.prepareSimulation({ simulationId: options.simulationId })
    await this.waitForReady({ simulationId: options.simulationId })
    await this.startSimulation({ simulationId: options.simulationId })
  }

  async getRunStatus(options: { simulationId: string }): Promise<SimulationStatus> {
    const response = await httpGet<{
      status: string
      currentRound: number
      totalRounds: number
      events?: SimulationEvent[]
    }>(
      `${this.config.baseUrl}/api/simulation/${options.simulationId}/run-status`
    )
    
    return {
      simulationId: options.simulationId,
      status: response.status,
      currentRound: response.currentRound,
      totalRounds: response.totalRounds,
      progress: Math.round((response.currentRound / response.totalRounds) * 100),
      events: response.events,
    }
  }

  async getStatus(options: { simulationId: string }): Promise<SimulationStatus> {
    return this.getRunStatus(options)
  }

  // --------------------------------------------------------------------------
  // 结果查询
  // --------------------------------------------------------------------------

  async queryResults(options: { simulationId: string; round?: number }): Promise<{
    rounds: any[]
    events: SimulationEvent[]
    entities: any[]
  }> {
    const url = new URL(`${this.config.baseUrl}/api/simulation/${options.simulationId}/results`)
    if (options.round) {
      url.searchParams.set('round', options.round.toString())
    }
    
    return await httpGet(url.toString())
  }

  // --------------------------------------------------------------------------
  // 高级封装：一键推演
  // --------------------------------------------------------------------------

  async quickSimulate(options: QuickSimulateOptions): Promise<{
    simulationId: string
    status: SimulationStatus
    results: any
  }> {
    const { name, seedFile, maxRounds = 20, description, onProgress } = options
    
    // 1. 创建项目
    console.log(`[MiroFish] 创建项目：${name}`)
    const project = await this.createProject({ name, description })
    console.log(`[MiroFish] 项目创建成功：${project.projectId}`)
    
    // 2. 读取种子文件
    const fullPath = join(this.config.projectDir, seedFile)
    if (!existsSync(fullPath)) {
      throw createError('FILE_NOT_FOUND', `Seed file not found: ${fullPath}`)
    }
    const seedContent = readFileSync(fullPath, 'utf-8')
    
    // TODO: 上传种子文件（需要实现文件上传 API）
    console.log(`[MiroFish] 种子文件已读取：${seedFile} (${seedContent.length} 字符)`)
    
    // 3. 构建图谱
    console.log(`[MiroFish] 构建知识图谱...`)
    const graph = await this.buildGraph({ projectId: project.projectId })
    console.log(`[MiroFish] 图谱构建完成：${graph.nodes} 节点，${graph.edges} 边`)
    
    // 4. 创建仿真
    console.log(`[MiroFish] 创建仿真...`)
    const simulation = await this.createSimulation({
      projectId: project.projectId,
      graphId: graph.graphId,
      name: `${name} - 仿真`,
      maxRounds,
    })
    console.log(`[MiroFish] 仿真创建成功：${simulation.simulationId}`)
    
    // 5. 准备仿真（最耗时）
    console.log(`[MiroFish] 准备仿真（生成 Agent 人设）...`)
    await this.prepareSimulation({ simulationId: simulation.simulationId })
    
    // 6. 等待准备完成
    console.log(`[MiroFish] 等待准备完成...`)
    await this.waitForReady({ simulationId: simulation.simulationId })
    
    // 7. 启动推演
    console.log(`[MiroFish] 启动推演...`)
    await this.startSimulation({ simulationId: simulation.simulationId })
    
    // 8. 轮询进度
    console.log(`[MiroFish] 推演进行中...`)
    let lastStatus: SimulationStatus | null = null
    
    while (true) {
      const status = await this.getRunStatus({ simulationId: simulation.simulationId })
      
      if (onProgress && status.currentRound !== lastStatus?.currentRound) {
        onProgress(status)
      }
      
      if (status.status === 'completed' || status.status === 'failed') {
        lastStatus = status
        break
      }
      
      lastStatus = status
      await sleep(this.config.pollInterval)
    }
    
    // 9. 获取结果
    console.log(`[MiroFish] 推演完成，获取结果...`)
    const results = await this.queryResults({ simulationId: simulation.simulationId })
    
    return {
      simulationId: simulation.simulationId,
      status: lastStatus!,
      results,
    }
  }

  // --------------------------------------------------------------------------
  // 工具方法
  // --------------------------------------------------------------------------

  getFrontendUrl(): string {
    return this.config.frontendUrl
  }

  getBackendUrl(): string {
    return this.config.baseUrl
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      await httpGet(`${this.config.baseUrl}/api/health`)
      return { ok: true, message: 'MiroFish backend is running' }
    } catch (error) {
      return {
        ok: false,
        message: `MiroFish backend is not accessible: ${(error as Error).message}`,
      }
    }
  }
}

// ============================================================================
// 快捷导出
// ============================================================================

export async function createMiroFish(config?: MiroFishConfig): Promise<MiroFish> {
  const mf = new MiroFish(config)
  
  // 启动时检查服务是否可用
  const health = await mf.healthCheck()
  if (!health.ok) {
    console.warn(`[MiroFish] ⚠️  ${health.message}`)
    console.warn(`[MiroFish] 请确保 MiroFish 服务已启动：`)
    console.warn(`[MiroFish]   cd D:\\projects\\MiroFish`)
    console.warn(`[MiroFish]   npm run dev`)
  }
  
  return mf
}

export default MiroFish
