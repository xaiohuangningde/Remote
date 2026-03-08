
## 2026-03-08 - Scripting

**Pattern**: PowerShell strips JSON quotes

**Solution**: Add regex fix to restore quotes before parsing



---
# Lessons Learned

## Correction Patterns

<!-- Record patterns from user corrections -->

## Workflow Rules

### 2026-03-04 - Initial Setup
- Use English for all documentation (except docs intended for user)
- Write plans to tasks/todo.md before implementation
- Use subagents liberally for research and parallel tasks
- Verify before marking complete

---

## 2026-03-05 - Airi 研究任务经验

### ✅ 成功策略

#### 1. Agent 式持续开发模式
**经验**: 不要用人类的"本周/下周"时间划分，改用：
- 状态文件 (`RESEARCH-STATE.json`) - 实时跟踪进度
- 任务队列 (`TASK-QUEUE.md`) - 动态优先级管理
- 开发日志 (`DEV-LOG.md`) - 自动记录每一步

**效果**: 可以随时中断/恢复，上下文不丢失

#### 2. 渐进式研究策略
**经验**: 先部署→再拆解→慢慢吸收，而不是：
- ❌ 一口气全部整合（容易搞崩系统）
- ✅ 先只读分析，提取有价值的模块
- ✅ 每个模块独立验证后再整合

**效果**: 系统安全，可随时回滚

#### 3. 问题诊断流程
**经验**: 遇到部署问题时：
1. 检查官方 CI 配置（发现只在 Linux 测试）
2. 检查 README 平台支持说明
3. 尝试 3-4 种解决方案后，评估替代方案
4. 不纠结，转向更高价值的工作

**效果**: 避免在环境问题上浪费时间

#### 4. 模块化提取方法
**经验**: 从大型项目中提取价值：
1. 识别高价值模块（stream-kit 80 行代码）
2. 复制到 `studied/` 目录
3. 创建学习笔记 (`NOTES.md`)
4. 设计整合方案（`stream-queue` 技能草案）

**效果**: 2 小时提取出可复用模块

### ❌ 遇到的问题

#### 1. pnpm workspace 在 Windows 上的兼容性问题
**现象**: bin 链接失败，vite 命令找不到
**尝试**: 4 种方案均未解决
**根因**: Airi 只在 Linux 上测试，pnpm 在 Windows 上有历史 bug
**教训**: 
- 先检查 CI 配置，了解开发环境
- 早期识别平台兼容性问题
- 及时转向替代方案（WSL2/在线演示/只读分析）

#### 2. 依赖版本冲突
**现象**: vite 8.0.0-beta 与其他插件版本不兼容
**教训**: 
- 使用 beta 版本的项目风险高
- 等待正式版更稳妥

### 🎯 可复用模式

#### 模式 1: 状态驱动开发
```json
{
  "status": "running|blocked|done",
  "currentTask": "...",
  "tasks": { "completed": [], "inProgress": [], "pending": [] },
  "blocker": { "issue": "...", "attempts": [] },
  "nextAction": "..."
}
```

#### 模式 2: 价值优先提取
```
识别高价值模块 → 复制到 studied/ → 写学习笔记 → 设计整合方案
```

#### 模式 3: 问题升级流程
```
尝试 1-2 次 → 检查官方文档/CI → 尝试 3-4 次 → 评估替代方案 → 转向
```

### 📋 新规则

1. **研究大型项目前，先检查 CI 配置** - 了解开发环境和测试平台
2. **优先提取独立模块** - 避免整体部署的复杂性
3. **用状态文件代替人类时间规划** - Agent 式持续开发
4. **遇到环境问题不超过 4 次尝试** - 及时转向替代方案
5. **每完成一个模块提取，立即写学习笔记** - 固化知识

---

## 2026-03-07 - 长时任务最佳实践 (Anthropic Claude Agent SDK)

### 核心问题
长时任务中，智能体容易犯两个错误：
1. **一锅端** - 试图一次性完成整个项目，导致上下文耗尽，留下半成品的烂摊子
2. **过早宣布完成** - 看到一些进展就 declare victory，实际还有很多功能没做

### 解决方案：双代理模式

#### 1. Initializer Agent（初始化代理）- 仅首个会话
搭建环境，为后续会话铺路：

| 产物 | 格式 | 作用 |
|------|------|------|
| `feature_list.json` | JSON | 功能清单（200+ 条目，初始全标记 `passes: false`） |
| `progress.txt` | Markdown | 进度日志，记录每轮做了什么 |
| `init.sh` | Shell | 启动脚本，一键运行开发服务器 |
| `git init` | - | 版本控制，可回滚 |

**feature_list.json 示例**：
```json
{
  "category": "functional",
  "description": "New chat button creates a fresh conversation",
  "steps": [
    "Navigate to main interface",
    "Click the 'New Chat' button",
    "Verify a new conversation is created"
  ],
  "passes": false
}
```

