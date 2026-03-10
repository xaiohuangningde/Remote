# Coding Rules

**Created**: 2026-03-10 12:10  
**Priority**: ⭐⭐⭐⭐⭐ (Highest)

---

## ⚠️ Rule #1: No Chinese in Code

### Rule
**All code, comments, configuration, logs, and error messages must be in English!**

### Scope
- ✅ TypeScript files (*.ts)
- ✅ JavaScript files (*.js)
- ✅ Python files (*.py)
- ✅ JSON configuration files (*.json)
- ✅ YAML configuration files (*.yml, *.yaml)
- ✅ Markdown documents (*.md) - Technical documentation
- ✅ Shell scripts (*.sh, *.ps1)
- ✅ Log messages
- ✅ Error messages
- ✅ API responses

### Only Exceptions
- ✅ Conversations with users (Chinese)
- ✅ UI text (Chinese optional)

---

## ❌ Wrong Examples

```typescript
// ❌ Chinese comments
// Responsible for task polling, dispatch, and retry
export class Orchestrator {
  // Maximum concurrent executions
  private maxConcurrent: number
  
  async dispatch(issue: Issue) {
    logger.info("Task dispatched")  // ✅ English string
  }
}
```

```json
// ✅ English configuration
{
  "name": "skill-name",
  "description": "Skill description"
}
```

---

## ✅ Correct Examples

```typescript
// ✅ English comments
// Responsible for task polling, dispatch, and retry
export class Orchestrator {
  // Maximum concurrent executions
  private maxConcurrent: number
  
  async dispatch(issue: Issue) {
    logger.info("Task dispatched")  // ✅ English string
  }
}
```

```json
// ✅ English configuration
{
  "name": "skill-name",
  "description": "Skill description"
}
```

---

## 📋 Checklist

Before creating or modifying any code, must check:

- [ ] All comments are in English
- [ ] All strings are in English
- [ ] All log messages are in English
- [ ] All error messages are in English
- [ ] All configuration keys are in English
- [ ] All configuration values are in English (unless user content)

---

## 🔧 Auto-Check Tools

### PowerShell Check for Chinese
```powershell
# Check if file contains Chinese
Select-String -Pattern "[\u4e00-\u9fff]" -Path "src/**/*.ts"

# Should have no output
```

### VS Code Extensions
- Chinese Character Remover
- English Only

---

## 🚨 Violation Consequences

If Chinese is found in code:
1. Fix immediately
2. Record to MEMORY.md
3. Update this document

---

## 📝 Memory Points

**Remember this rule**:
> "Code in English, Talk in Chinese"

**Mnemonic**:
- 💻 Code = English (universal)
- 💬 Conversation = Chinese (user communication)

---

## 🎯 Apply to Subagents

When spawning subagents, must include in task description:

```markdown
## ⚠️ Important Rule

**No Chinese comments in code!**
- All comments must be in **English**
- All strings must be in **English**
- Only use Chinese when talking to users
- Code, comments, logs, errors all in English
```

---

**Created**: 2026-03-10 12:10  
**Last Updated**: 2026-03-10 12:10  
**Next Check**: Before every code modification
