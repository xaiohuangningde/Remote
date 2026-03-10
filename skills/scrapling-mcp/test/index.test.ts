/**
 * Scrapling-MCP Skill Tests
 */

import { describe, it, expect } from 'vitest'
import { scrape, scrapeText, checkCamoufox } from './index.ts'

describe('scrapling-mcp', () => {
  describe('checkCamoufox', () => {
    it('should check if Camoufox is installed', async () => {
      const result = await checkCamoufox()
      expect(result).toHaveProperty('installed')
      expect(typeof result.installed).toBe('boolean')
    })
  })

  describe('scrape', () => {
    it('should scrape quotes.toscrape.com', async () => {
      const result = await scrape(
        'https://quotes.toscrape.com/',
        '.quote',
        { timeout: 60 }
      )

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data!.length).toBeGreaterThan(0)
      expect(result.meta).toBeDefined()
      expect(result.meta?.elementCount).toBeGreaterThan(0)
    }, 90000)

    it('should handle invalid URLs gracefully', async () => {
      const result = await scrape(
        'https://invalid-url-that-does-not-exist.com/',
        '.test'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    }, 90000)
  })

  describe('scrapeText', () => {
    it('should extract text from elements', async () => {
      const texts = await scrapeText(
        'https://quotes.toscrape.com/',
        '.text::text',
        { timeout: 60 }
      )

      expect(Array.isArray(texts)).toBe(true)
      expect(texts.length).toBeGreaterThan(0)
      expect(texts[0]).toContain('"')
    }, 90000)
  })
})
