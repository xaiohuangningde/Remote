/**
 * WORKFLOW.md 加载器
 * 
 * 解析 YAML front matter + Markdown prompt template
 */

import { readFile, stat, watch } from 'fs/promises'
import yaml from 'js-yaml'
import type { WorkflowDefinition } from './types.ts'

export class WorkflowLoader {
  private workflowPath: string
  private cache: WorkflowDefinition | null = null
  private lastModified: number | null = null

  constructor(workflowPath: string) {
    this.workflowPath = workflowPath
  }

  /**
   * 加载 WORKFLOW.md
   */
  async load(force = false): Promise<WorkflowDefinition> {
    // 检查缓存（支持热加载）
    if (!force && this.cache) {
      const stats = await this.getModifiedTime()
      if (stats === this.lastModified) {
        return this.cache
      }
    }

    // 读取文件
    const content = await readFile(this.workflowPath, 'utf-8')
    const modified = await this.getModifiedTime()

    // 解析
    const workflow = this.parse(content)

    // 更新缓存
    this.cache = workflow
    this.lastModified = modified

    return workflow
  }

  /**
   * 解析 WORKFLOW.md 内容
   */
  private parse(content: string): WorkflowDefinition {
    const trimmed = content.trim()

    // 检查是否有 YAML front matter
    if (!trimmed.startsWith('---')) {
      // 没有 front matter，整个文件作为 prompt template
      return {
        config: {},
        prompt_template: trimmed,
      }
    }

    // 解析 front matter
    const endMarker = trimmed.indexOf('---', 3)
    if (endMarker === -1) {
      throw new Error('Invalid WORKFLOW.md: missing closing ---')
    }

    const frontMatter = trimmed.slice(3, endMarker).trim()
    const promptTemplate = trimmed.slice(endMarker + 3).trim()

    // 解析 YAML
    let config: Record<string, unknown>
    try {
      config = yaml.load(frontMatter) as Record<string, unknown> ?? {}
    } catch (err) {
      throw new Error(
        `Invalid YAML front matter: ${err instanceof Error ? err.message : String(err)}`
      )
    }

    // 验证 front matter 是对象
    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
      throw new Error('YAML front matter must be a map/object')
    }

    return {
      config,
      prompt_template: promptTemplate,
    }
  }

  /**
   * 获取文件最后修改时间
   */
  private async getModifiedTime(): Promise<number | null> {
    try {
      const stats = await fs.stat(this.workflowPath)
      return stats.mtimeMs
    } catch {
      return null
    }
  }

  /**
   * 监听文件变化（热加载）
   */
  watch(callback: (workflow: WorkflowDefinition) => void): () => void {
    const watcher = fs.watch(this.workflowPath, async (eventType) => {
      if (eventType === 'change') {
        try {
          const workflow = await this.load(true)
          callback(workflow)
        } catch (err) {
          console.error('[WorkflowLoader] Reload failed:', err)
          // 保持旧配置，不崩溃
        }
      }
    })

    return () => watcher.close()
  }
}

// Node.js fs 导入（条件导入以支持不同环境）
let fs: typeof import('fs/promises')
try {
  fs = await import('fs/promises')
} catch {
  // 浏览器环境 fallback
  fs = {
    readFile: async () => {
      throw new Error('fs not available in browser')
    },
    stat: async () => {
      throw new Error('fs not available in browser')
    },
    watch: () => {
      throw new Error('fs.watch not available in browser')
    },
  } as any
}
