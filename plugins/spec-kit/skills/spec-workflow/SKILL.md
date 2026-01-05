---
name: spec-workflow
description: Create, refine, and validate feature specifications. Use when users want to "create a spec", "write a specification", "define requirements", "specify a feature", "refine a spec", "clarify requirements", "validate spec", or "check if ready to plan". Transforms vague descriptions into comprehensive specs, resolves ambiguities, and validates readiness for planning.
license: MIT
metadata:
  author: Retso Huang
  version: "1.0"
---

# Spec Workflow

Creates structured feature specifications following spec-driven development principles. Focus on WHAT users need and WHY, not HOW to implement.

## Stages

Specs progress through three stages. Each stage must be completed before moving to the next—no skipping allowed.

```
┌─────────────┐      ┌───────────────────────┐      ┌─────────────────┐
│   Draft     │─────▶│  Waiting for          │─────▶│  Ready for Planning  │
│             │      │  Validation           │      │                 │
└─────────────┘      └───────────────────────┘      └─────────────────┘
      │                        │                           │
      ▼                        ▼                           ▼
  Initial spec           All clarifications          Validation passed,
  creation,              resolved, all               ready for spec-to-plan
  may have gaps          sections complete
```

### Stage Definitions

| Stage | Description | Allowed Actions | Exit Criteria |
|-------|-------------|-----------------|---------------|
| **Draft** | Initial spec with potential gaps, `[NEEDS CLARIFICATION]` markers, or incomplete sections | Create, Clarify | All gaps resolved, all sections complete |
| **Waiting for Validation** | Spec is complete, awaiting validation checks | Validate, Clarify | Validation passes all checks |
| **Ready for Planning** | Validated and ready for planning | None (terminal) | N/A - hand off to spec-to-plan |

### Stage Transition Rules

| From | Action | To | Notes |
|------|--------|-----|-------|
| (none) | Create New Spec | Draft | Initial creation |
| Draft | Clarify (complete all gaps) | Waiting for Validation | All `[NEEDS CLARIFICATION]` resolved |
| Draft | Validate | ❌ Blocked | Must clarify first |
| Waiting for Validation | Validate (pass) | Ready for Planning | All checks pass |
| Waiting for Validation | Validate (fail) | Waiting for Validation | Fix issues and re-validate |
| Waiting for Validation | Clarify | Waiting for Validation | Can clarify after failed validation |

## Workflows

### Create New Spec

Use when the user provides a new feature description.

**Stage:** (none) → Draft

**Steps:**

1. **Determine feature number**
   - Scan `specs/` directory for existing feature folders
   - Assign next sequential number (001, 002, 003...)

2. **Generate feature name**
   - Create kebab-case name from feature description
   - Example: "user authentication" → `001-user-authentication`

3. **Create directory**
   - Create `specs/{NNN}-{feature-name}/`

4. **Generate spec.md**
   - Use the template from `assets/spec-template.md`
   - Fill in sections based on user's feature description
   - Mark unknowns with `[NEEDS CLARIFICATION: specific question]`

**Quality Guards:**
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- ❌ No speculative features - only what traces to user stories

### Clarify Existing Spec

Use when the user wants to refine an existing specification.

**Stage:** Draft → Waiting for Validation (when all gaps resolved)

**Stage Check:** Before clarifying, verify the spec is in `Draft` or `Waiting for Validation` stage. If `Ready for Planning`, inform user the spec is already complete.

**Steps:**

1. **Read existing spec**
   - Load the `spec.md` file from the specified path

2. **Analyze for gaps**
   - Find `[NEEDS CLARIFICATION]` markers
   - Identify underspecified user stories
   - Check for missing acceptance criteria
   - Look for ambiguous requirements

3. **Sequential questioning**
   - Ask coverage-based questions one area at a time
   - Use AskUserQuestion tool for structured input
   - Focus on resolving the most critical gaps first

4. **Update spec directly**
   - Replace `[NEEDS CLARIFICATION]` markers with answers
   - Refine user stories and acceptance criteria in-place
   - Add any new requirements discovered during clarification
   - If all gaps resolved: Update stage from `Draft` to `Waiting for Validation`

**Output:** Updated `spec.md` with resolved clarifications and updated stage

### Validate Spec

Use before marking a spec as `Ready for Planning`. Think of this as "unit tests for English" - ensuring requirements are complete, clear, and consistent.

**Stage:** Waiting for Validation → Ready for Planning (on pass)

**Stage Check:** Before validating, verify the spec is in `Waiting for Validation` stage.
- If `Draft`: Inform user to clarify the spec first to resolve all gaps
- If `Ready for Planning`: Inform user the spec has already been validated

**Validation Checklist:**

| Check | Question | Pass Criteria |
|-------|----------|---------------|
| Features Complete | All features described? | Every capability mentioned in overview has corresponding user stories |
| Edge Cases | Edge cases covered? | Error states, empty states, limits, and boundary conditions addressed |
| Unambiguous | Unambiguous language? | No vague terms like "fast", "easy", "seamless" without measurable criteria |
| Scope Boundaries | Clear scope boundaries? | Explicit "Out of Scope" section; no feature creep or unbounded requirements |
| No Conflicts | No conflicts between requirements? | Requirements don't contradict each other; priorities are clear |
| No Implementation | No implementation details? | Focus on WHAT/WHY, not HOW (unless technically constrained) |

**Steps:**

1. **Run checklist**
   - Evaluate spec against each validation criterion
   - Mark each check as ✅ Pass or ❌ Fail with specific issues

2. **Report results**
   - If ALL checks pass → Update stage to `Ready for Planning`
   - If ANY check fails → Keep stage as `Waiting for Validation`, list issues for user to address

3. **Resolve failures**
   - For each failed check, either:
     - Fix directly if the answer is clear
     - Use clarification workflow if user input needed
   - Re-run validation after fixes

**Example Validation Output:**

```
## Spec Validation: 003-realtime-chat

✅ Features Complete - All 4 features have user stories
✅ Edge Cases - Network failures, empty history, rate limits covered
❌ Unambiguous - "messages load quickly" needs measurable latency target
   → Fix: "Messages display within 200ms of sending under normal network conditions"
✅ Scope Boundaries - Video chat explicitly out of scope
✅ No Conflicts - Requirements are consistent
✅ No Implementation - No tech stack specified

**Stage Transition:** Waiting for Validation → Needs Revision (1 issue to resolve)
```

## Template Reference

See [assets/spec-template.md](assets/spec-template.md) for the specification template structure.

## Example Usage

**User:** "Create a spec for real-time chat with message history"

**Agent:**
1. Scans `specs/` → finds 2 existing features
2. Creates `specs/003-realtime-chat/`
3. Generates `spec.md` with:
   - Overview of chat functionality
   - User stories for sending/receiving messages
   - Acceptance criteria for message history
   - Non-functional requirements (latency, persistence)
   - `[NEEDS CLARIFICATION]` markers for unknowns

**User:** "Clarify the chat spec"

**Agent:**
1. Reads `specs/003-realtime-chat/spec.md`
2. Finds 3 clarification markers
3. Asks sequential questions about each
4. Updates spec with clarified requirements
