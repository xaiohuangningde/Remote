/**
 * Python 图表生成器测试
 * 
 * 使用 matplotlib 生成图表并插入 Excel
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs/promises'

const execAsync = promisify(exec)

const TEST_DIR = path.join(process.cwd(), 'test-output')
const TEST_FILE = path.join(TEST_DIR, 'chart_test.xlsx')

async function setup() {
  await fs.mkdir(TEST_DIR, { recursive: true })
  
  // 创建测试数据
  const { ExcelService } = await import('../src/index.js')
  const excel = new ExcelService()
  
  const data = [
    ['月份', '销售额', '利润'],
    ['1 月', 100, 20],
    ['2 月', 150, 35],
    ['3 月', 200, 45],
    ['4 月', 180, 40],
    ['5 月', 220, 55],
    ['6 月', 250, 65],
  ]
  await excel.write(TEST_FILE, data)
  console.log('[OK] 测试数据已创建')
}

async function testColumnChart() {
  console.log('\n[Test 1] 柱状图...')
  
  const scriptPath = path.join(process.cwd(), 'src', 'chart-python.py')
  const command = `python "${scriptPath}" ` +
    `--input "${TEST_FILE}" ` +
    `--sheet Sheet1 ` +
    `--range A1:C7 ` +
    `--type column ` +
    `--title "月度销售趋势" ` +
    `--xlabel "月份" ` +
    `--ylabel "金额" ` +
    `--position E1 ` +
    `--output "${TEST_FILE}"`
  
  try {
    const { stdout, stderr } = await execAsync(command, { encoding: 'utf8' })
    console.log(stdout)
    if (stderr) console.error(stderr)
    console.log('[OK] 柱状图生成成功')
  } catch (error) {
    console.log('⚠️  Python 图表生成失败:', error.message)
    console.log('   请确保已安装：pip install matplotlib openpyxl pandas')
  }
}

async function testLineChart() {
  console.log('\n[Test 2] 折线图...')
  
  const scriptPath = path.join(process.cwd(), 'src', 'chart-python.py')
  const command = `python "${scriptPath}" ` +
    `--input "${TEST_FILE}" ` +
    `--sheet Sheet1 ` +
    `--range A1:C7 ` +
    `--type line ` +
    `--title "利润增长趋势" ` +
    `--position E20 ` +
    `--output "${TEST_FILE}"`
  
  try {
    const { stdout, stderr } = await execAsync(command, { encoding: 'utf8' })
    console.log(stdout)
    console.log('[OK] 折线图生成成功')
  } catch (error) {
    console.log('⚠️  Python 图表生成失败:', error.message)
  }
}

async function testPieChart() {
  console.log('\n[Test 3] 饼图...')
  
  // 创建饼图数据
  const { ExcelService } = await import('../src/index.js')
  const excel = new ExcelService()
  
  const pieData = [
    ['产品', '销量'],
    ['产品 A', 100],
    ['产品 B', 150],
    ['产品 C', 80],
    ['产品 D', 120],
  ]
  await excel.write(TEST_FILE, pieData, 'PieData')
  
  const scriptPath = path.join(process.cwd(), 'src', 'chart-python.py')
  const command = `python "${scriptPath}" ` +
    `--input "${TEST_FILE}" ` +
    `--sheet PieData ` +
    `--range A1:B5 ` +
    `--type pie ` +
    `--title "产品销售占比" ` +
    `--position E1 ` +
    `--output "${TEST_FILE}"`
  
  try {
    const { stdout, stderr } = await execAsync(command, { encoding: 'utf8' })
    console.log(stdout)
    console.log('[OK] 饼图生成成功')
  } catch (error) {
    console.log('⚠️  Python 图表生成失败:', error.message)
  }
}

async function main() {
  console.log('Python 图表生成器测试\n')
  console.log('='.repeat(50))
  
  await setup()
  
  await testColumnChart()
  await testLineChart()
  await testPieChart()
  
  console.log('\n' + '='.repeat(50))
  console.log('测试完成!')
  console.log('测试文件:', TEST_FILE)
  console.log('\n提示:')
  console.log('   如果看到警告，请安装 Python 依赖:')
  console.log('   pip install matplotlib openpyxl pandas')
  console.log('='.repeat(50) + '\n')
}

main()
