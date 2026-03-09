# Excel MCP 高级功能指南

> 📊 公式 | 数据验证 | 图表（占位符）

---

## 🧮 公式支持

### 基础公式

```javascript
import { ExcelService } from 'skills/excel-mcp/src/index.js'

const excel = new ExcelService()

// 设置单个公式
await excel.setFormula('data.xlsx', 'Sheet1', 'C1', 'A1+B1')
await excel.setFormula('data.xlsx', 'Sheet1', 'C2', 'A2*B2')
```

### 常用公式示例

```javascript
// 求和
await excel.setFormula(file, 'Sheet1', 'D1', 'SUM(A1:A10)')

// 平均值
await excel.setFormula(file, 'Sheet1', 'D2', 'AVERAGE(A1:A10)')

// 计数
await excel.setFormula(file, 'Sheet1', 'D3', 'COUNT(A1:A10)')

// 最大值
await excel.setFormula(file, 'Sheet1', 'D4', 'MAX(A1:A10)')

// 最小值
await excel.setFormula(file, 'Sheet1', 'D5', 'MIN(A1:A10)')

// 条件求和
await excel.setFormula(file, 'Sheet1', 'D6', 'SUMIF(A1:A10, ">100")')

// 条件计数
await excel.setFormula(file, 'Sheet1', 'D7', 'COUNTIF(A1:A10, ">100")')

// VLOOKUP
await excel.setFormula(file, 'Sheet1', 'E1', 'VLOOKUP(A1, Sheet2!A:B, 2, FALSE)')

// IF 条件
await excel.setFormula(file, 'Sheet1', 'F1', 'IF(A1>100, "达标", "未达标")')
```

### 批量设置公式

```javascript
await excel.setFormulas('data.xlsx', 'Sheet1', [
  { cell: 'C1', formula: 'A1*B1' },
  { cell: 'C2', formula: 'A2*B2' },
  { cell: 'C3', formula: 'A3*B3' },
  { cell: 'C10', formula: 'SUM(C1:C9)' },
])
```

### 获取公式结果

```javascript
const result = await excel.getFormulaResult('data.xlsx', 'Sheet1', 'C1')
console.log('公式:', result.formula)  // 'A1*B1'
console.log('结果:', result.result)   // 计算结果（需要在 Excel 中打开才能看到）
```

---

## ✅ 数据验证

### 创建下拉列表

```javascript
// 简单下拉列表
await excel.createDropdown(
  'data.xlsx',
  'Sheet1',
  'B2:B10',
  ['选项 1', '选项 2', '选项 3', '选项 4']
)

// 部门选择
await excel.createDropdown(
  'data.xlsx',
  'Sheet1',
  'C2:C100',
  ['销售部', '技术部', '市场部', '人事部', '财务部']
)
```

### 数值范围验证

```javascript
// 整数范围（1-100）
await excel.addDataValidation('data.xlsx', 'Sheet1', 'D2:D100', {
  type: 'whole',
  formulas: ['1', '100'],
  allowBlank: false,
  showErrorMessage: true,
  error: {
    title: '数值无效',
    message: '请输入 1-100 之间的整数'
  }
})

// 小数范围（0.0-1.0）
await excel.addDataValidation('data.xlsx', 'Sheet1', 'E2:E100', {
  type: 'decimal',
  formulas: ['0.0', '1.0'],
  showErrorMessage: true,
  error: {
    message: '请输入 0.0-1.0 之间的小数'
  }
})
```

### 日期验证

```javascript
// 日期范围
await excel.addDataValidation('data.xlsx', 'Sheet1', 'F2:F100', {
  type: 'date',
  formulas: ['DATE(2024,1,1)', 'DATE(2024,12,31)'],
  showErrorMessage: true,
  error: {
    title: '日期无效',
    message: '请输入 2024 年的日期'
  }
})

// 日期大于今天
await excel.addDataValidation('data.xlsx', 'Sheet1', 'G2:G100', {
  type: 'date',
  operator: 'greaterThan',
  formulas: ['TODAY()'],
  error: {
    message: '日期必须晚于今天'
  }
})
```

### 文本长度验证

```javascript
// 手机号长度（11 位）
await excel.addDataValidation('data.xlsx', 'Sheet1', 'H2:H100', {
  type: 'textLength',
  formulas: ['11', '11'],
  error: {
    message: '手机号必须是 11 位数字'
  }
})

// 姓名长度（2-20 字符）
await excel.addDataValidation('data.xlsx', 'Sheet1', 'I2:I100', {
  type: 'textLength',
  formulas: ['2', '20'],
  error: {
    message: '姓名长度必须在 2-20 字符之间'
  }
})
```

### 自定义公式验证

