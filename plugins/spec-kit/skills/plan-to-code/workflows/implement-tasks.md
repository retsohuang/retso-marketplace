# Implement Tasks

Execute tasks from a validated task list, implementing code phase by phase.

**Stage Transition:** Ready for Implementation → In Progress → Ready to Test

**Stage Check:** Before implementing, verify the current stage.

- If `Ready for Implementation`: Proceed with implementation
- If `In Progress`: Continue from where left off
- If other stages: Inform user to validate tasks first

**Input Required:**

- Path to existing `tasks.md` file with stage `Ready for Implementation` or `In Progress`
- Phase range to implement (optional, default: all phases)

## Steps

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INPUT                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                        ┌─────────────────┐                                  │
│                        │    tasks.md     │                                  │
│                        │  (Stage: Ready  │                                  │
│                        │   for Impl)     │                                  │
│                        └────────┬────────┘                                  │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       IMPLEMENTATION PROCESS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                 │
│   │ 1. Update    │───▶│ 2. Execute   │───▶│ 3. Complete  │                 │
│   │    Stage     │    │    Tasks     │    │    Phase     │                 │
│   │              │    │              │    │              │                 │
│   └──────────────┘    └──────────────┘    └──────────────┘                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              OUTPUT                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                        ┌─────────────────┐                                  │
│                        │    tasks.md     │                                  │
│                        │  (Stage: Ready  │                                  │
│                        │   to Test)      │                                  │
│                        └─────────────────┘                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Step Details

1. **Update Stage**
   - Change tasks.md stage from `Ready for Implementation` to `In Progress`
   - If user specifies phase range, record which phases to implement
   - If no input, implement all phases
   - If resuming, continue from last incomplete task

2. **Execute Tasks**
   - For each phase (or specified range):
     - Execute tasks in dependency order
     - Respect `[P]` parallelization markers
     - For each task:
       - Read implementation details from task
       - Create/modify the specified file
       - Mark task as complete: `- [x]`
     - Run phase verification criteria after completing phase
   - **Loop Detection**: Stop immediately if:
     - Same task attempted 3+ times without progress
     - Circular dependency detected
     - Same error repeated without resolution

3. **Complete Phase**
   - Update tasks.md with completed tasks marked `[x]`
   - If all phases complete:
     - Change stage to `Ready to Test`
   - If stopped early (loop detection, user interrupt):
     - Keep stage as `In Progress`
     - Report progress and blockers

**Output:** Updated `tasks.md` with completed tasks marked and stage updated

## Loop Detection

The implementation workflow MUST stop when detecting these patterns:

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

Becomes:

```markdown
- [x] [T005] [P] Create message model at `src/models/message.ts`

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

## Example

**User:** "Implement tasks for specs/003-realtime-chat/tasks.md"

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
6. Executes Phase 4:
   - Completes polish tasks → marks [x]
7. All phases complete → updates stage to `Ready to Test`

**User:** "Implement phases 2-3 for specs/003-realtime-chat/tasks.md"

**Agent:**

1. Reads tasks.md, notes user specified phases 2-3
2. Skips Phase 1, executes Phase 2 and Phase 3 only
3. Updates stage to `Ready to Test` when both complete
