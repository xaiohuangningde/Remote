# Auto-Memory Skill

> Automatic memory and task state management

---

## Purpose

Automatically writes session summaries, lessons learned, and syncs todo.md state at key lifecycle points. Solves the "mental notes don't survive session restarts" problem.

---

## Usage

### Session Summary (at session end)

```javascript
// In your session cleanup or before /new
await exec('node scripts/auto-memory.js session-summary \'{"summary":"Completed X setup", "keyDecisions":["Chose Y over Z"], "openThreads":["Need to test W"]}\'')
```

### Lesson Learned (after task completion)

```javascript
// After solving a problem
await exec('node scripts/auto-memory.js lesson \'{"pattern":"Model download failed due to wrong ID", "solution":"Check README for correct model ID before downloading", "category":"Model Management"}\'')
```

### Weekly Consolidation (Sundays)

```javascript
// Auto-runs on Sundays, or trigger manually
await exec('node scripts/auto-memory.js consolidate')
```

---

## Todo Sync Commands

### Start Task

```javascript
await exec('node scripts/auto-todo-sync.js start \'{"title":"Install CosyVoice3", "id":"cosyvoice-install", "details":"Download and setup"}\'')
```

### Complete Task

```javascript
await exec('node scripts/auto-todo-sync.js complete \'{"id":"cosyvoice-install", "summary":"Successfully installed with zero-shot TTS working"}\'')
```

### Block Task

```javascript
await exec('node scripts/auto-todo-sync.js block \'{"id":"cosyvoice-install", "reason":"ModelScope connection timeout", "attempts":2}\'')
```

### Unblock Task

```javascript
await exec('node scripts/auto-todo-sync.js unblock \'{"id":"cosyvoice-install"}\'')
```

### Add to Backlog

```javascript
await exec('node scripts/auto-todo-sync.js backlog \'{"title":"Research alternative TTS", "id":"tts-research", "priority":"low"}\'')
```

---

## Integration Points

### 1. Session End Detection
Trigger `session-summary` when:
- User sends `/new` or `/reset`
- No interaction for >30 minutes (heartbeat timeout)
- Agent detects session is wrapping up

### 2. Task Completion
Trigger `lesson` after:
- Any task marked complete in todo.md
- Problem solved that required debugging
- New pattern discovered

### 3. Todo State Changes
Trigger todo-sync on:
- Task start (when beginning work)
- Task complete (when finished)
- Task blocked (when stuck)

---

## File Locations

| File | Purpose |
|------|---------|
| `scripts/auto-memory.js` | Main script |
| `scripts/auto-todo-sync.js` | Todo sync script |
| `memory/YYYY-MM-DD.md` | Daily session logs |
| `tasks/lessons.md` | Lessons learned |
| `tasks/todo.md` | Task tracker |
| `MEMORY.md` | Long-term memory (weekly consolidation) |

---

## Example Workflow

```
1. User: "Install CosyVoice3"
2. Agent: 
   - Call auto-todo-sync.js start
   - Begin installation
3. Installation fails twice
   - Call auto-todo-sync.js block (after 2 attempts)
   - Ask user for help
4. User provides solution
   - Call auto-todo-sync.js unblock
   - Continue installation
5. Installation succeeds
   - Call auto-todo-sync.js complete
   - Call auto-memory.js lesson (document the fix)
6. Session ends
   - Call auto-memory.js session-summary
```

---

## Benefits

| Before | After |
|--------|-------|
| Mental notes lost on restart | Everything written to files |
| Manual todo.md updates | Automatic state sync |
| Lessons scattered | Centralized lessons.md |
| Weekly review manual | Auto-consolidation on Sundays |

---

## Testing

```powershell
# Test session summary
node scripts/auto-memory.js session-summary "{\"summary\":\"Test session\", \"keyDecisions\":[\"Test decision\"], \"openThreads\":[\"Test thread\"]}"

# Test lesson
node scripts/auto-memory.js lesson "{\"pattern\":\"Test pattern\", \"solution\":\"Test solution\", \"category\":\"Test\"}"

# Test todo sync
node scripts/auto-todo-sync.js start "{\"title\":\"Test Task\", \"id\":\"test-123\"}"
node scripts/auto-todo-sync.js complete "{\"id\":\"test-123\", \"summary\":\"Test completed\"}"

# Test consolidate (only works on Sundays)
node scripts/auto-memory.js consolidate
```
