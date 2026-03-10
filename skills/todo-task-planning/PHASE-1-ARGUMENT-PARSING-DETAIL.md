# Phase 1: Argument Parsing - Detailed Reference

[← Back to Phase 1 Main](PHASE-1-TODO-READING.md)

---

## Overview

This document provides detailed implementation guidance for argument parsing logic in Phase 1. This content is for reference only and does not need to be read during normal skill execution.

**Main Phase 1 document**: See [PHASE-1-TODO-READING.md](PHASE-1-TODO-READING.md) for the concise overview.

---

## Sub-step 2.1: Parse `--pr` Flag

### Step 1: Split Arguments

1. Split `$ARGUMENTS` on whitespace to get an array of tokens
2. First element is the file path (e.g., `TODO.md`, `docs/todos/feature-x.md`)
3. Remaining elements are command-line flags (e.g., `--pr`, `--branch`, `feature/auth`)

### Step 2: Detect `--pr` Flag

1. Check if `$ARGUMENTS` contains the exact string `--pr`:
   - Search for `--pr` in the arguments list
   - If found: Set `HAS_PR_OPTION = true`
   - If not found: Set `HAS_PR_OPTION = false`

2. Log the result:
   ```
   Parsed --pr flag: HAS_PR_OPTION = [true/false]
   ```

---

## Sub-step 2.2: Parse `--branch` Flag and Value

### Step 1: Detect `--branch` Flag

1. Check if `$ARGUMENTS` contains the string `--branch`:
   - If NOT found:
     - Set `HAS_BRANCH_OPTION = false`
     - Set `BRANCH_NAME = ""` (empty string)
     - Set `IS_AUTO_GENERATED = false`
     - Skip to Sub-step 2.3

   - If found:
     - Set `HAS_BRANCH_OPTION = true`
     - Continue to Step 2 to extract the branch name value

### Step 2: Extract Branch Name Value

1. Locate the position of `--branch` in `$ARGUMENTS`
2. Check the next token after `--branch`:
   - If next token exists AND does not start with `--`:
     - Set `BRANCH_NAME = [next token value]`
     - Set `IS_AUTO_GENERATED = false`
     - Example: `--branch feature/auth` → `BRANCH_NAME = "feature/auth"`

   - If next token does not exist OR starts with `--`:
     - Set `BRANCH_NAME = ""` (empty string, will be generated in Step 3)
     - Set `IS_AUTO_GENERATED = true`
     - Example: `--branch --pr` → `BRANCH_NAME = ""`, `IS_AUTO_GENERATED = true`

3. Log the result:
   ```
   Parsed --branch flag:
     HAS_BRANCH_OPTION = true
     BRANCH_NAME = "[value or empty]"
     IS_AUTO_GENERATED = [true/false]
   ```

---

## Sub-step 2.3: Validation - PR Requires Branch

### Step 1: Apply Validation Rule

1. Check the validation condition:
   - If `HAS_PR_OPTION = true` AND `HAS_BRANCH_OPTION = false`:
     - Automatically set `HAS_BRANCH_OPTION = true`
     - Set `IS_AUTO_GENERATED = true`
     - Set `BRANCH_NAME = ""` (will be auto-generated in Step 3)
     - Rationale: Pull requests require a branch, so enable branch creation automatically
     - Log: "PR flag detected without branch flag - automatically enabling branch creation"

2. Log final validation result:
   ```
   Validation complete:
     HAS_PR_OPTION = [value]
     HAS_BRANCH_OPTION = [value]
     IS_AUTO_GENERATED = [value]
   ```

---

## Sub-step 2.4: Variable Summary Output

Output the final parsed values to ensure they are part of the conversation context:

```
=== Phase 1 Variables Summary ===
HAS_BRANCH_OPTION = [value]
HAS_PR_OPTION = [value]
BRANCH_NAME = [value]
IS_AUTO_GENERATED = [value]
=================================
```

**Variable Reference Table**:

| Variable | Type | Purpose | Set By |
|----------|------|---------|--------|
| `HAS_BRANCH_OPTION` | boolean | Whether branch creation is needed | `--branch` flag or PR validation |
| `HAS_PR_OPTION` | boolean | Whether PR creation is needed | `--pr` flag |
| `BRANCH_NAME` | string | Branch name (empty if auto-generated) | Explicit `--branch <name>` argument |
| `IS_AUTO_GENERATED` | boolean | Whether branch name needs generation | Flag without value or PR validation |

---

## Sub-step 2.5: Variable Persistence (Critical Step)

After parsing all arguments and generating branch name (if needed in Step 3), explicitly persist the variables for use in later phases, especially Phase 9.

### Implementation

1. Create a summary block that lists all variables in a consistent format:
   ```
   === Phase 1 Variables Summary ===
   HAS_BRANCH_OPTION = [value]
   HAS_PR_OPTION = [value]
   BRANCH_NAME = [value]
   IS_AUTO_GENERATED = [value]
   ================================
   ```

2. Include this summary in your response to ensure it's part of the conversation context

3. These variables will be available to Phase 9 through the conversation history

### When to Execute

- After completing Step 2 (argument parsing)
- After completing Step 3 (branch name generation, if applicable)
- Before transitioning to Phase 2

### Purpose

- Ensure variables are explicitly recorded in the conversation
- Enable Phase 9 to retrieve these values through conversation history search
- Provide a consistent format for variable extraction

---

## Parsing Examples

### Example 1: Both flags with explicit branch name

```
Input: /todo-task-planning TODO.md --pr --branch feature/auth
Result:
- HAS_PR_OPTION = true
- HAS_BRANCH_OPTION = true
- BRANCH_NAME = "feature/auth"
- IS_AUTO_GENERATED = false
```

### Example 2: Branch flag without value

```
Input: /todo-task-planning docs/todos/feature-x.md --branch
Result:
- HAS_PR_OPTION = false
- HAS_BRANCH_OPTION = true
- BRANCH_NAME = "" (empty, will be generated in Step 3)
- IS_AUTO_GENERATED = true
```

### Example 3: PR flag auto-enables branch creation

```
Input: /todo-task-planning TODO.md --pr
Result:
- HAS_PR_OPTION = true
- HAS_BRANCH_OPTION = true (auto-enabled by validation)
- BRANCH_NAME = "" (empty, will be generated in Step 3)
- IS_AUTO_GENERATED = true (set by validation)
```

### Example 4: No flags

```
Input: /todo-task-planning docs/feature.md
Result:
- HAS_PR_OPTION = false
- HAS_BRANCH_OPTION = false
- BRANCH_NAME = "" (empty)
- IS_AUTO_GENERATED = false
```

### Example 5: Branch flag at end of arguments

```
Input: /todo-task-planning TODO.md --branch
Result:
- HAS_PR_OPTION = false
- HAS_BRANCH_OPTION = true
- BRANCH_NAME = "" (empty, will be generated in Step 3)
- IS_AUTO_GENERATED = true
```

---

[← Back to Phase 1 Main](PHASE-1-TODO-READING.md)
