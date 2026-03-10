# Phase 5: Verification

[← Previous: Phase 4](PHASE-4-PROJECT-MANAGER.md) | [Next: Phase 6 →](PHASE-6-ANALYSIS.md)

---

## Overview

Phase 4 verifies that all subagents (Phase 2-4) completed successfully and prepares for subsequent phases.

**Purpose:**
- Verify sequential execution order
- Confirm all variables exist
- Check docs/memory files (create if missing)
- Prepare for Phase 5

---

## Verification Steps

### 1. Subagent Execution Verification

**[WARNING] Verify Sequential Execution Order**
- [ ] Phase 1 (Explore) completed FIRST
- [ ] Phase 2 (Plan) completed SECOND (after Explore)
- [ ] Phase 3 (project-manager) completed THIRD (after Plan)

**Confirm all subagents completed successfully**
- [ ] No errors in Explore subagent execution
- [ ] No errors in Plan subagent execution
- [ ] No errors in project-manager skill execution

**Verify Variable Dependencies**
- [ ] `exploration_results` exists and contains valid data
- [ ] `planning_results` exists and contains valid data
- [ ] `strategic_plan` exists and contains valid data

**Report to user if there are errors**
- Clearly state which phase failed
- Explain the impact on subsequent phases
- Recommend corrective action

### 2. docs/memory File Confirmation

**Check if exploration file exists**: `docs/memory/explorations/YYYY-MM-DD-[feature]-exploration.md`
- [ ] **If NOT exists**: [CRITICAL] CRITICAL ERROR - Exploration file must be created
  - Action: Create file immediately using Write tool with exploration_results data
  - Format: Structured markdown with Summary, Files, Patterns, Tech Stack, Blockers, Recommendations sections
  - Verify exploration_results variable has valid data before creating file

**Check if planning file exists**: `docs/memory/planning/YYYY-MM-DD-[feature]-plan.md`
- [ ] **If NOT exists**: [CRITICAL] CRITICAL ERROR - Planning file must be created
  - Action: Create file immediately using Write tool with planning_results data
  - Format: Structured markdown with Approach, Tasks, Critical Files, Trade-offs, Risks, Feasibility sections
  - Verify planning_results variable has valid data before creating file

**Verify file contents are complete**
- [ ] Exploration file: Must contain summary, files list, patterns, tech_stack, blockers, recommendations
- [ ] Planning file: Must contain approach, tasks, critical_files, trade_offs, risks, feasibility

**Report to user if files were NOT created in Phase 8**
- State which files are missing and why
- Confirm files have been created as recovery action

### 3. Preparation for Next Phase

- If `strategic_plan.user_questions` exists, use in Phase 7
- Use `strategic_plan.checklist_structure` in Phase 8
- Retain `exploration_results` and `planning_results` as reference information

### 4. Proceed to Phase 5

After verification completes successfully, proceed to Phase 5 (File Analysis) in a NEW message.

---

## Variable Persistence Reminder

All variables from Phase 0-4 persist and are available in Phase 5-9:
- `HAS_PR_OPTION`, `HAS_BRANCH_OPTION`, `BRANCH_NAME`, `IS_AUTO_GENERATED` (from Phase 0)
- `exploration_results` (from Phase 1)
- `planning_results` (from Phase 2)
- `strategic_plan` (from Phase 3)

---

[← Previous: Phase 4](PHASE-4-PROJECT-MANAGER.md) | [Next: Phase 6 →](PHASE-6-ANALYSIS.md)
