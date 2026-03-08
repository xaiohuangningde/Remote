# OpenClaw 自主任务技能分析报告

**生成时间：** 2026-03-04 22:39 GMT+8  
**研究范围：** workspace/skills 目录下与任务管理、自主执行相关的技能

---

## 一、现有可用技能列表

### 核心自主任务技能

| 技能名称 | 位置 | 状态 |
|----------|------|------|
| autonomous-tasks | skills/autonomous-tasks/ | ✅ 完整 |
| self-repair | skills/self-repair/ | ✅ 完整 |
| feishu-evolver-wrapper | skills/feishu-evolver-wrapper/ | ✅ 完整 |
| anterior-cingulate-memory | skills/anterior-cingulate-memory/ | 🚧 开发中 |

### 辅助技能

| 技能名称 | 位置 | 作用 |
|----------|------|------|
| agent-reach | skills/agent-reach/ | 网络搜索与信息获取 |
| news-aggregator | skills/news-aggregator/ | 新闻聚合与筛选 |
| mind-blow | skills/mind-blow/ | 生成创意洞察 |
| surprise-protocol | skills/surprise-protocol/ | 随机创意内容生成 |
| browserwing | skills/browserwing/ | 浏览器自动化 |
| exa-plus / exa-web-search-free | skills/exa-*/ | AI 搜索引擎 |

---

## 二、每个技能的作用详解

### 1. autonomous-tasks（核心）

**作用：** 目标驱动的自主任务执行系统

**核心功能：**
- 读取长期目标（GOALS.md）
- 自动生成每日可执行任务（4-5 个）
- 分配任务给 PM subagents
- 协调多 Agent 并行执行
- 文件状态管理（STATE.yaml）

**工作流：**
```
用户目标 → 主 Agent(CEO) → 生成任务 → spawn PM agents → 执行 → 更新状态 → 汇报
```

**关键文件：**
- `autonomous/GOALS.md` - 长期目标（只有主 Agent 可修改）
- `autonomous/STATE.yaml` - 任务状态（唯一事实源）
- `autonomous/WORKFLOW.md` - 工作流说明
- `memory/tasks-log.md` - 完成日志（只追加）

### 2. self-repair（核心）

**作用：** AI Agent 自动修复框架

**核心功能：**
- 全局错误捕获（未捕获异常、Promise 拒绝）
- 根因分析（基于规则库匹配错误类型）
- 自动修复（文件缺失、权限问题等）
- 生成修复报告

**支持的错误类型：**
| 错误模式 | 类型 | 修复策略 |
|---------|------|---------|
| ENOENT | missing_file | 创建缺失文件 |
| EACCES | permission_error | 修复权限 |
| MODULE_NOT_FOUND | missing_dependency | 安装依赖 |
| ECONNREFUSED | connection_refused | 重试 |
| ETIMEDOUT | timeout | 重试 |
| 429 | rate_limit | 等待后重试 |

### 3. feishu-evolver-wrapper（核心）

**作用：** 能力进化循环的飞书集成包装器

**核心功能：**
- 管理进化循环生命周期（start/stop/ensure）
- 发送富文本飞书卡片报告
- 生成可视化仪表板
- 看门狗守护（每 10 分钟检查）

**使用场景：**
- 需要飞书报告的能力进化任务
- 需要长期运行的进化循环

### 4. anterior-cingulate-memory（开发中）

**作用：** 冲突检测与错误监控

**核心功能（计划）：**
- "Something's off" 预意识警告
- 信息矛盾检测
- 错误追踪与学习
- 不确定性感知

**状态：** 🚧 开发中，暂不可用

### 5. agent-reach（辅助）

**作用：** 互联网内容搜索与读取工具集

**可用工具：**
- ✅ Exa 全网搜索（通过 mcporter）
- ✅ GitHub CLI 搜索
- ✅ RSS/任意网页（Jina AI）
- ⚠️ YouTube（yt-dlp 已安装）
- ⚠️ Twitter/X（需要 Cookie 配置）

### 6. news-aggregator（辅助）

**作用：** 新闻聚合与要点整理

**新闻源：**
- 国内科技：36 氪、机器之心、量子位、IT 之家
- 国内军事：观察者网、澎湃新闻、腾讯军事
- 国际科技：TechCrunch、The Verge、Wired
- 国际军事：Defense News、Jane's Defence

**工作流：** 搜索 → 筛选 → 整理 → 输出

---

## 三、技能配合使用方案

### 方案 A：标准自主任务执行

```
用户输入目标
    ↓
autonomous-tasks（主 Agent）
    ├─ 读取 GOALS.md
    ├─ 生成今日任务
    └─ spawn PM subagents
         ↓
    PM agents 执行任务
    ├─ 调用 agent-reach 搜索信息
    ├─ 调用 self-repair 处理错误
    └─ 更新 STATE.yaml + tasks-log.md
         ↓
    主 Agent 汇总汇报
```

**适用场景：** 日常任务管理、目标驱动的项目执行

### 方案 B：研究类任务

