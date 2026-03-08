# Phase 0: Key Guidelines Reading

[← Main](SKILL.md) | [Next: Phase 1 →](PHASE-1-TODO-READING.md)

---

## Overview

Phase 0 reads and applies core development guidelines from the key-guidelines skill to ensure consistent, high-quality implementation throughout all subsequent phases.

**Critical Output:**
- `guidelines_loaded`: Boolean confirming guidelines have been read and understood

---

## Execution Steps

### 1. Load Key Guidelines

Use the Skill tool to invoke the key-guidelines skill:

```
Skill tool invocation:
- skill: "key-guidelines"
- No arguments required
```

The key-guidelines skill provides:
- **Design Principles**: DRY, KISS, YAGNI, SOLID, SoC
- **Development Methodology**: TDD, Micro-commits
- **Quality & Standards**: Code quality, security, documentation, version control

### 2. Confirm Guidelines Understanding

Verify that the following principles will be applied throughout task planning:
- [ ] DRY (Don't Repeat Yourself) - Avoid code duplication
- [ ] KISS (Keep It Simple) - Keep designs simple
- [ ] YAGNI (You Ain't Gonna Need It) - Implement only what's needed
- [ ] SOLID Principles - Follow object-oriented design principles
- [ ] TDD Approach - Use test-driven development
- [ ] Micro-commits - One change per commit

### 3. Set Output Variable

Set `guidelines_loaded = true` to indicate successful completion.

---

## Verification Checkpoint

**[MANDATORY] WAIT: Verify Guidelines Loading**

Before proceeding to Phase 1, ensure:
- [ ] key-guidelines skill has been invoked successfully
- [ ] Core principles have been reviewed
- [ ] `guidelines_loaded = true` is set

**ONLY after confirming ALL of the above, proceed to Phase 1 (TODO File Reading).**

---

[← Main](SKILL.md) | [Next: Phase 1 →](PHASE-1-TODO-READING.md)
