# origin-mcp - OriginPro 自动化绘图技能

## 描述

基于 OriginLab 官方 `originpro` Python 包的 MCP 技能，用于自动化科研绘图。

## 功能

- ✅ 创建 2D/3D 图表（折线图、散点图、柱状图、等高线图等）
- ✅ 导入/导出数据（CSV、Excel、TXT）
- ✅ 自定义图表样式（轴标签、标题、图例、颜色）
- ✅ 数据分析和拟合（线性拟合、峰值分析）
- ✅ 批量处理（多文件自动绘图）
- ✅ 模板复用（打开 .opju 模板替换数据）

## 依赖

- Origin 2018+ (必须已安装)
- Python 3.6+
- originpro 包

## 安装

```bash
# 安装 skill
npx skills add local:skills/origin-mcp

# 安装 Python 依赖
pip install originpro
```

## 使用方式

### 1. 基础绘图

```python
from skills.origin-mcp.src import OriginService

origin = OriginService()
await origin.start()

# 创建图表
result = await origin.create_plot({
    "data": {"x": [1,2,3,4,5], "y": [2,4,6,8,10]},
    "type": "line",
    "title": "My Plot",
    "xlabel": "X Axis",
    "ylabel": "Y Axis"
})

await origin.save("output.png")
```

### 2. 导入 CSV 绘图

```python
result = await origin.import_and_plot({
    "csv_file": "data.csv",
    "x_col": 0,
    "y_col": 1,
    "plot_type": "scatter"
})
```

### 3. 使用模板

```python
await origin.open_template("template.opju")
await origin.replace_data({"Y": new_data})
await origin.refresh()
await origin.export("result.png")
```

### 4. 批量处理

```python
await origin.batch_plot({
    "input_folder": "data/",
    "pattern": "*.csv",
    "output_folder": "plots/"
})
```

## 配置

在 `.env` 或代码中配置：

```python
{
    "origin_path": "C:\\Program Files\\OriginLab\\Origin2024\\Origin.exe",  # 可选
    "timeout": 60000,  # 超时时间 (ms)
}
```

## 注意事项

1. 必须先安装 Origin 软件
2. Origin 仅支持 Windows
3. 首次运行可能需要启动 Origin

## 资源

- 官方文档：https://www.originlab.com/python/doc/originpro/
- 示例代码：https://github.com/originlab/Python-Samples

## License

Apache-2.0
