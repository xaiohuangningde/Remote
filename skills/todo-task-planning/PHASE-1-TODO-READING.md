# Phase 1: TODO File Reading

[← Previous: Phase 0](PHASE-0-KEY-GUIDELINES.md) | [Next: Phase 2 →](PHASE-2-EXPLORE.md)

---

## Overview

Phase 1 reads and parses the TODO file specified in `$ARGUMENTS`, extracts context, and prepares variables for subsequent phases.

**Critical Output:**
- `HAS_PR_OPTION`: Boolean indicating if PR creation is requested
- `HAS_BRANCH_OPTION`: Boolean indicating if branch creation is requested
- `BRANCH_NAME`: String containing branch name (empty if auto-generated)
- `IS_AUTO_GENERATED`: Boolean indicating if branch name needs generation

---

## Execution Steps

### 1. Reading $ARGUMENTS File

**Purpose**: Extract task information from the specified TODO file.

**Implementation**:
- Use Read tool to open the file specified in `$ARGUMENTS`
- Extract task descriptions, requirements, and tech stack information
- Determine exploration thoroughness level (quick/medium/very thorough)

**Output**: File content and context ready for subsequent phases.

---

### 2. Git Workflow Options Preparation

**Purpose**: Parse command-line flags from `$ARGUMENTS` to configure git workflow automation.

**Overview**:
Parse `$ARGUMENTS` string to extract file path and flags (`--pr`, `--branch`), then set the four critical variables that control Phase 9 behavior.

**Implementation Steps**:

1. **Parse `--pr` flag**: Check if `$ARGUMENTS` contains `--pr`
   - If found: Set `HAS_PR_OPTION = true`
   - If not found: Set `HAS_PR_OPTION = false`
