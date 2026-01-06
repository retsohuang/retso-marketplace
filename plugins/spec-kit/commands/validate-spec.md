---
description: Validate a spec before marking it ready for planning
argument-hint: <spec-path>
allowed-tools: Read, Edit, AskUserQuestion, Glob
---

# Validate Spec

Validate a specification before marking it as `Ready for Planning`. Think of this as "unit tests for English" - ensuring requirements are complete, clear, and consistent.

**Stage Transition:** Waiting for Validation → Ready for Planning (on pass)

## Usage

```bash
/spec-kit:validate-spec specs/001-feature-name
```

Where `<spec-path>` is the path to the spec directory (e.g., `specs/001-feature-name`).

## Instructions

### Step 1: Load and Validate Stage

Read the spec file at `$ARGUMENTS/spec.md`.

**Stage Check**: Verify the spec stage in the frontmatter:
- If `Draft`: Inform user to run `/spec-kit:clarify-spec` first to resolve all gaps
- If `Ready for Planning`: Inform user the spec has already been validated
- If `Waiting for Validation`: Proceed with validation

### Step 2: Run Validation Checklist

Evaluate the spec against each criterion:

| Check | Question | Pass Criteria |
|-------|----------|---------------|
| Features Complete | All features described? | Every capability mentioned in overview has corresponding user stories |
| Edge Cases | Edge cases covered? | Error states, empty states, limits, and boundary conditions addressed |
| Unambiguous | Unambiguous language? | No vague terms like "fast", "easy", "seamless" without measurable criteria |
| Scope Boundaries | Clear scope boundaries? | Explicit "Out of Scope" section; no feature creep or unbounded requirements |
| No Conflicts | No conflicts between requirements? | Requirements don't contradict each other; priorities are clear |
| No Implementation | No implementation details? | Focus on WHAT/WHY, not HOW (unless technically constrained) |

Mark each check as ✅ Pass or ❌ Fail with specific issues.

### Step 3: Report Results

Output validation results in this format:

```
## Spec Validation: {feature-name}

✅ Features Complete - {reason}
✅ Edge Cases - {reason}
❌ Unambiguous - {specific issue}
   → Fix: {suggested fix}
✅ Scope Boundaries - {reason}
✅ No Conflicts - {reason}
✅ No Implementation - {reason}

**Result:** {Pass | Fail (N issues to resolve)}
```

### Step 4: Handle Results

**If ALL checks pass:**
- Update stage from `Waiting for Validation` to `Ready for Planning`
- Inform user the spec is ready for planning with spec-to-plan skill

**If ANY check fails:**
- Keep stage as `Waiting for Validation`
- List specific issues to address
- Fix issues directly if the answer is clear
- Run `/spec-kit:clarify-spec` if user input needed
- Re-run validation after fixes
