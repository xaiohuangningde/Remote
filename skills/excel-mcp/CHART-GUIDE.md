# Excel 图表生成完整指南

> 📊 使用 Python + matplotlib 生成高质量图表并插入 Excel

---

## 🎯 方案选择

### 为什么用 Python + matplotlib？

| 方案 | 优点 | 缺点 | 状态 |
|------|------|------|------|
| **Python + matplotlib** | 功能强大、无需编译、跨平台 | 需要 Python 环境 | ✅ **推荐** |
| Chart.js + Node.js | 纯 JS 实现 | 需要 canvas（Windows 编译困难） | ❌ 不推荐 |
| ExcelJS 原生 | 无需外部依赖 | 图表功能极其有限 | ⚠️ 仅占位符 |

---

## 📦 安装依赖

### 1. 检查 Python 环境

```bash
python --version  # 需要 Python 3.7+
```

### 2. 安装 Python 依赖

```bash
pip install matplotlib openpyxl pandas
```

### 3. 验证安装

```bash
python -c "import matplotlib; import openpyxl; import pandas; print('OK')"
```

---

## 🚀 快速开始

### 方式 1: 直接运行 Python 脚本

```bash
python skills/excel-mcp/src/chart-python.py \
  --input data.xlsx \
  --sheet Sheet1 \
  --range A1:C10 \
  --type column \
  --title "销售趋势" \
  --position E1 \
  --output result.xlsx
```

### 方式 2: 使用 JavaScript 封装

```javascript
import { createChart } from 'skills/excel-mcp/src/chart-wrapper.js'

await createChart(
  'data.xlsx',
  'Sheet1',
  'A1:C10',
  'column',
  {
    title: '销售趋势',
    position: 'E1'
  }
)
```

### 方式 3: 集成到 ExcelService

```javascript
import { ExcelService } from 'skills/excel-mcp/src/index.js'
import { PythonChartGenerator } from 'skills/excel-mcp/src/chart-wrapper.js'

const excel = new ExcelService()
const chartGen = new PythonChartGenerator()

// 1. 创建数据
await excel.write('sales.xlsx', [
  ['月份', '销售额', '利润'],
  ['1 月', 100, 20],
  ['2 月', 150, 35],
  ['3 月', 200, 45],
])

// 2. 生成图表
await chartGen.generateChart(
  'sales.xlsx',
  'Sheet1',
  'A1:C4',
  'column',
  {
    title: '月度销售趋势',
    position: 'E1'
  }
)
```

---

## 📊 图表类型

### 1. 柱状图 (Column Chart)

```bash
python chart-python.py \
  --input data.xlsx \
  --range A1:C10 \
  --type column \
  --title "销售对比" \
  --xlabel "月份" \
  --ylabel "金额" \
  --position E1
```

**适用场景**: 比较不同类别的数据

---

### 2. 条形图 (Bar Chart)

```bash
python chart-python.py \
  --input data.xlsx \
  --range A1:C10 \
  --type bar \
  --title "产品销售排名" \
  --position E1
```

**适用场景**: 比较多个项目，标签较长时

---

### 3. 折线图 (Line Chart)

```bash
python chart-python.py \
  --input data.xlsx \
  --range A1:C10 \
  --type line \
  --title "趋势变化" \
  --xlabel "时间" \
  --ylabel "数值" \
  --position E1
```

**适用场景**: 显示数据随时间变化趋势

---

### 4. 饼图 (Pie Chart)

```bash
python chart-python.py \
  --input data.xlsx \
  --range A1:B5 \
  --type pie \
  --title "占比分布" \
  --position E1
```

**适用场景**: 显示各部分占整体的比例

---

### 5. 散点图 (Scatter Plot)

```bash
python chart-python.py \
  --input data.xlsx \
  --range A1:B20 \
  --type scatter \
  --title "相关性分析" \
  --xlabel "X 轴" \
  --ylabel "Y 轴" \
  --position E1
```

**适用场景**: 显示两个变量的相关性

---

### 6. 面积图 (Area Chart)

```bash
python chart-python.py \
  --input data.xlsx \
  --range A1:C10 \
  --type area \
  --title "累积趋势" \
  --position E1
```

**适用场景**: 显示数量随时间变化的累积效果

---

## 💡 实战案例

### 案例 1: 销售报表（多图表）

```javascript
import { ExcelService } from 'skills/excel-mcp/src/index.js'
import { PythonChartGenerator } from 'skills/excel-mcp/src/chart-wrapper.js'

const excel = new ExcelService()
const chartGen = new PythonChartGenerator()

// 1. 创建销售数据
const salesData = [
  ['区域', 'Q1', 'Q2', 'Q3', 'Q4'],
  ['华北', 100, 120, 110, 130],
  ['华东', 150, 160, 170, 180],
  ['华南', 120, 130, 140, 150],
  ['华西', 90, 95, 100, 105],
]

await excel.write('sales_report.xlsx', salesData)

// 2. 生成柱状图 - 季度对比
await chartGen.generateChart(
  'sales_report.xlsx',
  'Sheet1',
  'A1:E5',
  'column',
  {
    title: '季度销售对比',
    position: 'G1',
    width: 12,
    height: 7
  }
)

// 3. 生成折线图 - 趋势分析
await chartGen.generateChart(
  'sales_report.xlsx',
  'Sheet1',
  'A1:E5',
  'line',
  {
    title: '销售趋势分析',
    position: 'G25',
    width: 12,
    height: 7
  }
)

console.log('✅ 销售报表完成，包含 2 个图表')
```

---

### 案例 2: 财务报表（饼图 + 柱状图）

