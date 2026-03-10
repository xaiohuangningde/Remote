# CLI-Anything 快速开始

## 1. 安装依赖

```bash
# 确保 Python 3.10+ 已安装
python --version

# 安装 GIMP CLI (示例)
cd "D:/github PROJECT/CLI-Anything/gimp/agent-harness"
pip install -e .
```

## 2. 在 OpenClaw 中使用

```typescript
import { createCLIAnything } from 'skills/cli-anything/src/index.js'

const cli = createCLIAnything()

// 检查 GIMP CLI 是否可用
const available = await cli.isAvailable('gimp')
console.log('GIMP 可用:', available)

// 获取帮助
const help = await cli.getHelp('gimp')
console.log(help.output)
```

## 3. GIMP 示例

```typescript
// 创建 1920x1080 项目
await cli.gimpCreateProject(1920, 1080, 'poster.json')

// 添加背景图层
await cli.gimpAddLayer('Background', 'solid', '#1a1a2e')

// 导出为 PNG
await cli.execute('gimp', ['export', 'png', '-o', 'output.png'])
```

## 4. Blender 示例

```typescript
// 创建场景
await cli.blenderCreateScene('scene.json')

// 添加立方体
await cli.blenderAddObject('cube', [0, 0, 0])

// 渲染
await cli.execute('blender', ['render', '--output', 'render.png'])
```

## 支持的软件

- GIMP (图像编辑)
- Blender (3D 建模)
- Inkscape (矢量图形)
- Audacity (音频编辑)
- LibreOffice (办公套件)
- OBS Studio (直播录制)
- Kdenlive (视频编辑)
- Shotcut (视频编辑)
- Draw.io (流程图)

## 测试

```bash
npm test
```
