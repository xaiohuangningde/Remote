/**
 * Excel Service - 基于 ExcelJS 的 Excel 文件处理
 * 
 * 功能：读写/样式/图表/公式/数据验证/多工作表管理
 */

import ExcelJS from 'exceljs'
import * as path from 'path'
import * as fs from 'fs/promises'

export class ExcelService {
  /**
   * 读取现有 Excel 文件
   */
  async read(filePath, sheetName) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(path.resolve(filePath))

    if (sheetName) {
      const worksheet = workbook.getWorksheet(sheetName)
      if (!worksheet) {
        throw new Error(`工作表 "${sheetName}" 不存在`)
      }
      return this.worksheetToData(worksheet)
    }

    // 返回所有工作表
    const result = {}
    workbook.eachSheet((worksheet) => {
      result[worksheet.name] = this.worksheetToData(worksheet)
    })
    return result
  }

  /**
   * 写入数据到 Excel 文件
   */
  async write(filePath, data, sheetName = 'Sheet1') {
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
  async setCellValue(filePath, sheetName, cell, value, style) {
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
  async getCellValue(filePath, sheetName, cell) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)

    const worksheet = workbook.getWorksheet(sheetName)
    if (!worksheet) {
      throw new Error(`工作表 "${sheetName}" 不存在`)
    }

    return worksheet.getCell(cell).value
  }

  /**
   * 添加新工作表
   */
  async addSheet(filePath, name) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)
    workbook.addWorksheet(name)
    await workbook.xlsx.writeFile(filePath)
  }

  /**
   * 删除工作表
   */
  async deleteSheet(filePath, name) {
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
  async getSheetNames(filePath) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)

    const names = []
    workbook.eachSheet((sheet) => {
      names.push(sheet.name)
    })
    return names
  }

  // ========== 高级功能 ==========

  /**
   * 添加图表
   * 注意：ExcelJS 图表功能有限，建议使用其他方式生成后插入图片
   * 这里提供数据准备功能
   */
  async addChart(filePath, sheetName, position, chartConfig) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)

    const worksheet = workbook.getWorksheet(sheetName)
    if (!worksheet) {
      throw new Error(`工作表 "${sheetName}" 不存在`)
    }

    const { type, dataRange, title } = chartConfig

    // 添加图表占位符（实际图表需要用其他工具生成）
    const cell = worksheet.getCell(position)
    cell.value = `[CHART: ${type} - ${title}]`
    cell.font = { bold: true, color: { argb: 'FF0066CC' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    }

    // 添加说明
    const noteCell = worksheet.getCell(this.getNextRowPosition(position))
    noteCell.value = `提示：图表数据范围 ${dataRange}，可使用 Excel/在线工具生成后插入`
    noteCell.font = { italic: true, size: 10 }

    await workbook.xlsx.writeFile(filePath)
    
    console.log(`📊 图表占位符已添加：${type} - ${title}`)
    console.log(`   数据范围：${dataRange}`)
    console.log(`   💡 建议：使用 Excel、Chart.js 或其他工具生成图表后插入`)
  }

  /**
   * 获取下一个行位置
   */
  getNextRowPosition(currentPosition) {
    const match = currentPosition.match(/^([A-Z]+)(\d+)$/)
    if (!match) return 'A2'
    const col = match[1]
    const row = parseInt(match[2]) + 1
    return `${col}${row}`
  }

  /**
   * 解析数据范围
   */
  parseDataRange(range) {
    // 解析如 'A1:C10' 的范围
    const [start, end] = range.split(':')
    
    // 提取列和行
    const startMatch = start.match(/^([A-Z]+)(\d+)$/)
    const endMatch = end.match(/^([A-Z]+)(\d+)$/)
    
    if (!startMatch || !endMatch) {
      return {
        nameRange: `${start}`,
        categoryRange: `${range}`,
        valueRange: `${range}`
      }
    }

    const startCol = startMatch[1]
    const startRow = startMatch[2]
    const endCol = endMatch[1]
    const endRow = endMatch[2]

    // 构建范围
    const nameRange = `${startCol}${startRow}`
    const categoryRange = `${startCol}${startRow}:${endCol}${endRow}`
    
    // 值范围是第二列开始
    const secondCol = String.fromCharCode(startCol.charCodeAt(0) + 1)
    const valueRange = `${secondCol}${startRow}:${endCol}${endRow}`

    return { nameRange, categoryRange, valueRange }
  }

  /**
   * 设置公式
   */
  async setFormula(filePath, sheetName, cell, formula) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)

    const worksheet = workbook.getWorksheet(sheetName)
    if (!worksheet) {
      throw new Error(`工作表 "${sheetName}" 不存在`)
    }

    const cellObj = worksheet.getCell(cell)
    cellObj.value = { formula }

    await workbook.xlsx.writeFile(filePath)
  }

  /**
   * 获取公式结果
   */
  async getFormulaResult(filePath, sheetName, cell) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)

    const worksheet = workbook.getWorksheet(sheetName)
    if (!worksheet) {
      throw new Error(`工作表 "${sheetName}" 不存在`)
    }

    const cellObj = worksheet.getCell(cell)
    return {
      formula: cellObj.value?.formula,
      result: cellObj.value?.result || cellObj.value
    }
  }

  /**
   * 添加数据验证（下拉列表等）
   */
  async addDataValidation(filePath, sheetName, range, validationConfig) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)

    const worksheet = workbook.getWorksheet(sheetName)
    if (!worksheet) {
      throw new Error(`工作表 "${sheetName}" 不存在`)
    }

    const { type, formulas, allowBlank, showErrorMessage, error } = validationConfig

    // 创建数据验证器
    const validator = {
      type: type, // 'list', 'whole', 'decimal', 'date', 'time', 'textLength', 'custom'
      allowBlank: allowBlank !== false,
      showErrorMessage: showErrorMessage || false,
      error: error?.message || '输入值无效',
      errorTitle: error?.title || '验证失败',
      formulae: formulas
    }

    // 应用验证到指定范围
    worksheet.dataValidations.add(range, validator)

    await workbook.xlsx.writeFile(filePath)
  }

  /**
   * 批量设置公式
   */
  async setFormulas(filePath, sheetName, formulas) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)

    const worksheet = workbook.getWorksheet(sheetName)
    if (!worksheet) {
      throw new Error(`工作表 "${sheetName}" 不存在`)
    }

    // formulas: [{ cell: 'C1', formula: 'A1+B1' }, ...]
    formulas.forEach(({ cell, formula }) => {
      const cellObj = worksheet.getCell(cell)
      cellObj.value = { formula }
    })

    await workbook.xlsx.writeFile(filePath)
  }

  /**
   * 创建下拉列表
   */
  async createDropdown(filePath, sheetName, cell, options) {
    return this.addDataValidation(filePath, sheetName, cell, {
      type: 'list',
      formulas: [`"${options.join(',')}"`],
      allowBlank: true,
      showErrorMessage: true,
      error: {
        title: '选项无效',
        message: `请选择：${options.join(', ')}`
      }
    })
  }

  // ========== 私有辅助方法 ==========

  parseDataRange(range) {
    // 解析如 'A1:C10' 的范围
    // 返回 { nameRange, categoryRange, valueRange }
    const [start, end] = range.split(':')
    const startCol = start.match(/[A-Z]+/)[0]
    const startRow = parseInt(start.match(/\d+/)[0])
    const endCol = end.match(/[A-Z]+/)[0]
    const endRow = parseInt(end.match(/\d+/)[0])

    // 假设第一行是表头，第一列是类别
    const nameRange = `${startCol}${startRow}`
    const categoryRange = `${startCol}${startRow + 1}:${endCol}${endRow}`
    const valueRange = `${String.fromCharCode(startCol.charCodeAt(0) + 1)}${startRow + 1}:${endCol}${endRow}`

    return { nameRange, categoryRange, valueRange }
  }

  mapChartType(type) {
    // ExcelJS 图表类型字符串
    const typeMap = {
      'column': 'columnClustered',
      'bar': 'barClustered',
      'line': 'line',
      'pie': 'pie',
      'scatter': 'scatter',
      'area': 'area',
      'doughnut': 'doughnut'
    }
    return typeMap[type] || 'columnClustered'
  }

  // ========== 私有辅助方法 ==========

  worksheetToData(worksheet) {
    const data = []
    worksheet.eachRow((row, rowNumber) => {
      const rowData = []
      row.eachCell((cell) => {
        rowData.push(cell.value)
      })
      data.push(rowData)
    })
    return data
  }

  applyCellStyle(cell, style) {
    if (style.font) {
      cell.font = style.font
    }
    if (style.fill) {
      cell.fill = style.fill
    }
    if (style.border) {
      cell.border = style.border
    }
    if (style.alignment) {
      cell.alignment = style.alignment
    }
  }
}

// 便捷函数
export async function readExcel(filePath, sheetName) {
  const service = new ExcelService()
  return service.read(filePath, sheetName)
}

export async function writeExcel(filePath, data, sheetName) {
  const service = new ExcelService()
  await service.write(filePath, data, sheetName)
}
