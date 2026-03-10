#!/usr/bin/env node
/**
 * Excel MCP Server
 * 
 * 将此服务添加到 OpenClaw 的 mcp.json 配置中即可使用
 */

import { ExcelService, readExcel, writeExcel } from './index.js'
import * as fs from 'fs/promises'
import * as path from 'path'

const excelService = new ExcelService()

// MCP 工具定义
const TOOLS = {
  excel_read: {
    description: '读取 Excel 文件内容',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Excel 文件路径' },
        sheetName: { type: 'string', description: '工作表名称（可选）' }
      },
      required: ['filePath']
    }
  },
  excel_write: {
    description: '写入数据到 Excel 文件',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Excel 文件路径' },
        data: { 
          type: 'array', 
          description: '二维数组数据',
          items: { type: 'array', items: { type: 'string' } }
        },
        sheetName: { type: 'string', description: '工作表名称', default: 'Sheet1' }
      },
      required: ['filePath', 'data']
    }
  },
  excel_get_cell: {
    description: '获取单元格值',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Excel 文件路径' },
        sheetName: { type: 'string', description: '工作表名称' },
        cell: { type: 'string', description: '单元格引用，如 A1, B2' }
      },
      required: ['filePath', 'sheetName', 'cell']
    }
  },
  excel_set_cell: {
    description: '设置单元格值和样式',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Excel 文件路径' },
        sheetName: { type: 'string', description: '工作表名称' },
        cell: { type: 'string', description: '单元格引用' },
        value: { type: 'string', description: '单元格值' },
        style: { type: 'object', description: '样式配置' }
      },
      required: ['filePath', 'sheetName', 'cell', 'value']
    }
  },
  excel_list_sheets: {
    description: '获取所有工作表名称',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Excel 文件路径' }
      },
      required: ['filePath']
    }
  },
  excel_add_sheet: {
    description: '添加新工作表',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Excel 文件路径' },
        name: { type: 'string', description: '工作表名称' }
      },
      required: ['filePath', 'name']
    }
  },
  excel_delete_sheet: {
    description: '删除工作表',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Excel 文件路径' },
        name: { type: 'string', description: '工作表名称' }
      },
      required: ['filePath', 'name']
    }
  }
}

// 工具处理函数
async function handleToolCall(name, args) {
  try {
    switch (name) {
      case 'excel_read': {
        const data = await excelService.read(args.filePath, args.sheetName)
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
        }
      }
      
      case 'excel_write': {
        await writeExcel(args.filePath, args.data, args.sheetName)
        return {
          content: [{ type: 'text', text: `✅ 成功写入 ${args.data.length} 行数据到 ${args.filePath}` }]
        }
      }
      
      case 'excel_get_cell': {
        const value = await excelService.getCellValue(args.filePath, args.sheetName, args.cell)
        return {
          content: [{ type: 'text', text: `单元格 ${args.cell} 的值：${JSON.stringify(value)}` }]
        }
      }
      
      case 'excel_set_cell': {
        await excelService.setCellValue(
          args.filePath,
          args.sheetName,
          args.cell,
          args.value,
          args.style
        )
        return {
          content: [{ type: 'text', text: `✅ 单元格 ${args.cell} 已更新` }]
        }
      }
      
      case 'excel_list_sheets': {
        const sheets = await excelService.getSheetNames(args.filePath)
        return {
          content: [{ type: 'text', text: `工作表列表：${sheets.join(', ')}` }]
        }
      }
      
      case 'excel_add_sheet': {
        await excelService.addSheet(args.filePath, args.name)
        return {
          content: [{ type: 'text', text: `✅ 工作表 "${args.name}" 已添加` }]
        }
      }
      
      case 'excel_delete_sheet': {
        await excelService.deleteSheet(args.filePath, args.name)
        return {
          content: [{ type: 'text', text: `✅ 工作表 "${args.name}" 已删除` }]
        }
      }
      
      default:
        return {
          content: [{ type: 'text', text: `❌ 未知工具：${name}` }],
          isError: true
        }
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `❌ 错误：${error.message}` }],
      isError: true
    }
  }
}

// 主循环 - 从 stdin 读取请求
async function main() {
  const readline = await import('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  })

  let buffer = ''

  rl.on('line', (line) => {
    buffer += line + '\n'
    
    // 检查是否收到完整消息（以空行结束）
    if (line.trim() === '') {
      processMessage(buffer)
      buffer = ''
    }
  })

  console.error('Excel MCP Server 已启动')
}

async function processMessage(messageStr) {
  try {
    const message = JSON.parse(messageStr)
    
    if (message.method === 'initialize') {
      sendResponse(message.id, {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'excel-mcp',
          version: '1.0.0'
        }
      })
    } else if (message.method === 'tools/list') {
      const tools = Object.entries(TOOLS).map(([name, config]) => ({
        name,
        description: config.description,
        inputSchema: config.inputSchema
      }))
      sendResponse(message.id, { tools })
    } else if (message.method === 'tools/call') {
      const result = await handleToolCall(message.params.name, message.params.arguments)
      sendResponse(message.id, result)
    } else if (message.method === 'notifications/initialized') {
      // 忽略初始化通知
    } else {
      console.error('未知方法:', message.method)
    }
  } catch (error) {
    console.error('处理消息失败:', error)
  }
}

function sendResponse(id, result) {
  const response = {
    jsonrpc: '2.0',
    id,
    result
  }
  console.log(JSON.stringify(response))
}

// 捕获错误
process.on('uncaughtException', (error) => {
  console.error('未捕获异常:', error)
})

main()
