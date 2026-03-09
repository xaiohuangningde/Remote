/**
 * Python 图表生成器封装 - JavaScript 调用 Python 脚本
 * 
 * 依赖：Python 3 + matplotlib + openpyxl + pandas
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const execAsync = promisify(exec)

export class PythonChartGenerator {
  constructor(pythonPath = 'python') {
    this.pythonPath = pythonPath
    this.scriptPath = path.join(__dirname, 'chart-python.py')
  }

  /**
   * 生成图表并插入 Excel
   */
  async generateChart(filePath, sheetName, dataRange, chartType, options = {}) {
    const {
      title = '',
      xLabel = '',
      yLabel = '',
      position = 'E1',
      output = filePath,
      width = 10,
      height = 6
    } = options

    const command = [
      `"${this.pythonPath}" "${this.scriptPath}"`,
      `--input "${filePath}"`,
      `--sheet ${sheetName}`,
      `--range ${dataRange}`,
      `--type ${chartType}`,
      title && `--title "${title}"`,
      xLabel && `--xlabel "${xLabel}"`,
      yLabel && `--ylabel "${yLabel}"`,
      position && `--position ${position}`,
      output !== filePath && `--output "${output}"`,
      `--width ${width}`,
      `--height ${height}`
    ].filter(Boolean).join(' ')

    try {
      const { stdout, stderr } = await execAsync(command, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024
      })

      if (stderr && stderr.includes('Error')) {
        throw new Error(stderr)
      }

      console.log('[Chart] 图表生成成功')
      return {
        success: true,
        message: '图表已生成并插入 Excel',
        output: output
      }
    } catch (error) {
      console.error('[Chart] 生成失败:', error.message)
      throw new Error(`图表生成失败：${error.message}`)
    }
  }

  /**
   * 批量生成多个图表
   */
  async generateCharts(filePath, charts) {
    const results = []
    
    for (const chart of charts) {
      try {
        const result = await this.generateChart(
          filePath,
          chart.sheet,
          chart.range,
          chart.type,
          chart.options
        )
        results.push({ ...result, chart })
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          chart
        })
      }
    }
    
    return results
  }

  /**
   * 检查 Python 环境
   */
  async checkPythonEnv() {
    try {
      const { stdout } = await execAsync(`${this.pythonPath} --version`)
      console.log('[Check] Python 环境:', stdout.trim())

      // 检查依赖
      const deps = ['matplotlib', 'openpyxl', 'pandas']
      const missing = []

      for (const dep of deps) {
        try {
          await execAsync(`${this.pythonPath} -c "import ${dep}"`)
          console.log(`[Check] ${dep}: OK`)
        } catch {
          missing.push(dep)
          console.log(`[Check] ${dep}: 缺失`)
        }
      }

      if (missing.length > 0) {
        return {
          ready: false,
          message: `缺少依赖：${missing.join(', ')}`,
          install: `pip install ${missing.join(' ')}`
        }
      }

      return {
        ready: true,
        message: 'Python 环境就绪'
      }
    } catch (error) {
      return {
        ready: false,
        message: `Python 环境检查失败：${error.message}`
      }
    }
  }
}

// 便捷函数
export async function createChart(filePath, sheetName, dataRange, type, options) {
  const generator = new PythonChartGenerator()
  return await generator.generateChart(filePath, sheetName, dataRange, type, options)
}

export async function checkChartDependencies() {
  const generator = new PythonChartGenerator()
  return await generator.checkPythonEnv()
}
