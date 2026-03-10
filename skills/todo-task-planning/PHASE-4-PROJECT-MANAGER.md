# Phase 4: project-manager Skill

[← Previous: Phase 3](PHASE-3-PLAN.md) | [Next: Phase 5 →](PHASE-5-VERIFICATION.md)

---

## Overview

Phase 4 calls the project-manager skill to integrate exploration and planning results and organize strategically.

**Critical Output:**
- `strategic_plan`: Structured data containing organized tasks and questions

**[CRITICAL] ONE SKILL TOOL PER MESSAGE**:
- Call the project-manager Skill tool in THIS message
- **STOP** after calling the Skill tool
- **WAIT** for the tool result to arrive in the NEXT message

---

## Prerequisites

**[WARNING] MANDATORY PRECONDITION: Both Phase 1 AND Phase 2 MUST Be Completed First**

**DO NOT proceed with Phase 4 unless ALL of the following are confirmed:**
- [ ] Phase 2 Explore subagent has successfully completed
- [ ] Phase 3 Plan subagent has successfully completed
- [ ] Both `exploration_results` and `planning_results` variables exist
- [ ] No errors occurred during exploration or planning

**Sequential Dependency Chain:**
```
Phase 2 (Explore) → exploration_results
                          ↓
Phase 3 (Plan) → planning_results
                          ↓
Phase 4 (project-manager skill) → strategic_plan
```

**ONLY after confirming the above, execute the project-manager Skill tool.**

---

## Execution Steps

### 1. Verify Prerequisites

Confirm both `exploration_results` and `planning_results` exist before calling the Task tool.

### 2. Call project-manager Skill Tool

**YOU MUST:**
1. Verify both `exploration_results` and `planning_results` exist
2. Call the project-manager Skill tool in this message (provide context from exploration and planning)
3. **STOP** after calling the Skill tool
4. **WAIT** for the tool result to arrive
5. Parse the skill output to extract `strategic_plan` data
6. Proceed to Phase 5 verification

**Skill tool execution example**:
```typescript
Skill({
  skill: "project-manager",
  args: `
    # Strategic Project Planning Request

    ## Context
    Exploration results: ${exploration_results.summary}
    Planning results: ${planning_results.approach_summary}

    ## Goals
    1. Organize tasks by feasibility (✅⏳🔍🚧)
    2. Extract user questions with structured options
    3. Prepare checklist structure with file references (📁) and rationale (📊)
    4. Apply YAGNI principle validation

    ## Required Deliverables
    Please provide the following in your response:
    - tasks_by_feasibility: Categorize tasks as {ready, pending, research, blocked}
    - user_questions: List questions with structured options for AskUserQuestion tool
    - checklist_structure: Complete markdown checklist format
    - implementation_recommendations: Next actions and quality metrics
  `
})
```

### 3. Processing Results

**After receiving the skill output**:
- Parse the project-manager skill output to extract `strategic_plan` data containing:
  - `tasks_by_feasibility`: {ready: [], pending: [], research: [], blocked: []}
  - `user_questions`: Array of question objects with options (for AskUserQuestion tool)
  - `checklist_structure`: Complete markdown checklist format
  - `implementation_recommendations`: Next action items and quality metrics

**Note**: strategic_plan is NOT saved to disk
- **Reason**: Used as intermediate data structure for organizing tasks in Phase 8
- **Persistence**: Strategic plan data (tasks, questions, checklist) are integrated into $ARGUMENTS file in Phase 8
- **Reference**: Exploration and planning files already provide persistent storage of analysis results

---

## Next Steps

After Phase 4 completes successfully, proceed to Phase 5 (Verification) in a NEW message.

---

[← Previous: Phase 3](PHASE-3-PLAN.md) | [Next: Phase 5 →](PHASE-5-VERIFICATION.md)
