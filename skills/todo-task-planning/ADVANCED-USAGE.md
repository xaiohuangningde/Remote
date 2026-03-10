# Advanced Usage

[← Main](SKILL.md) | [Examples →](EXAMPLES.md)

---

## Thorough Iterative Execution Support Features

- **Detailed Difference Detection**: Automatically detect and analyze changes since the last execution
- **Research History Management**: Record and utilize past researched files and results (utilize docs/memory)
- **Question Status Management**: Mark, organize, and follow up on answered questions (refer to docs/memory/questions)
- **Task Evolution Management**: Adjust, split, and merge according to existing task progress (avoid duplicate tasks)
- **Learning and Improvement Function**: Propose improvements and efficiency from past execution history (utilize docs/memory/lessons)
- **Research Optimization**: Avoid duplicate research and supplement insufficient research (check entire docs/memory)
- **Duplicate Check Function**: Thoroughly avoid duplication of tasks, research, questions, and recommendations

## Subagent Usage Best Practices

### When to Use Explore Subagent (Phase 0.2)
Used by main Claude executor in Phase 0.2:
- **Codebase exploration**: Finding files, patterns, or keywords across the project
- **Relationship discovery**: Understanding how components/models/controllers relate
- **File structure analysis**: Mapping out project organization
- **Dependency identification**: Finding what files depend on or are used by others
- **Test file discovery**: Locating corresponding test files
- Set thoroughness: "quick" for simple searches, "medium" for standard exploration, "very thorough" for comprehensive analysis

### When to Use Plan Subagent (Phase 0.3)
Used by main Claude executor in Phase 0.3:
- **Implementation strategy**: Designing how to implement a feature
- **Architecture decisions**: Choosing between different approaches
- **Impact analysis**: Evaluating changes across multiple files
- **Technical design**: Creating detailed implementation plans
- **Trade-off evaluation**: Comparing different solutions
- The Plan subagent builds on Explore subagent findings to create actionable plans

### When to Use project-manager Skill (Phase 0.4)
Used by main Claude executor in Phase 0.4:
- **Strategic organization**: Organizing tasks by feasibility (✅⏳🔍🚧)
- **User question extraction**: Identifying specification ambiguities
- **Checklist structure preparation**: Creating structured checklist format
- **YAGNI validation**: Ensuring only necessary tasks are included
- The project-manager skill integrates Explore and Plan results into actionable structure

### Workflow Example (Phase 0)
1. **Phase 0.2: Explore Subagent** → Find all salary-related files and their relationships (thoroughness: medium)
2. **Phase 0.3: Plan Subagent** (after Explore completes) → Design implementation approach for adding calculation period feature
3. **Phase 0.4: project-manager Skill** (after Plan completes) → Organize tasks by feasibility and prepare checklist structure
4. **Phase 1-5** → Use skill results to execute remaining phases and update $ARGUMENTS file

### [WARNING] Common Mistakes to Avoid

**[NG] WRONG: Parallel Subagent Execution**
```typescript
// DO NOT DO THIS - agents will run in parallel
const [explore, plan] = await Promise.all([
  Task({ subagent_type: "Explore", ... }),
  Task({ subagent_type: "Plan", ... })  // Plan needs exploration_results!
]);
```

**[OK] CORRECT: Sequential Subagent Execution**
```typescript
// Execute agents one by one, waiting for each to complete
const exploration_results = await Task({
  subagent_type: "Explore",
  ...
});

// Verify exploration completed successfully
if (!exploration_results) {
  throw new Error("Explore subagent failed");
}

// NOW we can safely run Plan subagent
const planning_results = await Task({
  subagent_type: "Plan",
  prompt: `
    ## Context from Exploration Results
    ${exploration_results.summary}
    ...
  `
});

// Verify planning completed successfully
if (!planning_results) {
  throw new Error("Plan subagent failed");
}

// NOW we can safely call project-manager skill for strategic organization
const strategic_plan_output = await Skill({
  skill: "project-manager",
  args: `
    ## Context
    ### Exploration Results Summary
    ${exploration_results.summary}

    ### Planning Results Summary
    ${planning_results.approach_summary}

    ## Required Deliverables
    - tasks_by_feasibility: Categorize tasks as {ready, pending, research, blocked}
    - user_questions: List questions with structured options
    - checklist_structure: Complete markdown checklist format
    - implementation_recommendations: Next actions and quality metrics
  `
});

// Parse the skill output to extract strategic_plan
const strategic_plan = parseProjectManagerOutput(strategic_plan_output);
```

**Key Points:**
- Wait for each subagent to complete before starting the next
- Verify results exist before passing them to the next subagent
- Handle errors at each stage to prevent cascading failures

---

[← Main](SKILL.md) | [Examples →](EXAMPLES.md)
