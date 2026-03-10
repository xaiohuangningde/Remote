/**
 * Excel MCP 高级功能测试
 * 
 * 测试：图表生成、公式支持、数据验证
 */

import { ExcelService } from '../src/index.js'
import * as fs from 'fs/promises'
import * as path from 'path'

const TEST_DIR = path.join(process.cwd(), 'test-output')
const TEST_FILE = path.join(TEST_DIR, 'advanced_test.xlsx')

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

async function testChartGeneration() {
  console.log('\n📊 测试 1: 图表生成...')
  
  const excel = new ExcelService()
  
  // 创建基础数据
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
  
  // 添加柱状图占位符
  await excel.addChart(TEST_FILE, 'Sheet1', 'E1', {
    type: 'column',
    dataRange: 'A1:C7',
    title: '月度销售趋势'
  })
  console.log('✅ 柱状图占位符添加成功')
  
  // 添加折线图占位符
  await excel.addChart(TEST_FILE, 'Sheet1', 'E20', {
    type: 'line',
    dataRange: 'A1:C7',
    title: '利润增长趋势'
  })
  console.log('✅ 折线图占位符添加成功')
  
  // 添加饼图占位符
  const pieData = [
    ['产品', '销量'],
    ['产品 A', 100],
    ['产品 B', 150],
    ['产品 C', 80],
    ['产品 D', 120],
  ]
  await excel.write(TEST_FILE, pieData, 'PieChart')
  await excel.addChart(TEST_FILE, 'PieChart', 'E1', {
    type: 'pie',
    dataRange: 'A1:B5',
    title: '产品销售占比'
  })
  console.log('✅ 饼图占位符添加成功')
}

async function testFormulas() {
  console.log('\n🧮 测试 2: 公式支持...')
  
  const excel = new ExcelService()
  
  // 创建数据
  const data = [
    ['商品', '单价', '数量', '总价'],
    ['苹果', 10, 5, null],
    ['香蕉', 8, 10, null],
    ['橙子', 12, 8, null],
    ['总计', null, null, null],
  ]
  await excel.write(TEST_FILE, data, 'Formulas')
  
  // 设置公式：总价 = 单价 * 数量
  await excel.setFormula(TEST_FILE, 'Formulas', 'D2', 'B2*C2')
  await excel.setFormula(TEST_FILE, 'Formulas', 'D3', 'B3*C3')
  await excel.setFormula(TEST_FILE, 'Formulas', 'D4', 'B4*C4')
  console.log('✅ 单个公式设置成功')
  
  // 批量设置公式
  await excel.setFormulas(TEST_FILE, 'Formulas', [
    { cell: 'D5', formula: 'SUM(D2:D4)' },
    { cell: 'B5', formula: 'AVERAGE(B2:B4)' },
    { cell: 'C5', formula: 'SUM(C2:C4)' },
  ])
  console.log('✅ 批量公式设置成功')
  
  // 获取公式结果
  const result = await excel.getFormulaResult(TEST_FILE, 'Formulas', 'D5')
  console.log('D5 公式:', result.formula)
  console.log('D5 结果:', result.result)
}

async function testDataValidation() {
  console.log('\n✅ 测试 3: 数据验证...')
  
  const excel = new ExcelService()
  
  // 创建数据
  const data = [
    ['姓名', '部门', '评分'],
    ['张三', null, null],
    ['李四', null, null],
    ['王五', null, null],
  ]
  await excel.write(TEST_FILE, data, 'Validation')
  
  // 添加下拉列表（部门选择）
  await excel.createDropdown(
    TEST_FILE,
    'Validation',
    'B2:B4',
    ['销售部', '技术部', '市场部', '人事部']
  )
  console.log('✅ 部门下拉列表创建成功')
  
  // 添加数值范围验证（评分 1-10）
  await excel.addDataValidation(TEST_FILE, 'Validation', 'C2:C4', {
    type: 'whole',
    formulas: ['1', '10'],
    allowBlank: false,
    showErrorMessage: true,
    error: {
      title: '评分无效',
      message: '请输入 1-10 之间的整数'
    }
  })
  console.log('✅ 数值范围验证创建成功')
  
  // 添加日期验证
  await excel.addDataValidation(TEST_FILE, 'Validation', 'D2:D4', {
    type: 'date',
    formulas: ['DATE(2024,1,1)', 'DATE(2024,12,31)'],
    showErrorMessage: true,
    error: {
      message: '请输入 2024 年的日期'
    }
  })
  console.log('✅ 日期验证创建成功')
}

