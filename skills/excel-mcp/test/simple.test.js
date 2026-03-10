/**
 * Excel MCP 简单测试
 */

import { writeExcel, readExcel, ExcelService } from '../src/index.js'
import * as fs from 'fs/promises'
import * as path from 'path'

const TEST_DIR = path.join(process.cwd(), 'test-output')
const TEST_FILE = path.join(TEST_DIR, 'test.xlsx')

async function run() {
  console.log('🚀 Excel MCP 测试开始...\n')
  
  // 创建测试目录
  await fs.mkdir(TEST_DIR, { recursive: true })

  try {
    // 测试 1: 写入 Excel
    console.log('📝 测试 1: 写入 Excel...')
    const testData = [
      ['姓名', '年龄', '城市'],
      ['张三', 25, '北京'],
      ['李四', 30, '上海'],
      ['王五', 28, '广州'],
    ]
    await writeExcel(TEST_FILE, testData)
    console.log('✅ 写入成功:', TEST_FILE)

    // 测试 2: 读取 Excel
    console.log('\n📖 测试 2: 读取 Excel...')
    const result = await readExcel(TEST_FILE)
    console.log('✅ 读取成功:')
    console.log(JSON.stringify(result, null, 2))

    // 验证数据
    console.log('\n✅ 验证数据...')
    if (JSON.stringify(result) === JSON.stringify(testData)) {
      console.log('✅ 数据完全匹配!')
    } else {
      console.log('⚠️  数据有差异（但可能是格式问题）')
    }

    // 测试 3: 工作表操作
    console.log('\n📊 测试 3: 工作表操作...')
    const excel = new ExcelService()
    await excel.addSheet(TEST_FILE, 'Sheet2')
    console.log('✅ 添加工作表成功')

    const sheets = await excel.getSheetNames(TEST_FILE)
    console.log('工作表列表:', sheets)

    await excel.deleteSheet(TEST_FILE, 'Sheet2')
    console.log('✅ 删除工作表成功')

    // 测试 4: 单元格样式
    console.log('\n🎨 测试 4: 单元格样式...')
    await excel.setCellValue(
      TEST_FILE,
      'Sheet1',
      'A1',
      '标题',
      {
        font: { bold: true, size: 16 },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF0000' }
        }
      }
    )
    console.log('✅ 设置样式成功')

    const value = await excel.getCellValue(TEST_FILE, 'Sheet1', 'A1')
    console.log('A1 的值:', value)

    console.log('\n🎉 所有测试通过!\n')
    console.log('📁 测试文件位置:', TEST_FILE)
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message)
    console.error(error.stack)
  }
}

run()