```javascript
// 唯一值验证
await excel.addDataValidation('data.xlsx', 'Sheet1', 'J2:J100', {
  type: 'custom',
  formulas: ['COUNTIF($J$2:$J$100, J2)=1'],
  error: {
    message: '此值必须唯一'
  }
})

// 必须包含特定文本
await excel.addDataValidation('data.xlsx', 'Sheet1', 'K2:K100', {
  type: 'custom',
  formulas: ['ISNUMBER(SEARCH("ABC", K2))'],
  error: {
    message: '必须包含 "ABC" 字样'
  }
})
```

---

## 📊 图表功能

### ⚠️ 重要说明

ExcelJS 的图表功能有限，当前实现采用**占位符 + 数据准备**方案：

1. **占位符标记**：在指定位置添加图表标记
2. **数据范围**：标明图表使用的数据范围
3. **后续处理**：使用 Excel 或其他工具生成实际图表

### 使用方式

```javascript
// 添加图表占位符
await excel.addChart('data.xlsx', 'Sheet1', 'E1', {
  type: 'column',      // 图表类型：column, bar, line, pie, scatter
  dataRange: 'A1:C10', // 数据范围
  title: '销售趋势'    // 图表标题
})
```

### 推荐的图表生成方案

#### 方案 1: 使用 Excel 手动生成
1. 打开生成的 Excel 文件
2. 选择数据范围
3. 插入 → 选择图表类型
4. 调整位置和样式

#### 方案 2: 使用 Chart.js + 图片插入
```javascript
// 1. 用 Chart.js 生成图表图片
// 2. 使用 ExcelJS 插入图片到工作表
import ExcelJS from 'exceljs'

const workbook = new ExcelJS.Workbook()
await workbook.xlsx.readFile('data.xlsx')
const worksheet = workbook.getWorksheet('Sheet1')

// 读取图表图片
const imageId = workbook.addImage({
  buffer: fs.readFileSync('chart.png'),
  extension: 'png',
})

// 插入到指定位置
worksheet.addImage(imageId, {
  tl: { col: 4, row: 0 }, // E1
  ext: { width: 400, height: 300 }
})

await workbook.xlsx.writeFile('data_with_chart.xlsx')
```

#### 方案 3: 使用 Python + matplotlib
```python
import matplotlib.pyplot as plt
import pandas as pd

# 读取数据
df = pd.read_excel('data.xlsx')

# 生成图表
plt.figure(figsize=(10, 6))
plt.bar(df['月份'], df['销售额'])
plt.title('销售趋势')
plt.savefig('chart.png')

# 插入到 Excel
from openpyxl import load_workbook
from openpyxl.drawing.image import Image

wb = load_workbook('data.xlsx')
ws = wb.active
img = Image('chart.png')
ws.add_image(img, 'E1')
wb.save('data_with_chart.xlsx')
```

### 图表类型参考

| 类型 | 说明 | 适用场景 |
|------|------|----------|
| `column` | 柱状图 | 比较不同类别的数据 |
| `bar` | 条形图 | 比较多个项目 |
| `line` | 折线图 | 显示趋势变化 |
| `pie` | 饼图 | 显示占比关系 |
| `scatter` | 散点图 | 显示相关性 |
| `area` | 面积图 | 显示数量变化趋势 |
| `doughnut` | 圆环图 | 多组数据占比 |

---

## 💡 实战案例

### 案例 1: 销售报表（公式 + 图表）

```javascript
import { ExcelService } from 'skills/excel-mcp/src/index.js'

const excel = new ExcelService()

// 创建数据
const data = [
  ['区域', 'Q1', 'Q2', 'Q3', 'Q4', '总计', '增长率'],
  ['华北', 100, 120, 110, 130, null, null],
  ['华东', 150, 160, 170, 180, null, null],
  ['华南', 120, 130, 140, 150, null, null],
  ['华西', 90, 95, 100, 105, null, null],
]

await excel.write('sales_report.xlsx', data)

// 设置总计公式
await excel.setFormulas('sales_report.xlsx', 'Sheet1', [
  { cell: 'F2', formula: 'SUM(B2:E2)' },
  { cell: 'F3', formula: 'SUM(B3:E3)' },
  { cell: 'F4', formula: 'SUM(B4:E4)' },
  { cell: 'F5', formula: 'SUM(B5:E5)' },
])

// 设置增长率公式
await excel.setFormulas('sales_report.xlsx', 'Sheet1', [
  { cell: 'G2', formula: '(E2-B2)/B2' },
  { cell: 'G3', formula: '(E3-B3)/B3' },
  { cell: 'G4', formula: '(E4-B4)/B4' },
  { cell: 'G5', formula: '(E5-B5)/B5' },
])

// 添加图表占位符
await excel.addChart('sales_report.xlsx', 'Sheet1', 'H1', {
  type: 'column',
  dataRange: 'A1:E5',
  title: '季度销售对比'
})

console.log('✅ 销售报表已生成，可用 Excel 打开并插入实际图表')
```

