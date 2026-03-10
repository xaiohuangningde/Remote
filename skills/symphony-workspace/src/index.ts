/**
 * symphony-workspace - 工作空间管理器
 */

import { exec } from 'child_process'
import { mkdir, access, rm } from 'fs/promises'
import { join } from 'path'

export interface WorkspaceManagerConfig {
  root: string
  hooks?: {
    after_create?: string
    before_run?: string
    after_run?: string
    before_remove?: string
    timeout_ms?: number
  }
}

export interface Workspace {
  path: string
  workspace_key: string
  created_now: boolean
}

export interface IssueRef {
  identifier: string
}

/**
 * 创建工作空间管理器
 */
export async function createWorkspaceManager(
  config: WorkspaceManagerConfig
): Promise<WorkspaceManager> {
  const root = expandPath(config.root)
  
  // 确保 root 目录存在
  await ensureDirectory(root)
  
  return {
    async ensureWorkspace(issue: IssueRef): Promise<Workspace> {
      const workspaceKey = sanitizeWorkspaceKey(issue.identifier)
      const workspacePath = join(root, workspaceKey)
      
      let createdNow = false
      
      try {
        await access(workspacePath)
        // 目录已存在
        createdNow = false
      } catch {
        // 目录不存在，创建
        await ensureDirectory(workspacePath)
        createdNow = true
        
        // 执行 after_create 钩子
        if (config.hooks?.after_create) {
          await executeHook(
            'after_create',
            config.hooks.after_create,
            workspacePath,
            config.hooks.timeout_ms ?? 60000
          )
        }
      }
      
      return {
        path: workspacePath,
        workspace_key: workspaceKey,
        created_now: createdNow,
      }
    },
    
    async executeHook(hookName: string, workspacePath: string): Promise<void> {
      const hook = config.hooks?.[hookName as keyof typeof config.hooks] as string | undefined
      
      if (!hook) {
        return  // 钩子未配置，跳过
      }
      
      const timeout = config.hooks?.timeout_ms ?? 60000
      await executeHook(hookName, hook, workspacePath, timeout)
    },
    
    async cleanupWorkspace(issueIdentifier: string): Promise<void> {
      const workspaceKey = sanitizeWorkspaceKey(issueIdentifier)
      const workspacePath = join(root, workspaceKey)
      
      try {
        // 执行 before_remove 钩子
        if (config.hooks?.before_remove) {
          await executeHook(
            'before_remove',
            config.hooks.before_remove,
            workspacePath,
            config.hooks.timeout_ms ?? 60000
          ).catch(err => {
            console.warn(`[Workspace] before_remove hook failed: ${err}`)
          })
        }
        
        await rm(workspacePath, { recursive: true, force: true })
        console.log(`[Workspace] Cleaned up: ${workspacePath}`)
      } catch (err) {
        console.error(`[Workspace] Cleanup failed for ${workspacePath}:`, err)
      }
    },
    
    sanitizeWorkspaceKey(identifier: string): string {
      return sanitizeWorkspaceKey(identifier)
    },
  }
}

/**
 * Sanitize workspace key
 * 只允许 [A-Za-z0-9._-]，其他字符替换为 _
 */
function sanitizeWorkspaceKey(identifier: string): string {
  return identifier.replace(/[^A-Za-z0-9._-]/g, '_')
}

/**
 * 确保目录存在
 */
async function ensureDirectory(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true })
}

/**
 * 执行钩子脚本
 */
async function executeHook(
  hookName: string,
  script: string,
  cwd: string,
  timeoutMs: number
): Promise<void> {
  console.log(`[Workspace] Executing hook: ${hookName}`)
  
  return new Promise((resolve, reject) => {
    const child = exec(script, {
      cwd,
      shell: true,
      timeout: timeoutMs,
    })
    
    child.stdout?.on('data', (data) => {
      console.log(`[Hook:${hookName}] ${data.toString().trim()}`)
    })
    
    child.stderr?.on('data', (data) => {
      console.warn(`[Hook:${hookName}] ${data.toString().trim()}`)
    })
    
    child.on('error', (err) => {
      reject(new Error(`${hookName} hook failed: ${err.message}`))
    })
    
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${hookName} hook exited with code ${code}`))
      }
    })
    
    child.on('timeout', () => {
      child.kill('SIGKILL')
      reject(new Error(`${hookName} hook timed out after ${timeoutMs}ms`))
    })
  })
}

/**
 * 展开路径（~ → home directory）
 */
function expandPath(path: string): string {
  if (path.startsWith('~')) {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? ''
    return home + path.slice(1)
  }
  return path
}

// 导出类型
export type { WorkspaceManagerConfig, Workspace, IssueRef }

// WorkspaceManager 接口
export interface WorkspaceManager {
  ensureWorkspace(issue: IssueRef): Promise<Workspace>
  executeHook(hookName: string, workspacePath: string): Promise<void>
  cleanupWorkspace(issueIdentifier: string): Promise<void>
  sanitizeWorkspaceKey(identifier: string): string
}
