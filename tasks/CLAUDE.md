# CLAUDE.md - Autonomous Task Execution

Every task execution MUST follow this workflow:

## Workflow

### 1. Initialize
Read relevant files to understand the task:
- Read `tasks/task.json` for task list
- Read `tasks/architecture.md` for project spec
- Read `tasks/progress.txt` for previous work

### 2. Select Task
Choose ONE task where `passes: false`:
- Consider dependencies - fundamental features first
- Pick the highest-priority incomplete task

### 3. Implement
Follow the task steps:
- Write code to satisfy all steps
- Follow existing patterns

### 4. Verify (MANDATORY)
- **UI changes**: Test in browser
- **Code changes**: Run lint/build
- **Bash changes**: Verify output

Verification checklist:
- [ ] No lint errors
- [ ] Build succeeds
- [ ] Functionality works (browser test if UI-related)

### 5. Update Progress
Write to `tasks/progress.txt`:
```
## [Date] - Task: [task name]

### What was done:
- [specific changes]

### Testing:
- [how verified]

### Notes:
- [any relevant notes]
```

### 6. Commit
All changes in ONE commit:
```bash
git add .
git commit -m "[task description] - completed"
```

### 7. Update Task
Update `tasks/task.json`:
- Change `passes: false` to `passes: true`

---

## Rules

### Do
- ✅ Only mark `passes: true` after verification
- ✅ Test in browser for UI changes
- ✅ Run lint/build for code changes
- ✅ Document progress in progress.txt
- ✅ One task per session

### Don't
- ❌ Never delete or modify task descriptions
- ❌ Never remove tasks from the list
- ❌ Don't commit if blocked

---

## Blocking Rules

When blocked and cannot proceed:

**DO NOT:**
- ❌ Commit incomplete work
- ❌ Mark passes: true
- ❌ Pretend task is done

**DO:**
- ✅ Write clear blocking info to progress.txt
- ✅ Explain what human help is needed
- ✅ Stop and wait for intervention

```
🚫 BLOCKED - Human Intervention Required

**Task**: [task name]
**Completed**: [what was done]
**Blocked by**: [reason]
**Need help**:
1. [specific step 1]
2. [specific step 2]

**To continue**: [command to run after fix]
```

---

## File Structure

```
tasks/
├── CLAUDE.md       # This file - workflow
├── task.json       # Task definitions (source of truth)
├── progress.txt    # Progress log
├── architecture.md # Project specification
└── todo.md        # Quick tracking
```

## Quick Commands

```bash
# Show progress
python -c "import json; t=json.load(open('tasks/task.json')); p=[x for x in t if x['passes']]; print(f'{len(p)}/{len(t)} tasks complete')"

# Show current task
python -c "import json; t=json.load(open('tasks/task.json')); print([x['description'] for x in t if not x['passes']][0])"
```
