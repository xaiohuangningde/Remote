---
name: cli-anything
version: "1.0.0"
description: AI Agent 可控 CLI 工具生成器。支持 GIMP/Blender/Inkscape/Audacity/LibreOffice/OBS 等软件的自动化操作。
metadata:
  openclaw:
    emoji: 🛠️
    requires:
      - Python 3.10+
      - CLI-Anything project (D:/github PROJECT/CLI-Anything)
---

# CLI-Anything Skill

将任何 GUI 软件转换为 AI Agent 可控的 CLI 工具。

## 功能

- ✅ 支持 9 种主流创作软件
- ✅ TypeScript 封装，类型安全
- ✅ 自动安装和检测
- ✅ 专用方法简化常用操作

## 支持的软件

| 软件 | CLI 命令 | 状态 |
|------|----------|------|
| GIMP | cli-anything-gimp | 🟡 需安装 |
| Blender | cli-anything-blender | 🟡 需安装 |
| Inkscape | cli-anything-inkscape | 🟡 需安装 |
| Audacity | cli-anything-audacity | 🟡 需安装 |
| LibreOffice | cli-anything-libreoffice | 🟡 需安装 |
| OBS Studio | cli-anything-obs-studio | 🟡 需安装 |
| Kdenlive | cli-anything-kdenlive | 🟡 需安装 |
| Shotcut | cli-anything-shotcut | 🟡 需安装 |
| Draw.io | cli-anything-drawio | 🟡 需安装 |

## 使用方式

### TypeScript 导入

```typescript
import { createCLIAnything } from 'skills/cli-anything/src/index.ts'

const cli = createCLIAnything()

// 获取支持的软件列表
const software = await cli.getSupportedSoftware()

// 安装 GIMP CLI
await cli.install('gimp')

// 执行命令
const result = await cli.execute('gimp', ['--help'])
```

### GIMP 示例

```typescript
// 创建新项目 (1920x1080)
await cli.gimpCreateProject(1920, 1080, 'poster.json')

// 添加图层
await cli.gimpAddLayer('Background', 'solid', '#1a1a2e')

// 导出
await cli.execute('gimp', ['export', 'png', '-o', 'output.png'])
```

### Blender 示例

```typescript
// 创建场景
await cli.blenderCreateScene('scene.json')

// 添加立方体
await cli.blenderAddObject('cube', [0, 0, 0])

// 渲染
await cli.execute('blender', ['render', '--output', 'render.png'])
```

## 安装依赖

```bash
# 1. 确保 Python 3.10+ 已安装
python --version

# 2. 安装 GIMP CLI (示例)
cd "D:/github PROJECT/CLI-Anything/gimp/agent-harness"
pip install -e .

# 3. 验证安装
cli-anything-gimp --help
```

## API 参考

| 方法 | 说明 |
|------|------|
| `getSupportedSoftware()` | 获取支持的软件列表 |
| `install(software)` | 安装指定软件的 CLI |
| `execute(software, args)` | 执行 CLI 命令 |
| `isAvailable(software)` | 检查 CLI 是否可用 |
| `getHelp(software)` | 获取帮助信息 |
| `gimpCreateProject(w, h, output)` | GIMP: 创建项目 |
| `gimpAddLayer(name, type, color)` | GIMP: 添加图层 |
| `blenderCreateScene(output)` | Blender: 创建场景 |
| `blenderAddObject(type, loc)` | Blender: 添加对象 |

## 前置要求

- Python 3.10+
- click >= 8.0.0
- Pillow >= 10.0.0
- 目标软件已安装 (如 GIMP、Blender 等)

```bash
pip install click pytest Pillow
```

## 项目位置

- CLI-Anything: `D:/github PROJECT/CLI-Anything/`
- OpenClaw Skill: `skills/cli-anything/`
