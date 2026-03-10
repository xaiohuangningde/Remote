# HEARTBEAT.md - Task Execution Strategy

> Core: Proactive sync, smart collaboration, continuous logging

---

## ðŸ“Š Long Task Progress Sync

### Sync Frequency
| Task Duration | Sync Frequency | Method |
|---------------|----------------|--------|
| < 30 min | Report on completion | One-time notification |
| 30-60 min | Every 15 min | Brief progress |
| > 60 min | Every 30 min | Detailed progress + ETA |

### Sync Content
```markdown
ðŸ“Š Progress Update
- Current phase: XXX (3/5)
- Completion: 60%
- Time spent: 45 min
- ETA: 17:30
- Blockers: 0
```

### Immediate Notifications for Key Milestones
- âœ?Phase completed
- â?Failed more than 2 times
- âš ï¸ Needs user decision
- ðŸ’¡ Found better approach

---

## ðŸ¤– Smart Agent Team Usage

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
â”œâ”€ Subagent 1: Task A
â”œâ”€ Subagent 2: Task B
â”œâ”€ Subagent 3: Task C
â””â”€ Main Agent: Coordinate + Sync + Problem Solving
```

### Subagent Management
- Define clear task goals when creating
- Collect progress regularly
- Sync summary to user
- Intervene when problems arise

---

## ðŸ“ Memory Logging Rules

### Logging Levels
| Type | File | Content |
|------|------|---------|
| Daily notes | `memory/YYYY-MM-DD.md` | Today's tasks, conversations, progress |
| Long-term memory | `MEMORY.md` | Important events, user preferences, lessons |
| Task status | `tasks/todo.md` | Todo items, progress tracking |
| Lessons learned | Project docs | Reusable methods, pitfall records |

### When to Log
- Task starts â†?Create task document
- Key decisions â†?Record reasoning and solution
- Task completes â†?Summarize lessons learned
- User preferences â†?Write to MEMORY.md immediately

### Logging Principle
> "Mental notes" are unreliable, write it down to persist!

---

## âš ï¸ Exception Handling

### Failure Handling
| Failure Count | Action |
|---------------|--------|
| 1st | Try to solve yourself |
| 2nd | Try alternative approach |
| 3rd | Report to user, ask for guidance |

### When to Communicate
1. Unclear requirements â†?Ask before doing
2. Multiple approaches â†?List pros/cons for user to decide
3. Technical difficulties â†?Explain situation, give recommendations
4. Needs external resources â†?e.g., send email, register account
5. Risk of failure â†?Inform in advance

---

## ðŸŽ¯ Core Principles

```
âœ?Solve directly if you can
â?Ask first if unsure
ðŸ“ Always document lessons after completion
ðŸ”„ Be flexible when encountering problems
ðŸ’¡ Prioritize most efficient approach
ðŸ¤– Use agent teams for complex tasks
```

---

## ðŸ“‹ Checklists

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

## ðŸ¤– AI Autonomous Decision Authorization (Effective 2026-03-08)

> User authorization: xiaoxiaohuang can autonomously decide heartbeat check frequency and content

### Autonomous Check Checklist

**Every session start (mandatory)**:
- [ ] Read `tasks/todo.md` - Check for new tasks
- [ ] Read `memory/yesterday.md` + `memory/today.md` - Understand context
- [ ] `git status` - Project status
- [ ] Check evolver/service running status

**Regular scans (flexible)**:
- Project stuck â†?Proactively sync
- Found new problem â†?Log + notify
- Task completed â†?Report immediately + update status

**Every Sunday (fixed)**:
- [ ] Memory Consolidation - Merge weekly daily notes to MEMORY.md

### Decision Principles
1. **Don't wait** - Start working immediately when you find a task
2. **Transparency** - Sync before major decisions
3. **Documentation** - Write all actions to memory/YYYY-MM-DD.md
4. **Flexibility** - Adjust reporting frequency based on task complexity

---

## ðŸ“… Weekly Sunday Auto Tasks

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

## ðŸŽ¯ Skill Usage Strategy (Updated 2026-03-09 12:40)

### Priority Selection (High to Low Efficiency)
```
1ï¸âƒ£ Direct API call â†?Fastest, no UI overhead
2ï¸âƒ£ Installed Skill â†?Check available_skills list
3ï¸âƒ£ find-skills search â†?Community may have ready solutions
4ï¸âƒ£ Browser automation â†?Last resort, lowest efficiency
```

### Skill Category Index (54 skills)

#### ðŸ“¡ Information Retrieval (6 skills)
| Skill | Purpose | Status |
|-------|---------|--------|
| scrapling-mcp | Adaptive web scraper (anti-anti-scraping) | âœ?Available |
| gitnexus-web | GitHub codebase analysis | âœ?Available |
| exa-plus | Exa neural search (paid) | â?Needs API Key |
| exa-web-search-free | Exa free search | âœ?Available |
| news-aggregator | News aggregation | âœ?Available |
| world-monitor | Background monitoring | âœ?Available |

#### ðŸ§  Memory Management (7 skills)
| Skill | Purpose | Status |
|-------|---------|--------|
| duckdb-memory | Local SQL database | âœ?Available |
| memory-search-queue | Batch memory search queue | âœ?Available |
| api-cache | API response cache | âœ?Available |
| auto-memory | Automatic memory organization | âœ?Available |
| pdf2gep | PDFâ†’GEP asset conversion | âœ?Available |
| jina-embeddings | Text embeddings (Jina API) | âœ?Configured |
| anterior-cingulate-memory | Conflict detection self-check | âœ?Available |

#### ðŸ¤– Task Orchestration (8 skills)
| Skill | Purpose | Status |
|-------|---------|--------|
| orchestrator | Multi-agent parallel orchestration | âœ?Available |
| subagent-queue | Subagent task queue | âœ?Available |
| todo-manager | Todo management | âœ?Available |
| todo-task-planning | File-based task planning | âœ?Available |
| planning-with-files | Manus-style planning | âœ?Available |
| stream-queue | Stream task queue | âœ?Available |
| autonomous-tasks | Autonomous task execution | âœ?Available |
| self-repair | Auto-repair framework | âœ?Available |

#### ðŸŽ¤ Voice System (11 skills)
| Skill | Purpose | Status |
|-------|---------|--------|
| qwen3-tts | Qwen3 TTS | âš ï¸ Needs Python 3.10+ |
| voice-system-python | CosyVoice3 TTS | âœ?Available |
| volcano-voice | VolcEngine TTS | â?Needs API config |
| voice-clone | Voice cloning | â?Needs reference audio |
| whisper-local | Local speech recognition | âœ?Available |
| vad | Voice activity detection | âœ?Available |
| realtime-voice-chat | Real-time voice chat | â?Needs microphone |
| voice-system | Full voice pipeline | â?Needs config |
| tts | Basic TTS | âœ?Available |
| voice-llm-bridge | Voice LLM bridge | â?Pending integration |
| voice-output | espeak-ng output | âœ?Available |

#### ðŸ“š Academic Documents (5 skills)
| Skill | Purpose | Status |
|-------|---------|--------|
| ml-paper-writing | ML/AI paper writing | âœ?Available |
| research-paper-writer | General academic papers | âœ?Available |
| latex-paper-en | LaTeX paper polishing | âœ?Available |
| code-review-quality | Code review | âœ?Available |
| codemapper | AST codebase mapping | âœ?Available |

#### ðŸŽ­ Personality Interaction (5 skills)
| Skill | Purpose | Status |
|-------|---------|--------|
| green-tea-persona | Green tea style persona | âœ?Available |
| personas | Multi-persona switching | âœ?Available |
| surprise-protocol | Random creative surprises | âœ?Available |
| mind-blow | Mind-blowing insight generation | âœ?Available |
| agent-reach | Proactive user outreach | âœ?Available |

#### ðŸ”§ System Operations (6 skills)
| Skill | Purpose | Status |
|-------|---------|--------|
| system-monitor | System monitoring & diagnosis | âœ?Available |
| evolver | Self-evolution system | âœ?Running |
| feishu-evolver-wrapper | Feishu integrated reporting | â?Needs Feishu config |
| clawdbot-backup | Config backup & sync | âœ?Available |
| network-automation-framework | Network automation | âœ?Available |
| browserwing | Browser automation | âœ?Available |

#### ðŸ“± Social Media (2 skills)
| Skill | Purpose | Status |
|-------|---------|--------|
| xiaohongshu-mcp | Xiaohongshu automation | â?Needs account config |
| browserwing | Browser automation | âœ?Available |

#### ðŸŽ® Local Project Wrappers (2 skills)
| Skill | Purpose | Status |
|-------|---------|--------|
| mirofish-mcp | Swarm intelligence prediction engine | âœ?Available |
| worldview-mcp | Global real-time intelligence (OSINT) | âœ?Available |

#### ðŸ“¦ Others (3 skills)
| Skill | Purpose | Status |
|-------|---------|--------|
| autonomous-agent-patterns | Agent design patterns | ðŸ“– Reference docs |
| system-test | System testing | âœ?Available |
| voice-test | Voice testing | âœ?Available |

---

### Decision Tree

```
Need new feature?
    â†?Has official API/CLI? â†?Call directly
    â†?No
Community has ready Skill? â†?npx skills find
    â†?No
Needs compile dependencies? â†?Yes â†?Browser automation wrapper
    â†?No
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
- âœ?Origin MCP: Manual restart when auto fails
- âœ?File encoding: Use English to avoid garbled characters
- âœ?Evolver cron: Fixed with explicit Telegram chatId
- âœ?Skill count: 54 skills in 8 categories

---

## Workflow Rules (2026-03-10)

1. User messages must get instant replies. Any operation >5s runs in background.
2. Use first principles thinking. Don't assume user knows exactly what they want.
3. Real work goes to Claude Code in tmux. Tasks should be small, clear, with acceptance criteria.
4. Every heartbeat must check Claude Code progress. Unchanged data = kill and retry.
5. Heartbeat uses cheap models (e.g. step-3.5-flash) due to long system prompt.
6. Keep context under 100k. Proactively compact, don't wait for explosion.
7. Commit early, commit often. No local accumulation.
8. Claude Code may lack env vars (API key, proxy). Confirm before launch, require git commit.
9. Keep workflow code clean. Delete temp scripts, no garbage in git.
10. You're on duty, not just completing tasks. Patrol proactively - check Claude Code, progress, anomalies. Worth 10x more than passive waiting.