### 案例 2: 员工信息表（数据验证）

```javascript
const excel = new ExcelService()

// 创建表头
const data = [
  ['姓名', '部门', '职级', '入职日期', '手机号', '邮箱'],
  [null, null, null, null, null, null],
]

await excel.write('employees.xlsx', data)

// 部门下拉列表
await excel.createDropdown('employees.xlsx', 'Sheet1', 'B2:B100', [
  '销售部', '技术部', '市场部', '人事部', '财务部', '运营部'
])

// 职级下拉列表
await excel.createDropdown('employees.xlsx', 'Sheet1', 'C2:C100', [
  'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'
])

// 入职日期验证（2020 年以后）
await excel.addDataValidation('employees.xlsx', 'Sheet1', 'D2:D100', {
  type: 'date',
  formulas: ['DATE(2020,1,1)', 'TODAY()'],
  error: { message: '入职日期必须在 2020 年之后' }
})

// 手机号验证（11 位数字）
await excel.addDataValidation('employees.xlsx', 'Sheet1', 'E2:E100', {
  type: 'textLength',
  formulas: ['11', '11'],
  error: { message: '手机号必须是 11 位数字' }
})

// 邮箱格式验证（自定义公式）
await excel.addDataValidation('employees.xlsx', 'Sheet1', 'F2:F100', {
  type: 'custom',
  formulas: ['ISNUMBER(SEARCH("@", F2))'],
  error: { message: '请输入有效的邮箱地址' }
})

console.log('✅ 员工信息表已创建，包含完整的数据验证')
```

### 案例 3: 财务报表（复杂公式）

```javascript
const excel = new ExcelService()

// 创建数据
const data = [
  ['项目', '1 月', '2 月', '3 月', 'Q1 合计', '占比'],
  ['收入', 100000, 120000, 115000, null, null],
  ['成本', 60000, 65000, 62000, null, null],
  ['毛利', null, null, null, null, null],
  ['毛利率', null, null, null, null, null],
]

await excel.write('financial_report.xlsx', data)

// 计算毛利
await excel.setFormulas('financial_report.xlsx', 'Sheet1', [
  { cell: 'B3', formula: 'B1-B2' },
  { cell: 'C3', formula: 'C1-C2' },
  { cell: 'D3', formula: 'D1-D2' },
])

// 计算 Q1 合计
await excel.setFormulas('financial_report.xlsx', 'Sheet1', [
  { cell: 'E1', formula: 'SUM(B1:D1)' },
  { cell: 'E2', formula: 'SUM(B2:D2)' },
  { cell: 'E3', formula: 'SUM(B3:D3)' },
])

// 计算毛利率
await excel.setFormulas('financial_report.xlsx', 'Sheet1', [
  { cell: 'B4', formula: 'B3/B1' },
  { cell: 'C4', formula: 'C3/C1' },
  { cell: 'D4', formula: 'D3/D1' },
  { cell: 'E4', formula: 'E3/E1' },
])

// 计算占比
await excel.setFormulas('financial_report.xlsx', 'Sheet1', [
  { cell: 'F1', formula: 'E1/SUM($E$1:$E$2)' },
  { cell: 'F2', formula: 'E2/SUM($E$1:$E$2)' },
])

// 设置百分比格式
await excel.setCellValue('financial_report.xlsx', 'Sheet1', 'B4', 
  { formula: 'B3/B1' },
  { numFmt: '0.00%' }
)

console.log('✅ 财务报表已生成，包含完整的公式计算')
```

---

## 🔧 注意事项

### 公式
- ✅ 支持所有 Excel 标准公式
- ⚠️ 公式结果需要在 Excel 中打开才能看到
- ⚠️ 不支持自定义 VBA 函数

### 数据验证
- ✅ 支持所有标准验证类型
- ✅ 支持自定义公式验证
- ⚠️ 某些复杂验证可能需要 Excel 2016+

### 图表
- ⚠️ ExcelJS 图表功能有限
- ✅ 提供占位符和数据范围标记
- 💡 推荐使用 Excel 手动生成或使用其他库

---

## 📚 相关资源

- [Excel 公式大全](https://support.microsoft.com/excel)
- [ExcelJS 文档](https://github.com/exceljs/exceljs)
- [Chart.js](https://www.chartjs.org/)
- [matplotlib](https://matplotlib.org/)

---

**更新时间**: 2026-03-09  
**版本**: 1.1.0 (高级功能)
