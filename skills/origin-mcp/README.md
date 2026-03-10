# origin-mcp - OriginPro Automated Plotting Skill

> MCP skill based on OriginLab's official `originpro` Python package for automated scientific plotting

## Features

### 📊 Chart Types
- Line plots
- Scatter plots
- Column/Bar charts
- Pie charts
- Contour plots
- 3D plots

### 📁 Data Operations
- Create worksheets
- Import CSV/Excel data
- Set/get column data
- Batch process multiple files

### 🎨 Chart Customization
- Set axis labels and titles
- Adjust axis ranges
- Switch log/linear scales
- Anti-aliasing rendering

### 📤 Export Formats
- PNG (default)
- JPG
- TIFF
- BMP
- PDF (project export)

## Installation

### Prerequisites

1. **Origin Software** (required)
   - Origin 2018 or higher
   - Download: https://www.originlab.com

2. **Python Environment**
   - Python 3.6+
   - `originpro` package installed

### Installation Steps

```bash
# 1. Install originpro package
pip install originpro

# 2. Verify installation
python -c "import originpro; print(originpro.org_ver())"

# 3. Install skill (OpenClaw)
npx skills add local:skills/origin-mcp
```

## Quick Start

### Example 1: Simple Line Plot

```python
from skills.origin-mcp.src import OriginService

# Create service
origin = OriginService()
await origin.start()

# Create plot
await origin.create_plot({
    "x": [1, 2, 3, 4, 5],
    "y": [2, 4, 6, 8, 10],
    "type": "line",
    "title": "My Plot",
    "xlabel": "Time (s)",
    "ylabel": "Value"
})

# Export
await origin.save_graph("output.png")
await origin.stop()
```

### Example 2: Import CSV and Plot

```python
from skills.origin-mcp.src import OriginService

origin = OriginService()
await origin.start()

# Import CSV
await origin.import_csv("data.csv", sheet_name="Data")

# Create plot
await origin.create_plot({
    "type": "scatter",
    "title": "Experimental Data"
})

# Export
await origin.save_graph("result.png")
await origin.stop()
```

### Example 3: Custom Axis

```python
origin = OriginService()
await origin.start()

# Create plot
await origin.create_plot({
    "x": [1, 10, 100, 1000],
    "y": [0.1, 0.5, 0.9, 0.99],
    "type": "line"
})

# Set log scale
await origin.set_scale(
    x_begin=1, x_end=1000,
    y_begin=0, y_end=1,
    x_log=True  # X axis log scale
)

# Set axis labels
await origin.set_axis(
    xlabel="Frequency (Hz)",
    ylabel="Response",
    title="Frequency Response"
)

await origin.save_graph("bode_plot.png")
await origin.stop()
```

### Example 4: Batch Processing

```python
origin = OriginService()
await origin.start()

# Batch process all CSV files in data/ folder
result = await origin.batch_plot({
    "input_folder": "data/",
    "pattern": "*.csv",
    "output_folder": "plots/",
    "plot_type": "line"
})

print(f"Processing complete: {result['success']}/{result['total']}")
await origin.stop()
```

### Example 5: Quick Function

```python
from skills.origin-mcp.src import quick_plot

# One-line plotting
result = await quick_plot(
    {"x": [1,2,3], "y": [1,4,9], "type": "scatter"},
    "output.png"
)
```

## API Reference

### Project Management

| Method | Description | Returns |
|--------|-------------|---------|
| `start()` | Start/connect to Origin | bool |
| `new_project()` | Create new project | Dict |
| `open_project(path)` | Open project file | Dict |
| `save_project(path)` | Save project | Dict |
| `close_project()` | Close project | bool |
| `stop()` | Exit Origin | bool |

### Worksheet Operations

| Method | Description | Returns |
|--------|-------------|---------|
| `create_sheet(name)` | Create worksheet | Dict |
| `set_data(col, data, axis)` | Set column data | Dict |
| `import_csv(file, sheet)` | Import CSV | Dict |
| `get_data(col)` | Get column data | Dict |

### Chart Operations

| Method | Description | Returns |
|--------|-------------|---------|
| `create_plot(data)` | Create plot | Dict |
| `add_plot(x, y, type)` | Add plot | Dict |
| `set_axis(xlabel, ylabel, title)` | Set axis labels | Dict |
| `set_scale(x_begin, x_end, ...)` | Set axis scale | Dict |
| `rescale()` | Rescale axes | Dict |

### Export

| Method | Description | Returns |
|--------|-------------|---------|
| `save_graph(path, dpi)` | Export image | Dict |
| `export_pdf(path)` | Export PDF | Dict |

### Batch Processing

| Method | Description | Returns |
|--------|-------------|---------|
| `batch_plot(config)` | Batch process CSV files | Dict |

## Chart Types

```python
# Supported chart types
plot_types = [
    "line",       # Line plot
    "scatter",    # Scatter plot
    "column",     # Column chart
    "bar",        # Bar chart
    "pie",        # Pie chart
    "contour",    # Contour plot
    "3d",         # 3D plot
]
```

## FAQ

### Q: `import originpro` fails

**A**: Make sure originpro package is installed:
```bash
pip install originpro
```

### Q: Origin won't start

**A**: Check:
1. Origin is properly installed
2. Origin version >= 2018
3. No stuck Origin processes (check Task Manager)

### Q: Chinese character garbling

**A**: Set Chinese font in Origin:
1. Tools → Options → Page
2. Set default font to one that supports Chinese

### Q: Exported image is blurry

**A**: Use higher DPI in save_graph:
```python
await origin.save_graph("output.png", dpi=600)
```

## Resources

- **Official Docs**: https://www.originlab.com/python/doc/originpro/
- **Sample Code**: https://github.com/originlab/Python-Samples
- **Graph Gallery**: https://www.originlab.com/www/products/graphgallery.aspx
- **Tutorials**: https://www.originlab.com/doc/Tutorials

## License

Apache-2.0
