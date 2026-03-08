# Phase 8: Question Management

[← Previous: Phase 7](PHASE-7-BREAKDOWN.md) | [Main](SKILL.md) | [Next: Phase 9 →](PHASE-9-UPDATE.md)

---

### Phase 8: Thorough Question Management, User Confirmation, and Specification Recommendations

6. **Question Extraction (Only What Is Necessary to Achieve the Objective)**
   - **Utilizing Phase 0 Strategic Plan**
     - Check extracted questions from `strategic_plan.user_questions`
     - Base on questions identified by project-manager skill in Phase 0.4
   - **🚨 Important Constraint**: Extract only questions that are truly necessary to achieve the objective
   - **Required**: Extract concrete unclear points from the researched files and implementation
   - **Duplicate Question Check**: Check past question history in docs/memory to avoid duplicates
   - Extract new unclear points and questions
   - Confirm the status of existing questions (answered/unanswered)
   - Organize questions by category (specification/technology/UI/UX/other)
   - Analyze the impact scope and urgency of questions
   - **Save Question History**: Save question and answer history in docs/memory/questions
   - **🎯 User Question UI**: When you have questions for the user, ALWAYS use the AskUserQuestion tool
     - `strategic_plan.user_questions` already contains structured options
     - Present questions with clear options for the user to select from
     - Provide 2-4 concrete answer choices with descriptions
     - Use multiSelect: true when multiple answers can be selected
     - Set concise headers (max 12 chars) for each question
     - This provides a better UX than asking questions in plain text
   - **🚨 CRITICAL: Thorough Questioning Protocol**
     - When you have questions or uncertainties, keep asking using AskUserQuestion tool until all doubts are resolved
     - Never proceed with assumptions - always confirm unclear points with the user
     - When multiple interpretations are possible, present options and ask the user to choose
     - Do not move to the next phase until all questions and uncertainties are completely resolved

7. **Evidence-Based Specification Recommendations**
   - **Required**: Present concrete recommended specifications based on research results
   - **Existing Recommendation Check**: Check past recommendations in docs/memory to maintain consistency
   - Recommended plan based on existing codebase patterns
   - Proposal of implementation policy considering technical constraints
   - Comparison and evaluation when there are multiple options
   - Specify recommendation reasons and rationale (including reference files and implementation examples)
   - Provide judgment materials with specified risks and benefits
   - **Save Recommendation History**: Save specification recommendations and rationale in docs/memory/recommendations
   - **🎯 User Question UI for Recommendations**: When presenting multiple options to the user, use AskUserQuestion tool
     - Present each option as a selectable choice with clear descriptions
     - Include pros/cons or trade-offs in the option descriptions
     - This allows users to make informed decisions easily

8. **Structural Update of $ARGUMENTS File**
   - Add new questions
   - Update the status of existing questions
   - Specify confirmation items necessary for task execution
   - Record reference information for the next execution
   - **Record Research Rationale**: Specify referenced files and code (details saved in docs/memory)
   - Record recommended specifications and selection reasons in a structured manner (details saved in docs/memory)
   - **docs/memory Reference Information**: Record file paths of related research and analysis results

9. **AskUserQuestion Tool Execution (MANDATORY BEFORE PHASE 4)**

   **⚠️ CRITICAL EXECUTION POLICY**:

   This step enforces a mandatory question extraction and user interaction checkpoint. You MUST evaluate execution conditions and follow the corresponding workflow.

   ### Execution Condition Decision Flow

   ```
   IF (questions extracted in step 6) THEN
       → CONDITION A: Execute AskUserQuestion tool (MANDATORY)
   ELSE
       → CONDITION B: No questions exist (MANDATORY documentation required)
   END IF
   ```

   ---

   ### CONDITION A: Questions Exist (MANDATORY Execution)

   **Triggers**:
   - `strategic_plan.user_questions` exists and contains questions
   - Questions were extracted during Phase 3 analysis
   - Unclear specifications or multiple valid approaches identified

   **🚨 MANDATORY**: You MUST execute AskUserQuestion tool before proceeding to Phase 8

   **Execution Steps**:
   - [ ] Present each question using AskUserQuestion tool with **required parameters**:
     - `header` (string, max 12 chars): Concise question identifier
     - `question` (string): Clear question text with context
     - `options` (array): 2-4 structured choice objects with:
       - `label` (string): Short option identifier
       - `description` (string): Explain implications of each choice
     - `multiSelect` (boolean): Set `true` when multiple answers can be selected
   - [ ] Wait for user responses - **DO NOT proceed to Phase 8 until answered**
   - [ ] Validate that all questions received responses

   **After Receiving Answers**:
   - [ ] **MANDATORY**: Record user responses in `docs/memory/questions/YYYY-MM-DD-[feature]-answers.md`
     - Format: Structured markdown with question headers, selected options, and rationale
     - Example structure:
       ```markdown
       # User Decisions - [Feature Name]
       Date: YYYY-MM-DD

       ## Question 1: [Header]
       **Selected**: [Option Label]
       **Rationale**: [Why this choice was made]

       ## Question 2: [Header]
       **Selected**: [Option Label(s)]
       **Rationale**: [Decision context]
       ```
   - [ ] Update task planning based on user decisions
   - [ ] Resolve any 🚧 Blocked or 🔍 Research tasks that depended on answers

   **Error Handling**:
   - If AskUserQuestion tool fails → **STOP execution** and report error to user
   - If questions.md file creation fails → Retry once, then escalate to user
   - Do NOT proceed to Phase 8 if any question remains unanswered

   ---

   ### CONDITION B: No Questions (MANDATORY Documentation)

   **⚠️ MANDATORY**: If there are genuinely no questions or uncertainties:
   - [ ] Proceed directly to Phase 8
   - [ ] **REQUIRED**: Document in Phase 5 summary why no questions were needed
   - [ ] Explain what made the requirements clear enough to skip user interaction

   ---

   ### Why This Matters

   **Risks of Skipping Questions**:
   - **Incorrect Assumptions**: Proceeding without clarification can lead to implementing wrong features or using inappropriate technical approaches
   - **Wasted Development Effort**: Building features based on misunderstood requirements results in rework and delays
   - **Context Loss**: Without recorded user decisions, future maintainers cannot understand why specific implementation choices were made
   - **User Misalignment**: Skipping user validation means missed opportunities to catch requirement mismatches early

   This checkpoint ensures alignment between user intent and implementation strategy before significant development effort begins.

---

[← Previous: Phase 7](PHASE-7-BREAKDOWN.md) | [Main](SKILL.md) | [Next: Phase 9 →](PHASE-9-UPDATE.md)
