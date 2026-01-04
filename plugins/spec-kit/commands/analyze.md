---
description: Validate cross-artifact consistency between constitution, spec, plan, and tasks
allowed-tools: Read
model: claude-sonnet-4-5
---

# Analyze Consistency

Perform read-only validation of consistency across all spec-kit artifacts: constitution, specifications, plans, and tasks. Identify gaps, conflicts, and misalignments without making any changes.

## Usage

```bash
/spec-kit:analyze
```

Can be run from any branch. Analyzes all features or current feature depending on context.

## Process

### Step 1: Determine Scope

Check if on a feature branch:

```bash
CURRENT_BRANCH=$(git branch --show-current)
```

- If on `spec-kit/{NNN}-{feature-name}`: Analyze that feature only
- If on another branch: Analyze all features

### Step 2: Load All Artifacts

For the feature(s) being analyzed, read:

```bash
# Constitution (if exists)
cat .claude/spec-kit/memory/constitution.md

# For each feature
cat .claude/spec-kit/specs/{NNN}-{feature}/spec.md
cat .claude/spec-kit/specs/{NNN}-{feature}/plan.md
cat .claude/spec-kit/specs/{NNN}-{feature}/tasks.md
```

### Step 3: Analyze Constitution Alignment

If constitution exists, check if specs align with:

**Core Principles:**
- Do specs reflect the stated principles?
- Are decisions consistent with stated values?

**Technical Standards:**
- Do plans follow architectural standards?
- Are testing strategies consistent with constitution?
- Do chosen technologies match technical standards?

**Decision-Making Guidelines:**
- Was the "when to write a spec" criteria followed?
- Are trade-offs documented as expected?

Report issues like:
```
⚠️ Constitution Misalignment: Feature 001-user-auth

Principle Conflict:
- Constitution states: "Quality over speed - thorough testing first"
- Spec has: No testing requirements in success criteria
- Suggestion: Add testing requirements to spec and plan

Standard Violation:
- Constitution requires: "80% test coverage minimum"
- Plan has: "Unit tests for core logic" (no coverage target)
- Suggestion: Add coverage target to plan testing strategy
```

### Step 4: Analyze Spec → Plan Consistency

Check if the plan addresses all spec requirements:

**Requirements Coverage:**
- Are all functional requirements (FR-1, FR-2, etc.) addressed in the plan?
- Are non-functional requirements (NFR-1, NFR-2, etc.) considered?
- Are technical requirements (TR-1, TR-2, etc.) satisfied?

**User Stories Coverage:**
- Is each user story addressed in the plan?
- Are acceptance criteria achievable with the planned approach?

**Data Requirements:**
- Are all data models from spec defined in plan?
- Are data sources and persistence strategies specified?

**Integration Points:**
- Are all mentioned integrations included in plan?
- Are error handling strategies defined?

**Success Metrics:**
- Can the planned implementation achieve the success metrics?
- Are monitoring approaches defined for metrics?

Report issues like:
```
❌ Missing Requirements: Feature 002-payment

Spec Requirements Not Addressed in Plan:
- FR-3: Support for international currencies
  → Plan only mentions USD
  → Action: Update plan to include multi-currency support

- NFR-2: 99.9% uptime requirement
  → Plan has no redundancy or failover strategy
  → Action: Add high-availability design to plan

User Story Not Covered:
- "As a user, I want to save payment methods"
  → No data model for saved payments in plan
  → Action: Add SavedPaymentMethod to data models
```

### Step 5: Analyze Plan → Tasks Consistency

Check if tasks implement the entire plan:

**File Coverage:**
- Are all planned files-to-create included in tasks?
- Are all planned files-to-modify included in tasks?

**Phase Coverage:**
- Do tasks cover all implementation phases?
- Are phase goals achievable with listed tasks?

**Architectural Decisions:**
- Is each architectural decision reflected in tasks?
- Are chosen technologies included in dependency tasks?

**Testing Coverage:**
- Are all testing strategies from plan included in tasks?
- Unit, integration, E2E tests all present?

**Deployment Coverage:**
- Are rollout strategy steps included in tasks?
- Is monitoring setup included?

Report issues like:
```
⚠️ Incomplete Task Breakdown: Feature 003-admin-dashboard

Missing Files:
- Plan mentions: src/components/Dashboard/AdminPanel.tsx
  → No task creates this file
  → Action: Add task to create AdminPanel component

Missing Tests:
- Plan requires: E2E tests for admin workflows
  → No E2E test tasks in Phase 3
  → Action: Add E2E testing task

Architectural Decision Not Implemented:
- Plan decides: Use Redis for session caching
  → No task adds Redis dependency or configuration
  → Action: Add Redis setup task to Phase 1
```

