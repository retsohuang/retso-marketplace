---
description: Execute tasks to build the feature according to spec and plan
allowed-tools: Read, Write, Bash, Glob, Grep, Edit
model: claude-sonnet-4-5
---

# Implement Feature

Execute the tasks from the task list to build the feature. Works through tasks in dependency order, checking off completed items as it goes.

## Usage

```bash
/spec-kit:implement
```

Must be run from within a feature branch (e.g., `spec-kit/001-feature-name`).

## Process

### Step 1: Validate Context

Check the current branch:

```bash
CURRENT_BRANCH=$(git branch --show-current)
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/cli.js validate-branch "$CURRENT_BRANCH"
```

### Step 2: Load All Artifacts

Read the complete context:

```bash
cat .claude/spec-kit/memory/constitution.md
cat .claude/spec-kit/specs/{NNN}-{feature-name}/spec.md
cat .claude/spec-kit/specs/{NNN}-{feature-name}/plan.md
cat .claude/spec-kit/specs/{NNN}-{feature-name}/tasks.md
```

If any are missing, direct user to appropriate command.

### Step 3: Check for Consistency Issues

Remind user to run analysis if they haven't:

```
⚠️ Recommendation: Run /spec-kit:analyze first to check for consistency issues.
```

If the user wants to proceed anyway, continue.

### Step 4: Review Task Status

Parse tasks.md to find:
- Total tasks: {count}
- Completed: {count}
- In Progress: {count}
- Not Started: {count}

**Decision Point:**
- If tasks are already in progress, ask if user wants to continue from where they left off or start fresh
- Show which task was in progress

### Step 5: Select Starting Task

Find the next task to work on:
- **Not started** with dependencies satisfied
- Follow dependency order (Phase 1 → Phase 2 → Phase 3)
- Within a phase, prioritize by: High priority → Medium → Low

Show the selected task:
```
📋 Next Task: Task 1.2 - Set Up Database Schema

Priority: High
Complexity: Medium
Estimated: M (1 day)
Dependencies: ✅ Task 1.1 (completed)

Description:
Create database schema for user authentication with users table and sessions table.

Ready to start? (y/n)
```

### Step 6: Execute Task

For the selected task:

1. **Mark as In Progress**
   - Update tasks.md: Change status from ⬜ to 🟡
   - Write the updated tasks.md

2. **Review Task Details**
   - Read acceptance criteria
   - Note files to create/modify
   - Review implementation notes
   - Check testing requirements

3. **Implement the Task**
   - Create or modify files as specified
   - Follow patterns from the plan
   - Adhere to constitution standards
   - Write clean, well-documented code

4. **Verify Acceptance Criteria**
   - Go through each checkbox
   - Validate the criteria is met
   - If not met, continue working

5. **Run Tests** (if applicable)
   - Run unit tests for the task
   - Run integration tests if needed
   - Fix any failures

6. **Mark as Complete**
   - Update tasks.md: Change status from 🟡 to ✅
   - Check all acceptance criteria boxes
   - Update task summary counts

### Step 7: Move to Next Task

After completing a task:

```
✅ Task 1.2 Complete: Set Up Database Schema

Files Modified:
- src/database/schema.sql
- src/models/User.ts
- src/models/Session.ts

Tests: ✅ All passing (12 tests)

Progress: 2/15 tasks complete (13%)

Next task available: Task 1.3 - Create Auth Service
Continue? (y/n)
```

If user says yes, repeat Step 6 for the next task.
If user says no, save progress and exit.

### Step 8: Handle Blockers

If you encounter a blocker:

**Technical Blocker:**
- Document the issue in implementation notes
- Mark task as blocked with reason
- Suggest how to unblock
- Ask user for guidance

**Requirement Ambiguity:**
- Flag the unclear requirement
- Suggest running `/spec-kit:clarify` to resolve
- Pause implementation until clarified

**Dependency Missing:**
- Check if dependency task is complete
- If not, suggest completing that first
- If complete but still blocking, investigate why

### Step 9: Phase Completion

When all tasks in a phase are complete:

```
🎉 Phase 1 Complete: Foundation

Completed Tasks: 5/5
- ✅ Task 1.1: Project setup
- ✅ Task 1.2: Database schema
- ✅ Task 1.3: Auth service
- ✅ Task 1.4: API routes
- ✅ Task 1.5: Basic tests

Next Phase: Phase 2 - Core Features (8 tasks)

Ready to continue with Phase 2? (y/n)
```

### Step 10: Feature Completion

When all tasks are complete:

```
🎊 Feature Complete: {NNN}-{feature-name}!

Implementation Summary:
- Total Tasks: 15
- Completed: 15
- Time Taken: {actual time if tracked}
- Files Created: {count}
- Files Modified: {count}
- Tests Written: {count}

Final Steps:
1. Review all changes: git diff main
2. Run full test suite: npm test
3. Manual testing of user flows
4. Code review preparation
5. Deployment planning

Recommendations:
- Update spec.md if requirements changed during implementation
- Update plan.md with lessons learned
- Document any deviations from original plan
- Consider writing a post-mortem or summary

Ready to commit? Use /commit to create a commit with the changes.
```

## Best Practices

### Work in Small Increments

- Complete one task at a time
- Commit after each task or phase
- Test continuously
- Don't skip ahead

### Follow the Plan

- Stick to the plan unless there's a good reason to deviate
- If you deviate, document why
- Update the plan if you learn something new

### Test as You Go

- Write tests alongside implementation
- Run tests after each task
- Don't accumulate testing debt

### Ask for Help

- If stuck for >30 minutes, ask user
- Don't make assumptions about requirements
- Clarify ambiguities immediately

### Keep Tasks Updated

- Update status in real-time
- Check off acceptance criteria as met
- Add notes about challenges or learnings

## Handling Common Situations

### Task Seems Too Large

If a task is taking much longer than estimated:
- Break it into subtasks
- Complete what you can
- Mark original task partially complete
- Add new tasks for remaining work

### Requirements Changed

If requirements change during implementation:
1. Pause implementation
2. Document the change
3. Update spec.md
4. Update plan.md and tasks.md if needed
5. Get user approval
6. Resume implementation

### Discovered Technical Issue

If you find a technical problem not anticipated in the plan:
1. Document the issue
2. Propose solution options
3. Update plan with chosen approach
4. Add tasks if needed
5. Continue implementation

### Tests Failing

If tests fail:
1. Don't mark task complete
2. Fix the failures
3. Re-run tests
4. Only mark complete when tests pass

## Error Handling

- If tasks.md doesn't exist, direct to `/spec-kit:tasks`
- If no tasks are ready (dependencies), show dependency tree
- If encountering code errors, debug and fix them
- If uncertain about implementation, consult plan and spec

## Notes

- Implementation can be paused and resumed anytime
- Tasks.md tracks your progress
- You can implement tasks out of order if dependencies allow
- It's OK to add new tasks if you discover more work
- Update estimates if actual effort differs significantly
- Document lessons learned for future planning
- The goal is to ship the feature, not to follow the plan perfectly
