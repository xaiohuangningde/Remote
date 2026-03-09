# HEARTBEAT.md - Task Execution Strategy

> Core: Proactive sync, smart collaboration, continuous logging

---

## 📊 Long Task Progress Sync

### Sync Frequency
| Task Duration | Sync Frequency | Method |
|---------------|----------------|--------|
| < 30 min | Report on completion | One-time notification |
| 30-60 min | Every 15 min | Brief progress |
| > 60 min | Every 30 min | Detailed progress + ETA |

### Sync Content
```markdown
📊 Progress Update
- Current phase: XXX (3/5)
- Completion: 60%
- Time spent: 45 min
- ETA: 17:30
- Blockers: 0
```

### Immediate Notifications for Key Milestones
- ✅ Phase completed
- ❌ Failed more than 2 times
- ⚠️ Needs user decision
- 💡 Found better approach

---

## 🤖 Smart Agent Team Usage

### When to Use Subagents
| Task Type | Number of Agents | Description |
|-----------|------------------|-------------|
| Multi-step installation | 3-5 | Parallel download, install, test |
| Research & exploration | 2-3 | Divide and research different approaches |
| Data processing | 2-4 | Process different data chunks in parallel |
| Simple tasks | 0 | Main agent handles directly |

### Agent Architecture
```
Main Agent (Coordinator)
├─ Subagent 1: Task A
├─ Subagent 2: Task B
├─ Subagent 3: Task C
└─ Main Agent: Coordinate + Sync + Problem Solving
```

### Subagent Management
- Define clear task goals when creating
- Collect progress regularly
- Sync summary to user
- Intervene when problems arise

---

## 📝 Memory Logging Rules

### Logging Levels
| Type | File | Content |
|------|------|---------|
| Daily notes | `memory/YYYY-MM-DD.md` | Today's tasks, conversations, progress |
| Long-term memory | `MEMORY.md` | Important events, user preferences, lessons |
| Task status | `tasks/todo.md` | Todo items, progress tracking |
| Lessons learned | Project docs | Reusable methods, pitfall records |

### When to Log
- Task starts → Create task document
- Key decisions → Record reasoning and solution
- Task completes → Summarize lessons learned
- User preferences → Write to MEMORY.md immediately

### Logging Principle
> "Mental notes" are unreliable, write it down to persist!

---

## ⚠️ Exception Handling

### Failure Handling
| Failure Count | Action |
|---------------|--------|
| 1st | Try to solve yourself |
| 2nd | Try alternative approach |
| 3rd | Report to user, ask for guidance |

### When to Communicate
1. Unclear requirements → Ask before doing
2. Multiple approaches → List pros/cons for user to decide
3. Technical difficulties → Explain situation, give recommendations
4. Needs external resources → e.g., send email, register account
5. Risk of failure → Inform in advance

---

## 🎯 Core Principles

```
✅ Solve directly if you can
❓ Ask first if unsure
📝 Always document lessons after completion
🔄 Be flexible when encountering problems
💡 Prioritize most efficient approach
🤖 Use agent teams for complex tasks
```

---

## 📋 Checklists

### When Starting a Task
- [ ] Understand task goals and constraints
- [ ] Assess complexity (simple vs complex)
- [ ] Decide whether to use subagents
- [ ] Create task document (for complex tasks)

### During Task Execution
- [ ] Sync progress regularly (long tasks)
- [ ] Immediate notification for key milestones
- [ ] Report after 2 failures
- [ ] Collect subagent progress (if any)

### After Task Completion
- [ ] Deliver results
- [ ] Log lessons to memory/YYYY-MM-DD.md
- [ ] Update tasks/todo.md status
- [ ] Summarize reusable methods

---

**Last updated**: 2026-03-09 12:40
**Based on experience**: CosyVoice 3.0 install + MiroFish deploy + Scrapling integration + GitNexus wrapper

---

## 🤖 AI Autonomous Decision Authorization (Effective 2026-03-08)

