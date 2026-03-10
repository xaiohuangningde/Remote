/**
 * Excel Service - 基于 ExcelJS 的 Excel 文件处理
 * 
 * 功能：读写/样式/图表/多工作表管理
 */

import ExcelJS from 'exceljs'
import * as path from 'path'
import * as fs from 'fs/promises'

export interface CellStyle {
  font?: {
    bold?: boolean
    size?: number
    name?: string
    color?: { argb: string }
  }
  fill?: {
    type: string
    pattern?: string
    fgColor?: { argb: string }
  }
  border?: {
    top?: { style: string; color: { argb: string } }
    left?: { style: string; color: { argb: string } }
    bottom?: { style: string; color: { argb: string } }
    right?: { style: string; color: { argb: string } }
  }
  alignment?: {
    horizontal?: string
    vertical?: string
  }
}

export interface ChartConfig {
  type: 'column' | 'bar' | 'line' | 'pie' | 'scatter'
  data: string // 数据范围，如 'A1:C10'
  title?: string
  xLabel?: string
  yLabel?: string
}

export class ExcelService {
  private workbook: ExcelJS.Workbook | null = null
  private filePath: string = ''

  /**
   * 创建新 Excel 文件
   */
  async create(filePath: string): Promise<void> {
    this.workbook = new ExcelJS.Workbook()
    this.workbook.creator = 'OpenClaw Excel MCP'
    this.workbook.created = new Date()
    this.filePath = path.resolve(filePath)
  }

  /**
   * 读取现有 Excel 文件
   */
  async read(filePath: string, sheetName?: string): Promise<any[][]> {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)

    if (sheetName) {
      const worksheet = workbook.getWorksheet(sheetName)
      if (!worksheet) {
        throw new Error(`工作表 "${sheetName}" 不存在`)
      }
      return this.worksheetToData(worksheet)
    }

    // 返回所有工作表
    const result: Record<string, any[][]> = {}
    workbook.eachSheet((worksheet) => {
      result[worksheet.name] = this.worksheetToData(worksheet)
    })
    return result as any
  }

  /**
   * 写入数据到 Excel 文件
   */
  async write(filePath: string, data: any[][], sheetName: string = 'Sheet1'): Promise<void> {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet(sheetName)

    // 写入数据
    data.forEach((row, rowIndex) => {
      const rowNumber = rowIndex + 1
      worksheet.getRow(rowNumber).values = row
    })

    // 自动调整列宽
    worksheet.columns.forEach((column) => {
      if (column) {
        let maxLength = 10
        column.eachCell({ includeEmpty: true }, (cell) => {
          const length = cell.value ? String(cell.value).length : 0
          if (length > maxLength) {
            maxLength = length
          }
        })
        column.width = Math.min(maxLength + 2, 50)
      }
    })

    await workbook.xlsx.writeFile(path.resolve(filePath))
  }

  /**
   * 设置单元格值和样式
   */
  async setCellValue(
    filePath: string,
    sheetName: string,
    cell: string,
    value: any,
    style?: CellStyle
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)

    const worksheet = workbook.getWorksheet(sheetName)
    if (!worksheet) {
      throw new Error(`工作表 "${sheetName}" 不存在`)
    }

    const cellObj = worksheet.getCell(cell)
    cellObj.value = value

    if (style) {
      this.applyCellStyle(cellObj, style)
    }

    await workbook.xlsx.writeFile(filePath)
  }

  /**
   * 获取单元格值
   */
  async getCellValue(filePath: string, sheetName: string, cell: string): Promise<any> {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)

    const worksheet = workbook.getWorksheet(sheetName)
    if (!worksheet) {
      throw new Error(`工作表 "${sheetName}" 不存在`)
    }

    return worksheet.getCell(cell).value
  }

  /**
   * 添加图表
   */
  async addChart(
    filePath: string,
    sheetName: string,
    position: string,
    config: ChartConfig
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)

    const worksheet = workbook.getWorksheet(sheetName)
    if (!worksheet) {
      throw new Error(`工作表 "${sheetName}" 不存在`)
    }

    // 解析数据范围
    const range = this.parseRange(config.data)
    
    // 创建图表
    const chart = worksheet.addChart(position, {
      type: config.type as any,
      series: [{
        name: range.sheet + '!' + range.header,
        categories: range.sheet + '!' + range.categories,
        values: range.sheet + '!' + range.values
      }],
      title: config.title || '图表',
      xLabel: config.xLabel,
      yLabel: config.yLabel
    })

    await workbook.xlsx.writeFile(filePath)
  }

  /**
   * 添加新工作表
   */
  async addSheet(filePath: string, name: string): Promise<void> {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)

    workbook.addWorksheet(name)
    await workbook.xlsx.writeFile(filePath)
  }

  /**
   * 删除工作表
   */
  async deleteSheet(filePath: string, name: string): Promise<void> {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)

    const worksheet = workbook.getWorksheet(name)
    if (!worksheet) {
      throw new Error(`工作表 "${name}" 不存在`)
    }

    workbook.removeWorksheet(worksheet)
    await workbook.xlsx.writeFile(filePath)
  }

  /**
   * 获取所有工作表名称
   */
  async getSheetNames(filePath: string): Promise<string[]> {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)

    const names: string[] = []
    workbook.eachSheet((sheet) => {
      names.push(sheet.name)
    })
    return names
  }

  // ========== 私有辅助方法 ==========

  private worksheetToData(worksheet: ExcelJS.Worksheet): any[][] {
    const data: any[][] = []
    worksheet.eachRow((row, rowNumber) => {
      const rowData: any[] = []
      row.eachCell((cell) => {
        rowData.push(cell.value)
      })
      data.push(rowData)
    })
    return data
  }

  private applyCellStyle(cell: ExcelJS.Cell, style: CellStyle): void {
    if (style.font) {
      cell.font = style.font
    }
    if (style.fill) {
      cell.fill = style.fill as any
    }
    if (style.border) {
      cell.border = style.border
    }
    if (style.alignment) {
      cell.alignment = style.alignment
    }
  }

  private parseRange(range: string): {
    sheet: string
    header: string
    categories: string
    values: string
  } {
    // 简单解析，如 'A1:C10'
    // 实际使用需要根据具体需求调整
    const [start, end] = range.split(':')
    return {
      sheet: 'Sheet1',
      header: start,
      categories: `${start}:${end}`,
      values: `${start}:${end}`
    }
  }
}

// 便捷函数
export async function createExcel(filePath: string): Promise<ExcelService> {
  const service = new ExcelService()
  await service.create(filePath)
  return service
}

export async function readExcel(filePath: string, sheetName?: string): Promise<any[][]> {
  const service = new ExcelService()
  return service.read(filePath, sheetName)
}

export async function writeExcel(
  filePath: string,
  data: any[][],
  sheetName?: string
): Promise<void> {
  const service = new ExcelService()
  await service.write(filePath, data, sheetName)
}
