# GitNexus Web - 快速开始

## 使用方式

### 分析 GitHub 仓库

```typescript
import { analyzeCodebase } from 'skills/gitnexus-web/src/index.ts'

const result = await analyzeCodebase({
  githubUrl: 'https://github.com/abhigyanpatwari/GitNexus'
})

if (result.success) {
  console.log('分析完成!')
  console.log('文件数:', result.fileCount)
  console.log('符号数:', result.symbolCount)
}
```

### 分析本地代码

```typescript
// 先打包成 ZIP
exec("Compress-Archive -Path ./my-project -DestinationPath ./code.zip")

const result = await analyzeCodebase({
  zipPath: './code.zip'
})
```

## 功能

- ✅ 代码知识图谱可视化
- ✅ 依赖关系追踪
- ✅ 调用链分析
- ✅ AI 代码问答
- ✅ 符号搜索

## 限制

- 浏览器模式最多处理 ~5000 个文件
- 大仓库建议用本地 CLI 模式

## 升级到 CLI 模式

如需分析大型仓库或集成到 AI 工作流：

```powershell
# 1. 安装 VS Build Tools
# https://visualstudio.microsoft.com/downloads/

# 2. 安装 GitNexus
npm install -g gitnexus

# 3. 分析仓库
npx gitnexus analyze

# 4. 启动 MCP 服务
npx gitnexus mcp
```