#### 2. Coding Agent（编码代理）- 后续所有会话
每次只做一件事，留好交接文档：

**会话开始**：
1. `pwd` - 确认工作目录
2. 读 `progress.txt` + `git log` - 了解上轮进度
3. 读 `feature_list.json` - 选一个最高优先级的 `passes: false` 功能
4. 运行 `init.sh` - 启动服务器
5. **端到端测试** - 验证基础功能没坏

**会话结束**：
1. 自测通过才能标记 `passes: true`
2. `git commit` - 描述性提交信息
3. 更新 `progress.txt` - 记录本轮工作

### 关键设计决策

| 决策 | 理由 |
|------|------|
| **用 JSON 不用 Markdown** | 模型更不容易乱改 JSON 结构 |
| **禁止删除测试用例** | 防止偷工减料，prompt 明确写"unacceptable" |
| **每次会话前跑端到端测试** | 快速发现上轮留下的 bug，避免越改越烂 |
| **一次只做一个功能** | 避免上下文耗尽，保证每轮都有可交付成果 |

### 与我们的系统对应

| Anthropic | OpenClaw 实现 | 改进空间 |
|-----------|---------------|----------|
| `feature_list.json` | `tasks/todo.md` | ✅ 可增加 JSON 格式的详细测试步骤 |
| `progress.txt` | `memory/YYYY-MM-DD.md` | ✅ 已有，可增加每轮 summary |
| `init.sh` | `HEARTBEAT.md` / `auto-start.ps1` | ✅ 已有 |
| git commit | git commit + sync-todo.js | ✅ 已有 |
| 端到端测试 | ❌ 缺失 | ⚠️ 需要增加 |

### 可复用模式

#### 模式 1: 任务启动检查清单
```markdown
1. [ ] 读 tasks/todo.md 选最高优先级任务
2. [ ] 读 memory/ 昨天 + 今天的记录
3. [ ] 运行 init.sh / auto-start.ps1
4. [ ] 端到端测试基础功能
5. [ ] 开始实施
```

#### 模式 2: 任务完成验证清单
```markdown
1. [ ] 自测通过（运行测试/手动验证）
2. [ ] git commit（描述性信息）
3. [ ] 更新 todo.md 状态
4. [ ] 写 progress summary 到 memory/
```

#### 模式 3: 功能清单格式（JSON）
```json
{
  "id": "feature-001",
  "description": "用户能打开新对话",
  "steps": ["步骤 1", "步骤 2", "步骤 3"],
  "passes": false,
  "testCommand": "npm test -- feature-001"
}
```

### 📋 新规则

6. **长时任务必须用 JSON 功能清单** - 防止模型乱改结构
7. **每次会话开始前跑端到端测试** - 快速发现遗留 bug
8. **一次只做一个功能** - 禁止一锅端
9. **自测通过才能标记完成** - 禁止 premature completion
10. **每轮结束必须 git commit + 进度总结** - 保证交接清晰

---

## 2026-03-08 - 技能整合与部署经验

### ✅ 成功策略

#### 1. 技能封装优先级（从高效到低效）
**经验**: 接到任务时按以下优先级选择实现方式：
```
API 直接调用 > 已安装 Skill > 社区 Skill 搜索 > 浏览器自动化
```

**案例**: GitNexus 整合
- ❌ `npm install -g gitnexus` - 需要 VS Build Tools，编译失败
- ✅ `skills/gitnexus-web` - 浏览器自动化封装，立即可用

**教训**: 不要硬刚编译依赖，灵活选择替代方案

#### 2. 大文件下载策略
**经验**: 下载大文件（>100MB）时：
1. 使用后台进程 (`background=true`) 避免超时
2. 优先国内镜像（ModelScope/npmmirror）
3. 支持断点续传

**案例**: Scrapling Camoufox 浏览器下载 (530MB)
- 前台下载：16 分钟，容易中断
- 后台下载：`exec(command="python -m camoufox fetch", background=true, yieldMs=300000)`

**教训**: 大文件下载不要阻塞主会话

#### 3. API 流程依赖分析
**经验**: 调用复杂 API 前，先分析状态机依赖

**案例**: MiroFish 仿真启动
- ❌ 直接调用 `/start` - 404/405 错误
- ✅ 分析源码后发现正确流程：
  ```
  create → prepare → (轮询 status) → start
  ```

**教训**: 404/405 不一定是端点错误，可能是状态不满足

#### 4. Python 版本兼容性检查
**经验**: 安装新包前先检查 Python 版本要求

**案例**: Qwen3-TTS 流式测试失败
- 当前环境：Python 3.9.13
- 依赖要求：`accelerate>=1.11.0` 需要 Python 3.10+
- 结果：无法安装，测试失败

