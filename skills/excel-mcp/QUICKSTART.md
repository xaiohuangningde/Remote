# Excel MCP - 快速开始

## 1. 安装依赖

```bash
cd skills/excel-mcp
npm install
```

## 2. 基础使用

### 创建 Excel 文件

```typescript
import { writeExcel } from './src/index.ts'

await writeExcel('output.xlsx', [
  ['姓名', '年龄', '城市'],
  ['张三', 25, '北京'],
  ['李四', 30, '上海'],
  ['王五', 28, '广州'],
])
```

### 读取 Excel 文件

```typescript
import { readExcel } from './src/index.ts'

const data = await readExcel('data.xlsx')
console.log(data)
// 输出：[['姓名', '年龄', '城市'], ['张三', 25, '北京'], ...]
```

### 读取指定工作表

```typescript
const data = await readExcel('data.xlsx', 'Sheet2')
```

## 3. 高级功能

### 设置单元格样式

```typescript
import { ExcelService } from './src/index.ts'

const excel = new ExcelService()

await excel.setCellValue(
  'report.xlsx',
  'Sheet1',
  'A1',
  '销售报告',
  {
    font: { bold: true, size: 18, name: '微软雅黑' },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF0000' } // 红色背景
    },
    alignment: { horizontal: 'center', vertical: 'middle' }
  }
)
```

### 获取单元格值

```typescript
const value = await excel.getCellValue('data.xlsx', 'Sheet1', 'A1')
console.log(value)
```

### 添加工作表

```typescript
await excel.addSheet('data.xlsx', '新工作表')
```

### 删除工作表

```typescript
await excel.deleteSheet('data.xlsx', '旧工作表')
```

### 获取所有工作表名称

```typescript
const sheets = await excel.getSheetNames('data.xlsx')
console.log(sheets) // ['Sheet1', 'Sheet2', ...]
```

## 4. 实际案例

### 案例 1: 导出销售数据

```typescript
import { writeExcel } from './src/index.ts'

const salesData = [
  ['产品', 'Q1', 'Q2', 'Q3', 'Q4'],
  ['产品 A', 100, 150, 200, 250],
  ['产品 B', 80, 120, 180, 220],
  ['产品 C', 60, 90, 150, 200],
]

await writeExcel('sales_report.xlsx', salesData)
```

### 案例 2: 读取并处理数据

```typescript
import { readExcel, writeExcel } from './src/index.ts'

// 读取原始数据
const data = await readExcel('raw_data.xlsx')

// 处理数据（示例：添加总计行）
const lastRow = data[data.length - 1]
const totalRow = ['总计']
for (let i = 1; i < lastRow.length; i++) {
  totalRow[i] = (lastRow[i] || 0) + (data[data.length - 2][i] || 0)
}
data.push(totalRow)

// 写入处理后的数据
await writeExcel('processed_data.xlsx', data)
```

### 案例 3: 批量创建报表

```typescript
import { ExcelService } from './src/index.ts'

const excel = new ExcelService()

// 为每个部门创建单独的工作表
const departments = ['销售部', '技术部', '市场部']
const data = {
  '销售部': [['姓名', '业绩'], ['张三', 100], ['李四', 150]],
  '技术部': [['姓名', '项目数'], ['王五', 5], ['赵六', 8]],
  '市场部': [['姓名', '活动数'], ['钱七', 12], ['孙八', 9]],
}

await excel.create('department_report.xlsx')

for (const dept of departments) {
  await excel.write('department_report.xlsx', data[dept], dept)
}
```

## 5. 常见问题

### Q: 支持哪些 Excel 格式？
A: 支持 `.xlsx` 和 `.xls` 格式。

### Q: 可以读取公式吗？
A: 可以读取公式的计算结果，但不支持执行公式。

### Q: 支持图表吗？
A: 支持添加基础图表（柱状图/折线图/饼图等），通过 `addChart` 方法。

### Q: 大文件性能如何？
A: ExcelJS 支持流式读写，适合处理大文件（10MB+）。

### Q: 支持中文吗？
A: 完全支持中文，包括中文文件名、工作表名、单元格内容。

---

**更多示例**: 查看 `test/` 目录中的测试用例
