/**
 * symphony-core - OpenClaw Symphony 核心编排器
 * 
 * 基于 OpenAI Symphony SPEC v1 设计
 * 负责任务轮询、分发、重试、协调
 */

import { WorkflowLoader } from './workflow-loader.ts'
import { ConfigLayer } from './config.ts'
import { Orchestrator } from './orchestrator.ts'
import { createLogger, getTodayMemoryFile } from './logger.ts'
import { createHttpServer } from './http-server.ts'
import type { SymphonyConfig, RuntimeSnapshot } from './types.ts'

export interface CreateSymphonyOptions {
  workflowPath?: string
  // OpenClaw 函数注入（可选，默认使用 globalThis）
  sessions_spawn?: any
  sessions_send?: any
}

export interface Symphony {
  /** 启动轮询循环 */
  start(): Promise<void>
  
  /** 停止轮询 */
  stop(): Promise<void>
  
  /** 获取运行时快照 */
  getSnapshot(): Promise<RuntimeSnapshot>
  
  /** 手动触发轮询 */
  triggerPoll(): Promise<void>
  
  /** 检查是否运行中 */
  isRunning(): boolean
}

/**
 * 创建 Symphony 实例
 */
export async function createSymphony(
  options: CreateSymphonyOptions & {
    httpPort?: number  // HTTP 服务器端口（0 表示禁用）
  } = {}
): Promise<Symphony> {
  const workflowPath = options.workflowPath ?? './WORKFLOW.md'
  const httpPort = options.httpPort ?? 0
  
  // 创建日志记录器
  const logger = createLogger('Symphony', {
    memoryFile: getTodayMemoryFile(),
    console: true,
  })
  
  // 1. 加载 WORKFLOW.md
  logger.info('Loading WORKFLOW.md...')
  const loader = new WorkflowLoader(workflowPath)
  const workflow = await loader.load()
  logger.info('WORKFLOW.md loaded', { promptLength: workflow.prompt_template.length })
  
  // 2. 创建配置层
  const config = new ConfigLayer(workflow.config)
  
  // 3. 创建编排器
  const orchestrator = new Orchestrator(config, {
    sessions_spawn: options.sessions_spawn ?? globalThis.sessions_spawn,
    sessions_send: options.sessions_send ?? globalThis.sessions_send,
  })
  
  // 4. 创建 HTTP 服务器（可选）
  let httpServer = null
  if (httpPort > 0) {
    httpServer = createHttpServer({ port: httpPort }, logger)
  }
  
  let pollIntervalId: number | null = null
  let isRunning = false
  
  return {
    async start() {
      if (isRunning) {
        throw new Error('Symphony is already running')
      }
      
      logger.info('Starting Symphony...')
      
      // 初始化编排器（加载 GitHub adapter 和 workspace manager）
      await orchestrator.initialize()
      logger.info('Orchestrator initialized')
      
      // 验证配置
      const validation = await orchestrator.validate()
      if (!validation.ok) {
        logger.error('Configuration validation failed', new Error(validation.error))
        throw new Error(`Configuration validation failed: ${validation.error}`)
      }
      logger.info('Configuration validated')
      
      // 启动 HTTP 服务器
      if (httpServer) {
        await httpServer.start()
        logger.info(`HTTP dashboard started on http://localhost:${httpPort}`)
      }
      
      isRunning = true
      
      // 启动轮询循环
      const pollInterval = config.getPollInterval()
      pollIntervalId = setInterval(async () => {
        try {
          await orchestrator.tick()
          
          // 更新 HTTP 服务器的快照
          if (httpServer) {
            const snapshot = orchestrator.getSnapshot()
            httpServer.updateSnapshot(snapshot)
          }
        } catch (err) {
          logger.error('Tick failed', err as Error)
        }
      }, pollInterval)
      
      // 立即执行一次
      await orchestrator.tick()
      
      logger.info('Symphony started', { pollInterval })
    },
    
    async stop() {
      if (!isRunning) return
      
      logger.info('Stopping Symphony...')
      
      if (pollIntervalId) {
        window.clearInterval(pollIntervalId)
        pollIntervalId = null
      }
      
      // 停止 HTTP 服务器
      if (httpServer) {
        await httpServer.stop()
      }
      
      // 等待运行中任务完成
      await orchestrator.waitForRunningTasks()
      
      isRunning = false
      logger.info('Symphony stopped')
    },
    
    async getSnapshot(): Promise<RuntimeSnapshot> {
      return orchestrator.getSnapshot()
    },
    
    async triggerPoll() {
      logger.info('Manual poll triggered')
      await orchestrator.tick()
      
      // 更新 HTTP 服务器的快照
      if (httpServer) {
        const snapshot = orchestrator.getSnapshot()
        httpServer.updateSnapshot(snapshot)
      }
    },
    
    isRunning() {
      return isRunning
    },
  }
}

// 重新导出类型
export type { 
  SymphonyConfig, 
  RuntimeSnapshot, 
  Issue,
  WorkflowDefinition,
  RunningEntry,
  RetryEntry,
} from './types.ts'

// 重新导出工具类
export { WorkflowLoader } from './workflow-loader.ts'
export { ConfigLayer } from './config.ts'
export { Orchestrator } from './orchestrator.ts'