```javascript
const excel = new ExcelService()
const chartGen = new PythonChartGenerator()

// 创建数据
const financeData = [
  ['项目', '金额', '占比'],
  ['销售收入', 1000, null],
  ['成本', 600, null],
  ['毛利', 400, null],
  ['费用', 200, null],
  ['利润', 200, null],
]

await excel.write('finance.xlsx', financeData)

// 生成饼图 - 成本结构
await chartGen.generateChart(
  'finance.xlsx',
  'Sheet1',
  'A1:B6',
  'pie',
  {
    title: '财务结构分布',
    position: 'D1'
  }
)

// 生成柱状图 - 利润分析
await chartGen.generateChart(
  'finance.xlsx',
  'Sheet1',
  'A1:B6',
  'column',
  {
    title: '财务数据对比',
    position: 'D20'
  }
)
```

---

### 案例 3: 批量生成图表

```javascript
const chartGen = new PythonChartGenerator()

const charts = [
  {
    sheet: 'Sheet1',
    range: 'A1:C10',
    type: 'column',
    options: { title: '销售对比', position: 'E1' }
  },
  {
    sheet: 'Sheet1',
    range: 'A1:C10',
    type: 'line',
    options: { title: '趋势分析', position: 'E20' }
  },
  {
    sheet: 'Sheet2',
    range: 'A1:B5',
    type: 'pie',
    options: { title: '占比分布', position: 'E1' }
  }
]

const results = await chartGen.generateCharts('report.xlsx', charts)

results.forEach((result, i) => {
  if (result.success) {
    console.log(`✅ 图表 ${i+1} 生成成功`)
  } else {
    console.log(`❌ 图表 ${i+1} 生成失败：${result.error}`)
  }
})
```

---

## 🔧 高级配置

### 自定义图表样式

```python
# 在 chart-python.py 中修改
fig, ax = plt.subplots(figsize=(12, 8), dpi=150)  # 更高分辨率

# 设置中文字体
plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei']
plt.rcParams['axes.unicode_minus'] = False

# 自定义颜色
colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A']
ax.bar(x, y, color=colors)
```

### 调整图表大小

```javascript
await chartGen.generateChart(filePath, sheet, range, 'column', {
  width: 14,   // 英寸
  height: 8,   // 英寸
  position: 'E1'
})
```

### 多数据集图表

```javascript
// Excel 数据格式：
// 月份 | 产品 A | 产品 B | 产品 C
// 1 月  | 100    | 120    | 90
// 2 月  | 110    | 130    | 95

// 自动生成多条柱状/折线
await chartGen.generateChart('data.xlsx', 'Sheet1', 'A1:D13', 'column', {
  title: '多产品对比'
})
```

---

## ⚠️ 常见问题

### Q1: 中文乱码

**解决**:
```python
plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'Arial Unicode MS']
plt.rcParams['axes.unicode_minus'] = False
```

### Q2: Windows 编码错误

**解决**:
```python
import sys
sys.stdout.reconfigure(encoding='utf-8')
```

### Q3: 依赖缺失

**解决**:
```bash
pip install --upgrade matplotlib openpyxl pandas
```

### Q4: 图表位置不对

**解决**: 检查 position 参数格式（如 'E1'），确保列字母大写

### Q5: 数据范围解析错误

**解决**: 确保 range 格式正确（如 'A1:C10'），包含表头

---

## 📚 API 参考

### Python 脚本参数

| 参数 | 必需 | 说明 | 默认值 |
|------|------|------|--------|
| `--input` | ✅ | 输入 Excel 文件 | - |
| `--sheet` | ❌ | 工作表名称 | Sheet1 |
| `--range` | ✅ | 数据范围 | - |
| `--type` | ✅ | 图表类型 | - |
| `--title` | ❌ | 图表标题 | - |
| `--xlabel` | ❌ | X 轴标签 | - |
| `--ylabel` | ❌ | Y 轴标签 | - |
| `--position` | ❌ | 插入位置 | E1 |
| `--output` | ❌ | 输出文件 | 覆盖原文件 |
| `--width` | ❌ | 图表宽度 | 10 |
| `--height` | ❌ | 图表高度 | 6 |

### JavaScript 封装

```javascript
const chartGen = new PythonChartGenerator(pythonPath?)

// 单个图表
await chartGen.generateChart(filePath, sheet, range, type, options)

// 批量图表
await chartGen.generateCharts(filePath, [chartConfig1, chartConfig2])

// 检查环境
const status = await chartGen.checkPythonEnv()
```

---

## 🎯 最佳实践

### 1. 数据准备
- 第一行作为表头（标签）
- 第一列作为 X 轴标签
- 其他列作为数据集

### 2. 图表选择
- 比较数据 → 柱状图/条形图
- 显示趋势 → 折线图/面积图
- 展示占比 → 饼图/圆环图
- 分析相关性 → 散点图

### 3. 样式优化
- 添加清晰的标题
- 标注坐标轴含义
- 多图时添加图例
- 选择合适的大小

### 4. 性能考虑
- 大数据集时降低 dpi
- 批量生成时用并行
- 及时清理临时文件

---

## 📝 更新日志

### v1.2.0 (2026-03-09)
- ✅ Python + matplotlib 图表生成
- ✅ 支持 6 种图表类型
- ✅ JavaScript 封装
- ✅ 批量生成支持
- ✅ 中文完美支持

### v1.1.0 (2026-03-09)
- ✅ 公式支持
- ✅ 数据验证
- ✅ 图表占位符

### v1.0.0 (2026-03-09)
- ✅ 基础读写功能
- ✅ 样式设置
- ✅ 多工作表管理

---

**创建时间**: 2026-03-09  
**版本**: 1.2.0  
**状态**: ✅ 测试通过