### Step 6: Analyze Cross-Feature Consistency

If analyzing multiple features, check:

**Naming Conflicts:**
- Do features use different names for the same concept?
- Are data models consistent across features?

**Integration Points:**
- Do features that should integrate reference each other?
- Are shared components identified?

**Dependency Order:**
- Do feature numbers match dependency order?
- Does Feature 002 depend on Feature 001's output?

Report issues like:
```
🔗 Cross-Feature Issues:

Naming Inconsistency:
- Feature 001 uses: "Customer" model
- Feature 002 uses: "User" model
  → Appears to be same entity
  → Suggestion: Standardize on one name

Missing Dependency:
- Feature 003 (Admin Dashboard) requires auth
- Feature 001 (User Auth) is still in progress
  → Feature 003 should reference or depend on 001
  → Suggestion: Update Feature 003 spec to note dependency
```

### Step 7: Check for Common Issues

Look for typical problems:

**Vague Requirements:**
- Requirements without measurable criteria
- Phrases like "should be fast", "user-friendly"

**Missing Error Handling:**
- No error scenarios in specs
- No error handling in plans

**Incomplete Acceptance Criteria:**
- User stories without checkboxes
- Task acceptance criteria missing

**Orphaned Sections:**
- Open questions never resolved
- Risks without mitigation strategies

**Scope Creep:**
- Tasks that aren't in the plan
- Plan features not in the spec

### Step 8: Generate Report

Create a comprehensive report with:

**Summary:**
- Total features analyzed
- Total issues found (critical, warnings, suggestions)
- Overall consistency score

**Critical Issues** (must fix before implementation):
- Missing requirements
- Conflicting decisions
- Blocked dependencies

**Warnings** (should address):
- Incomplete coverage
- Vague specifications
- Missing strategies

**Suggestions** (nice to have):
- Clarifications
- Additional documentation
- Process improvements

### Step 9: Show Summary

```
✅ Consistency Analysis Complete!

Scope: {all features | Feature NNN-name}
Artifacts Analyzed: {count} specs, {count} plans, {count} task lists

Results:
- 🔴 Critical Issues: {count}
- 🟡 Warnings: {count}
- 🟢 Suggestions: {count}
- ✅ Consistency Score: {score}%

{If issues found:}
Critical Issues Require Attention:
1. Feature 001: Missing NFR-1 implementation in plan
2. Feature 002: Tasks don't cover error handling from plan
3. Constitution conflict: Feature 003 violates testing standard

{Show top 3-5 issues with file references}

Detailed Report Sections:
- Constitution Alignment
- Spec → Plan Consistency
- Plan → Tasks Consistency
- Cross-Feature Issues
- Common Issues

Next Steps:
1. Address critical issues before implementation
2. Update relevant artifacts (spec, plan, or tasks)
3. Run /spec-kit:analyze again to verify fixes

Tip: Analyze regularly - after clarify, after plan, and before implement.
```

## Important Notes

### This Command is Read-Only

**Never modify files** during analysis:
- ❌ Don't fix issues automatically
- ❌ Don't update specs, plans, or tasks
- ✅ Do report what's wrong
- ✅ Do suggest specific fixes
- ✅ Do reference specific file locations

### When to Run Analysis

Run `/spec-kit:analyze`:
- After `/spec-kit:clarify` - Check spec completeness
- After `/spec-kit:plan` - Validate plan covers spec
- After `/spec-kit:tasks` - Ensure tasks implement plan
- Before `/spec-kit:implement` - Final check
- After major constitution updates - Check all features align

### Consistency Levels

**100% Consistency** - Ideal:
- All requirements have plans
- All plans have tasks
- Everything aligns with constitution

**80-99% Consistency** - Good:
- Minor gaps or unclear areas
- Suggestions for improvement
- Safe to proceed with implementation

**60-79% Consistency** - Needs Work:
- Significant gaps
- Some requirements unaddressed
- Should fix critical issues first

**<60% Consistency** - Needs Rework:
- Major misalignments
- Many missing requirements
- Redo planning before implementing

## Error Handling

- If constitution doesn't exist, skip constitution checks
- If spec/plan/tasks missing, report which artifacts are needed
- If no features found, inform user to create one with `/spec-kit:specify`

## Notes

- Analysis doesn't mean artifacts are wrong - just flags inconsistencies
- Use judgment on which issues matter most
- Some "issues" might be intentional trade-offs - document them if so
- Perfect consistency is a goal, not a requirement to start implementing
- Analysis helps catch issues early when they're cheapest to fix
