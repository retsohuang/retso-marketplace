---
description: Validate tasks before marking them ready for implementation
argument-hint: <tasks-path>
allowed-tools: Read, Edit, AskUserQuestion, Glob
---

# Validate Tasks

Validate that the task list is complete, consistent, and ready for execution. Think of this as "unit tests for English" - ensuring tasks are implementable.

**Stage Transition:** Waiting for Validation → Ready for Implementation (on pass)

## Usage

```bash
/spec-kit:validate-tasks specs/001-feature-name
```

Where `<tasks-path>` is the path to the spec directory (e.g., `specs/001-feature-name`).

## Instructions

### Step 1: Load and Validate Stage

Read the tasks file at `$ARGUMENTS/tasks.md` and the linked plan file.

**Stage Check:** Verify the tasks stage in the frontmatter:
- If `Waiting for Validation`: Proceed with validation
- If `Ready for Implementation`: Inform user the tasks have already been validated
- If `In Progress` or `Ready to Test`: Inform user validation is not applicable at this stage

### Step 2: Run Completeness Checks

| Check | Validation | Failure Action |
|-------|------------|----------------|
| Plan link | Tasks reference source plan.md | Add plan link |
| File paths | Every task has exact file path in backticks | Add missing paths |
| Implementation details | Every task has code samples/types from plan | Add missing details |
| Phase coverage | All plan phases represented in task list | Add missing tasks |
| No placeholders | Zero `{placeholder}` or TODO markers remain | Resolve or ask user |

### Step 3: Run Consistency Checks

| Check | Validation | Failure Action |
|-------|------------|----------------|
| Plan alignment | Task implementation details match plan.md | Sync with plan |
| Task ordering | Foundational tasks precede dependent tasks | Reorder tasks |
| ID sequencing | Task IDs are sequential (T001, T002, ...) | Renumber tasks |
| Phase structure | Tasks grouped correctly by phase | Reorganize phases |

### Step 4: Run Executability Checks

| Check | Validation | Failure Action |
|-------|------------|----------------|
| Self-contained | Each task executable without referring to plan | Add missing context |
| Parallelization | `[P]` markers only on truly independent tasks | Fix markers |
| Dependency clarity | Blocking dependencies are obvious from ordering | Add dependency notes |
| Verification criteria | Each phase has testable verification steps | Add verification |

### Step 5: Report Results

Output validation results in this format:

```
## Tasks Validation: {feature-name}

### Completeness: PASS | FAIL
- [x] Plan link present
- [x] All tasks have file paths
- [ ] Missing: T005 lacks implementation details

### Consistency: PASS | FAIL
- [x] Task ordering correct
- [x] IDs sequential
- [ ] Issue: T003 implementation differs from plan

### Executability: PASS | FAIL
- [x] All tasks self-contained
- [x] Parallelization markers accurate
- [x] Verification criteria present

**Result:** {Pass | Fail (N issues to resolve)}
```

### Step 6: Handle Results

**If ALL checks pass:**
- Update stage from `Waiting for Validation` to `Ready for Implementation`
- Inform user the tasks are ready for implementation with generate-tasks skill

**If ANY check fails:**
- Keep stage as `Waiting for Validation`
- List specific issues to address
- Fix issues directly if the answer is clear
- Run `/spec-kit:refine-tasks` if user input needed
- Re-run validation after fixes

## Example

**User:** "/spec-kit:validate-tasks specs/003-realtime-chat"

**Agent:**

1. Loads `specs/003-realtime-chat/tasks.md` and linked plan.md
2. Runs validation checks
3. Finds issues:
   - T005 missing Zod schema code sample (in plan but not in task)
   - Phase 3 missing verification criteria
4. Reports:
   ```
   ## Tasks Validation: realtime-chat

   ### Completeness: FAIL
   - [x] Plan link present
   - [x] All tasks have file paths
   - [ ] Missing: T005 lacks Zod schema code sample

   ### Consistency: PASS
   - [x] Task ordering correct
   - [x] IDs sequential
   - [x] Phase structure correct

   ### Executability: FAIL
   - [x] All tasks self-contained
   - [x] Parallelization markers accurate
   - [ ] Missing: Phase 3 verification criteria

   **Result:** Fail (2 issues to resolve)
   ```
5. Offers to help fix issues or asks user for guidance
