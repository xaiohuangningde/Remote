# Phase 3: Plan Subagent

[← Previous: Phase 2](PHASE-2-EXPLORE.md) | [Next: Phase 4 →](PHASE-4-PROJECT-MANAGER.md)

---

## Overview

Phase 2 calls the Plan subagent to design implementation strategy based on exploration results from Phase 1.

**Critical Output:**
- `planning_results`: Structured data containing implementation plan

**[CRITICAL] ONE TASK TOOL PER MESSAGE**:
- Call the Plan Task tool in THIS message
- **STOP** after calling the Task tool
- **WAIT** for the tool result to arrive in the NEXT message
- **DO NOT** call project-manager in the same message

---

## Prerequisites

**[WARNING] MANDATORY PRECONDITION: Phase 1 Explore Subagent MUST Be Completed First**

**DO NOT proceed with Phase 2 unless ALL of the following are confirmed:**
- [ ] Phase 1 Explore subagent has successfully completed
- [ ] `exploration_results` variable exists and contains data
- [ ] No errors occurred during exploration

**Verify Argument Parsing Variables (from Phase 0)**:
- [ ] `HAS_PR_OPTION` is set (boolean value, not undefined)
- [ ] `HAS_BRANCH_OPTION` is set (boolean value, not undefined)
- [ ] `BRANCH_NAME` is set (string value, may be empty if auto-generation needed)
- [ ] `IS_AUTO_GENERATED` is set (boolean value, not undefined)
- [ ] If `HAS_BRANCH_OPTION = true` and `IS_AUTO_GENERATED = true`, verify `BRANCH_NAME` was populated in Phase 0
- [ ] Report to user if variables are NOT set (CRITICAL ERROR)

**Why This Matters:**
The Plan subagent requires exploration results (`exploration_results.summary`, `exploration_results.files`, `exploration_results.patterns`, `exploration_results.tech_stack`) to create an accurate implementation plan. Running Plan before Explore completes will result in incomplete or incorrect planning.

**ONLY after confirming the above, execute the Plan subagent Task tool.**

---

## Execution Steps

### 1. Verify exploration_results Exists

```typescript
// ⚠️ IMPORTANT: This Task call MUST happen AFTER Phase 1 (Explore) completes
// Verify exploration_results exists before proceeding
if (!exploration_results) {
  throw new Error("Cannot proceed: exploration_results not found. Phase 1 must complete first.");
}
```

### 2. Call Plan Task Tool

**YOU MUST:**
1. Verify `exploration_results` exists from Phase 1
2. Call the Plan Task tool in this message (pass `exploration_results` in prompt)
3. **STOP** after calling the Task tool
4. **WAIT** for the tool result to arrive
5. Verify `planning_results` contains valid data
6. **DO NOT** call project-manager Task tool in the same message

**Task tool execution example**:
```typescript
Task({
  subagent_type: "Plan",
  description: "Implementation planning for [feature name]",
  prompt: `
    Create detailed implementation plan using exploration results.
    Include: approach, step-by-step tasks, critical files, trade-offs, risks, feasibility assessment.
    Context: ${exploration_results.summary}
  `
})
```

### 3. Saving Results

**Subagent responsibility**:
- Return structured data in variable `planning_results` containing:
  - `approach_summary`: Implementation strategy (2-3 paragraphs)
  - `tasks`: Array of task objects with descriptions and dependencies
  - `critical_files`: Files to create/modify with their roles
  - `trade_offs`: Technical trade-offs analysis
  - `risks`: Potential risks and mitigation strategies
  - `feasibility`: Task categorization by status (✅⏳🔍🚧)
- **IMPORTANT**: Subagent does NOT create files directly (Task tool limitation)

**Main Claude executor responsibility** (executed in Phase 8):
- **MANDATORY**: Use Write tool to create `docs/memory/planning/YYYY-MM-DD-[feature]-plan.md`
- Format: Transform planning_results data into structured markdown
- Sections: Approach, Task Breakdown, Critical Files, Trade-offs, Risks and Mitigation, Feasibility Assessment
- Verification: File creation will be confirmed in Phase 4

---

## Verification Checkpoint

**[WARNING] WAIT: Verify Plan Subagent Completion**

**THIS IS A MANDATORY CHECKPOINT - DO NOT PROCEED UNTIL VERIFIED:**

Before proceeding to Phase 3, ensure:
- [ ] Plan subagent Task tool has completed successfully
- [ ] You have **RECEIVED** the Task tool result in the conversation
- [ ] `planning_results` variable contains valid data
- [ ] `planning_results` includes exploration context from Phase 1
- [ ] NO errors occurred during planning

**IF ANY OF THE ABOVE ARE NOT TRUE:**
- [PROHIBITED] **STOP** - Do not proceed to Phase 3
- Investigate what went wrong
- Fix the issue before continuing

**ONLY after confirming ALL of the above in a NEW message, proceed to Phase 3 (project-manager).**

---

[← Previous: Phase 2](PHASE-2-EXPLORE.md) | [Next: Phase 4 →](PHASE-4-PROJECT-MANAGER.md)
