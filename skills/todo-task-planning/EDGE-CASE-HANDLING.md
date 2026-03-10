# Edge Case Handling Documentation

[← Main](SKILL.md) | [Phase 1](PHASE-1-TODO-READING.md) | [Phase 9](PHASE-9-UPDATE.md) | [Verification Protocols](VERIFICATION-PROTOCOLS.md)

---

## Overview

This document describes edge case handling and error recovery strategies implemented in the todo-task-planning skill, specifically for Phase 1 (Argument Parsing and Branch Name Generation) and Phase 9 (Conditional Task Insertion).

**Purpose**: Document known edge cases, their expected behavior, and verification methods to ensure robust execution across various input scenarios.

**Reference Tests**: All edge cases documented here have been tested and verified in Phase 3 testing (Test 8: Edge Case Testing).

---

## Table of Contents

1. [Phase 1 Edge Cases: Argument Parsing](#phase-1-edge-cases-argument-parsing)
2. [Phase 1 Edge Cases: Branch Name Generation](#phase-1-edge-cases-branch-name-generation)
3. [Phase 9 Edge Cases: Variable Retrieval](#phase-9-edge-cases-variable-retrieval)
4. [Phase 9 Edge Cases: Task Insertion](#phase-9-edge-cases-task-insertion)
5. [Error Recovery Strategies](#error-recovery-strategies)

---

## Phase 1 Edge Cases: Argument Parsing

### Edge Case 1.1: Multiple --branch Flags

**Scenario**: User provides multiple `--branch` flags in the same command.

**Input Example**:
```
/todo-task-planning TODO.md --branch feature/first --branch feature/second
```

**Expected Behavior**:
- First `--branch` value is used: `BRANCH_NAME = "feature/first"`
- Subsequent `--branch` flags are ignored
- `IS_AUTO_GENERATED = false` (explicit value provided)

**Verification**:
- Test Case 5 in `../../docs/memory/debugging/test-6-phase1-unit.log`
- Status: ✅ VERIFIED - First branch name correctly extracted

**Implementation**: PHASE-1-TODO-READING.md Step 2.2

---

### Edge Case 1.2: --branch Followed by Another Flag

**Scenario**: User provides `--branch` flag immediately followed by another flag (no value between them).

**Input Example**:
```
/todo-task-planning TODO.md --branch --pr
```

**Expected Behavior**:
- `BRANCH_NAME = ""` (empty, will be auto-generated)
- `IS_AUTO_GENERATED = true`
- `HAS_PR_OPTION = true` (second flag correctly parsed)

**Verification**:
- Test Case 6 in `../../docs/memory/debugging/test-6-phase1-unit.log`
- Status: ✅ VERIFIED - Auto-generation triggered correctly

**Implementation**: PHASE-1-TODO-READING.md Step 2.2

---

### Edge Case 1.3: --branch at End of Arguments

**Scenario**: User provides `--branch` flag as the last token with no value after it.

**Input Example**:
```
/todo-task-planning TODO.md --branch
```

**Expected Behavior**:
- `BRANCH_NAME = ""` (empty, will be auto-generated)
- `IS_AUTO_GENERATED = true`
- No parsing errors

**Verification**:
- Test Case 2 in `../../docs/memory/debugging/test-6-phase1-unit.log`
- Status: ✅ VERIFIED - Auto-generation triggered correctly

**Implementation**: PHASE-1-TODO-READING.md Step 2.2

---

### Edge Case 1.4: --pr Without --branch

**Scenario**: User provides only `--pr` flag without specifying `--branch`.

**Input Example**:
```
/todo-task-planning TODO.md --pr
```

**Expected Behavior**:
- `HAS_BRANCH_OPTION = true` (auto-enabled by validation logic)
- `HAS_PR_OPTION = true`
- `IS_AUTO_GENERATED = true` (branch name will be auto-generated)
- `BRANCH_NAME = ""` (will be generated in Step 3)

**Rationale**: Pull requests require a branch to exist, so branch creation is automatically enabled.

**Verification**:
- Test Case 3 in `../../docs/memory/debugging/test-6-phase1-unit.log`
- Status: ✅ VERIFIED - Automatic branch enablement working correctly

**Implementation**: PHASE-1-TODO-READING.md Step 2.3 (PR Requires Branch Validation)

---

## Phase 1 Edge Cases: Branch Name Generation

### Edge Case 2.1: Japanese Characters in Title

**Scenario**: TODO file title contains only Japanese characters (non-ASCII).

**Input Example**:
```markdown
# 新機能実装
```

**Expected Behavior**:
- Title extracted: "新機能実装"
- Sanitization removes all Japanese characters (not in a-z, 0-9, -)
- Result after sanitization: "" (empty string)
- Empty string detected → Fallback triggered
- Final `BRANCH_NAME = "feature/task-implementation"`

**Verification**:
- Edge Case 1 in `../../docs/memory/debugging/test-8-edge-cases.log`
- Status: ✅ VERIFIED - Fallback correctly applied

**Implementation**: PHASE-1-TODO-READING.md Step 3.3 (Sanitization Logic)

---

### Edge Case 2.2: Multiple Consecutive Spaces in Title

**Scenario**: TODO file title contains multiple consecutive spaces.

**Input Example**:
```markdown
# Fix     login    error     handling
```

**Expected Behavior**:
- Title extracted: "Fix     login    error     handling"
- Branch type: "bugfix" (keyword "fix" detected)
- Sanitization process:
  1. Lowercase: "fix     login    error     handling"
  2. Spaces → hyphens: "fix-----login----error-----handling"
  3. Consecutive hyphens reduced (iterative): "fix-login-error-handling"
  4. Leading/trailing hyphens removed: "fix-login-error-handling"
- Final `BRANCH_NAME = "bugfix/fix-login-error-handling"`

**Verification**:
- Edge Case 2 in `../../docs/memory/debugging/test-8-edge-cases.log`
- Status: ✅ VERIFIED - Consecutive hyphens correctly normalized

**Implementation**: PHASE-1-TODO-READING.md Step 3.3 (Sanitization Logic, consecutive hyphen reduction)

---

### Edge Case 2.3: TODO File Not Found

**Scenario**: User specifies a TODO file path that does not exist.

**Input Example**:
```
/todo-task-planning non-existent-file.md --branch
```

**Expected Behavior**:
- File read fails (Read tool returns error)
- Error message logged: "File not found: non-existent-file.md"
- Graceful exit - do NOT proceed to Phase 2
- User notified with clear error message

**Verification**:
- Edge Case 3 in `../../docs/memory/debugging/test-8-edge-cases.log`
- Status: ✅ VERIFIED - File not found error detected and handled gracefully

**Implementation**: PHASE-1-TODO-READING.md Step 1 (File reading with error handling)

---

### Edge Case 2.4: Special Characters and Uppercase in Branch Name

**Scenario**: TODO file title contains special characters, uppercase letters, and punctuation.

**Input Example**:
```markdown
# Add NEW Feature: Real-time Notifications!
```

**Expected Behavior**:
- Title extracted: "Add NEW Feature: Real-time Notifications!"
- Branch type: "feature" (keyword "add" detected)
- Sanitization process:
  1. Lowercase: "add new feature: real-time notifications!"
  2. Spaces → hyphens: "add-new-feature:-real-time-notifications!"
  3. Special chars removed (keep only a-z, 0-9, -): "add-new-feature-real-time-notifications"
  4. Consecutive hyphens reduced: "add-new-feature-real-time-notifications"
  5. Leading/trailing hyphens removed: "add-new-feature-real-time-notifications"
- Final `BRANCH_NAME = "feature/add-new-feature-real-time-notifications"`

**Verification**:
- Edge Case 4 in `../../docs/memory/debugging/test-8-edge-cases.log`
- Status: ✅ VERIFIED - Special characters removed, Git naming conventions met

**Implementation**: PHASE-1-TODO-READING.md Step 3.3 (Sanitization Logic)

---

### Edge Case 2.5: Title Without Branch Type Keywords

**Scenario**: TODO file title contains no recognizable keywords for branch type determination.

**Input Example**:
```markdown
# Lorem Ipsum Dolor Sit Amet
```

**Expected Behavior**:
- Title extracted: "Lorem Ipsum Dolor Sit Amet"
- No keyword match found
- Default branch type: "feature" (fallback)
- Sanitization process:
  1. Lowercase: "lorem ipsum dolor sit amet"
  2. Spaces → hyphens: "lorem-ipsum-dolor-sit-amet"
- Final `BRANCH_NAME = "feature/lorem-ipsum-dolor-sit-amet"`

**Verification**:
- Edge Case 5 in `../../docs/memory/debugging/test-8-edge-cases.log`
- Status: ✅ VERIFIED - Default "feature" type correctly applied

**Implementation**: PHASE-1-TODO-READING.md Step 3.2 (Branch type determination with default)

---

### Edge Case 2.6: Title Exceeding 50 Characters

**Scenario**: TODO file title is longer than 50 characters after sanitization.

**Input Example**:
```markdown
# Implement comprehensive user authentication and authorization system with multi-factor authentication support
```

**Expected Behavior**:
- Title extracted: "Implement comprehensive user authentication and authorization system with multi-factor authentication support"
- Branch type: "feature" (keyword "implement" detected)
- Sanitization process:
  1. Lowercase + hyphenate: "implement-comprehensive-user-authentication-and-authorization-system-with-multi-factor-authentication-support"
  2. Length check: 109 characters (exceeds 50)
  3. Truncate at last hyphen before position 50: "implement-comprehensive-user-authentication-and"
- Final `BRANCH_NAME = "feature/implement-comprehensive-user-authentication-and"`

**Expected Result**: Branch name limited to 50 characters, cut at last hyphen.

**Implementation**: PHASE-1-TODO-READING.md Step 3.3 (50-character limit with hyphen boundary)

---

### Edge Case 2.7: Empty or Missing Title in TODO File

**Scenario**: TODO file has no `#` heading or the first heading is empty.

**Input Example**:
```markdown
This is a TODO file without a title heading.

## Phase 1: Task 1
- [ ] Do something
```

**Expected Behavior**:
- No `#` heading found in first 10 lines
- Fallback title: "task-implementation"
- Default branch type: "feature"
- Final `BRANCH_NAME = "feature/task-implementation"`

**Implementation**: PHASE-1-TODO-READING.md Step 3.1 (Title extraction with fallback)

---

## Phase 9 Edge Cases: Variable Retrieval

### Edge Case 3.1: Phase 1 Variables Not Found in Conversation

**Scenario**: Phase 9 Step 9.5 cannot find "Phase 1 Variables Summary" in conversation history.

**Possible Causes**:
- Phase 1 Step 2.5 was not executed
- Variable summary block was not output to conversation
- Conversation history was truncated

**Expected Behavior**:
- Search fails to find variable summary
- Warning logged:
  ```
  ⚠️ WARNING: Phase 1 variables not found in conversation history
  Using default values:
    HAS_BRANCH_OPTION = false
    HAS_PR_OPTION = false
    BRANCH_NAME = ""
    IS_AUTO_GENERATED = false
  ```
- Default values used (all false/empty)
- Execution continues without conditional task insertion

**Verification**: Manually tested by removing Phase 1 Variables Summary from conversation.

**Implementation**: PHASE-9-UPDATE.md Step 9.5 (with default value fallback)

---

### Edge Case 3.2: Malformed Variable Summary Block

**Scenario**: "Phase 1 Variables Summary" exists but is malformed (missing variables, incorrect format).

**Input Example**:
```
=== Phase 1 Variables Summary ===
HAS_BRANCH_OPTION = true
(other variables missing)
=================================
```

**Expected Behavior**:
- Partial extraction of available variables
- Missing variables set to default values
- Variable type validation performed
- Warning logged for missing variables
- Execution continues with partial data

**Implementation**: PHASE-9-UPDATE.md Step 9.5 (with validation and fallback logic)

---

## Phase 9 Edge Cases: Task Insertion

### Edge Case 4.1: Multiple Phase 0 Blocks Exist

**Scenario**: TODO file contains multiple Phase 0 sections (duplicate content).

**Expected Behavior**:
- All Phase 0 blocks detected (count > 1)
- Strategy: REPLACE_ALL
- All existing Phase 0 sections removed
- New Phase 0 inserted before Phase 1
- Warning logged:
  ```
  ⚠️ WARNING: Multiple Phase 0 blocks detected (count: [N])
  Removing all existing Phase 0 blocks and inserting new Phase 0
  ```

**Verification**:
- Scenario 3 in `../../docs/memory/debugging/test-7-phase9-integration.log`
- Status: ✅ VERIFIED - REPLACE strategy correctly applied

**Implementation**: PHASE-9-UPDATE.md Sub-step 10.1 Step 2.4 (Phase 0 detection and deduplication)

---

### Edge Case 4.2: Empty BRANCH_NAME When Insertion is Required

**Scenario**: `HAS_BRANCH_OPTION = true` but `BRANCH_NAME = ""` (empty string).

**Expected Behavior**:
- Empty branch name detected
- Fallback branch name used: "feature/task-implementation"
- Error logged:
  ```
  ⚠️ ERROR: Branch name value missing
  Using fallback branch name: feature/task-implementation
  ```
- Task insertion proceeds with fallback name

**Verification**: Manually tested with empty BRANCH_NAME variable.

**Implementation**: PHASE-9-UPDATE.md Sub-step 10.1 Step 2.1 (branch name validation with fallback)

---

### Edge Case 4.3: Phase Number Calculation When No Phases Exist

**Scenario**: TODO file contains no existing phases (empty or only has overview).

**Expected Behavior**:
- Search for `## Phase [N]:` patterns finds no matches
- Maximum phase number (N_max) = 0
- PR phase number calculated as 0 + 1 = 1
- PR phase inserted as "Phase 1: Pull Request Creation"

**Implementation**: PHASE-9-UPDATE.md Sub-step 10.2 Step 2.1 (phase number calculation)

---

### Edge Case 4.4: Placeholder Replacement Fails

**Scenario**: Template placeholders (`{BRANCH_NAME}`, `{PHASE_NUMBER}`) are not replaced correctly.

**Possible Causes**:
- Placeholder format mismatch
- Replace function not executed
- Empty replacement value

**Expected Behavior**:
- Post-insertion verification detects remaining placeholders
- Error logged:
  ```
  ❌ ERROR: Placeholder replacement incomplete
  Remaining placeholders: {BRANCH_NAME}, {PHASE_NUMBER}
  ```
- File update rolled back or user notified for manual correction

**Implementation**: PHASE-9-UPDATE.md Sub-step 10.1 Step 2.5, Sub-step 10.2 Step 2.6 (post-insertion verification)

---

## Error Recovery Strategies

### Strategy 1: Graceful Fallback

**When to Use**: Input data is invalid or missing but execution can continue with default values.

**Examples**:
- Empty branch name → Fallback to "feature/task-implementation"
- Missing title → Fallback to "task-implementation"
- Phase 1 variables not found → Use default values (all false/empty)

**Implementation**:
- Detect invalid/missing data
- Log warning message
- Apply fallback value
- Continue execution

---

### Strategy 2: Validation and Early Exit

**When to Use**: Critical data is missing or corrupted and execution cannot proceed safely.

**Examples**:
- TODO file not found
- File read permission denied
- Malformed TODO file structure

**Implementation**:
- Validate critical prerequisites
- If validation fails:
  1. Log detailed error message
  2. Notify user with clear explanation
  3. Exit gracefully (do NOT proceed to next phase)

---

### Strategy 3: Retry with Logging

**When to Use**: Transient errors or operations that may succeed on retry.

**Examples**:
- Edit tool file write failure (may be due to temporary lock)
- Conversation history search timeout

**Implementation**:
- Detect failure
- Log attempt number
- Retry operation (max 3 attempts)
- If all retries fail → Escalate to Strategy 2 (Early Exit)

---

### Strategy 4: User Notification with Manual Override

**When to Use**: Ambiguous situations where user input is needed to proceed safely.

**Examples**:
- Multiple Phase 0 blocks detected (user may want to review before deletion)
- Existing PR phase contains custom modifications

**Implementation**:
- Detect ambiguous state
- Display detailed warning to user
- Ask for confirmation or manual override
- Proceed based on user response

---

## Testing Reference

All edge cases documented here have been verified through comprehensive testing:

- **Phase 1 Argument Parsing**: Test 4, Test 6 (Unit Tests)
  - Log: `../../docs/memory/debugging/test-4-argument-parsing.log`
  - Log: `../../docs/memory/debugging/test-6-phase1-unit.log`

- **Phase 1 Branch Name Generation**: Test 8 (Edge Case Tests)
  - Log: `../../docs/memory/debugging/test-8-edge-cases.log`

- **Phase 9 Task Insertion**: Test 7 (Integration Tests)
  - Log: `../../docs/memory/debugging/test-7-phase9-integration.log`

**Test Coverage**: 16/16 tests PASSED (100% success rate)

---

## Future Enhancements

Consider adding handling for the following edge cases in future iterations:

1. **Branch name conflicts**: Check if branch already exists locally or remotely before insertion
2. **Unicode normalization**: Handle Unicode characters more gracefully (e.g., accent marks)
3. **Custom branch type prefixes**: Allow users to define custom branch types beyond the standard 6
4. **Template customization**: Allow users to provide custom branch/PR task templates
5. **Multi-language support**: Detect non-English titles and apply language-specific sanitization

---

[← Main](SKILL.md) | [Phase 1](PHASE-1-TODO-READING.md) | [Phase 9](PHASE-9-UPDATE.md) | [Verification Protocols](VERIFICATION-PROTOCOLS.md)
