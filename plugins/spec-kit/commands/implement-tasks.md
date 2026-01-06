---
description: Execute tasks from a validated task list, implementing code phase by phase
argument-hint: <tasks-path> [phase-range]
allowed-tools: Read, Write, Edit, Bash, Glob, AskUserQuestion
---

# Implement Tasks

Execute tasks from a validated task list, implementing code phase by phase.

**Stage Transition:** Ready for Implementation → In Progress → Ready to Test

## Usage

```bash
/spec-kit:implement-tasks specs/001-feature-name
/spec-kit:implement-tasks specs/001-feature-name 2-3
```

Where:
- `<tasks-path>` is the path to the spec directory (e.g., `specs/001-feature-name`)
- `[phase-range]` is optional, specifies which phases to implement (e.g., `2-3`)

## Instructions

### Step 1: Load and Validate Stage

Read the tasks file at `$ARGUMENTS/tasks.md`.

**Stage Check:** Verify the tasks stage before implementing:
- If `Ready for Implementation`: Proceed with implementation
- If `In Progress`: Continue from where left off
- If `Waiting for Validation`: Inform user to run `/spec-kit:validate-tasks` first
- If `Ready to Test`: Inform user implementation is already complete

### Step 2: Update Stage

- Change tasks.md stage from `Ready for Implementation` to `In Progress`
- If user specifies phase range, record which phases to implement
- If no phase range specified, implement all phases
- If resuming from `In Progress`, continue from last incomplete task

### Step 3: Execute Tasks

For each phase (or specified range):

1. Execute tasks in dependency order
2. Respect `[P]` parallelization markers
3. For each task:
   - Read implementation details from task
   - Create/modify the specified file
   - Mark task as complete: `- [x]`
4. Run phase verification criteria after completing phase

**Loop Detection:** Stop immediately if:
- Same task attempted 3+ times without progress
- Circular dependency detected
- Same error repeated without resolution
- 5+ minutes on single task without file changes

### Step 4: Complete Phase

- Update tasks.md with completed tasks marked `[x]`
- If all phases complete: Change stage to `Ready to Test`
- If stopped early (loop detection, user interrupt):
  - Keep stage as `In Progress`
  - Report progress and blockers

### Step 5: Report Results

Output a summary:

```
## Implementation Progress: {feature-name}

### Completed
- Phase 1: 3/3 tasks
- Phase 2: 4/4 tasks

### Status
Stage: {In Progress | Ready to Test}

{If Ready to Test}: All phases implemented successfully
{If In Progress}: Stopped at T007 - {reason}
```

## Loop Detection

The implementation MUST stop when detecting these patterns:

| Pattern | Detection | Action |
|---------|-----------|--------|
| **Repeated Failure** | Same task fails 3+ times | Stop, report task and errors |
| **Circular Edit** | File edited, then reverted, then edited again | Stop, ask user for guidance |
| **No Progress** | 5+ minutes on single task without file changes | Stop, report stuck task |
| **Dependency Loop** | Task A needs B, B needs A | Stop, report circular dependency |

When stopped:
1. Keep stage as `In Progress`
2. Report which task caused the stop
3. Report what was attempted
4. Ask user how to proceed

## Task Execution Format

When executing a task, follow the embedded implementation details:

```markdown
- [ ] [T005] [P] Create message model at `src/models/message.ts`

  ```typescript
  interface Message {
    id: string;
    content: string;
    senderId: string;
    roomId: string;
    createdAt: Date;
  }
  ```

  - Include Zod schema for runtime validation
  - Export both interface and Zod schema
```

After completion, mark as done:

```markdown
- [x] [T005] [P] Create message model at `src/models/message.ts`
  ...
```

## Example

**User:** "/spec-kit:implement-tasks specs/003-realtime-chat"

**Agent:**

1. Reads tasks.md, verifies stage is `Ready for Implementation`
2. Updates stage to `In Progress`
3. Executes Phase 1:
   - T001: Initialize project → creates package.json → marks [x]
   - T002: Configure TypeScript → creates tsconfig.json → marks [x]
4. Executes Phase 2:
   - T003 [P] and T004 [P]: Can run in parallel
   - Creates both files → marks [x]
5. Executes Phase 3:
   - T005 [P] and T006 [P]: Creates models in parallel → marks [x]
   - T007: Depends on models, creates handler → marks [x]
6. All phases complete → updates stage to `Ready to Test`
7. Reports:
   ```
   ## Implementation Progress: realtime-chat

   ### Completed
   - Phase 1: 2/2 tasks
   - Phase 2: 2/2 tasks
   - Phase 3: 3/3 tasks

   ### Status
   Stage: Ready to Test

   All phases implemented successfully
   ```

**User:** "/spec-kit:implement-tasks specs/003-realtime-chat 2-3"

**Agent:**

1. Reads tasks.md, notes user specified phases 2-3
2. Skips Phase 1, executes Phase 2 and Phase 3 only
3. Updates stage to `Ready to Test` when both complete