2. **Parse `--branch` flag**: Check if `$ARGUMENTS` contains `--branch`
   - If NOT found: Set `HAS_BRANCH_OPTION = false`, `BRANCH_NAME = ""`, `IS_AUTO_GENERATED = false`
   - If found: Set `HAS_BRANCH_OPTION = true`, then extract optional value:
     - If value provided (next token doesn't start with `--`): Set `BRANCH_NAME` to that value, `IS_AUTO_GENERATED = false`
     - If no value: Set `BRANCH_NAME = ""`, `IS_AUTO_GENERATED = true`
3. **Validation**: If `HAS_PR_OPTION = true` AND `HAS_BRANCH_OPTION = false`:
   - Set `HAS_BRANCH_OPTION = true` (PR requires a branch)
   - Set `IS_AUTO_GENERATED = true`
   - Set `BRANCH_NAME = ""` (will be auto-generated in Step 3)
4. **Output Variables Summary**: Display all four variables in a structured format for Phase 9 access

**Variable Reference**:

| Variable | Type | Purpose |
|----------|------|---------|
| `HAS_BRANCH_OPTION` | boolean | Whether branch creation is needed |
| `HAS_PR_OPTION` | boolean | Whether PR creation is needed |
| `BRANCH_NAME` | string | Branch name (empty if auto-generated) |
| `IS_AUTO_GENERATED` | boolean | Whether branch name needs generation |

**Required Output Format**:
```
=== Phase 1 Variables Summary ===
HAS_BRANCH_OPTION = [value]
HAS_PR_OPTION = [value]
BRANCH_NAME = [value]
IS_AUTO_GENERATED = [value]
=================================
```

**Common Patterns**:
- `--pr --branch feature/auth` → Explicit branch name, create PR
- `--branch` → Auto-generate branch name, no PR
- `--pr` → Auto-generate branch name, create PR (branch auto-enabled)
- No flags → No branch, no PR

**Detailed Reference**: See [PHASE-1-ARGUMENT-PARSING-DETAIL.md](PHASE-1-ARGUMENT-PARSING-DETAIL.md) for complete parsing logic, validation rules, and examples.

---

### 3. Branch Name Auto-Generation (Conditional)

**Trigger Condition**: Only execute if `IS_AUTO_GENERATED = true`. Skip entirely if false.

**Purpose**: Generate a git-compliant branch name from TODO file title.

**Overview**:
1. Extract title from TODO file (first `#` heading)
2. Determine branch type from keywords (feature/bugfix/refactor/docs/test/chore)
3. Sanitize title (lowercase, hyphen-separated, alphanumeric only, max 50 chars)
4. Construct branch name: `[type]/[sanitized-title]`
5. Validate against git naming rules and store in `BRANCH_NAME`

**Type Determination Keywords**:
- `bugfix`: bug, fix, error, issue, defect
- `feature`: feature, add, new, implement, create (default)
- `refactor`: refactor, improve, optimize
- `test`: test, testing, spec
- `docs`: doc, documentation, readme
- `chore`: chore, update, upgrade

**Sanitization Rules**:
- Convert to lowercase
- Replace spaces with hyphens
- Remove special characters (keep only: a-z, 0-9, -)
- Collapse consecutive hyphens to single hyphen
- Trim to 50 characters at last hyphen
- Fallback to "task-implementation" if empty after sanitization

**Example Outputs**:
- `# User Authentication` → `feature/user-authentication`
- `# Fix login error` → `bugfix/login-error`
- `# Refactor database queries` → `refactor/database-queries`

**Completion**: Update `BRANCH_NAME` variable and include in Phase 1 Variables Summary.

**Detailed Reference**: See [PHASE-1-BRANCH-GENERATION-DETAIL.md](PHASE-1-BRANCH-GENERATION-DETAIL.md) for step-by-step implementation, edge cases, and validation logic.

---

### 4. Context Preparation for Exploration

**Purpose**: Prepare context for Phase 2 codebase exploration.

**Implementation**:
- Identify feature areas and related keywords from TODO content
- Determine exploration scope (file patterns, target directories)
- Check existing documentation or memory research results to avoid duplication
- Prepare search terms and file patterns for efficient exploration

**Output**: Structured context ready for Phase 2 Explore tool usage.

---

## Variable Persistence

**IMPORTANT**: Variables set in Phase 1 persist throughout all subsequent phases (Phase 2-10).

**Phase 1 Variables Used in Later Phases**:
- `HAS_PR_OPTION`, `HAS_BRANCH_OPTION`, `BRANCH_NAME`, `IS_AUTO_GENERATED`
  - Set in: Phase 1 Step 2 (argument parsing) and Step 3 (branch generation)
  - Used in: Phase 9 (conditional task insertion for branch/PR creation)
  - Scope: Available throughout entire skill execution via conversation context

**Variable Lifecycle**:
```
Phase 1 → Set and persist variables in conversation
    ↓
Phase 9 → Retrieve and use variables for conditional logic
```

**Critical Requirement**: Always output the "Phase 1 Variables Summary" block to ensure Phase 9 can retrieve values from conversation history.

---

## Post-Implementation Verification Checklist

After modifying Phase 1 implementation, verify the following:

- [ ] **Step 1: File Reading**
  - [ ] TODO file is successfully read
  - [ ] Task context is extracted correctly
  - [ ] Exploration thoroughness is determined

- [ ] **Step 2: Argument Parsing**
  - [ ] `--pr` flag detection works
  - [ ] `--branch` flag detection works
  - [ ] Branch name value extraction works (if provided)
  - [ ] `IS_AUTO_GENERATED` flag is set correctly
  - [ ] PR requires branch validation works
  - [ ] "Phase 1 Variables Summary" block is output

- [ ] **Step 3: Branch Name Generation** (if `IS_AUTO_GENERATED = true`)
  - [ ] Title extraction from TODO file works
  - [ ] Branch type determination works
  - [ ] Sanitization handles edge cases (Japanese chars, special chars, length limits)
  - [ ] Git naming validation works
  - [ ] Generated branch name is stored in `BRANCH_NAME`

- [ ] **Step 4: Context Preparation**
  - [ ] Feature areas and keywords identified
  - [ ] Exploration scope determined

- [ ] **End-to-End Testing**
  - [ ] Test Case 1: `--branch` only → auto-generation triggered
  - [ ] Test Case 2: `--branch feature/test` → explicit name used
  - [ ] Test Case 3: `--pr` only → branch auto-enabled + auto-generation
  - [ ] Test Case 4: No flags → all variables false/empty
  - [ ] Test Case 5: `--pr --branch custom` → both flags + custom name

**Detailed References**:
- Argument parsing details: [PHASE-1-ARGUMENT-PARSING-DETAIL.md](PHASE-1-ARGUMENT-PARSING-DETAIL.md)
- Branch generation details: [PHASE-1-BRANCH-GENERATION-DETAIL.md](PHASE-1-BRANCH-GENERATION-DETAIL.md)
- Unit test results: `../../docs/memory/debugging/test-6-phase1-unit.log`

---

[← Previous: Phase 0](PHASE-0-KEY-GUIDELINES.md) | [Next: Phase 2 →](PHASE-2-EXPLORE.md)