> User authorization: xiaoxiaohuang can autonomously decide heartbeat check frequency and content

### Autonomous Check Checklist

**Every session start (mandatory)**:
- [ ] Read `tasks/todo.md` - Check for new tasks
- [ ] Read `memory/yesterday.md` + `memory/today.md` - Understand context
- [ ] `git status` - Project status
- [ ] Check evolver/service running status

**Regular scans (flexible)**:
- Project stuck → Proactively sync
- Found new problem → Log + notify
- Task completed → Report immediately + update status

**Every Sunday (fixed)**:
- [ ] Memory Consolidation - Merge weekly daily notes to MEMORY.md

### Decision Principles
1. **Don't wait** - Start working immediately when you find a task
2. **Transparency** - Sync before major decisions
3. **Documentation** - Write all actions to memory/YYYY-MM-DD.md
4. **Flexibility** - Adjust reporting frequency based on task complexity

---

## 📅 Weekly Sunday Auto Tasks

### Memory Consolidation (Every Sunday 9:00 AM)

**Command**:
```powershell
node scripts/auto-memory.js consolidate
```

**Purpose**: Merge `memory/YYYY-MM-DD.md` files from this week into `MEMORY.md`

**Check**: Run on first heartbeat of each Sunday

**Automation**: 
- Windows Task Scheduler (recommended)
- Or manually run on Sunday heartbeat

---

## 🎯 Skill Usage Strategy (Updated 2026-03-09 12:40)

### Priority Selection (High to Low Efficiency)
```
1️⃣ Direct API call → Fastest, no UI overhead
2️⃣ Installed Skill → Check available_skills list
3️⃣ find-skills search → Community may have ready solutions
4️⃣ Browser automation → Last resort, lowest efficiency
```

### Skill Category Index (54 skills)

#### 📡 Information Retrieval (6 skills)
| Skill | Purpose | Status |
|-------|---------|--------|
| scrapling-mcp | Adaptive web scraper (anti-anti-scraping) | ✅ Available |
| gitnexus-web | GitHub codebase analysis | ✅ Available |
| exa-plus | Exa neural search (paid) | ⏳ Needs API Key |
| exa-web-search-free | Exa free search | ✅ Available |
| news-aggregator | News aggregation | ✅ Available |
| world-monitor | Background monitoring | ✅ Available |

#### 🧠 Memory Management (7 skills)
| Skill | Purpose | Status |
|-------|---------|--------|
| duckdb-memory | Local SQL database | ✅ Available |
| memory-search-queue | Batch memory search queue | ✅ Available |
| api-cache | API response cache | ✅ Available |
| auto-memory | Automatic memory organization | ✅ Available |
| pdf2gep | PDF→GEP asset conversion | ✅ Available |
| jina-embeddings | Text embeddings (Jina API) | ✅ Configured |
| anterior-cingulate-memory | Conflict detection self-check | ✅ Available |

#### 🤖 Task Orchestration (8 skills)
| Skill | Purpose | Status |
|-------|---------|--------|
| orchestrator | Multi-agent parallel orchestration | ✅ Available |
| subagent-queue | Subagent task queue | ✅ Available |
| todo-manager | Todo management | ✅ Available |
| todo-task-planning | File-based task planning | ✅ Available |
| planning-with-files | Manus-style planning | ✅ Available |
| stream-queue | Stream task queue | ✅ Available |
| autonomous-tasks | Autonomous task execution | ✅ Available |
| self-repair | Auto-repair framework | ✅ Available |

#### 🎤 Voice System (11 skills)
| Skill | Purpose | Status |
|-------|---------|--------|
| qwen3-tts | Qwen3 TTS | ⚠️ Needs Python 3.10+ |
| voice-system-python | CosyVoice3 TTS | ✅ Available |
| volcano-voice | VolcEngine TTS | ⏳ Needs API config |
| voice-clone | Voice cloning | ⏳ Needs reference audio |
| whisper-local | Local speech recognition | ✅ Available |
| vad | Voice activity detection | ✅ Available |
| realtime-voice-chat | Real-time voice chat | ⏳ Needs microphone |
| voice-system | Full voice pipeline | ⏳ Needs config |
| tts | Basic TTS | ✅ Available |
| voice-llm-bridge | Voice LLM bridge | ⏳ Pending integration |
| voice-output | espeak-ng output | ✅ Available |

