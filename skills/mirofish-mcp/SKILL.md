# MiroFish MCP - 群体智能预测引擎技能

> 群体智能预测引擎 - 多智能体模拟 + 知识图谱推演

---

## 📦 技能信息

| 项目 | 值 |
|------|------|
| **名称** | mirofish-mcp |
| **位置** | `skills/mirofish-mcp/` |
| **类型** | 本地服务封装 |
| **状态** | ✅ 可用 |
| **依赖** | 无（本地 HTTP API） |

---

## 🎯 功能概述

MiroFish 是一个群体智能预测引擎，通过多智能体模拟和知识图谱进行推演。

**适用场景**:
- ✅ 政策推演
- ✅ 舆情预测
- ✅ 小说结局推演
- ✅ 地缘政治分析
- ✅ 商业决策模拟

---

## 🔧 环境配置

### 本地部署
- **位置**: `D:\projects\MiroFish`
- **前端**: http://localhost:3000
- **后端 API**: http://localhost:5001
- **LLM**: MiniMax-M2.5
- **图谱**: Zep Cloud

### 配置文件
```json
{
  "baseUrl": "http://localhost:5001",
  "frontendUrl": "http://localhost:3000",
  "llm": {
    "provider": "minimax",
    "apiKey": "sk-cp-***"
  },
  "zep": {
    "apiKey": "z_1dWlk***"
  }
}
```

---

## 📚 API 使用

### 1. 创建项目

```typescript
import { MiroFish } from 'skills/mirofish-mcp/src/index.ts'

const mf = new MiroFish()

const project = await mf.createProject({
  name: '2026 伊朗战争推演',
  description: '基于当前局势的战争推演'
})

// 返回：{ projectId: 'proj_xxx', name: '...', status: 'created' }
```

### 2. 上传种子材料

```typescript
await mf.uploadSeedFile({
  projectId: 'proj_xxx',
  filePath: 'uploads/iran-war-seed.md',
  // 或 fileContent: '时间线：...\n参与方：...'
})
```

### 3. 构建知识图谱

```typescript
const graph = await mf.buildGraph({
  projectId: 'proj_xxx',
  llmModel: 'minimax' // 使用配置的 LLM 提取实体和关系
})

// 返回：{ graphId: 'graph_xxx', nodes: 46, edges: 147 }
```

### 4. 创建仿真

```typescript
const simulation = await mf.createSimulation({
  projectId: 'proj_xxx',
  graphId: 'graph_xxx',
  name: '伊朗战争仿真',
  maxRounds: 20 // 推演轮数
})

// 返回：{ simulationId: 'sim_xxx', status: 'created' }
```

### 5. 启动推演（自动处理 prepare→start 流程）

```typescript
// 一键启动（推荐）
await mf.runSimulation({
  simulationId: 'sim_xxx'
})

// 或分步控制
await mf.prepareSimulation({ simulationId: 'sim_xxx' })
await mf.waitForReady({ simulationId: 'sim_xxx' }) // 轮询直到 ready
await mf.startSimulation({ simulationId: 'sim_xxx' })
```

### 6. 查询状态

```typescript
const status = await mf.getStatus({
  simulationId: 'sim_xxx'
})

// 返回：{ status: 'running' | 'ready' | 'completed', currentRound: 5, totalRounds: 20 }
```

### 7. 查询结果

```typescript
const results = await mf.queryResults({
  simulationId: 'sim_xxx',
  round: 5 // 可选，查询特定轮次
})

// 返回：{ rounds: [...], events: [...], entities: [...] }
```

---

## 🚀 一键推演（高级封装）

```typescript
import { MiroFish } from 'skills/mirofish-mcp/src/index.ts'

const mf = new MiroFish()

// 从种子文件到推演完成的全流程
const result = await mf.quickSimulate({
  name: '2026 伊朗战争推演',
  seedFile: 'uploads/iran-war-seed.md',
  maxRounds: 20,
  onProgress: (status) => {
    console.log(`第 ${status.currentRound}/${status.totalRounds} 轮`)
  }
})

// 返回完整推演结果
```

---

## 📊 状态机流程

```
created → preparing → ready → running → completed
   ↓          ↓          ↓         ↓          ↓
创建项目   生成配置   准备完成   推演中    推演完成
           (LLM 生成 Agent 人设)
```

**关键 API 端点**:
| 端点 | 方法 | 作用 |
|------|------|------|
| `/api/project/create` | POST | 创建项目 |
| `/api/graph/build` | POST | 构建图谱 |
| `/api/simulation/create` | POST | 创建仿真 |
| `/api/simulation/prepare` | POST | 准备配置（最耗时） |
| `/api/simulation/prepare/status` | POST | 查询准备进度 |
| `/api/simulation/start` | POST | 启动仿真 |
| `/api/simulation/<id>/run-status` | GET | 查询运行状态 |

---

## ⚠️ 注意事项

### 1. 状态依赖
- 必须先 `prepare` 才能 `start`
- `prepare` 是异步的，需要轮询状态

### 2. 推演时间
- 每轮约 3-5 分钟（取决于 Agent 数量和 LLM 速度）
- 20 轮约需 1-2 小时

### 3. 资源消耗
- LLM 调用频繁（每轮多次）
- 建议设置 `maxRounds` 控制成本

### 4. 错误处理
```typescript
try {
  await mf.runSimulation({ simulationId: 'sim_xxx' })
} catch (error) {
  if (error.code === 'PREPARE_FAILED') {
    // LLM 生成人设失败，检查 API Key
  } else if (error.code === 'TIMEOUT') {
    // 轮询超时，可能服务卡住
  }
}
```

---

## 📋 最佳实践

### 快速演示
```typescript
// 设置少量轮数快速验证
await mf.quickSimulate({
  name: '测试推演',
  seedFile: 'test-seed.md',
  maxRounds: 5 // 约 30 分钟完成
})
```

### 减少 Agent 数量
简化种子材料，减少实体数量，加快推演速度

### 前端优先
http://localhost:3000 可视化操作更直观，适合首次使用

### 日志监控
```bash
# 实时查看后端日志
Get-Content D:\projects\MiroFish\backend\logs\*.log -Wait
```

---

## 🔗 相关资源

- **项目位置**: `D:\projects\MiroFish`
- **GitHub**: https://github.com/mirofish-ai/mirofish
- **前端**: http://localhost:3000
- **后端 API**: http://localhost:5001
- **日志**: `D:\projects\MiroFish\backend\logs\`

---

**创建时间**: 2026-03-08  
**维护者**: xiaoxiaohuang  
**状态**: ✅ 可用
