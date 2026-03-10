/**
 * Excel MCP 使用示例集合
 * 
 * 运行：node examples/usage-examples.js
 */

import { writeExcel, readExcel, ExcelService } from '../src/index.js'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const OUTPUT_DIR = path.join(__dirname, '..', 'examples-output')

import * as fs from 'fs'
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

console.log('📚 Excel MCP 使用示例\n')
console.log('=' .repeat(50))

// ========== 示例 1: 基础数据导出 ==========
async function example1() {
  console.log('\n【示例 1】基础数据导出')
  console.log('-'.repeat(50))
  
  const data = [
    ['产品名称', '单价', '销量', '销售额'],
    ['笔记本电脑', 5999, 120, 719880],
    ['智能手机', 3999, 250, 999750],
    ['平板电脑', 2999, 180, 539820],
    ['智能手表', 1999, 300, 599700],
  ]

  const file = path.join(OUTPUT_DIR, 'example1_basic.xlsx')
  await writeExcel(file, data)
  console.log('✅ 文件已创建:', file)
  
  // 读取验证
  const result = await readExcel(file)
  console.log('📊 数据预览:', JSON.stringify(result, null, 2))
}

// ========== 示例 2: 多工作表报表 ==========
async function example2() {
  console.log('\n【示例 2】多工作表报表')
  console.log('-'.repeat(50))
  
  const excel = new ExcelService()
  const file = path.join(OUTPUT_DIR, 'example2_multisheet.xlsx')
  
  // 创建基础数据
  const q1Data = [
    ['月份', '收入', '支出'],
    ['1 月', 100000, 80000],
    ['2 月', 120000, 75000],
    ['3 月', 110000, 82000],
  ]
  await writeExcel(file, q1Data, 'Q1')
  
  // 添加其他季度
  await excel.addSheet(file, 'Q2')
  await excel.addSheet(file, 'Q3')
  await excel.addSheet(file, 'Q4')
  
  const sheets = await excel.getSheetNames(file)
  console.log('✅ 工作表列表:', sheets)
  console.log('📁 文件位置:', file)
}

// ========== 示例 3: 带样式的报表 ==========
async function example3() {
  console.log('\n【示例 3】带样式的精美报表')
  console.log('-'.repeat(50))
  
  const excel = new ExcelService()
  const file = path.join(OUTPUT_DIR, 'example3_styled.xlsx')
  
  // 创建基础数据
  const data = [
    ['部门', '预算', '实际', '差异率'],
    ['销售部', 500000, 480000, '-4%'],
    ['技术部', 800000, 850000, '+6.25%'],
    ['市场部', 300000, 290000, '-3.33%'],
    ['人事部', 200000, 195000, '-2.5%'],
  ]
  await writeExcel(file, data)
  
  // 设置标题样式
  await excel.setCellValue(
    file,
    'Sheet1',
    'A1',
    '2024 年度预算执行报告',
    {
      font: { bold: true, size: 18, color: { argb: 'FF000080' } },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9D9D9' }
      },
      alignment: { horizontal: 'center', vertical: 'middle' }
    }
  )
  
  // 设置表头样式
  await excel.setCellValue(
    file,
    'Sheet1',
    'A2',
    '部门',
    {
      font: { bold: true, size: 12 },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      },
      alignment: { horizontal: 'center' }
    }
  )
  
  console.log('✅ 样式设置完成')
  console.log('📁 文件位置:', file)
}

// ========== 示例 4: 数据读取与分析 ==========
async function example4() {
  console.log('\n【示例 4】数据读取与分析')
  console.log('-'.repeat(50))
  
  // 先创建示例数据
  const sourceData = [
    ['产品', '地区', '销售额'],
    ['产品 A', '华北', 100000],
    ['产品 A', '华东', 150000],
    ['产品 A', '华南', 120000],
    ['产品 B', '华北', 80000],
    ['产品 B', '华东', 95000],
    ['产品 B', '华南', 88000],
  ]
  const sourceFile = path.join(OUTPUT_DIR, 'example4_source.xlsx')
  await writeExcel(sourceFile, sourceData)
  
  // 读取数据
  const data = await readExcel(sourceFile)
  const rows = data['Sheet1']
  
  // 计算每个产品的总销售额
  const productSales = {}
  for (let i = 1; i < rows.length; i++) {
    const [product, region, sales] = rows[i]
    if (!productSales[product]) {
      productSales[product] = 0
    }
    productSales[product] += sales
  }
  
  console.log('📊 产品销售统计:')
  for (const [product, total] of Object.entries(productSales)) {
    console.log(`   ${product}: ¥${total.toLocaleString()}`)
  }
  
  // 创建汇总报表
  const summaryData = [['产品', '总销售额']]
  for (const [product, total] of Object.entries(productSales)) {
    summaryData.push([product, total])
  }
  
  const summaryFile = path.join(OUTPUT_DIR, 'example4_summary.xlsx')
  await writeExcel(summaryFile, summaryData)
  console.log('\n✅ 汇总报表已创建:', summaryFile)
}

// ========== 示例 5: 批量生成报表 ==========
async function example5() {
  console.log('\n【示例 5】批量生成部门报表')
  console.log('-'.repeat(50))
  
  const departments = {
    '销售部': {
      data: [
        ['姓名', 'Q1', 'Q2', 'Q3', 'Q4'],
        ['张三', 120, 150, 180, 200],
        ['李四', 100, 130, 160, 190],
        ['王五', 90, 120, 140, 170],
      ],
      title: '销售部年度业绩'
    },
    '技术部': {
      data: [
        ['姓名', '项目数', 'Bug 数', '满意度'],
        ['赵六', 8, 12, '95%'],
        ['钱七', 6, 8, '98%'],
        ['孙八', 7, 10, '96%'],
      ],
      title: '技术部年度统计'
    },
    '市场部': {
      data: [
        ['姓名', '活动数', '参与人数', '转化率'],
        ['周九', 15, 3000, '12%'],
        ['吴十', 12, 2500, '15%'],
      ],
      title: '市场部活动总结'
    },
  }
  
  const excel = new ExcelService()
  
  for (const [dept, config] of Object.entries(departments)) {
    const file = path.join(OUTPUT_DIR, `example5_${dept}.xlsx`)
    await writeExcel(file, config.data)
    
    // 设置标题
    await excel.setCellValue(
      file,
      'Sheet1',
      'A1',
      config.title,
      {
        font: { bold: true, size: 16, color: { argb: 'FF006600' } },
        alignment: { horizontal: 'center' }
      }
    )
    
    console.log(`✅ ${dept} 报表已生成`)
  }
  
  console.log('\n📁 所有报表已保存到:', OUTPUT_DIR)
}

// ========== 运行所有示例 ==========
async function runAll() {
  try {
    await example1()
    await example2()
    await example3()
    await example4()
    await example5()
    
    console.log('\n' + '='.repeat(50))
    console.log('🎉 所有示例运行完成!')
    console.log('📂 输出目录:', OUTPUT_DIR)
    console.log('=' .repeat(50) + '\n')
  } catch (error) {
    console.error('\n❌ 示例运行失败:', error)
  }
}

runAll()
