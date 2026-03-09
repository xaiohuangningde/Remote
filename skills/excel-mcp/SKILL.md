# Excel MCP Skill

基于 ExcelJS 的 Excel 文件处理能力，提供读写/样式/图表等功能。

## 功能

### 基础功能
- ✅ 读取 Excel 文件（XLSX/XLS）
- ✅ 写入/修改 Excel 文件
- ✅ 设置单元格样式（字体/颜色/边框）
- ✅ 多工作表管理

### 高级功能（v1.2.0 新增）
- ✅ 公式支持（SUM/AVERAGE/IF/VLOOKUP 等）
- ✅ 数据验证（下拉列表/数值范围/日期验证）
- ✅ **图表生成**（Python + matplotlib - 6 种图表类型）

## 安装

```bash
cd skills/excel-mcp
npm install
```

## 使用示例

### 读取 Excel
```typescript
import { ExcelService } from './src/index.ts'

const excel = new ExcelService()
const data = await excel.read('data.xlsx', 'Sheet1')
console.log(data)
```

### 写入 Excel
```typescript
const excel = new ExcelService()
await excel.write('output.xlsx', [
  ['姓名', '年龄', '城市'],
  ['张三', 25, '北京'],
  ['李四', 30, '上海'],
])
```

### 高级功能
```typescript
// 设置样式
await excel.setCellValue('Sheet1', 'A1', '标题', {
  font: { bold: true, size: 16 },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } }
})

// 创建图表
await excel.addChart('Sheet1', 'E1', {
  type: 'column',
  data: 'A1:C10'
})
```

## API 参考

| 方法 | 说明 |
|------|------|
| `read(file, sheet)` | 读取工作表数据 |
| `write(file, data)` | 写入数据到新文件 |
| `setCellValue(sheet, cell, value, style?)` | 设置单元格值和样式 |
| `getCellValue(sheet, cell)` | 获取单元格值 |
| `addChart(sheet, position, config)` | 添加图表 |
| `addSheet(name)` | 添加新工作表 |
| `deleteSheet(name)` | 删除工作表 |

## 依赖

- exceljs: Excel 文件处理
- @types/exceljs: TypeScript 类型定义