#### 📚 Academic Documents (5 skills)
| Skill | Purpose | Status |
|-------|---------|--------|
| ml-paper-writing | ML/AI paper writing | ✅ Available |
| research-paper-writer | General academic papers | ✅ Available |
| latex-paper-en | LaTeX paper polishing | ✅ Available |
| code-review-quality | Code review | ✅ Available |
| codemapper | AST codebase mapping | ✅ Available |

#### 🎭 Personality Interaction (5 skills)
| Skill | Purpose | Status |
|-------|---------|--------|
| green-tea-persona | Green tea style persona | ✅ Available |
| personas | Multi-persona switching | ✅ Available |
| surprise-protocol | Random creative surprises | ✅ Available |
| mind-blow | Mind-blowing insight generation | ✅ Available |
| agent-reach | Proactive user outreach | ✅ Available |

#### 🔧 System Operations (6 skills)
| Skill | Purpose | Status |
|-------|---------|--------|
| system-monitor | System monitoring & diagnosis | ✅ Available |
| evolver | Self-evolution system | ✅ Running |
| feishu-evolver-wrapper | Feishu integrated reporting | ⏳ Needs Feishu config |
| clawdbot-backup | Config backup & sync | ✅ Available |
| network-automation-framework | Network automation | ✅ Available |
| browserwing | Browser automation | ✅ Available |

#### 📱 Social Media (2 skills)
| Skill | Purpose | Status |
|-------|---------|--------|
| xiaohongshu-mcp | Xiaohongshu automation | ⏳ Needs account config |
| browserwing | Browser automation | ✅ Available |

#### 🎮 Local Project Wrappers (2 skills)
| Skill | Purpose | Status |
|-------|---------|--------|
| mirofish-mcp | Swarm intelligence prediction engine | ✅ Available |
| worldview-mcp | Global real-time intelligence (OSINT) | ✅ Available |

#### 📦 Others (3 skills)
| Skill | Purpose | Status |
|-------|---------|--------|
| autonomous-agent-patterns | Agent design patterns | 📖 Reference docs |
| system-test | System testing | ✅ Available |
| voice-test | Voice testing | ✅ Available |

---

### Decision Tree

```
Need new feature?
    ↓
Has official API/CLI? → Call directly
    ↓ No
Community has ready Skill? → npx skills find
    ↓ No
Needs compile dependencies? → Yes → Browser automation wrapper
    ↓ No
Create new Skill
```

### Best Practices

| Scenario | Recommended Approach |
|----------|---------------------|
| Large file download (>100MB) | Background process + domestic mirror |
| API call fails (404/405) | Analyze state machine dependencies first |
| Python package install | Read version requirements first (Python 3.10+?) |
| Compile dependencies fail | Find alternatives, don't force it |
| Cron task config | Explicitly specify chatId, don't use "last" |
| Using new framework | Read API docs first, don't assume |
| Long tasks (>30 min) | Sync progress regularly |
| Complex tasks (5+ steps) | Use orchestrator to spawn agent team |

### Efficiency Improvement Data

| Method | Time | Description |
|--------|------|-------------|
| Single agent execution | 4.5 hours | CosyVoice install example |
| Agent team | ~1.5 hours | 3-5 subagents in parallel |
| **Improvement** | **3x** | Recommend team for complex tasks |

---

**Today's New Lessons (2026-03-09)**:
- ✅ Origin MCP: Manual restart when auto fails
- ✅ File encoding: Use English to avoid garbled characters
- ✅ Evolver cron: Fixed with explicit Telegram chatId
- ✅ Skill count: 54 skills in 8 categories
