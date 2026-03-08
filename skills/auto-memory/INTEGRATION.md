# Auto-Memory Integration Guide

> How to integrate auto-memory with OpenClaw session lifecycle

---

## Integration Points

### 1. Session End Detection

**Trigger**: When `/new` or `/reset` is received, or session timeout

**Action**: Call `session-summary` before session ends

**Implementation**:

```javascript
// In your session cleanup handler or before responding to /new
const summary = {
  summary: "Brief summary of what was accomplished",
  keyDecisions: ["Decision 1", "Decision 2"],
  openThreads: ["Thread to continue next session"]
};

await exec(`node scripts/auto-memory.js session-summary '${JSON.stringify(summary)}'`);
```

**When to call**:
- User sends `/new` or `/reset`
- Heartbeat timeout (>30 min no interaction)
- Agent detects session is wrapping up (natural conclusion)

---

### 2. Task Lifecycle Integration

**Trigger**: Task state changes in `tasks/todo.md`

**Actions**:

#### Task Start
```javascript
// When beginning work on a task
await exec(`node scripts/auto-todo-sync.js start '${JSON.stringify({
  title: "Task title",
  id: "task-unique-id",
  details: "Optional details"
})}'`);
```

#### Task Complete
```javascript
// When task is finished and verified
await exec(`node scripts/auto-todo-sync.js complete '${JSON.stringify({
  id: "task-unique-id",
  summary: "What was accomplished"
})}'`);

// Also write a lesson
await exec(`node scripts/auto-memory.js lesson '${JSON.stringify({
  pattern: "What pattern was learned",
  solution: "How it was solved",
  category: "Category name"
})}'`);
```

#### Task Blocked
```javascript
// After 2 failed attempts
await exec(`node scripts/auto-todo-sync.js block '${JSON.stringify({
  id: "task-unique-id",
  reason: "Why blocked",
  attempts: 2
})}'`);

// Then notify user for help
```

#### Task Unblocked
```javascript
// When blocker is resolved
await exec(`node scripts/auto-todo-sync.js unblock '${JSON.stringify({
  id: "task-unique-id"
})}'`);
```

---

### 3. Weekly Consolidation (Cron)

**Trigger**: Every Sunday

**Action**: Run `consolidate` command

**Windows Task Scheduler**:

```powershell
# Create scheduled task (run as administrator)
$action = New-ScheduledTaskAction -Execute "node" -Argument "C:\Users\12132\.openclaw\workspace\scripts\auto-memory.js consolidate" -WorkingDirectory "C:\Users\12132\.openclaw\workspace"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 9am
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType S4U -RunLevel Highest
Register-ScheduledTask -TaskName "OpenClaw-Weekly-Memory" -Action $action -Trigger $trigger -Principal $principal -Description "Consolidate weekly memory files into MEMORY.md"
```

**Alternative: OpenClaw Heartbeat**

Add to `HEARTBEAT.md`:

```markdown
## Weekly Memory Consolidation

**When**: Every Sunday at 9:00 AM

**Command**: 
```powershell
node scripts/auto-memory.js consolidate
```

**Check**: Run on first heartbeat after 9:00 AM on Sundays
```

---

## Workflow Examples

### Example 1: Simple Task

```
1. User: "Install CosyVoice3"
2. Agent: 
   - Call auto-todo-sync.js start
   - Begin installation
3. Installation completes
   - Call auto-todo-sync.js complete
   - Call auto-memory.js lesson
4. Session ends
   - Call auto-memory.js session-summary
```

### Example 2: Task with Blocker

```
1. User: "Deploy to production"
2. Agent:
   - Call auto-todo-sync.js start
   - Attempt deployment (fails)
   - Attempt again (fails)
3. After 2 failures:
   - Call auto-todo-sync.js block
   - Notify user: "Blocked after 2 attempts, need help with X"
4. User provides solution
   - Call auto-todo-sync.js unblock
   - Continue deployment
5. Deployment succeeds
   - Call auto-todo-sync.js complete
   - Call auto-memory.js lesson
```

### Example 3: Long Multi-Session Task

```
Session 1:
- Start task
- Complete phase 1
- Session summary

Session 2:
- Continue task (already in progress)
- Complete phase 2
- Session summary

Session 3:
- Complete final phase
- Complete task
- Write lesson
- Session summary
```

---

## State-Driven Protocol

### Task State Format

```markdown
### 🔄 Task Title

