# Phase 9: File Update

[← Previous: Phase 8](PHASE-8-QUESTIONS.md) | [Main](SKILL.md) | [Next: Phase 10 →](PHASE-10-VERIFICATION.md)

---

### Phase 9: $ARGUMENTS File Update

**⚠️ VERIFICATION REQUIRED**: Before proceeding, execute all verification protocols defined in [VERIFICATION-PROTOCOLS.md](VERIFICATION-PROTOCOLS.md):
- [Phase 4 Entrance Gate Verification](VERIFICATION-PROTOCOLS.md#phase-4-entrance-gate-verification)
- [Phase 1 Skip Detection](VERIFICATION-PROTOCOLS.md#phase-1-skip-detection)
- [Phase 2 Skip Detection](VERIFICATION-PROTOCOLS.md#phase-2-skip-detection)
- [Integration Verification](VERIFICATION-PROTOCOLS.md#integration-verification)

**✅ Only proceed to Phase 4 execution steps below when ALL verification checks pass.**

---

**⚠️ MANDATORY PRECONDITION**: All questions extracted in Phase 7 MUST be answered via AskUserQuestion tool before starting this phase. If questions exist but were not answered, STOP and return to Phase 7 step 9.

**🚨 CRITICAL REQUIREMENT**: This phase MUST complete with the $ARGUMENTS file successfully updated. File update is NOT optional - it is the primary output of this command. Failure to update the file is a critical execution failure.

#### File Creation Responsibility and Timeline

**🚨 CRITICAL: docs/memory Files Must Be Created in This Phase**

The following files MUST be created by the Main Claude executor (NOT by subagents) in Phase 9:

1. **Exploration results file** (from Phase 0.2):
   - [ ] **Create** `docs/memory/explorations/YYYY-MM-DD-[feature]-exploration.md`
   - Source: `exploration_results` variable returned by Explore subagent
   - Tool: Use Write tool
   - Format: Structured markdown with sections: Summary, Key Discoveries, Patterns, Tech Stack, Blockers, Recommendations

2. **Planning results file** (from Phase 0.3):
   - [ ] **Create** `docs/memory/planning/YYYY-MM-DD-[feature]-plan.md`
   - Source: `planning_results` variable returned by Plan subagent
   - Tool: Use Write tool
   - Format: Structured markdown with sections: Approach, Task Breakdown, Critical Files, Trade-offs, Risks, Feasibility

3. **User answers file** (from Phase 7, if AskUserQuestion was executed):
   - [ ] **Create** `docs/memory/questions/YYYY-MM-DD-[feature]-answers.md` (if user questions existed)
   - Source: User responses from AskUserQuestion tool
   - Tool: Use Write tool
   - Format: Q&A format with questions and selected answers

**Timeline:**
- **Phase 0.2-0.4**: Subagents return data as variables (`exploration_results`, `planning_results`, `strategic_plan`)
- **Phase 0.5**: Verify subagent completion and data variables exist
- **👉 Phase 4 (THIS PHASE)**: Main Claude executor creates persistent docs/memory files using Write tool
- **Phase 9**: Verify file creation and report to user

**Why Subagents Cannot Create Files:**
- Task tool subagents run in isolated processes
- Subagent-created files do not persist to Main Claude executor's filesystem
- Main Claude executor must explicitly use Write tool to create persistent files

9. **Create docs/memory Files (EXECUTE FIRST)**
    - **⚠️ MANDATORY FIRST STEP**: Before updating $ARGUMENTS file, create all docs/memory files
    - [ ] **Create exploration file** using Write tool:
      - Path: `docs/memory/explorations/YYYY-MM-DD-[feature]-exploration.md`
      - Source data: `exploration_results` variable from Phase 0.2
      - Format: Markdown with sections: Summary, Key Discoveries, Patterns, Tech Stack, Blockers, Recommendations
    - [ ] **Create planning file** using Write tool:
      - Path: `docs/memory/planning/YYYY-MM-DD-[feature]-plan.md`
      - Source data: `planning_results` variable from Phase 0.3
      - Format: Markdown with sections: Approach, Task Breakdown, Critical Files, Trade-offs, Risks, Feasibility
    - [ ] **Create questions file** (if user questions existed) using Write tool:
      - Path: `docs/memory/questions/YYYY-MM-DD-[feature]-answers.md`
      - Source data: User responses from AskUserQuestion tool in Phase 7
      - Format: Q&A format with questions and user's selected answers
    - [ ] **Verify all files were created successfully**
      - Use Bash tool with `ls -la` to confirm file existence
      - Report any file creation failures as CRITICAL ERROR

   **⚠️ PHASE 4 PREREQUISITES CHECK:**

   Before updating TODO.md, execute all prerequisite verifications from [VERIFICATION-PROTOCOLS.md](VERIFICATION-PROTOCOLS.md):
   - [Phase 1 Skip Detection](VERIFICATION-PROTOCOLS.md#phase-1-skip-detection)
   - [Phase 2 Skip Detection](VERIFICATION-PROTOCOLS.md#phase-2-skip-detection)

   **✅ VERIFICATION PASSED**: Only proceed to step 10 (TODO.md update) when ALL data structure validations pass.

  **🔍 INTEGRATION VERIFICATION - Pre-Update Data Quality Check:**

  Immediately before writing to $ARGUMENTS file (TODO.md), execute integration verification from [VERIFICATION-PROTOCOLS.md](VERIFICATION-PROTOCOLS.md#integration-verification).

  **✅ INTEGRATION VERIFICATION PASSED**: Only proceed to step 10 when all integration checks pass OR user explicitly approves proceeding with warnings.

9.5. **Retrieve Phase 1 Variables (MANDATORY BEFORE STEP 10)**

    Before executing Step 10 conditional logic, retrieve the variables set in Phase 0.1.

    **Implementation:**

    1. Search the conversation history for "Phase 1 Variables Summary" or "=== Phase 1 Variables Summary ==="
       - Look for a block containing the following variables:
         - `HAS_BRANCH_OPTION`
         - `HAS_PR_OPTION`
         - `BRANCH_NAME`
         - `IS_AUTO_GENERATED`

    2. Extract the variable values from the summary block:
       - Parse each line to extract the variable name and value
       - Store the values for use in Step 10

    3. If variables are not found in conversation history:
       - Set default values:
         - `HAS_BRANCH_OPTION = false`
         - `HAS_PR_OPTION = false`
         - `BRANCH_NAME = ""`
         - `IS_AUTO_GENERATED = false`
       - Log warning message:
         ```
         ⚠️ WARNING: Phase 1 variables not found in conversation history
         Using default values:
           HAS_BRANCH_OPTION = false
           HAS_PR_OPTION = false
           BRANCH_NAME = ""
           IS_AUTO_GENERATED = false
         ```
       - Continue execution with default values

    4. Log the retrieved/default values for debugging:
       ```
       === Phase 9 Step 9.5: Variables Retrieved ===
       HAS_BRANCH_OPTION = [value]
       HAS_PR_OPTION = [value]
       BRANCH_NAME = [value]
       IS_AUTO_GENERATED = [value]
       =============================================
       ```

    5. Validate variable types:
       - Confirm `HAS_BRANCH_OPTION` is boolean (true/false)
       - Confirm `HAS_PR_OPTION` is boolean (true/false)
       - Confirm `BRANCH_NAME` is string (may be empty)
       - Confirm `IS_AUTO_GENERATED` is boolean (true/false)

    **⚠️ CRITICAL**: These variables MUST be available for Step 10 conditional logic. If retrieval fails, Step 10 will use default values (no conditional tasks will be inserted).

10. **Thorough Update of $ARGUMENTS File (MANDATORY - MUST BE EXECUTED)**
    - **🚨 CRITICAL**: This step is the CORE PURPOSE of the command and MUST be executed
    - Use Edit or Write tool to update the file specified in $ARGUMENTS parameter
    - If file update fails, report as CRITICAL ERROR and retry

    - **🔀 Branch Creation Task (Conditional)**

      ### Sub-step 10.1: Conditional Branch Task Insertion

      **Step 1: Check Condition**

      1. Retrieve the value of `HAS_BRANCH_OPTION` from Phase 1 variables (retrieved in Step 9.5)

      2. Log the condition check:
         ```
         === Step 10.1: Checking Branch Task Insertion Condition ===
         HAS_BRANCH_OPTION = [value]
         ===========================================================
         ```

      **Step 2: Execute Conditional Logic**

      IF `HAS_BRANCH_OPTION = true`:

        **Step 2.1: Determine Branch Name**

        1. Check the value of `IS_AUTO_GENERATED`:
           - If `IS_AUTO_GENERATED = true`:
             - Use the branch name generated in Phase 0.1 Step 3
             - Retrieve `BRANCH_NAME` from Phase 1 variables
             - Log: "Using auto-generated branch name: [BRANCH_NAME value]"
           - If `IS_AUTO_GENERATED = false`:
             - Use the branch name from `BRANCH_NAME` variable (user-provided)
             - Retrieve `BRANCH_NAME` from Phase 1 variables
             - Log: "Using user-provided branch name: [BRANCH_NAME value]"

        2. Validate that `BRANCH_NAME` is not empty:
           - If `BRANCH_NAME` is empty string AND `IS_AUTO_GENERATED = true`:
             - Log error:
               ```
               ⚠️ ERROR: Branch name generation failed in Phase 0.1
               Using fallback branch name: feature/task-implementation
               ```
             - Set `BRANCH_NAME = "feature/task-implementation"`
           - If `BRANCH_NAME` is empty string AND `IS_AUTO_GENERATED = false`:
             - Log error:
               ```
               ⚠️ ERROR: Branch name value missing from arguments
               Using fallback branch name: feature/task-implementation
               ```
             - Set `BRANCH_NAME = "feature/task-implementation"`

        3. Log the final branch name to be used:
           ```
           Branch name for task insertion: [BRANCH_NAME value]
           ```

        **Step 2.2: Load Branch Task Template**

        Use the following template exactly as shown:

        ```markdown
        ### Phase 0: Branch Creation ✅

        - [ ] ✅ **Create Branch**
          - Branch name: `{BRANCH_NAME}`
          - Command: `git checkout -b {BRANCH_NAME}`
          - Verification: Confirm current branch is `{BRANCH_NAME}`
          - 📋 Commit all changes on this branch
          - Estimated time: 1 minute
        ```

        **Step 2.3: Replace Placeholder**

        1. Replace all occurrences of `{BRANCH_NAME}` in the template with the actual branch name value determined in Step 2.1

        2. The result should be a complete markdown section with the actual branch name

        3. Example result (if BRANCH_NAME = "feature/test-fix"):
           ```markdown
           ### Phase 0: Branch Creation ✅

           - [ ] ✅ **Create Branch**
             - Branch name: `feature/test-fix`
             - Command: `git checkout -b feature/test-fix`
             - Verification: Confirm current branch is `feature/test-fix`
             - 📋 Commit all changes on this branch
             - Estimated time: 1 minute
           ```

        **Step 2.4: Check for Existing Phase 0**

        1. Read the current TODO file content (the $ARGUMENTS file)

        2. Search for existing Phase 0 section:
           - Look for the pattern `### Phase 0:` or `## Phase 0:`
           - Search for the pattern `Phase 0: Branch Creation`

        3. Count the number of existing Phase 0 blocks found

        4. Determine insertion strategy:
           - If Phase 0 block count = 0:
             - Strategy: INSERT
             - Action: Insert new Phase 0 before Phase 1
             - Log:
               ```
               No existing Phase 0 found - will insert new Phase 0 before Phase 1
               ```
           - If Phase 0 block count = 1:
             - Strategy: REPLACE
             - Action: Remove the existing Phase 0 section and insert new one in same position
             - Log:
               ```
               Existing Phase 0 found - will replace with new Phase 0
               ```
           - If Phase 0 block count > 1:
             - Strategy: REPLACE_ALL
             - Action: Remove ALL existing Phase 0 sections and insert new one before Phase 1
             - Log:
               ```
               ⚠️ WARNING: Multiple Phase 0 blocks detected (count: [N])
               Removing all existing Phase 0 blocks and inserting new Phase 0
               ```

        **Step 2.5: Execute Task Insertion**

        1. Based on the strategy determined in Step 2.4:

           **INSERT mode (no existing Phase 0):**
           - Locate the position of `## Phase 1:` or `### Phase 1:` in the file
           - Use Edit tool to insert the new Phase 0 section BEFORE Phase 1
           - Preserve all blank lines and formatting
           - Do not modify Phase 1 or subsequent phases

           **REPLACE mode (single existing Phase 0):**
           - Locate the start and end of the existing Phase 0 section
           - Phase 0 section starts at `## Phase 0:` or `### Phase 0:`
           - Phase 0 section ends at the next `## Phase` or `### Phase` heading
           - Use Edit tool to replace the old Phase 0 section with the new template
           - Preserve surrounding content and formatting

           **REPLACE_ALL mode (multiple existing Phase 0):**
           - Locate ALL Phase 0 sections in the file
           - Remove each Phase 0 section completely
           - Insert the new Phase 0 section before Phase 1
           - Use Edit tool for each removal and the final insertion

        2. Verify the insertion:
           - Read the modified section of the TODO file
           - Confirm the branch name was correctly replaced (no `{BRANCH_NAME}` placeholders remain)
           - Confirm the section is in the correct position (before Phase 1)
           - Confirm Phase 1 and other phases are unchanged

        3. Log the completion:
           ```
           ✅ Branch task insertion complete
           Strategy: [INSERT/REPLACE/REPLACE_ALL]
           Branch name: [actual value]
           Phase 0 section verified
           ```

      ELSE (HAS_BRANCH_OPTION = false):

        Log and skip:
        ```
        Branch task insertion condition not met (HAS_BRANCH_OPTION = false)
        Skipping branch task insertion - no Phase 0 will be added
        Proceeding to Sub-step 10.2 (PR task check)
        ```

        Proceed directly to Sub-step 10.2 (PR task insertion check)

    - **🔀 PR Creation Tasks (Conditional)**

      ### Sub-step 10.2: Conditional PR Task Insertion

      **Step 1: Check Condition**

      1. Retrieve the value of `HAS_PR_OPTION` from Phase 1 variables (retrieved in Step 9.5)

      2. Log the condition check:
         ```
         === Step 10.2: Checking PR Task Insertion Condition ===
         HAS_PR_OPTION = [value]
         ========================================================
         ```

      **Step 2: Execute Conditional Logic**

      IF `HAS_PR_OPTION = true`:

        **Step 2.1: Determine Phase Number**

        1. Read the current TODO file content (the $ARGUMENTS file)

        2. Count existing phases in the TODO file:
           - Search for all occurrences of the pattern `## Phase [N]:` or `### Phase [N]:`
           - Extract all phase numbers found
           - Identify the highest phase number (N_max)

        3. Calculate new phase number:
           - New PR phase number = N_max + 1
           - Store this as `PR_PHASE_NUMBER`

        4. Log the phase calculation:
           ```
           Current highest phase number: [N_max]
           New PR phase will be: Phase [PR_PHASE_NUMBER]
           ```

        **Step 2.2: Retrieve Branch Name**

        1. Retrieve `BRANCH_NAME` from Phase 1 variables (from Step 9.5)

        2. Validate that `BRANCH_NAME` is not empty:
           - If `BRANCH_NAME` is empty string:
             - Log warning:
               ```
               ⚠️ WARNING: Branch name is empty for PR task insertion
               Using fallback branch name: feature/task-implementation
               ```
             - Set `BRANCH_NAME = "feature/task-implementation"`

        3. Log the branch name to be used:
           ```
           Branch name for PR task insertion: [BRANCH_NAME value]
           ```

        **Step 2.3: Load PR Task Template**

        Use the following template exactly as shown:

        ```markdown
        ### Phase {PHASE_NUMBER}: Pull Request Creation and Merge ✅/⏳

        - [ ] ✅ {PHASE_NUMBER}.1 PR Preparation Following Template
          - [ ] Read `.github/PULL_REQUEST_TEMPLATE.md` or `.github/pull_request_template.md`
          - [ ] If template exists, create PR description following its structure
          - [ ] If no template, use standard format: Summary, Changes, Testing
          - Estimated time: 5 minutes

        - [ ] ✅ {PHASE_NUMBER}.2 Create Pull Request
          - [ ] Push changes to remote: `git push -u origin {BRANCH_NAME}`
          - [ ] Verify remote branch was created successfully
          - [ ] Create PR using gh CLI: `gh pr create --title "[Title]" --body "[Description created from template]"`
          - [ ] Alternative: Use GitHub Web interface if gh CLI is unavailable
          - [ ] Verify PR was created successfully and record PR number
          - Estimated time: 3 minutes

        - [ ] ⏳ {PHASE_NUMBER}.3 Review and Merge
          - [ ] Check CI/CD pipeline results
          - [ ] Address review comments if any
          - [ ] Request review from team members if necessary
          - [ ] After approval, execute merge: `gh pr merge`
          - Estimated time: Variable (depends on review wait time)
        ```

        **Step 2.4: Replace Placeholders**

        1. Replace all occurrences of `{PHASE_NUMBER}` in the template with the actual PR phase number value (PR_PHASE_NUMBER from Step 2.1)

        2. Replace all occurrences of `{BRANCH_NAME}` in the template with the actual branch name value (from Step 2.2)

        3. The result should be a complete markdown section with actual values

        4. Example result (if PR_PHASE_NUMBER = 5 and BRANCH_NAME = "feature/test-fix"):
           ```markdown
           ### Phase 5: Pull Request Creation and Merge ✅/⏳

           - [ ] ✅ 5.1 PR Preparation Following Template
             - [ ] Read `.github/PULL_REQUEST_TEMPLATE.md` or `.github/pull_request_template.md`
             - [ ] If template exists, create PR description following its structure
             - [ ] If no template, use standard format: Summary, Changes, Testing
             - Estimated time: 5 minutes

           - [ ] ✅ 5.2 Create Pull Request
             - [ ] Push changes to remote: `git push -u origin feature/test-fix`
             - [ ] Verify remote branch was created successfully
             - [ ] Create PR using gh CLI: `gh pr create --title "[Title]" --body "[Description created from template]"`
             - [ ] Alternative: Use GitHub Web interface if gh CLI is unavailable
             - [ ] Verify PR was created successfully and record PR number
             - Estimated time: 3 minutes

           - [ ] ⏳ 5.3 Review and Merge
             - [ ] Check CI/CD pipeline results
             - [ ] Address review comments if any
             - [ ] Request review from team members if necessary
             - [ ] After approval, execute merge: `gh pr merge`
             - Estimated time: Variable (depends on review wait time)
           ```

        **Step 2.5: Check for Existing PR Phase**

        1. Search the TODO file for existing PR-related phases:
           - Look for patterns:
             - "Pull Request Creation"
             - "PR Creation"
             - "Create Pull Request"
           - Check if the final phase contains PR-related tasks

        2. Determine if deduplication is needed:
           - If PR-related phase exists at the end:
             - Strategy: REPLACE
             - Action: Remove existing PR phase and insert new one
             - Log:
               ```
               Existing PR phase found - will replace with new PR phase
               ```
           - If no PR-related phase exists:
             - Strategy: APPEND
             - Action: Append new PR phase at the end
             - Log:
               ```
               No existing PR phase found - will append new PR phase at end
               ```

        **Step 2.6: Execute Task Insertion**

        1. Based on the strategy determined in Step 2.5:

           **APPEND mode (no existing PR phase):**
           - Locate the end of the TODO file
           - Use Edit tool to append the new PR phase section at the end
           - Ensure there is a blank line before the new phase section
           - Do not modify any existing phases

           **REPLACE mode (existing PR phase):**
           - Locate the start and end of the existing PR phase section
           - PR phase section starts at the matching phase heading
           - PR phase section ends at the end of the file (since it's typically the last phase)
           - Use Edit tool to replace the old PR phase section with the new template
           - Preserve formatting

        2. Verify the insertion:
           - Read the appended/replaced section of the TODO file
           - Confirm all placeholders were correctly replaced:
             - No `{PHASE_NUMBER}` placeholders remain
             - No `{BRANCH_NAME}` placeholders remain
           - Confirm the phase number is correct (N_max + 1)
           - Confirm the branch name appears in push commands

        3. Log the completion:
           ```
           ✅ PR task insertion complete
           Strategy: [APPEND/REPLACE]
           Phase number: [PR_PHASE_NUMBER]
           Branch name: [actual value]
           PR phase section verified
           ```

      ELSE (HAS_PR_OPTION = false):

        Log and skip:
        ```
        PR task insertion condition not met (HAS_PR_OPTION = false)
        Skipping PR task insertion - no PR phase will be added
        Proceeding to Step 11 (finalization)
        ```

        Proceed to Step 11 (finalization)

    - **🔀 Conditional Behavior Summary**

      **Task Insertion Matrix**:

      | `HAS_BRANCH_OPTION` | `HAS_PR_OPTION` | Branch Task (Phase 0) | PR Task (Phase N+1) | Total Additional Phases |
      |---------------------|-----------------|----------------------|---------------------|------------------------|
      | `false` | `false` | ❌ Not inserted | ❌ Not inserted | 0 (base task list only) |
      | `true` | `false` | ✅ Inserted | ❌ Not inserted | +1 (Phase 0 added) |
      | `false` | `true` | ❌ Not inserted | ✅ Inserted | +1 (Phase N+1 added) |
      | `true` | `true` | ✅ Inserted | ✅ Inserted | +2 (Phase 0 and N+1 added) |

      **Branch Name Handling**:
      - **User-provided name** (`IS_AUTO_GENERATED = false`): Use `BRANCH_NAME` as-is
      - **Auto-generated name** (`IS_AUTO_GENERATED = true`): Use `BRANCH_NAME` generated in Phase 0.1 Step 3

      **Deduplication Strategy**:
      - Check for existing Phase 0 before branch task insertion → Replace if exists
      - Check for existing final phase before PR task insertion → Replace if contains PR-related tasks
      - Do not create duplicate phases with identical functionality

    - **Integrating Phase 0 Results**
      - Update file based on `strategic_plan.checklist_structure`
      - Include links to docs/memory:
        - `docs/memory/explorations/YYYY-MM-DD-[feature]-exploration.md`
        - `docs/memory/planning/YYYY-MM-DD-[feature]-plan.md`
      - Record next actions from `strategic_plan.implementation_recommendations`
    - **Required**: Directly update the $ARGUMENTS file (specified file)
    - **Complete Checklist Format**: Describe all tasks in Markdown checklist format with `- [ ]`
    - **Status Display**: Clearly indicate completed `- [x]`, in progress `- [🔄]`, waiting `- [ ]`
    - **Structured Sections**: Maintain checklist format within each category as well
    - **Nested Subtasks**: Create subtask checklists with indentation (2 spaces)
    - Display implementation feasibility indicators (✅⏳🔍🚧) on tasks
    - Describe confirmation items in checklist format as well
    - **Record Research Trail**: Specify referenced and analyzed file paths (detailed research results saved in docs/memory)
    - **Technical Rationale**: Record technical information that served as the basis for determination (detailed analysis saved in docs/memory)
    - **docs/memory Reference**: Record file paths of related research, analysis, and recommendation results
    - Record progress rate and update date
    - Add links to related documents and files
    - Add structured new sections while preserving existing content

---

## Post-Implementation Verification Checklist

After modifying Phase 9 implementation, verify the following:

- [ ] **Variable Retrieval Verification (Step 9.5)**
  - [ ] Conversation history search for "Phase 1 Variables Summary" works
  - [ ] All 4 variables are extracted correctly (HAS_BRANCH_OPTION, HAS_PR_OPTION, BRANCH_NAME, IS_AUTO_GENERATED)
  - [ ] Default values are set correctly when variables not found
  - [ ] Variable type validation works (boolean/string)
  - [ ] Retrieved values are logged for debugging

- [ ] **Branch Task Insertion Verification (Sub-step 10.1)**
  - [ ] Condition check: `HAS_BRANCH_OPTION = true` triggers insertion
  - [ ] Branch name determination logic works:
    - [ ] Auto-generated branch name used when `IS_AUTO_GENERATED = true`
    - [ ] User-provided branch name used when `IS_AUTO_GENERATED = false`
    - [ ] Fallback to "feature/task-implementation" when `BRANCH_NAME` is empty
  - [ ] Template loading works correctly
  - [ ] Placeholder replacement works: `{BRANCH_NAME}` → actual value
  - [ ] Existing Phase 0 detection works:
    - [ ] INSERT strategy when no Phase 0 exists
    - [ ] REPLACE strategy when single Phase 0 exists
    - [ ] REPLACE_ALL strategy when multiple Phase 0 blocks exist
  - [ ] Edit tool usage correctly inserts/replaces content
  - [ ] Post-insertion verification confirms no placeholders remain

- [ ] **PR Task Insertion Verification (Sub-step 10.2)**
  - [ ] Condition check: `HAS_PR_OPTION = true` triggers insertion
  - [ ] Phase number calculation works: N_max + 1
  - [ ] Branch name retrieval works (from Phase 1 variables)
  - [ ] Fallback branch name used when empty
  - [ ] Template loading works correctly
  - [ ] Placeholder replacement works:
    - [ ] `{PHASE_NUMBER}` → calculated phase number
    - [ ] `{BRANCH_NAME}` → actual branch name
  - [ ] Existing PR phase detection works:
    - [ ] APPEND strategy when no PR phase exists
    - [ ] REPLACE strategy when existing PR phase exists
  - [ ] Edit tool usage correctly inserts/replaces content
  - [ ] Post-insertion verification confirms no placeholders remain

- [ ] **Integration Testing**
  - [ ] Test Scenario 1: `HAS_BRANCH_OPTION=true, HAS_PR_OPTION=false` → Only Branch Task inserted
  - [ ] Test Scenario 2: `HAS_BRANCH_OPTION=false, HAS_PR_OPTION=true` → Only PR Task inserted
  - [ ] Test Scenario 3: `HAS_BRANCH_OPTION=true, HAS_PR_OPTION=true` → Both tasks inserted
  - [ ] Test Scenario 4: Both false → No additional tasks inserted
  - [ ] Test Scenario 5: Existing Phase 0 replacement works correctly
  - [ ] Test Scenario 6: PR phase number auto-calculation works

**Reference**: See `../../docs/memory/debugging/test-7-phase9-integration.log` for integration test results.

---

[← Previous: Phase 8](PHASE-8-QUESTIONS.md) | [Main](SKILL.md) | [Next: Phase 10 →](PHASE-10-VERIFICATION.md)
