---
description: Refine an existing spec by resolving gaps and clarifying requirements
argument-hint: <spec-path>
allowed-tools: Read, Edit, AskUserQuestion, Glob
---

# Clarify Spec

Refine an existing specification by analyzing gaps, asking clarifying questions, and updating the spec with resolved requirements.

**Stage Transition:** Draft → Waiting for Validation (when all gaps resolved)

## Usage

```bash
/spec-kit:clarify-spec specs/001-feature-name
```

Where `<spec-path>` is the path to the spec directory (e.g., `specs/001-feature-name`).

## Instructions

### Step 1: Load and Validate Spec

Read the spec file at `$ARGUMENTS/spec.md`.

**Stage Check**: Verify the spec stage in the frontmatter:
- If `Ready for Planning`: Inform user the spec is already complete and exit
- If `Draft` or `Waiting for Validation`: Proceed with clarification

### Step 2: Analyze for Gaps

Scan the spec for:
- `[NEEDS CLARIFICATION]` markers
- Underspecified user stories
- Missing acceptance criteria
- Ambiguous requirements (vague terms without measurable criteria)
- Missing edge cases or error states

Create a list of gaps to resolve, prioritized by importance.

### Step 3: Sequential Questioning

Ask coverage-based questions one area at a time:
- Use `AskUserQuestion` tool for structured input
- Focus on resolving the most critical gaps first
- Frame questions to get actionable, specific answers

Example question structure:
```
For the "message delivery" user story, what should happen when:
- The recipient is offline?
- The message exceeds the size limit?
```

### Step 4: Update Spec

After each clarification:
1. Replace `[NEEDS CLARIFICATION]` markers with answers
2. Refine user stories and acceptance criteria in-place
3. Add any new requirements discovered during clarification
4. If all gaps resolved: Update stage from `Draft` to `Waiting for Validation`

### Step 5: Report Results

**Output:** Updated `spec.md` with resolved clarifications and updated stage.

Summarize:
- Number of gaps resolved
- Key decisions made
- Current spec stage
- Next action: Run `/spec-kit:validate-spec` when ready