```
研究任务
    ↓
PM-research agent
    ├─ agent-reach（Exa 搜索）
    ├─ exa-plus / exa-web-search-free
    ├─ news-aggregator（新闻背景）
    └─ 生成研究报告
         ↓
    更新状态 + 汇报
```

**适用场景：** 市场调研、技术调研、竞品分析

### 方案 C：能力进化循环

```
长期优化目标
    ↓
feishu-evolver-wrapper
    ├─ 启动进化循环
    ├─ 定期生成飞书报告
    └─ 可视化仪表板
         ↓
    持续优化 + 监控
```

**适用场景：** 长期能力优化、需要可视化报告的项目

### 方案 D：自动修复增强

```
任何任务执行
    ↓
遇到错误
    ↓
self-repair 自动介入
    ├─ 错误捕获
    ├─ 根因分析
    ├─ 尝试修复
    └─ 生成报告
         ↓
    任务继续执行 或 标记 blocked
```

**适用场景：** 提高系统鲁棒性、减少人工干预

---

## 四、缺失的能力（需要新建）

### 1. 任务优先级调度器

**缺失原因：** 当前系统按顺序生成任务，缺乏动态优先级调整

**建议功能：**
- 根据截止日期自动排序
- 根据任务依赖关系调度
- 紧急任务插队机制
- 资源冲突检测

**实现建议：** 新建 `skills/task-scheduler/`

### 2. 任务依赖管理器

**缺失原因：** 任务之间可能存在依赖关系，当前未支持

**建议功能：**
- 定义任务依赖图
- 自动检测循环依赖
- 阻塞任务自动等待
- 依赖完成后自动触发

**实现建议：** 扩展 `autonomous-tasks` 或新建 `skills/task-dependencies/`

### 3. 进度可视化仪表板

**缺失原因：** 当前只有 YAML 和 Markdown 日志，缺乏直观可视化

**建议功能：**
- 任务完成进度条
- 目标完成度统计
- 历史趋势图表
- 导出 PDF/图片报告

**实现建议：** 新建 `skills/task-dashboard/` 或扩展 `feishu-evolver-wrapper`

### 4. 定时任务调度器（Cron 集成）

**缺失原因：** 当前依赖心跳检查，缺乏精确时间控制

**建议功能：**
- 精确时间触发（每天 9:00 生成任务）
- 周期性任务（每周一汇总）
- 一次性提醒（20 分钟后提醒我）
- 与 OpenClaw Cron 集成

**实现建议：** 新建 `skills/cron-scheduler/`

### 5. 任务模板库

**缺失原因：** 每次生成任务需要重新描述，缺乏可复用模板

**建议功能：**
- 预定义任务模板（研究类、开发类、文档类）
- 模板参数化
- 一键生成任务实例
- 模板版本管理

**实现建议：** 新建 `skills/task-templates/`

### 6. 多用户协作支持

**缺失原因：** 当前系统为单用户设计

**建议功能：**
- 任务分配给不同用户
- 协作任务状态同步
- 评论和批注
- 权限管理

**实现建议：** 扩展 `autonomous-tasks` 或新建 `skills/collaborative-tasks/`

### 7. 自然语言任务解析器

**缺失原因：** 用户需要手动编辑 GOALS.md，缺乏自然语言输入

**建议功能：**
- "我想学习 AI Agent 开发" → 自动生成相关任务
- "帮我整理一下 workspace" → 生成整理任务
- 意图识别 + 任务分解

**实现建议：** 新建 `skills/nl-task-parser/`

### 8. 任务执行历史记录与分析

**缺失原因：** 当前只有简单日志，缺乏深度分析

**建议功能：**
- 任务执行时间统计
- 成功率分析
- 瓶颈识别
- 优化建议生成

**实现建议：** 新建 `skills/task-analytics/`

---

## 五、推荐实施优先级

### 高优先级（立即实施）

1. **任务模板库** - 提高任务生成效率
2. **自然语言任务解析器** - 降低使用门槛
3. **进度可视化仪表板** - 提升用户体验

### 中优先级（近期实施）

4. **定时任务调度器** - 精确时间控制
5. **任务执行历史记录与分析** - 数据驱动优化

### 低优先级（长期规划）

6. **任务依赖管理器** - 复杂场景支持
7. **多用户协作支持** - 团队协作场景
8. **任务优先级调度器** - 动态优化

---

## 六、总结

OpenClaw 已具备完整的自主任务执行基础框架：

- ✅ **核心系统：** autonomous-tasks 提供目标驱动的任务管理
- ✅ **容错机制：** self-repair 提供自动修复能力
- ✅ **进化能力：** feishu-evolver-wrapper 支持长期优化
- ✅ **信息获取：** agent-reach、exa-* 提供搜索能力

**主要缺口：**
- 用户交互体验（自然语言输入、可视化）
- 高级调度功能（依赖、优先级、定时）
- 数据分析与洞察

**建议下一步：** 优先实施高优先级的 3 个新技能，快速提升系统可用性。

---

**报告生成者：** pm-research-001  
**任务 ID：** task-001  
**输出文件：** research/autonomous-skills-analysis.md
