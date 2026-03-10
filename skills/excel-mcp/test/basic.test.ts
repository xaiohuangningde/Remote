/**
 * Excel MCP 基础测试
 */

import { writeExcel, readExcel, ExcelService } from '../src/index.ts'
import * as fs from 'fs/promises'
import * as path from 'path'

const TEST_DIR = path.join(process.cwd(), 'test-output')
const TEST_FILE = path.join(TEST_DIR, 'test.xlsx')

async function setup() {
  await fs.mkdir(TEST_DIR, { recursive: true })
}

async function cleanup() {
  try {
    await fs.unlink(TEST_FILE)
  } catch (e) {
    // 忽略
  }
}

async function testWriteAndRead() {
  console.log('\n📝 测试 1: 写入和读取 Excel...')
  
  const testData = [
    ['姓名', '年龄', '城市'],
    ['张三', 25, '北京'],
    ['李四', 30, '上海'],
    ['王五', 28, '广州'],
  ]

  await writeExcel(TEST_FILE, testData)
  console.log('✅ 写入成功')

  const result = await readExcel(TEST_FILE)
  console.log('✅ 读取成功')

  // 验证数据
  if (JSON.stringify(result) === JSON.stringify(testData)) {
    console.log('✅ 数据验证通过')
  } else {
    console.error('❌ 数据不匹配')
    console.log('期望:', testData)
    console.log('实际:', result)
  }
}

async function testSheetOperations() {
  console.log('\n📊 测试 2: 工作表操作...')
  
  const excel = new ExcelService()

  // 添加工作表
  await excel.addSheet(TEST_FILE, 'Sheet2')
  console.log('✅ 添加工作表成功')

  // 获取所有工作表
  const sheets = await excel.getSheetNames(TEST_FILE)
  console.log('工作表列表:', sheets)

  // 删除工作表
  await excel.deleteSheet(TEST_FILE, 'Sheet2')
  console.log('✅ 删除工作表成功')

  // 验证
  const sheetsAfter = await excel.getSheetNames(TEST_FILE)
  if (!sheetsAfter.includes('Sheet2')) {
    console.log('✅ 验证通过')
  } else {
    console.error('❌ 删除失败')
  }
}

async function testCellStyle() {
  console.log('\n🎨 测试 3: 单元格样式...')
  
  const excel = new ExcelService()

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
  if (value === '标题') {
    console.log('✅ 验证通过')
  } else {
    console.error('❌ 值不匹配:', value)
  }
}

async function main() {
  console.log('🚀 开始 Excel MCP 测试...\n')
  
  await setup()

  try {
    // 先创建基础文件
    await writeExcel(TEST_FILE, [['测试']])
    
    await testWriteAndRead()
    await testSheetOperations()
    await testCellStyle()

    console.log('\n✅ 所有测试完成!\n')
  } catch (error) {
    console.error('\n❌ 测试失败:', error)
  } finally {
    await cleanup()
  }
}

main()
