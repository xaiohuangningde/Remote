# GitNexus Web - 代码知识图谱分析

> 通过 GitNexus Web UI 分析代码库，生成知识图谱

## 状态

- **类型**: 浏览器自动化
- **URL**: https://gitnexus.vercel.app
- **依赖**: browser 工具
- **状态**: ✅ 可用

## 使用方式

### 1. 分析 GitHub 仓库

```typescript
// 直接分析 GitHub 仓库
browser.open("https://gitnexus.vercel.app")
browser.act(targetId, {
  kind: "click",
  ref: "github-url-tab"
})
browser.act(targetId, {
  kind: "type",
  ref: "github-url-input",
  text: "https://github.com/owner/repo"
})
```

### 2. 分析本地代码（ZIP）

```typescript
// 打包代码为 ZIP
exec("Compress-Archive -Path . -DestinationPath code.zip")

// 上传并分析
browser.upload(targetId, {
  paths: ["code.zip"]
})
```

### 3. 连接本地服务（如有 CLI）

```typescript
// 启动本地 GitNexus 服务
exec("npx gitnexus serve")

// Web UI 自动检测并连接
browser.open("https://gitnexus.vercel.app")
```

## 功能

| 功能 | 说明 |
|------|------|
| 知识图谱可视化 | 查看代码依赖、调用链、集群 |
| AI 对话 | 询问代码结构、影响分析 |
| 符号搜索 | 查找函数、类、变量的定义和引用 |
| 影响分析 | 查看修改会波及哪些代码 |

## 限制

- 浏览器模式受内存限制（约 5k 文件）
- 大仓库建议使用本地 CLI 模式
- 需要手动操作上传（浏览器自动化限制）

## 替代方案

如需完全自动化，建议：
1. 安装 VS Build Tools
2. 运行 `npm install -g gitnexus`
3. 使用 MCP 工具集成

## 相关文件

- `skills/gitnexus-web/src/index.ts` - TypeScript 封装
- `skills/gitnexus-web/README.md` - 快速开始
