# Phase 1: Branch Name Generation - Detailed Reference

[← Back to Phase 1 Main](PHASE-1-TODO-READING.md)

---

## Overview

This document provides detailed implementation guidance for branch name auto-generation in Phase 1. This content is for reference only and does not need to be read during normal skill execution.

**Main Phase 1 document**: See [PHASE-1-TODO-READING.md](PHASE-1-TODO-READING.md) for the concise overview.

**Trigger Condition**: Only execute branch name generation if `IS_AUTO_GENERATED = true`. If `IS_AUTO_GENERATED = false`, skip entirely.

---

## Step 3.1: Read TODO File Title

### Step 1: Extract Title

1. Read the first few lines of the TODO file (already read in Step 1)
2. Look for the first `#` heading (typically `# [Title]`)
3. Extract the title text (remove the `#` prefix and trim whitespace)

### Step 2: Handle Missing Title

1. If no title found (no `#` heading in first 10 lines):
   - Use fallback: "task-implementation"
   - Log warning: "No title found in TODO file, using fallback"
   - Set `title = "task-implementation"`
2. If title found:
   - Set `title = [extracted title text]`
   - Log: "Extracted title: [title]"

---

## Step 3.2: Determine Branch Type

### Step 1: Analyze Title for Keywords

1. Convert title to lowercase for case-insensitive matching
2. Search for keywords in the following priority order:
   - If contains "bug", "fix", "error", "issue", "defect": Type = "bugfix"
   - If contains "feature", "add", "new", "implement", "create": Type = "feature"
   - If contains "refactor", "improve", "optimize", "restructure": Type = "refactor"
   - If contains "test", "testing", "spec": Type = "test"
   - If contains "doc", "documentation", "readme": Type = "docs"
   - If contains "chore", "update", "upgrade", "dependency": Type = "chore"
   - Default (no keyword match): Type = "feature"

### Step 2: Log Determination

```
Branch type determined: [type]
Reason: [keyword found or "default"]
```

---

## Step 3.3: Generate Branch Name

### Step 1: Sanitize Title

1. Take the extracted title text
2. Apply the following transformations in order:
   - Convert to lowercase
   - Replace spaces with hyphens (`-`)
   - Remove all special characters except hyphens (keep only: a-z, 0-9, -)
   - Replace multiple consecutive hyphens with single hyphen (use iterative replacement until no consecutive hyphens remain)
   - Remove leading and trailing hyphens
   - Trim to maximum 50 characters (if longer, cut at last hyphen before character 50)
3. Handle edge cases:
   - If result is empty after sanitization (e.g., Japanese characters only), use fallback: "task-implementation"
   - Log warning if fallback is used: "Sanitization resulted in empty string, using fallback"

### Step 2: Construct Branch Name

1. Combine type and sanitized title: `[type]/[sanitized-title]`
   - Example: `feature/user-authentication`
   - Example: `bugfix/login-error-handling`

### Step 3: Validate Git Naming Conventions

1. Check the generated branch name against Git rules:
   - No consecutive hyphens (should already be handled in sanitization)
   - Does not start or end with hyphen (should already be handled)
   - No uppercase letters (should already be handled)
   - Contains only valid characters: a-z, 0-9, -, /

2. If validation fails:
   - Log error: "Generated branch name failed validation: [branch name]"
   - Use fallback: `feature/task-implementation`

### Step 4: Log Generated Name

```
Generated branch name: [BRANCH_NAME]
Sanitization steps applied: lowercase, hyphen-separation, special char removal
```

---

## Step 3.4: Store Branch Name

### Step 1: Update Variables

1. Set the variable: `BRANCH_NAME = [generated branch name value]`
2. Confirm: `IS_AUTO_GENERATED = true` (should already be true from Step 2)

### Step 2: Include in Variable Summary

1. This updated `BRANCH_NAME` will be included in the Phase 1 Variables Summary (Step 2.5)
2. Ensure the generated name is logged clearly for debugging

### Step 3: Log Completion

```
✅ Branch name generation complete
  BRANCH_NAME = [value]
  IS_AUTO_GENERATED = true
```

---

## Branch Name Generation Examples

### Example 1: Feature with clear title

```
Title: "# User Authentication Implementation"
→ Type: feature (keyword: "implement")
→ Sanitized: "user-authentication-implementation"
→ Result: BRANCH_NAME = "feature/user-authentication-implementation"
```

### Example 2: Bug fix

```
Title: "# Fix login error on mobile devices"
→ Type: bugfix (keyword: "fix")
→ Sanitized: "login-error-on-mobile-devices"
→ Result: BRANCH_NAME = "bugfix/login-error-on-mobile-devices"
```

### Example 3: Refactoring

```
Title: "# Refactor database query optimization"
→ Type: refactor (keyword: "refactor")
→ Sanitized: "database-query-optimization"
→ Result: BRANCH_NAME = "refactor/database-query-optimization"
```

### Example 4: Title with special characters

```
Title: "# Add new feature: Real-time notifications!"
→ Type: feature (keyword: "add")
→ Sanitized: "add-new-feature-real-time-notifications"
→ Result: BRANCH_NAME = "feature/add-new-feature-real-time-notifications"
```

### Example 5: No title found

```
Title: (not found)
→ Type: feature (default)
→ Fallback title: "task-implementation"
→ Result: BRANCH_NAME = "feature/task-implementation"
```

---

[← Back to Phase 1 Main](PHASE-1-TODO-READING.md)