> ID: task-unique-id
> Started: 2026-03-08T09:00:00+08:00
> Status: running|blocked|done|pending
> Attempts: 0 (optional, for blocked tasks)

Task details here...
```

### State Transitions

```
pending → running (on start)
running → done (on complete)
running → blocked (after 2 failures)
blocked → running (on unblock)
```

### Automatic Writes

| Event | Write To |
|-------|----------|
| Task start | `tasks/todo.md` (In Progress) |
| Task complete | `tasks/todo.md` (Completed) + `tasks/lessons.md` |
| Task blocked | `tasks/todo.md` (mark blocked) |
| Session end | `memory/YYYY-MM-DD.md` |
| Sunday 9am | `MEMORY.md` (consolidation) |

---

## Testing Integration

### Test Session Summary

```powershell
node scripts/auto-memory.js session-summary "{\"summary\":\"Test session\",\"keyDecisions\":[\"Test\"],\"openThreads\":[\"Continue X\"]}"
```

Verify: `memory/2026-03-08.md` updated

### Test Lesson

```powershell
node scripts/auto-memory.js lesson "{\"pattern\":\"Test pattern\",\"solution\":\"Test solution\",\"category\":\"Testing\"}"
```

Verify: `tasks/lessons.md` updated

### Test Todo Sync

```powershell
node scripts/auto-todo-sync.js start "{\"title\":\"Test Task\",\"id\":\"test-123\"}"
node scripts/auto-todo-sync.js complete "{\"id\":\"test-123\",\"summary\":\"Done\"}"
```

Verify: `tasks/todo.md` updated

---

## Best Practices

### 1. Write Early, Write Often
- Don't wait until session end to write lessons
- Write immediately after solving a problem

### 2. Be Specific
- Bad: "Fixed bug"
- Good: "Fixed PowerShell JSON quote stripping with regex"

### 3. Include Context
- Why was this decision made?
- What alternatives were considered?
- What should next-session know?

### 4. Keep It Actionable
- Open threads should be specific next steps
- Not: "Continue work"
- Yes: "Test Qwen3-TTS with microphone input"

---

## Troubleshooting

### PowerShell Quote Stripping

If JSON parsing fails, the script has built-in fixes. But you can also:

```powershell
# Use single quotes around JSON
node scripts/auto-memory.js lesson '{\"pattern\":\"test\"}'

# Or use a variable
$json = '{"pattern":"test","solution":"fix"}'
node scripts/auto-memory.js lesson $json
```

### Memory File Not Created

Check:
1. `memory/` directory exists
2. Script has write permissions
3. Date format is correct (YYYY-MM-DD)

### Todo Sync Not Working

Check:
1. `tasks/todo.md` exists and has correct format
2. Task ID matches between start/complete
3. Section headers are exactly: `## In Progress`, `## Completed`, `## Backlog`

---

## Future Enhancements

### Session End Hook
Create a wrapper that auto-detects session end:

```javascript
// skills/auto-memory/src/session-end.js
import { exec } from 'child_process'

export async function onSessionEnd(summary) {
  return new Promise((resolve) => {
    exec(`node scripts/auto-memory.js session-summary '${JSON.stringify(summary)}'`, resolve)
  })
}
```

### Task Wrapper
```javascript
// skills/auto-memory/src/task.js
export async function withTaskTracking(id, title, fn) {
  await startTask({ id, title })
  try {
    const result = await fn()
    await completeTask({ id, summary: result })
    return result
  } catch (error) {
    await blockTask({ id, reason: error.message })
    throw error
  }
}
```

---

## Quick Reference

| Command | When | Example |
|---------|------|---------|
| `start` | Beginning task | `node scripts/auto-todo-sync.js start '{"title":"X","id":"123"}'` |
| `complete` | Task done | `node scripts/auto-todo-sync.js complete '{"id":"123","summary":"Done"}'` |
| `block` | Stuck (2+ failures) | `node scripts/auto-todo-sync.js block '{"id":"123","reason":"X","attempts":2}'` |
| `unblock` | Blocker resolved | `node scripts/auto-todo-sync.js unblock '{"id":"123"}'` |
| `lesson` | After solving | `node scripts/auto-memory.js lesson '{"pattern":"X","solution":"Y"}'` |
| `session-summary` | Session end | `node scripts/auto-memory.js session-summary '{"summary":"..."}'` |
| `consolidate` | Sundays | `node scripts/auto-memory.js consolidate` |
