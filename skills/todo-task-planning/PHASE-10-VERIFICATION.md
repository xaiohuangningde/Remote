# Phase 10: Verification

[← Previous: Phase 9](PHASE-9-UPDATE.md) | [Main](SKILL.md)

---

### Phase 10: Thorough Verification and Feedback

11. **Multi-faceted Update Result Verification**
    - **Required**: Reload and confirm the updated file
    - Verify the consistency and completeness of tasks
    - Check for missing or duplicate questions
    - **Questions Processing Integrity Validation**:
      - Execute validation from [VERIFICATION-PROTOCOLS.md](VERIFICATION-PROTOCOLS.md#questions-processing-integrity-validation)
      - If validation fails, follow the recovery procedure defined in the protocols document
    - **Technical Consistency Verification**: Reconfirm whether the proposed tasks are technically executable
    - **Dependency Verification**: Confirm whether dependencies between tasks are correctly set
    - **Research Rationale Verification**: Confirm whether there are any omissions in the recorded research results

12. **Comprehensive Execution Summary Provision**
    - **Research Performance**: Report the number of researched files and directories
    - **Analysis Results**: Report the number of newly created tasks and their classification
    - **Verification Status**: Report identified questions and confirmation items
    - **$ARGUMENTS File Update Verification** (MANDATORY):
      - [ ] **CRITICAL**: Confirm that the $ARGUMENTS file (specified in command argument) was updated in Phase 8
        - Read the file using Read tool to verify the update was successful
        - Compare file modification timestamp to confirm recent update
        - If NOT updated: Report as CRITICAL ERROR - the file update is mandatory
        - If updated: Confirm new tasks, questions, and sections were added correctly
    - **docs/memory Files Creation Report** (MANDATORY):
      - [ ] **Exploration file**: Confirm `docs/memory/explorations/YYYY-MM-DD-[feature]-exploration.md` was created
        - If NOT created: Report as CRITICAL ERROR with explanation
        - If created: Report file size and confirm contents
      - [ ] **Planning file**: Confirm `docs/memory/planning/YYYY-MM-DD-[feature]-plan.md` was created
        - If NOT created: Report as CRITICAL ERROR with explanation
        - If created: Report file size and confirm contents
      - [ ] **Questions file** (if applicable): Confirm `docs/memory/questions/YYYY-MM-DD-[feature]-answers.md` was created (if user questions existed)
        - Report whether this file was needed and created
    - **AskUserQuestion Execution Report** (MANDATORY):
      - Report whether AskUserQuestion tool was executed
      - If executed: Report number of questions asked and answers received
      - If not executed: Explicitly state "No questions required" with justification
      - Report location of recorded answers: `docs/memory/questions/YYYY-MM-DD-[feature]-answers.md`
      - **Questions Processing Integrity Status**:
        - Report validation result: SUCCESS / FAILURE / GRAY ZONE (as defined in Questions Processing Integrity Validation)
        - If FAILURE: Report gap details (missing question count, specific IDs)
        - If recovery executed: Report rollback to Phase 3 Step 9 and re-execution results
        - Confirm 1:1 mapping achieved: Questions count = Answers count
    - **Technical Insights**: Report discovered technical issues, constraints, and opportunities
    - **Recommended Actions**: Concretely specify the next action items
    - **Improvement Proposals**: Propose improvements for iterative execution
    - **Update Confirmation**: Confirm and report that the $ARGUMENTS file has been updated normally
    - **Quality Indicators**: Self-evaluate the thoroughness of research, accuracy of analysis, and practicality of proposals

---

[← Previous: Phase 9](PHASE-9-UPDATE.md) | [Main](SKILL.md)
