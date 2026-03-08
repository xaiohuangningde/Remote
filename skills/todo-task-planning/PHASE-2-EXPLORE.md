# Phase 2: Explore Subagent

 [← Previous: Phase 1](PHASE-1-TODO-READING.md) | [Next: Phase 3 →](PHASE-3-PLAN.md)

---

## Overview

Phase 2 calls the Explore subagent to discover related files, patterns, and dependencies through comprehensive codebase exploration.

**Critical Output:**
- `exploration_results`: Structured data containing codebase exploration findings

**[CRITICAL] ONE TASK TOOL PER MESSAGE**:
- Call the Explore Task tool in THIS message
- **STOP** after calling the Task tool
- **WAIT** for the tool result to arrive in the NEXT message
- **DO NOT** call Plan or project-manager in the same message

---

## Prerequisites

Before starting Phase 1, verify:
- [ ] Phase 1 completed successfully
- [ ] TODO file has been read
- [ ] Context has been prepared

---

## Execution Steps

### 1. Call Explore Task Tool

**YOU MUST:**
1. Call the Explore Task tool in this message
2. **STOP** after calling the Task tool
3. **WAIT** for the tool result to arrive
4. Verify `exploration_results` contains valid data
5. **DO NOT** call Plan or project-manager Task tools in the same message

**Task tool execution example**:
```typescript
// Conceptual example - Explore subagent for codebase investigation
Task({
  subagent_type: "Explore",
  description: "Codebase exploration for [feature name]",
  prompt: `
    Investigate [feature area] in the codebase.

    Focus on: related files, dependencies, test coverage, existing patterns.
    Thoroughness: [quick/medium/very thorough]

    Return: key files, patterns, tech stack, blockers, recommendations.
  `
});
```

### 2. Saving Results

**Subagent responsibility**:
- Return structured data in variable `exploration_results` containing:
  - `summary`: Overall findings summary (required)
  - `files`: Array of {path, purpose, importance} objects
  - `patterns`: Existing patterns and conventions
  - `tech_stack`: Technologies and frameworks used
  - `blockers`: Potential blockers and constraints
  - `recommendations`: Recommendations for planning phase
- **IMPORTANT**: Subagent does NOT create files directly (Task tool limitation)

**Main Claude executor responsibility** (executed in Phase 9):
- **MANDATORY**: Use Write tool to create `docs/memory/explorations/YYYY-MM-DD-[feature]-exploration.md`
- Format: Transform exploration_results data into structured markdown
- Sections: Summary, Key Discoveries, Patterns, Tech Stack, Blockers, Recommendations
- Verification: File creation will be confirmed in Phase 5

---

## Verification Checkpoint

**[WARNING] WAIT: Verify Explore Subagent Completion**

**THIS IS A MANDATORY CHECKPOINT - DO NOT PROCEED UNTIL VERIFIED:**

Before proceeding to Phase 3, ensure:
- [ ] Explore subagent Task tool has completed successfully
- [ ] You have **RECEIVED** the Task tool result in the conversation
- [ ] `exploration_results` variable contains valid data
- [ ] NO errors occurred during exploration

**IF ANY OF THE ABOVE ARE NOT TRUE:**
- [PROHIBITED] **STOP** - Do not proceed to Phase 3
- Investigate what went wrong
- Fix the issue before continuing

**ONLY after confirming ALL of the above in a NEW message, proceed to Phase 3 (Plan Subagent).**

---

 [← Previous: Phase 1](PHASE-1-TODO-READING.md) | [Next: Phase 3 →](PHASE-3-PLAN.md)
