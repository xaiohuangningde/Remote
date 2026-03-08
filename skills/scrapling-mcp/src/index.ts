/**
 * Scrapling-MCP Skill
 * 自适应网页爬虫框架，带反反爬能力
 * 
 * @module scrapling-mcp
 * @author xiaoxiaohuang
 * @created 2026-03-08
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { join } from 'path'

const execAsync = promisify(exec)

// ============================================================================
// Types
// ============================================================================

export interface ScraplingOptions {
  /** 启用反反爬模式 (Cloudflare 绕过) */
  stealth?: boolean
  /** 无头模式 */
  headless?: boolean
  /** 请求超时 (秒) */
  timeout?: number
  /** 重试次数 */
  retries?: number
}

export interface ScraplingResult<T = any> {
  success: boolean
  data?: T[]
  error?: string
  meta?: {
    url: string
    timestamp: string
    elementCount: number
  }
}

export interface ScraplingElement {
  tag: string
  text: string
  html: string
  attributes: Record<string, string>
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * 抓取网页数据
 * 
 * @param url - 目标网址
 * @param selector - CSS 选择器
 * @param options - 选项
 * 
 * @example
 * ```typescript
 * const result = await scrape(
 *   'https://quotes.toscrape.com/',
 *   '.quote'
 * )
 * ```
 */
export async function scrape<T = ScraplingElement>(
  url: string,
  selector: string,
  options: ScraplingOptions = {}
): Promise<ScraplingResult<T>> {
  const {
    stealth = false,
    headless = true,
    timeout = 30,
    retries = 2
  } = options

  // 检查 scrapling 是否安装
  try {
    await execAsync('python -c "import scrapling"')
  } catch (error) {
    return {
      success: false,
      error: 'scrapling 未安装，请运行：pip install scrapling[fetchers]'
    }
  }

  // 构建 Python 脚本
  const script = buildPythonScript(url, selector, stealth, headless)

  // 执行抓取 (带重试)
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const { stdout, stderr } = await execAsync(
        `python -c "${script}"`,
        { timeout: timeout * 1000 }
      )

      if (stderr && !stderr.includes('INFO:')) {
        console.warn('Scrapling warning:', stderr)
      }

      const result = JSON.parse(stdout) as ScraplingResult<T>
      
      if (result.success) {
        result.meta = {
          url,
          timestamp: new Date().toISOString(),
          elementCount: result.data?.length || 0
        }
      }

      return result
    } catch (error: any) {
      if (attempt === retries + 1) {
        return {
          success: false,
          error: error.message || '抓取失败'
        }
      }
      // 重试前等待
      await sleep(1000 * attempt)
    }
  }

  return { success: false, error: '未知错误' }
}

/**
 * 抓取并提取文本
 * 
 * @param url - 目标网址
 * @param selector - CSS 选择器
 * @param options - 选项
 * 
 * @example
 * ```typescript
 * const texts = await scrapeText(
 *   'https://news.ycombinator.com/',
 *   '.titleline > a'
 * )
 * ```
 */
export async function scrapeText(
  url: string,
  selector: string,
  options: ScraplingOptions = {}
): Promise<string[]> {
  const result = await scrape(url, selector, options)
  
  if (!result.success || !result.data) {
    throw new Error(result.error || '抓取失败')
  }

  return result.data.map(item => {
    if (typeof item === 'string') return item
    if (typeof item === 'object' && 'text' in item) {
      return String(item.text)
    }
    return String(item)
  })
}

/**
 * 抓取并提取链接
 * 
 * @param url - 目标网址
 * @param selector - CSS 选择器 (应为 a 标签)
 * @param options - 选项
 * 
 * @example
 * ```typescript
 * const links = await scrapeLinks(
 *   'https://example.com/',
 *   'a'
 * )
 * ```
 */
export async function scrapeLinks(
  url: string,
  selector: string,
  options: ScraplingOptions = {}
): Promise<{ text: string; href: string }[]> {
  const script = buildPythonScript(url, selector, options.stealth, options.headless, true)
  
  try {
    const { stdout } = await execAsync(`python -c "${script}"`)
    const result = JSON.parse(stdout) as ScraplingResult<{ text: string; href: string }>
    
    if (!result.success) {
      throw new Error(result.error || '抓取失败')
    }
    
    return result.data || []
  } catch (error: any) {
    throw new Error(error.message || '抓取失败')
  }
}

/**
 * 检查 Camoufox 是否已安装
 */
export async function checkCamoufox(): Promise<{ installed: boolean; path?: string }> {
  try {
    const { stdout } = await execAsync('python -c "import camoufox; print(camoufox.__version__)"')
    return { installed: true, path: stdout.trim() }
  } catch {
    return { installed: false }
  }
}

/**
 * 安装/更新 Camoufox
 */
export async function installCamoufox(): Promise<{ success: boolean; error?: string }> {
  try {
    await execAsync('python -m camoufox fetch', { timeout: 600000 })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildPythonScript(
  url: string,
  selector: string,
  stealth: boolean,
  headless: boolean,
  extractLinks = false
): string {
  const fetcher = stealth ? 'StealthyFetcher' : 'Fetcher'
  const method = stealth ? 'fetch' : 'get'
  const headlessArg = headless ? ', headless=True' : ''

  if (extractLinks) {
    return `
from scrapling.fetchers import ${fetcher}
import json

try:
    page = ${fetcher}.${method}("${url}"${headlessArg})
    elements = page.css("${selector}")
    data = [{"text": el.get(), "href": el.attributes.get("href", "")} for el in elements]
    print(json.dumps({"success": True, "data": data}, ensure_ascii=False))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))
`
  }

  return `
from scrapling.fetchers import ${fetcher}
import json

try:
    page = ${fetcher}.${method}("${url}"${headlessArg})
    elements = page.css("${selector}")
    data = [el.get() for el in elements]
    print(json.dumps({"success": True, "data": data}, ensure_ascii=False))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))
`
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================================
// CLI Entry Point
// ============================================================================

if (import.meta.vitest === undefined && process.argv[1]?.includes('scrapling-mcp')) {
  const [, , command, url, selector] = process.argv
  
  if (command === 'scrape' && url && selector) {
    scrape(url, selector).then(result => {
      console.log(JSON.stringify(result, null, 2))
    })
  } else {
    console.log(`
Scrapling-MCP CLI

Usage:
  node skills/scrapling-mcp/src/index.ts scrape <url> <selector>

Examples:
  node skills/scrapling-mcp/src/index.ts scrape https://quotes.toscrape.com/ '.quote'
  node skills/scrapling-mcp/src/index.ts scrape https://example.com/ 'a' --stealth
`)
  }
}
