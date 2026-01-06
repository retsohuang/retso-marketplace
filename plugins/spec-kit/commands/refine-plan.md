---
description: Refine a plan by resolving gaps and NEEDS DECISION markers
argument-hint: <plan-path>
allowed-tools: Read, Edit, AskUserQuestion, Glob
---

# Refine Plan

Refine an existing implementation plan by resolving `[NEEDS DECISION]` markers and completing any gaps.

**Stage Transition:** Draft → Waiting for Validation (when all gaps resolved)

## Usage

```bash
/spec-kit:refine-plan specs/001-feature-name
```

Where `<plan-path>` is the path to the spec directory (e.g., `specs/001-feature-name`).

## Instructions

### Step 1: Load and Validate Stage

Read the plan file at `$ARGUMENTS/plan.md`.

**Stage Check:** Check the plan stage in the frontmatter:
- If `Draft` or `Waiting for Validation`: Proceed with refinement
- If `Ready for Tasks`: Inform user the plan is already complete

### Step 2: Analyze for Gaps

Identify areas that need refinement:
- Find `[NEEDS DECISION]` markers
- Identify incomplete sections (empty or placeholder text)
- Check for missing rationale in decisions
- Look for undefined implementation phases

### Step 3: Sequential Questioning

For each gap found:
1. Ask one decision at a time using AskUserQuestion
2. Focus on most critical gaps first
3. Gather context for each decision

### Step 4: Update Plan

Apply refinements directly to the plan:
- Replace `[NEEDS DECISION]` markers with actual decisions
- Add rationale for each decision made
- Complete any missing sections
- If all gaps resolved: Update stage from `Draft` to `Waiting for Validation`

### Step 5: Report Results

Output a summary of changes:

```
## Plan Refinement: {feature-name}

### Decisions Made
- {Decision 1}: {Choice made}
- {Decision 2}: {Choice made}

### Sections Updated
- {Section 1}
- {Section 2}

### Status
Stage: {Draft → Waiting for Validation | Draft (N gaps remaining)}

{If stage updated}: Ready for validation with `/spec-kit:validate-plan`
{If gaps remain}: Continue refining with `/spec-kit:refine-plan`
```

## Example

**User:** "/spec-kit:refine-plan specs/003-realtime-chat"

**Agent:**

1. Reads `specs/003-realtime-chat/plan.md`
2. Finds 2 `[NEEDS DECISION]` markers:
   - Message storage: Redis vs PostgreSQL
   - Auth: JWT vs session-based
3. Asks about message storage first
4. User chooses Redis for speed
5. Asks about auth approach
6. User chooses JWT for stateless scaling
7. Updates plan with decisions and rationale
8. Reports:
   ```
   ## Plan Refinement: realtime-chat

   ### Decisions Made
   - Message storage: Redis (for speed and pub/sub support)
   - Authentication: JWT (for stateless scaling)

   ### Sections Updated
   - Key Decisions
   - Architecture Overview

   ### Status
   Stage: Draft → Waiting for Validation

   Ready for validation with `/spec-kit:validate-plan`
   ```
