# Task Management (Simplified Mode)

Based on the SamuelQZQ auto-coding-agent-demo pattern.

## Quick Start

See `CLAUDE.md` for full workflow.

## File Structure

| File | Purpose |
|------|---------|
| `CLAUDE.md` | **Primary** - Complete workflow definition |
| `task.json` | Task list (source of truth) |
| `progress.txt` | Session progress log |
| `architecture.md` | Project specification |
| `todo.md` | Quick tracking |

## Key Principles

1. **One task at a time** - Focus on completing one task well
2. **Verify before marking complete** - Test in browser or run lint/build
3. **Document progress** - Write to progress.txt
4. **One commit per task** - Code + task.json + progress.txt together
5. **Never remove tasks** - Only flip passes: false → true

## Blocking Rules

When blocked:
- ❌ Don't commit incomplete work
- ✅ Write blocking info to progress.txt
- ✅ Wait for human intervention

## Example Task (task.json)

```json
{
  "id": 1,
  "description": "User can send message",
  "steps": [
    "Open chat interface",
    "Type message",
    "Click send",
    "Verify message appears"
  ],
  "priority": "high",
  "passes": false
}
```
