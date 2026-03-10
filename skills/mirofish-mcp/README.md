# MiroFish MCP - 快速开始

> 群体智能预测引擎 - 5 分钟上手

---

## 🚀 快速开始

### 1. 确保服务运行

```bash
cd D:\projects\MiroFish
npm run dev
```

访问 http://localhost:3000 确认服务正常

### 2. 基本使用

```typescript
import { createMiroFish } from 'skills/mirofish-mcp/src/index.ts'

const mf = await createMiroFish()

// 一键推演（从种子文件到完成）
const result = await mf.quickSimulate({
  name: '2026 伊朗战争推演',
  seedFile: 'uploads/iran-war-seed.md',
  maxRounds: 20,
  onProgress: (status) => {
    console.log(`第 ${status.currentRound}/${status.totalRounds} 轮 - ${status.progress}%`)
  }
})

console.log(`推演完成！共 ${result.results.events.length} 个事件`)
```

---

## 📚 分步使用

### 创建项目 → 构建图谱 → 启动仿真

```typescript
import { MiroFish } from 'skills/mirofish-mcp/src/index.ts'

const mf = new MiroFish()

// 1. 创建项目
const project = await mf.createProject({
  name: '我的推演项目',
  description: '测试推演'
})

// 2. 构建图谱（需要种子文件内容）
const graph = await mf.buildGraph({
  projectId: project.projectId,
  llmModel: 'minimax'
})

// 3. 创建仿真
const simulation = await mf.createSimulation({
  projectId: project.projectId,
  graphId: graph.graphId,
  name: '测试仿真',
  maxRounds: 10
})

// 4. 启动推演
await mf.runSimulation({ simulationId: simulation.simulationId })

// 5. 查询状态
const status = await mf.getStatus({ simulationId: simulation.simulationId })
console.log(`当前轮次：${status.currentRound}/${status.totalRounds}`)

// 6. 获取结果
const results = await mf.queryResults({ simulationId: simulation.simulationId })
```

---

## 🎯 常用场景

### 快速演示（5 轮，约 30 分钟）

```typescript
await mf.quickSimulate({
  name: '快速测试',
  seedFile: 'test-seed.md',
  maxRounds: 5
})
```

### 完整推演（20 轮，约 2 小时）

```typescript
await mf.quickSimulate({
  name: '完整推演',
  seedFile: 'full-seed.md',
  maxRounds: 20,
  onProgress: (status) => {
    // 每轮通知进度
    if (status.currentRound % 5 === 0) {
      console.log(`已完成 ${status.currentRound} 轮`)
    }
  }
})
```

### 查询特定轮次结果

```typescript
const round5Results = await mf.queryResults({
  simulationId: 'sim_xxx',
  round: 5
})
```

---

## 📊 种子文件格式

种子文件是推演的基础，包含时间线、参与方、关键问题等。

**示例** (`uploads/iran-war-seed.md`):

```markdown
# 2026 伊朗战争推演

## 时间线
- 2026-01-15: 紧张局势升级
- 2026-02-01: 外交谈判失败
- 2026-02-10: 军事冲突爆发

## 参与方
- 伊朗
- 美国
- 以色列
- 沙特阿拉伯

## 关键问题
1. 冲突会升级为全面战争吗？
2. 国际社会的反应如何？
3. 石油价格会如何变化？

## 推演需求
- 模拟各方决策过程
- 预测冲突发展轨迹
- 分析可能的结局
```

---

## ⚠️ 注意事项

### 1. 服务状态
确保 MiroFish 服务运行：
```bash
# 检查后端
curl http://localhost:5001/api/health

# 检查前端
curl http://localhost:3000
```

### 2. 推演时间
- 每轮约 3-5 分钟
- 20 轮约需 1-2 小时
- 建议首次使用 `maxRounds: 5` 测试

### 3. 日志监控
```bash
# 实时查看后端日志
Get-Content D:\projects\MiroFish\backend\logs\*.log -Wait
```

### 4. 可视化界面
推荐使用前端界面操作更直观：
http://localhost:3000

---

## 🔗 相关资源

- **技能文档**: `SKILL.md`
- **源码**: `src/index.ts`
- **项目位置**: `D:\projects\MiroFish`
- **GitHub**: https://github.com/mirofish-ai/mirofish

---

**创建时间**: 2026-03-08  
**维护者**: xiaoxiaohuang
