---
description: Validate a plan before marking it ready for tasks
argument-hint: <plan-path>
allowed-tools: Read, Edit, AskUserQuestion, Glob
---

# Validate Plan

Validate an implementation plan before marking it as `Ready for Tasks`. Think of this as "unit tests for English" - ensuring the plan is complete, clear, and consistent.

**Stage Transition:** Waiting for Validation → Ready for Tasks (on pass)

## Usage

```bash
/spec-kit:validate-plan specs/001-feature-name
```

Where `<plan-path>` is the path to the spec directory (e.g., `specs/001-feature-name`).

## Instructions

### Step 1: Load and Validate Stage

Read the plan file at `$ARGUMENTS/plan.md` and the linked spec file.

**Stage Check:** Verify the plan stage in the frontmatter:
- If `Draft`: Inform user to run `/spec-kit:refine-plan` first to resolve all gaps
- If `Ready for Tasks`: Inform user the plan has already been validated
- If `Waiting for Validation`: Proceed with validation

### Step 2: Run Completeness Checks

| Check | Validation | Failure Action |
|-------|------------|----------------|
| Spec link | Plan references source spec.md | Add spec link |
| Technical context | All fields populated (language, dependencies, platform) | Fill missing fields |
| Architecture | Components and data flow defined | Define architecture |
| Implementation details | Code samples for types and APIs present | Add code samples |
| Implementation phases | At least 2 phases with concrete tasks | Define phases |
| No open markers | Zero `[NEEDS DECISION]` markers remain | Resolve or ask user |

### Step 3: Run Consistency Checks

| Check | Validation | Failure Action |
|-------|------------|----------------|
| Spec alignment | Every acceptance criterion from spec is addressable by plan | Map missing criteria to phases |
| Tech stack match | Dependencies align with stated language/platform | Correct mismatches |
| Data flow coverage | All components in data flow are defined in Components | Add missing components |
| Phase dependencies | Later phases don't depend on undefined earlier work | Reorder or add prerequisite tasks |

### Step 4: Run Clarity Checks

| Check | Validation | Failure Action |
|-------|------------|----------------|
| Decision rationale | Every key decision has rationale and alternatives | Add missing rationale |
| Type definitions | Interfaces have field descriptions or are self-documenting | Add clarity to types |
| Phase scope | Each phase has concrete tasks with detailed implementation guidance | Add implementation details to tasks |
| Risk coverage | Major technical risks identified with mitigations | Add risk analysis |

### Step 5: Report Results

Output validation results in this format:

```
## Plan Validation: {feature-name}

### Completeness: PASS | FAIL
- [x] Spec link present
- [x] Technical context complete
- [ ] Missing: Implementation details code samples

### Consistency: PASS | FAIL
- [x] All acceptance criteria mapped
- [ ] Issue: Component "Cache" in data flow not defined

### Clarity: PASS | FAIL
- [x] All decisions have rationale
- [x] Phases appropriately scoped

**Result:** {Pass | Fail (N issues to resolve)}
```

### Step 6: Handle Results

**If ALL checks pass:**
- Update stage from `Waiting for Validation` to `Ready for Tasks`
- Inform user the plan is ready for task generation with plan-to-code skill

**If ANY check fails:**
- Keep stage as `Waiting for Validation`
- List specific issues to address
- Fix issues directly if the answer is clear
- Run `/spec-kit:refine-plan` if user input needed
- Re-run validation after fixes

## Example

**User:** "/spec-kit:validate-plan specs/003-realtime-chat"

**Agent:**

1. Loads `specs/003-realtime-chat/plan.md` and linked spec
2. Runs validation checks
3. Finds issues:
   - Missing code sample for WebSocket message handler
   - Acceptance criterion "offline message queue" not mapped to any phase
4. Reports:
   ```
   ## Plan Validation: realtime-chat

   ### Completeness: FAIL
   - [x] Spec link present
   - [x] Technical context complete
   - [ ] Missing: WebSocket message handler code sample

   ### Consistency: FAIL
   - [ ] Spec criterion "offline message queue" not addressed
   - [x] Tech stack coherent
   - [x] Data flow coverage complete

   ### Clarity: PASS
   - [x] All decisions have rationale
   - [x] Phases appropriately scoped
   - [x] Risks identified

   **Result:** Fail (2 issues to resolve)
   ```
5. Offers to help fix issues or asks user for guidance
