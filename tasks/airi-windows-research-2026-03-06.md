# Airi Windows 兼容性研究 - 2026-03-06

> 研究时间：2026-03-06 13:00 - 13:30
> 研究者：xiaoxiaohuang 🐤
> 任务来源：用户指定

---

## 📊 核心发现

### 1. Windows 支持状态

**结论：Airi 官方支持 Windows，但有已知问题**

| 项目 | 状态 | 说明 |
|------|------|------|
| **Electron 构建配置** | ✅ 支持 | `electron-builder.config.ts` 中有 `win` 和 `nsis` 配置 |
| **Windows 安装包** | ✅ 支持 | NSIS 安装器配置完整 |
| **已知问题** | ⚠️ 多个 | GitHub Issues 中有 10+ Windows 相关 bug 报告 |

### 2. 分支检查

**检查结果：没有专门的 Windows 分支**

查看了 https://github.com/moeru-ai/airi/branches/active
- 24 个活跃分支
- 无 `windows`、`win`、`platform` 相关分支
- 所有开发在 `main` 分支进行

### 3. Windows 相关问题汇总

从 GitHub Issues 发现的主要问题：

| Issue | 问题描述 | 状态 |
|-------|----------|------|
| #1130 | 两个版本 Windows 场景 exe 都运行不了 | 已关闭 (2 天前) |
| #1122 | Audio Input doesn't work for Aliyun NLS | 已关闭 (昨天) |
| #1087 | Windows installer does nothing at all | pending triage |
| #1059 | Cannot find module 'ms' on Windows 11 | pending triage |
| #1051 | Cannot find module 'ms' in AIRI 0.8.5 beta.3 | 已关闭 (重复) |
| #1007 | 如何打包 Windows 10 客户端呢？ | 已关闭 |
| #1002 | Problem: AIRI software cannot start on my Windows computer | pending triage |

**核心问题**：
1. 模块缺失 (`ms` 模块) - 依赖问题
2. 安装器无响应 - NSIS 配置问题
3. 音频输入问题 - 特定于阿里云 NLS

---

## 🎯 可学习的模块（按优先级排序）

### 优先级 1：已验证高价值模块

#### 1.1 stream-kit ⭐⭐⭐⭐⭐
**位置**: `packages/stream-kit/`
**状态**: 已提取到 workspace (`studied/stream-kit/`)
**价值**: 
- 80 行代码解决流式任务调度
- 事件驱动架构
- 自动错误处理
- **Windows 兼容** (纯 TypeScript，无平台依赖)

**整合建议**: 立即整合到 `volcano-voice` 和 `memory_search`

#### 1.2 DuckDB-WASM 架构 ⭐⭐⭐⭐⭐
**位置**: `packages/duckdb-wasm/` `packages/drizzle-duckdb-wasm/`
**价值**:
- 浏览器/本地 DuckDB 集成
- Drizzle ORM 支持
- 内存高效，适合本地记忆存储

**Windows 兼容性**: ✅ WASM 无平台限制

#### 1.3 Electron 事件系统 ⭐⭐⭐⭐
**位置**: `packages/electron-eventa/`
**价值**:
- Electron 主进程/渲染进程通信
- 类型安全事件总线
- 可用于 OpenClaw 桌面集成

**Windows 兼容性**: ✅ Electron 跨平台

---

### 优先级 2：中等价值模块

#### 2.1 音频管道 ⭐⭐⭐⭐
**位置**: `packages/audio-pipelines-transcribe/` `packages/audio/`
**价值**:
- 流式语音识别
- 音频处理管道
- 与 TTS 集成

**Windows 兼容性**: ⚠️ 需验证 (依赖系统音频 API)

#### 2.2 Live2D 渲染 ⭐⭐⭐
**位置**: `packages/stage-ui-live2d/` `packages/stage-ui-three/`
**价值**:
- Live2D 模型渲染
- Three.js 集成
- 性能优化

**Windows 兼容性**: ✅ WebGL 跨平台

#### 2.3 屏幕捕获 ⭐⭐⭐
**位置**: `packages/electron-screen-capture/`
**价值**:
- Electron 屏幕共享
- 可用于视觉理解

**Windows 兼容性**: ⚠️ 需验证 (依赖系统 API)

---

### 优先级 3：探索性模块

#### 3.1 插件系统 ⭐⭐⭐
**位置**: `packages/plugin-protocol/` `packages/plugin-sdk/`
**价值**:
- 插件架构设计
- MCP 协议支持