async function testMixedFeatures() {
  console.log('\n🎯 测试 4: 综合应用...')
  
  const excel = new ExcelService()
  
  // 创建销售报表
  const data = [
    ['区域', 'Q1', 'Q2', 'Q3', 'Q4', '总计', '增长率'],
    ['华北', 100, 120, 110, 130, null, null],
    ['华东', 150, 160, 170, 180, null, null],
    ['华南', 120, 130, 140, 150, null, null],
    ['华西', 90, 95, 100, 105, null, null],
    ['平均', null, null, null, null, null, null],
  ]
  await excel.write(TEST_FILE, data, 'Sales Report')
  
  // 设置总计公式
  await excel.setFormulas(TEST_FILE, 'Sales Report', [
    { cell: 'F2', formula: 'SUM(B2:E2)' },
    { cell: 'F3', formula: 'SUM(B3:E3)' },
    { cell: 'F4', formula: 'SUM(B4:E4)' },
    { cell: 'F5', formula: 'SUM(B5:E5)' },
    { cell: 'F6', formula: 'SUM(F2:F5)' },
  ])
  console.log('✅ 总计公式设置成功')
  
  // 设置增长率公式
  await excel.setFormulas(TEST_FILE, 'Sales Report', [
    { cell: 'G2', formula: '(E2-B2)/B2' },
    { cell: 'G3', formula: '(E3-B3)/B3' },
    { cell: 'G4', formula: '(E4-B4)/B4' },
    { cell: 'G5', formula: '(E5-B5)/B5' },
  ])
  console.log('✅ 增长率公式设置成功')
  
  // 设置平均值公式
  await excel.setFormulas(TEST_FILE, 'Sales Report', [
    { cell: 'B6', formula: 'AVERAGE(B2:B5)' },
    { cell: 'C6', formula: 'AVERAGE(C2:C5)' },
    { cell: 'D6', formula: 'AVERAGE(D2:D5)' },
    { cell: 'E6', formula: 'AVERAGE(E2:E5)' },
  ])
  console.log('✅ 平均值公式设置成功')
  
  // 添加图表占位符
  await excel.addChart(TEST_FILE, 'Sales Report', 'H1', {
    type: 'column',
    dataRange: 'A1:E6',
    title: '季度销售对比'
  })
  console.log('✅ 销售图表占位符添加成功')
  
  // 添加区域下拉列表
  await excel.createDropdown(TEST_FILE, 'Sales Report', 'A2:A5', [
    '华北', '华东', '华南', '华西'
  ])
  console.log('✅ 区域下拉列表创建成功')
}

async function main() {
  console.log('🚀 Excel MCP 高级功能测试\n')
  console.log('=' .repeat(50))
  
  await setup()

  try {
    await testChartGeneration()
    await testFormulas()
    await testDataValidation()
    await testMixedFeatures()

    console.log('\n' + '='.repeat(50))
    console.log('🎉 所有高级功能测试通过!')
    console.log('📁 测试文件:', TEST_FILE)
    console.log('=' .repeat(50) + '\n')
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message)
    console.error(error.stack)
  } finally {
    // 不删除文件，方便查看
    console.log('💡 提示：测试文件已保留，可以打开查看效果')
  }
}

main()