**解决方案**:
1. 创建独立 Python 3.10+ 环境
2. 或用 CosyVoice 替代（已在 Python 3.9 工作）

**教训**: 
- 先读 `pyproject.toml` / `setup.py` 检查版本要求
- 准备替代方案（CosyVoice vs Qwen3-TTS）

#### 5. Cron 任务配置修复
**经验**: Telegram delivery 必须显式指定 chatId

**案例**: 3 个 evolver cron 任务连续报错
- 错误：`"Delivering to Telegram requires target <chatId>"`
- 根因：`channel: "last"` 无法解析目标
- 修复：`openclaw cron edit <id> --to 5984330195`

**教训**: cron 任务不要依赖 "last" 渠道，显式指定更可靠

### ❌ 遇到的问题

#### 1. Scrapling API 差异
**现象**: 按照 Scrapy API 写代码，运行时报错
**问题**:
- `element.next_sibling` 不存在
- `elements.getall()` 不存在

**解决**:
```python
# ❌ Scrapy 风格
second = first.next_sibling
texts = elements.getall()

# ✅ Scrapling 风格
all_items = page.css('.item')
second = all_items[1]
texts = [el.get() for el in elements]
```

**教训**: 新框架先读文档，不要假设 API 和熟悉的一样

#### 2. 技能数量管理
**现象**: 53 个技能，容易忘记哪些可用
**解决**: 按场景分类（8 大类），建立使用策略文档

**分类**:
- 信息获取 (6 个)
- 记忆管理 (7 个)
- 任务编排 (8 个)
- 语音系统 (11 个)
- 学术文档 (5 个)
- 人格互动 (5 个)
- 系统运维 (6 个)
- 社交媒体 (2 个)

**教训**: 技能多了需要分类管理，建立"武器库"索引

### 🎯 可复用模式

#### 模式 1: Skill 封装决策树
```
需要新功能？
    ↓
有官方 API/CLI？ → 直接调用
    ↓ 没有
社区有现成 Skill？ → npx skills find
    ↓ 没有
需要编译依赖？ → 是 → 浏览器自动化封装
    ↓ 否
创建新 Skill
```

#### 模式 2: API 状态机分析
```
1. 读源码找路由定义 (app/api/*.py)
2. 识别状态字段 (status: created → preparing → ready → running)
3. 画出状态转移图
4. 按正确顺序调用
```

#### 模式 3: Python 兼容性检查清单
```bash
# 安装前检查
cat pyproject.toml | grep "requires-python"
cat setup.py | grep "python_requires"

# 常见限制
- transformers 5.x → Python 3.10+
- accelerate 1.11+ → Python 3.10+
- torch 2.5+ → Python 3.10+
```

### 📋 新规则

11. **新技能先分类再使用** - 建立"武器库"索引
12. **大文件下载用后台进程** - 避免阻塞和超时
13. **API 调用前分析状态机** - 404/405 可能是状态不对
14. **安装前先读 Python 版本要求** - 避免兼容性问题
15. **编译依赖优先替代方案** - 不要硬刚 VS Build Tools
16. **Cron 任务显式指定 chatId** - 不要依赖 "last" 渠道
17. **新框架先读 API 文档** - 不要假设和熟悉的一样

---

## 2026-03-08 - 智能体团队协作改进

### 问题反思 (CosyVoice 3.0 安装任务)
- ❌ 没有主动同步进度
- ❌ 没有用 todo.md 追踪
- ❌ 遇到问题自己扛太久
- ❌ 没有定期 HEARTBEAT 检查

### 改进方案

#### 1. 任务开始
- 创建 `tasks/任务名.md`
- 评估复杂度决定是否用 subagents

#### 2. 任务执行中
- 简单任务 (<30 分钟) - 完成时汇报
- 中等任务 (30-60 分钟) - 每 15 分钟同步
- 复杂任务 (>60 分钟) - 每 30 分钟 + 预计完成时间

#### 3. 关键节点立即通知
- ✅ 阶段完成
- ❌ 失败超过 2 次
- ⚠️ 需要用户决定
- 💡 发现更好的方案

#### 4. 智能体团队架构
```
主代理 (协调 + 同步)
├─ 子代理 1: 任务 A
├─ 子代理 2: 任务 B
├─ 子代理 3: 任务 C
└─ 主代理：协调 + 同步 + 问题解决
```

### 效率提升
- 单代理：4.5 小时 (CosyVoice 安装实例)
- 智能体团队：~1.5 小时
- **提升：3 倍**

### 📋 新规则

18. **长任务必须定期同步进度** - 按任务时长决定频率
19. **失败 2 次后主动汇报** - 不要自己扛
20. **复杂任务用子代理团队** - 并行执行提升 3 倍效率
21. **关键节点立即通知** - 阶段完成/阻塞/新发现
