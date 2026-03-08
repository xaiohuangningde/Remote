// GitNexus Web UI 封装
// 通过浏览器自动化分析代码库

import { browser } from '@openclaw/tools'

export interface GitNexusWebOptions {
  /** GitHub 仓库 URL */
  githubUrl?: string
  /** 本地 ZIP 文件路径 */
  zipPath?: string
  /** 等待超时（毫秒） */
  timeoutMs?: number
}

export interface GitNexusResult {
  /** 分析是否成功 */
  success: boolean
  /** 目标 ID（用于后续操作） */
  targetId?: string
  /** 错误信息 */
  error?: string
  /** 文件数量 */
  fileCount?: number
  /** 符号数量 */
  symbolCount?: number
}

/**
 * 通过 GitNexus Web UI 分析代码库
 * 
 * @example
 * // 分析 GitHub 仓库
 * await analyzeCodebase({ githubUrl: 'https://github.com/owner/repo' })
 * 
 * @example
 * // 分析本地 ZIP
 * await analyzeCodebase({ zipPath: './code.zip' })
 */
export async function analyzeCodebase(
  options: GitNexusWebOptions
): Promise<GitNexusResult> {
  const { githubUrl, zipPath, timeoutMs = 120000 } = options

  try {
    // 1. 打开 GitNexus Web UI
    const { targetId } = await browser({
      action: 'open',
      url: 'https://gitnexus.vercel.app'
    })

    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 3000))

    // 2. 根据选项选择上传方式
    if (githubUrl) {
      // 切换到 GitHub URL 标签
      await browser({
        action: 'act',
        targetId,
        request: {
          kind: 'click',
          selector: '[role="tab"]:has-text("GitHub URL")'
        }
      })

      // 输入 GitHub URL
      await browser({
        action: 'act',
        targetId,
        request: {
          kind: 'type',
          selector: 'input[type="url"]',
          text: githubUrl
        }
      })

      // 提交
      await browser({
        action: 'act',
        targetId,
        request: {
          kind: 'click',
          selector: 'button:has-text("Analyze")'
        }
      })
    } else if (zipPath) {
      // 上传 ZIP 文件
      await browser({
        action: 'upload',
        targetId,
        paths: [zipPath]
      })
    } else {
      return {
        success: false,
        error: '必须提供 githubUrl 或 zipPath'
      }
    }

    // 3. 等待分析完成
    await new Promise(resolve => setTimeout(resolve, timeoutMs))

    // 4. 提取结果统计
    const stats = await browser({
      action: 'act',
      targetId,
      request: {
        kind: 'evaluate',
        fn: `() => {
          const files = document.querySelector('[data-testid="file-count"]')?.textContent
          const symbols = document.querySelector('[data-testid="symbol-count"]')?.textContent
          return {
            fileCount: files ? parseInt(files) : undefined,
            symbolCount: symbols ? parseInt(symbols) : undefined
          }
        }`
      }
    })

    return {
      success: true,
      targetId,
      ...stats
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 在已打开的 GitNexus 页面中查询代码
 */
export async function queryCode(
  targetId: string,
  query: string
): Promise<string> {
  const result = await browser({
    action: 'act',
    targetId,
    request: {
      kind: 'evaluate',
      fn: `() => {
        const input = document.querySelector('input[placeholder*="search"]')
        if (!input) return ''
        input.value = '${query}'
        input.dispatchEvent(new Event('input', { bubbles: true }))
        return 'Query submitted'
      }`
    }
  })
  return result
}

/**
 * 获取当前分析的仓库信息
 */
export async function getRepoInfo(
  targetId: string
): Promise<{ name?: string; files?: number; symbols?: number }> {
  const info = await browser({
    action: 'act',
    targetId,
    request: {
      kind: 'evaluate',
      fn: `() => {
        const name = document.querySelector('[data-testid="repo-name"]')?.textContent
        const files = document.querySelector('[data-testid="file-count"]')?.textContent
        const symbols = document.querySelector('[data-testid="symbol-count"]')?.textContent
        return {
          name,
          files: files ? parseInt(files) : undefined,
          symbols: symbols ? parseInt(symbols) : undefined
        }
      }`
    }
  })
  return info
}
