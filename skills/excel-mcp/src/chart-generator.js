/**
 * 图表生成器 - 使用 Chart.js 生成图表图片并插入 Excel
 * 
 * 依赖：chartjs-node-canvas (无需浏览器环境)
 */

import { ChartJSNodeCanvas } from 'chartjs-node-canvas'
import ExcelJS from 'exceljs'
import * as path from 'path'
import * as fs from 'fs/promises'

export class ChartGenerator {
  constructor(width = 800, height = 600) {
    this.width = width
    this.height = height
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height })
  }

  /**
   * 生成图表并插入 Excel
   */
  async generateAndInsert(filePath, sheetName, position, chartConfig) {
    // 1. 生成图表图片
    const imageBuffer = await this.generateChart(chartConfig)

    // 2. 插入到 Excel
    await this.insertToExcel(filePath, sheetName, position, imageBuffer, chartConfig)

    console.log(`✅ 图表已生成并插入：${chartConfig.type} - ${chartConfig.title}`)
  }

  /**
   * 生成图表图片
   */
  async generateChart(chartConfig) {
    const { type, data, title, xLabel, yLabel } = chartConfig

    // Chart.js 配置
    const configuration = {
      type: this.mapChartType(type),
      data: {
        labels: data.labels,
        datasets: data.datasets.map((dataset, index) => ({
          label: dataset.label,
          data: dataset.data,
          backgroundColor: this.getBackgroundColor(index, type),
          borderColor: this.getBorderColor(index),
          borderWidth: 2,
          fill: type === 'line' || type === 'area'
        }))
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: !!title,
            text: title,
            font: { size: 16 }
          },
          legend: {
            display: data.datasets.length > 1,
            position: 'top'
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: !!xLabel,
              text: xLabel
            }
          },
          y: {
            display: true,
            title: {
              display: !!yLabel,
              text: yLabel
            },
            beginAtZero: true
          }
        }
      }
    }

    // 生成图片
    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration)
    return imageBuffer
  }

  /**
   * 插入图片到 Excel
   */
  async insertToExcel(filePath, sheetName, position, imageBuffer, chartConfig) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)

    const worksheet = workbook.getWorksheet(sheetName)
    if (!worksheet) {
      throw new Error(`工作表 "${sheetName}" 不存在`)
    }

    // 解析位置（如 'E1'）
    const { col, row } = this.parseCellPosition(position)

    // 添加图片到 workbook
    const imageId = workbook.addImage({
      buffer: imageBuffer,
      extension: 'png'
    })

    // 计算图片大小（根据单元格）
    const cell = worksheet.getCell(row, col)
    const cellWidth = (worksheet.getColumn(col).width || 10) * 7 // 近似像素
    const cellHeight = (worksheet.getRow(row).height || 15) * 4 // 近似像素

    // 插入图片
    worksheet.addImage(imageId, {
      tl: { col: col - 1, row: row - 1 },
      ext: {
        width: chartConfig.width || 600,
        height: chartConfig.height || 400
      }
    })

    await workbook.xlsx.writeFile(filePath)
  }

  /**
   * 从 Excel 读取数据并生成图表
   */
  async generateFromExcelData(filePath, sheetName, dataRange, chartType, title) {
    // 读取 Excel 数据
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)
    const worksheet = workbook.getWorksheet(sheetName)

    // 解析数据范围（如 'A1:C10'）
    const range = this.parseDataRange(dataRange)
    const data = this.extractChartData(worksheet, range)

    return {
      type: chartType,
      data: data,
      title: title
    }
  }

  // ========== 辅助方法 ==========

  mapChartType(type) {
    const typeMap = {
      'column': 'bar',
      'bar': 'bar',
      'line': 'line',
      'pie': 'pie',
      'doughnut': 'doughnut',
      'area': 'line',
      'scatter': 'scatter'
    }
    return typeMap[type] || 'bar'
  }

  getBackgroundColor(index, type) {
    const colors = {
      column: [
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 99, 132, 0.6)',
        'rgba(255, 206, 86, 0.6)',
        'rgba(75, 192, 192, 0.6)',
        'rgba(153, 102, 255, 0.6)'
      ],
      pie: [
        'rgba(255, 99, 132, 0.8)',
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(153, 102, 255, 0.8)'
      ],
      line: 'rgba(54, 162, 235, 0.2)',
      scatter: 'rgba(54, 162, 235, 0.6)'
    }
    return colors[type][index % colors[type].length] || colors[type]
  }

  getBorderColor(index) {
    const colors = [
      'rgba(54, 162, 235, 1)',
      'rgba(255, 99, 132, 1)',
      'rgba(255, 206, 86, 1)',
      'rgba(75, 192, 192, 1)',
      'rgba(153, 102, 255, 1)'
    ]
    return colors[index % colors.length]
  }

  parseCellPosition(position) {
    const match = position.match(/^([A-Z]+)(\d+)$/)
    if (!match) {
      return { col: 1, row: 1 }
    }
    
    // 列字母转数字（A=1, B=2, ...）
    let col = 0
    for (let i = 0; i < match[1].length; i++) {
      col = col * 26 + (match[1].charCodeAt(i) - 'A'.charCodeAt(0) + 1)
    }
    
    return { col, row: parseInt(match[2]) }
  }

  parseDataRange(range) {
    const [start, end] = range.split(':')
    return { start, end }
  }

  extractChartData(worksheet, range) {
    const startCell = this.parseCellPosition(range.start)
    const endCell = this.parseCellPosition(range.end)

    const labels = []
    const datasets = []

    // 读取第一列作为标签
    for (let row = startCell.row + 1; row <= endCell.row; row++) {
      const cell = worksheet.getCell(row, startCell.col)
      labels.push(cell.value)
    }

    // 读取其他列作为数据集
    for (let col = startCell.col + 1; col <= endCell.col; col++) {
      const headerCell = worksheet.getCell(startCell.row, col)
      const label = headerCell.value

      const data = []
      for (let row = startCell.row + 1; row <= endCell.row; row++) {
        const cell = worksheet.getCell(row, col)
        data.push(cell.value)
      }

      datasets.push({
        label: String(label),
        data: data
      })
    }

    return { labels, datasets }
  }
}

// 便捷函数
export async function createChart(filePath, sheetName, position, chartConfig) {
  const generator = new ChartGenerator()
  await generator.generateAndInsert(filePath, sheetName, position, chartConfig)
}

export async function createChartFromExcel(filePath, sheetName, dataRange, position, chartType, title) {
  const generator = new ChartGenerator()
  const config = await generator.generateFromExcelData(filePath, sheetName, dataRange, chartType, title)
  await generator.generateAndInsert(filePath, sheetName, position, config)
}