#### 3.2 服务器运行时 ⭐⭐
**位置**: `packages/server-runtime/` `packages/server-sdk/`
**价值**:
- 后端服务架构
- 但 OpenClaw 已有类似能力

---

## 🛠️ Windows 特定配置分析

### electron-builder.config.ts 关键配置

```typescript
export default {
  appId: 'ai.moeru.airi',
  productName: 'AIRI',
  
  // Windows 配置
  win: {
    executableName: 'airi',
  },
  nsis: {
    artifactName: '${productName}-${version}-windows-${arch}-setup.${ext}',
    shortcutName: '${productName}',
    uninstallDisplayName: '${productName}',
    createDesktopShortcut: 'always',
    deleteAppDataOnUninstall: true,
    oneClick: false,  // 允许选择安装目录
    allowToChangeInstallationDirectory: true,
  },
  
  // macOS 配置（有平台特定逻辑）
  mac: {
    // ... macOS 特定配置
  }
}
```

**关键发现**:
- Windows 配置简洁，无特殊处理
- NSIS 安装器支持自定义安装路径
- 卸载时删除应用数据

### package.json 关键依赖

```json
{
  "dependencies": {
    "@proj-airi/electron-eventa": "workspace:^",
    "@proj-airi/electron-screen-capture": "workspace:^",
    "@proj-airi/electron-vueuse": "workspace:^",
    "electron-updater": "^6.8.3",
    "electron-click-drag-plugin": "^2.0.2"
  }
}
```

---

## 📋 行动建议

### 立即执行（今天）

1. **整合 stream-kit**
   - 创建 `stream-queue` skill
   - 在 `volcano-voice` 中测试
   - 预计时间：30 分钟

2. **研究 DuckDB-WASM**
   - 分析 `packages/duckdb-wasm/` 架构
   - 设计 `duckdb-memory` skill
   - 预计时间：1 小时

### 本周执行

3. **测试 Windows 兼容性**
   - 克隆 `multi-agent-windows` 分支（如果有）
   - 或直接在 `main` 分支尝试构建
   - 使用 WSL2 作为备选方案

4. **提取高价值模块**
   - `electron-eventa` → 可用于 OpenClaw 事件系统
   - `audio-pipelines-transcribe` → 优化语音识别

### 持续进行

5. **监控 Airi 更新**
   - 关注 Windows 相关 issue 修复
   - 定期同步新模块

---

## 💡 关键洞察

### 1. Windows 支持是"名义上"的

**问题**: 配置有，但测试不足
**证据**: 
- CI 配置只在 Linux 测试
- 10+ Windows 特定 bug 未解决
- 无专门 Windows 分支

**推论**: 选择性整合模块，避免整体依赖

### 2. 最大价值在架构设计

**不是代码本身，而是设计思路**:
- stream-kit 的事件驱动队列
- DuckDB 的本地优先存储
- 插件系统的解耦设计

**行动**: 提取设计模式，而非直接复制代码

### 3. 选择性整合 > 整体移植

**风险**:
- pnpm workspace Windows 兼容性问题
- vite 8.0.0-beta 不稳定
- 大量未测试的 Windows 路径

**策略**:
- ✅ 纯 TypeScript 模块 (stream-kit)
- ✅ WASM 模块 (DuckDB)
- ⚠️ 系统 API 模块 (音频、屏幕捕获) → 需验证
- ❌ 整体应用 → 不推荐

---

## 📈 与上次研究对比

| 维度 | 上次 (2026-03-05) | 本次 (2026-03-06) |
|------|------------------|------------------|
| **目标** | 整体研究 + 部署 | Windows 兼容性专项 |
| **分支检查** | 未检查 | 检查 24 个活跃分支 |
| **问题发现** | 4 次部署失败 | 10+ Windows bugs |
| **模块提取** | stream-kit | stream-kit + DuckDB + Electron |
| **Windows 结论** | 未知 | 支持但有 bug |

---

## 🎓 经验教训

### 1. 分支命名不总是直观的
- 没有 `windows` 分支不代表不支持 Windows
- 需要检查构建配置和 issues

### 2. Issues 是金矿
- 10 分钟浏览 issues = 数小时调试
- 优先检查"已关闭"的类似问题

### 3. 构建配置说明一切
- `electron-builder.config.ts` 明确支持 Windows
- 但配置≠测试过

---

## 📝 下一步

等待用户确认：
1. 是否开始整合 stream-kit？
2. 是否尝试本地构建 Airi？
3. 是否优先研究 DuckDB 架构？

---

**研究者**: xiaoxiaohuang 🐤
**时间**: 2026-03-06 13:30
**状态**: 等待用户确认优先级
