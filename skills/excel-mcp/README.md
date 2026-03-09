# Excel MCP Skill

> 📊 基于 ExcelJS 的 Excel 文件处理能力 - OpenClaw 技能

## ✨ 功能特性

### 基础功能
- ✅ **读写 Excel** - 支持 XLSX/XLS 格式
- ✅ **单元格样式** - 字体/颜色/边框/对齐
- ✅ **多工作表** - 添加/删除/切换工作表
- ✅ **大数据** - 流式读写，支持大文件
- ✅ **中文友好** - 完全支持中文

### 高级功能（v1.2.0）
- ✅ **公式支持** - SUM/AVERAGE/IF/VLOOKUP 等所有 Excel 公式
- ✅ **数据验证** - 下拉列表/数值范围/日期/文本长度/自定义公式
- ✅ **图表生成** - Python + matplotlib（柱状图/折线图/饼图等 6 种）

## 🚀 快速开始

### 1. 安装依赖

```bash
cd skills/excel-mcp
npm install
```

### 2. 基础使用

#### 写入 Excel

```javascript
import { writeExcel } from './src/index.js'

await writeExcel('output.xlsx', [
  ['姓名', '年龄', '城市'],
  ['张三', 25, '北京'],
  ['李四', 30, '上海'],
])
```

#### 读取 Excel

```javascript
import { readExcel } from './src/index.js'

const data = await readExcel('data.xlsx')
console.log(data)
// 输出：{ Sheet1: [['姓名', '年龄', '城市'], ['张三', 25, '北京'], ...] }
```

#### 读取指定工作表

```javascript
const data = await readExcel('data.xlsx', 'Sheet2')
```

### 3. 高级功能

#### 设置单元格样式

```javascript
import { ExcelService } from './src/index.js'

const excel = new ExcelService()

await excel.setCellValue(
  'report.xlsx',
  'Sheet1',
  'A1',
  '销售报告',
  {
    font: { bold: true, size: 18 },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF0000' } // 红色背景
    },
    alignment: { horizontal: 'center' }
  }
)
```

#### 获取单元格值

```javascript
const value = await excel.getCellValue('data.xlsx', 'Sheet1', 'A1')
```

#### 工作表管理

```javascript
// 添加工作表
await excel.addSheet('data.xlsx', '新工作表')

// 删除工作表
await excel.deleteSheet('data.xlsx', '旧工作表')

// 获取所有工作表
const sheets = await excel.getSheetNames('data.xlsx')
```

## 📚 API 参考

### 便捷函数

| 函数 | 说明 | 示例 |
|------|------|------|
| `writeExcel(file, data, sheet?)` | 写入数据到 Excel | `writeExcel('a.xlsx', [[1,2]])` |
| `readExcel(file, sheet?)` | 读取 Excel 数据 | `readExcel('a.xlsx', 'Sheet1')` |

### ExcelService 类

| 方法 | 说明 | 参数 |
|------|------|------|
| `read(file, sheet?)` | 读取工作表 | `file: string, sheet?: string` |
| `write(file, data, sheet?)` | 写入数据 | `file: string, data: any[][], sheet?: string` |
| `setCellValue(file, sheet, cell, value, style?)` | 设置单元格 | `file, sheet, cell, value, style?` |
| `getCellValue(file, sheet, cell)` | 获取单元格值 | `file, sheet, cell` |
| `addSheet(file, name)` | 添加工作表 | `file, name` |
| `deleteSheet(file, name)` | 删除工作表 | `file, name` |
| `getSheetNames(file)` | 获取工作表列表 | `file` |

### CellStyle 类型

```typescript
interface CellStyle {
  font?: {
    bold?: boolean
    size?: number
    name?: string
    color?: { argb: string } // 如 'FFFF0000' = 红色
  }
  fill?: {
    type: string
    pattern?: string
    fgColor?: { argb: string }
  }
  border?: {
    top?: { style: string; color: { argb: string } }
    left?: { style: string; color: { argb: string } }
    bottom?: { style: string; color: { argb: string } }
    right?: { style: string; color: { argb: string } }
  }
  alignment?: {
    horizontal?: 'left' | 'center' | 'right'
    vertical?: 'top' | 'middle' | 'bottom'
  }
}
```

