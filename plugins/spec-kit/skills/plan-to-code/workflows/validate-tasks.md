# Validate Tasks

Validates that the task list is complete, consistent, and ready for execution.

**Stage Transition:** Waiting for Validation → Ready for Implementation (on pass)

**Stage Check:** Before validating, check the current stage.

- If `Waiting for Validation`: Run validation checks
- If `Ready for Implementation`: Inform user the tasks have already been validated

**When to Run:**

- After generating tasks
- After refining tasks
- Before starting implementation

## Validation Checks

### 1. Completeness Checks

| Check                  | Validation                                  | Failure Action      |
| ---------------------- | ------------------------------------------- | ------------------- |
| Plan link              | Tasks reference source plan.md              | Add plan link       |
| File paths             | Every task has exact file path in backticks | Add missing paths   |
| Implementation details | Every task has code samples/types from plan | Add missing details |
| Phase coverage         | All plan phases represented in task list    | Add missing tasks   |
| No placeholders        | Zero `{placeholder}` or TODO markers remain | Resolve or ask user |

### 2. Consistency Checks

| Check           | Validation                                 | Failure Action    |
| --------------- | ------------------------------------------ | ----------------- |
| Plan alignment  | Task implementation details match plan.md  | Sync with plan    |
| Task ordering   | Foundational tasks precede dependent tasks | Reorder tasks     |
| ID sequencing   | Task IDs are sequential (T001, T002, ...)  | Renumber tasks    |
| Phase structure | Tasks grouped correctly by phase           | Reorganize phases |

### 3. Executability Checks

| Check                 | Validation                                      | Failure Action       |
| --------------------- | ----------------------------------------------- | -------------------- |
| Self-contained        | Each task executable without referring to plan  | Add missing context  |
| Parallelization       | `[P]` markers only on truly independent tasks   | Fix markers          |
| Dependency clarity    | Blocking dependencies are obvious from ordering | Add dependency notes |
| Verification criteria | Each phase has testable verification steps      | Add verification     |

## Validation Output

```
## Validation Results

### Completeness: ✅ PASS | ❌ FAIL
- [x] Plan link present
- [x] All tasks have file paths
- [ ] Missing: T005 lacks implementation details

### Consistency: ✅ PASS | ❌ FAIL
- [x] Task ordering correct
- [x] IDs sequential
- [ ] Issue: T003 implementation differs from plan

### Executability: ✅ PASS | ❌ FAIL
- [x] All tasks self-contained
- [x] Parallelization markers accurate
- [x] Verification criteria present

### Stage Transition: Waiting for Validation → Ready for Implementation | Needs Revision
```

## Steps

1. **Load tasks and plan**
   - Read tasks.md from specified path
   - Read linked plan.md for cross-reference

2. **Run completeness checks**
   - Verify all tasks have file paths and implementation details
   - Check for remaining placeholders or TODOs
   - Confirm all plan phases are covered

3. **Run consistency checks**
   - Cross-reference task details with plan.md
   - Verify task ordering respects dependencies
   - Check ID sequencing

4. **Run executability checks**
   - Validate each task is self-contained
   - Verify parallelization markers are accurate
   - Check verification criteria exist

5. **Report results**
   - Output validation summary
   - If all pass: Update stage to `Ready for Implementation`
   - If failures: Keep stage as `Waiting for Validation`, list issues to address

## Example

**User:** "Validate the tasks at specs/003-realtime-chat/tasks.md"

**Agent:**

1. Loads tasks.md and linked plan.md
2. Runs validation checks
3. Finds issues:
   - T005 missing Zod schema code sample (in plan but not in task)
   - Phase 3 missing verification criteria
4. Reports:
   ```
   Completeness: ❌ FAIL - T005 missing implementation details
   Consistency: ✅ PASS
   Executability: ❌ FAIL - Phase 3 missing verification criteria
   ```
5. Offers to help fix issues or asks user for guidance
