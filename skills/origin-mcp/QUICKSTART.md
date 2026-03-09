# origin-mcp 快速开始指南

## 前置要求

1. **安装 Origin** (必须)
   - Origin 2018 或更高版本
   - 下载地址：https://www.originlab.com
   - 学生版：https://www.originlab.com/StudentVersion

2. **Python 环境**
   - Python 3.6+
   - 可使用 Origin 内置 Python 或系统 Python

## 安装步骤

### 方法 1: 使用系统 Python

```bash
# 1. 安装 originpro 包
pip install originpro

# 2. 验证安装
python -c "import originpro; print(originpro.__version__)"
```

### 方法 2: 使用 Origin 内置 Python

Origin 2018+ 自带 Python，无需额外安装：

1. 打开 Origin
2. 菜单 → Scripting → Python Console
3. 输入 `import originpro` 验证

## 第一个图表

### 示例 1: 简单折线图

```python
from skills.origin-mcp.src import OriginService

async def main():
    # 创建服务
    origin = OriginService()
    
    # 启动 Origin
    await origin.start()
    
    # 创建图表
    await origin.create_plot({
        "x": [1, 2, 3, 4, 5],
        "y": [2, 4, 6, 8, 10],
        "type": "line",
        "title": "My First Plot",
        "xlabel": "X Axis",
        "ylabel": "Y Axis"
    })
    
    # 导出
    await origin.save_graph("output.png", dpi=600)
    
    # 停止
    await origin.stop()

# 运行
import asyncio
asyncio.run(main())
```

### 示例 2: 导入 CSV 绘图

```python
from skills.origin-mcp.src import OriginService

async def main():
    origin = OriginService()
    await origin.start()
    
    # 导入 CSV 并绘图
    await origin.import_and_plot({
        "csv_file": "data.csv",
        "x_col": 0,
        "y_col": 1,
        "plot_type": "scatter",
        "title": "My Data",
        "xlabel": "Time (s)",
        "ylabel": "Value"
    })
    
    await origin.save_graph("result.png", dpi=600)
    await origin.stop()

asyncio.run(main())
```

### 示例 3: 使用模板

```python
from skills.origin-mcp.src import OriginService

async def main():
    origin = OriginService()
    await origin.start()
    
    # 打开模板
    await origin.open_project("template.opju")
    
    # 替换数据
    ws = origin.get_sheet("Data1")
    ws.set_data(1, new_y_data)  # 更新 Y 列
    
    # 刷新图表
    await origin.refresh_graphs()
    
    # 导出
    await origin.save_graph("output.png", dpi=600)
    await origin.stop()

asyncio.run(main())
```

### 示例 4: 批量处理

```python
from skills.origin-mcp.src import OriginService

async def main():
    origin = OriginService()
    await origin.start()
    
    # 批量处理 data/ 文件夹下所有 CSV
    result = await origin.batch_plot({
        "input_folder": "data/",
        "pattern": "*.csv",
        "output_folder": "plots/"
    })
    
    print(f"处理完成：{result['success']}/{result['total']}")
    await origin.stop()

asyncio.run(main())
```

## 快捷函数

```python
from skills.origin-mcp.src import quick_plot, quick_import_plot

# 快速绘图
result = await quick_plot(
    {"x": [1,2,3], "y": [1,4,9], "type": "scatter"},
    "output.png"
)

# 快速导入 CSV 并绘图
result = await quick_import_plot("data.csv", "output.png")
```

## 常见问题

### Q: `import originpro` 失败

**A**: 确保已安装 originpro 包：
```bash
pip install originpro
```

### Q: Origin 无法启动

**A**: 检查：
1. Origin 是否正确安装
2. Origin 版本是否 >= 2018
3. 是否有 Origin 进程卡住（任务管理器中结束）

### Q: 中文乱码

**A**: 在 Origin 中设置中文字体：
1. Tools → Options → Page
2. 设置默认字体为支持中文的字体

### Q: 导出图片模糊

**A**: 提高 DPI：
```python
await origin.save_graph("output.png", dpi=600)  # 默认 600
```

## 下一步

- 📖 **完整文档**: README.md
- 💻 **示例代码**: test/test_origin.py
- 🌐 **官方教程**: https://www.originlab.com/doc/Tutorials

## 资源

- originpro API 文档：https://www.originlab.com/python/doc/originpro/
- 官方示例：https://github.com/originlab/Python-Samples
- 图表示例：https://www.originlab.com/www/products/graphgallery.aspx