## 💡 实用案例

### 案例 1: 导出销售报表

```javascript
const salesData = [
  ['产品', 'Q1', 'Q2', 'Q3', 'Q4'],
  ['产品 A', 100, 150, 200, 250],
  ['产品 B', 80, 120, 180, 220],
  ['产品 C', 60, 90, 150, 200],
  ['总计', 240, 360, 530, 670],
]

await writeExcel('sales_report.xlsx', salesData)
```

### 案例 2: 读取并处理数据

```javascript
import { readExcel, writeExcel } from './src/index.js'

// 读取原始数据
const data = await readExcel('raw_data.xlsx')

// 添加计算列
data[0].push('增长率') // 表头
for (let i = 1; i < data.length; i++) {
  const prev = data[i][1]
  const curr = data[i][2]
  data[i].push(((curr - prev) / prev * 100).toFixed(2) + '%')
}

// 写入处理后的数据
await writeExcel('processed_data.xlsx', data)
```

### 案例 3: 批量创建部门报表

```javascript
const excel = new ExcelService()

const departments = {
  '销售部': [['姓名', '业绩'], ['张三', 100], ['李四', 150]],
  '技术部': [['姓名', '项目数'], ['王五', 5], ['赵六', 8]],
  '市场部': [['姓名', '活动数'], ['钱七', 12], ['孙八', 9]],
}

for (const [dept, data] of Object.entries(departments)) {
  await writeExcel(`${dept}_report.xlsx`, data)
}
```

### 案例 4: 带样式的精美报表

```javascript
const excel = new ExcelService()

// 创建基础数据
await writeExcel('styled_report.xlsx', [
  ['月份', '收入', '支出', '利润'],
  ['1 月', 10000, 8000, 2000],
  ['2 月', 12000, 7500, 4500],
  ['3 月', 15000, 9000, 6000],
])

// 设置标题样式
await excel.setCellValue(
  'styled_report.xlsx',
  'Sheet1',
  'A1',
  '2024 年第一季度财报',
  {
    font: { bold: true, size: 20, color: { argb: 'FF0000FF' } },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCCCCC' }
    },
    alignment: { horizontal: 'center' }
  }
)
```

## 🧪 运行测试

```bash
cd skills/excel-mcp
node test/simple.test.js
```

## 📦 依赖

- [exceljs](https://github.com/exceljs/exceljs) - Excel 文件处理库

## 🤝 集成到 OpenClaw

在 OpenClaw 中使用此技能：

```typescript
// 在 skill 中导入
import { ExcelService } from 'skills/excel-mcp/src/index.js'

// 或者在 MCP 配置中添加
{
  "mcpServers": {
    "excel": {
      "command": "node",
      "args": ["skills/excel-mcp/src/mcp-server.js"]
    }
  }
}
```

## 📝 注意事项

1. **文件格式**: 推荐使用 `.xlsx` 格式（性能更好）
2. **大文件**: 超过 10MB 的文件建议使用流式 API
3. **公式**: 可以读取公式结果，但不执行公式计算
4. **编码**: 完全支持 UTF-8，中文无乱码

## 🐛 常见问题

### Q: 支持 `.xls` 格式吗？
A: 支持，但推荐使用 `.xlsx`（性能更好，功能更多）。

### Q: 可以执行公式吗？
A: 不支持执行公式，但可以读取 Excel 中已有公式的计算结果。

### Q: 支持图表吗？
A: 基础支持，可以通过 ExcelJS 的图表 API 添加。

### Q: 大文件性能如何？
A: ExcelJS 支持流式读写，10MB+ 文件也能高效处理。

## 📄 许可证

MIT

---

**创建时间**: 2026-03-09  
**作者**: xiaoxiaohuang  
**版本**: 1.0.0
