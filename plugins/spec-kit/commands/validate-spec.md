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
- Proceed to Step 5 (Estimate Points)

**If ANY check fails:**
- Keep stage as `Waiting for Validation`
- List specific issues to address
- Fix issues directly if the answer is clear
- Run `/spec-kit:clarify-spec` if user input needed
- Re-run validation after fixes

### Step 5: Estimate Story Points

When validation passes, estimate story points based on spec complexity. Points use fibonacci scale (1, 2, 3, 5, 8, 13, 21) where **1 point = 1 hour** of Senior Engineer effort.

**Estimation Factors:**

| Factor | Weight | How to Count |
|--------|--------|--------------|
| User Stories | 2-4 pts each | Base complexity per story |
| Acceptance Scenarios | 0.5-1 pt each | Additional test coverage |
| NFRs (Non-Functional) | 1-3 pts each | Performance, security, scalability work |
| Integrations | 2-5 pts each | External APIs, services mentioned |
| Constraints | 1-2 pts each | Technical limitations adding complexity |

**Estimation Guidelines:**

| Total Points | Typical Scope |
|--------------|---------------|
| 1-3 | Trivial change, single file |
| 5-8 | Small feature, few components |
| 13-21 | Medium feature, multiple systems |
| 21+ | Large feature, consider splitting |

**Steps:**
1. Count user stories, acceptance scenarios, NFRs, integrations, constraints
2. Apply weights based on complexity indicators
3. Round to nearest fibonacci number
4. Update `**Estimated Points:**` field in spec frontmatter
5. Update stage to `Ready for Planning`
6. Inform user the spec is ready with estimated points
