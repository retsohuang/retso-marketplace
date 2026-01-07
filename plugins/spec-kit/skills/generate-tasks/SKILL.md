---
name: generate-tasks
description: Generate actionable task lists from implementation plans. Use when users want to "create tasks", "generate tasks", "break down the plan", or "convert plan to tasks". Transforms validated plans into dependency-ordered, parallelizable task lists.
license: MIT
metadata:
  author: Retso Huang
  version: "3.0"
---

# Generate Tasks

Generates actionable, dependency-ordered task lists from implementation plans. Based on the principle that tasks should be "immediately executable" with sufficient specificity for LLM completion.

## Prerequisites

This skill requires an existing implementation plan file (`plan.md`) with stage `Ready for Tasks`. The plan must be created by the `draft-plan` skill and validated with `/spec-kit:validate-plan` before task generation can begin.

## Stages

Tasks progress through four stages.

```
┌────────────────────────┐      ┌─────────────────────────┐      ┌─────────────┐      ┌───────────────┐
│  Waiting for Validation │─────▶│  Ready for Implementation│─────▶│ In Progress │─────▶│ Ready to Test │
└────────────────────────┘      └─────────────────────────┘      └─────────────┘      └───────────────┘
         │                                │                              │                     │
         ▼                                ▼                              ▼                     ▼
   Task list created,              Validation passed,           Implementing          All phases
   can refine & validate           ready to execute             selected phases       completed
```

### Stage Definitions

| Stage                        | Description                                         | Next Action                    | Exit Criteria                |
| ---------------------------- | --------------------------------------------------- | ------------------------------ | ---------------------------- |
| **Waiting for Validation**   | Task list created, may have gaps or need refinement | `/spec-kit:refine-tasks` or `/spec-kit:validate-tasks` | Validation passes |
| **Ready for Implementation** | Validated and ready for execution                   | `/spec-kit:implement-tasks`    | Implementation starts        |
| **In Progress**              | Tasks are being implemented                         | `/spec-kit:implement-tasks`    | All selected phases complete |
| **Ready to Test**            | All phases completed, ready for testing             | (hand off to testing)          | N/A - terminal               |

### Stage Transition Rules

| From                     | Action                                | To                       | Notes                              |
| ------------------------ | ------------------------------------- | ------------------------ | ---------------------------------- |
| (none)                   | Generate (this skill)                 | Waiting for Validation   | Creates tasks.md                   |
| Waiting for Validation   | `/spec-kit:refine-tasks`              | Waiting for Validation   | Updates tasks with missing details |
| Waiting for Validation   | `/spec-kit:validate-tasks` (pass)     | Ready for Implementation | All checks pass                    |
| Waiting for Validation   | `/spec-kit:validate-tasks` (fail)     | Waiting for Validation   | Identifies gaps to fix             |
| Ready for Implementation | `/spec-kit:refine-tasks`              | Waiting for Validation   | Requires re-validation             |
| Ready for Implementation | `/spec-kit:implement-tasks`           | In Progress              | Starts executing tasks             |
| In Progress              | `/spec-kit:implement-tasks` (finish)  | Ready to Test            | All selected phases complete       |

## Input

| Input     | Required | Description                                                |
| --------- | -------- | ---------------------------------------------------------- |
| `plan.md` | Yes      | Validated implementation plan with stage `Ready for Tasks` |

## Output

The task generation produces a single actionable document:

| Output     | Purpose                                                                       |
| ---------- | ----------------------------------------------------------------------------- |
| `tasks.md` | Dependency-ordered task list organized by phases with parallelization markers |

## Workflow

This skill handles task generation only. Use `/spec-kit:refine-tasks` to update task details, `/spec-kit:validate-tasks` to validate, and `/spec-kit:implement-tasks` to execute.

### Generate Tasks

Use when the user provides a plan file path and wants to generate implementation tasks.

**Stage:** (none) → Waiting for Validation

**Input Required:**

- Path to existing `plan.md` file with stage `Ready for Tasks`

**Steps:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INPUT                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                        ┌─────────────────┐                                  │
│                        │    plan.md      │                                  │
│                        │  (Stage: Ready  │                                  │
│                        │   for Tasks)    │                                  │
│                        └────────┬────────┘                                  │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TASK GENERATION PROCESS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                 │
│   │ 1. Extract   │───▶│ 2. Map       │───▶│ 3. Order by  │                 │
│   │    Tech &    │    │    Implemen- │    │    Priority  │                 │
│   │    Structure │    │    tation    │    │              │                 │
│   └──────────────┘    └──────────────┘    └──────────────┘                 │
│                                                  │                          │
│                                                  ▼                          │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                 │
│   │ 6. Generate  │◀───│ 5. Mark      │◀───│ 4. Build     │                 │
│   │    Output    │    │    Parallel  │    │    Dependency│                 │
│   │              │    │    Tasks     │    │    Graph     │                 │
│   └──────────────┘    └──────────────┘    └──────────────┘                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              OUTPUT                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                        ┌─────────────────┐                                  │
│                        │    tasks.md     │                                  │
│                        │  (dependency-   │                                  │
│                        │   ordered)      │                                  │
│                        └─────────────────┘                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Step Details:**

1. **Extract Tech & Structure**
   - Load the plan from the provided path
   - Verify plan stage is `Ready for Tasks`
   - If stage is not ready, inform user to validate the plan first
   - Extract: tech stack, dependencies, project structure, architecture components

2. **Map Implementation Phases**
   - Parse implementation phases from plan
   - Break down each phase into discrete tasks
   - Extract priority levels from phase ordering
   - **Generate implementation details** based on plan's technical decisions:
     - Create code samples based on key patterns from plan
     - Design type definitions following plan's architecture
     - Reference plan.md for pattern and architecture consistency

3. **Order by Priority**
   - Organize tasks by phase in priority order
   - Ensure earlier phases come first
   - Group related tasks within each phase

4. **Build Dependency Graph**
   - Identify task dependencies (which tasks block others)
   - Ensure foundational tasks precede dependent tasks
   - Mark blocking prerequisites clearly

5. **Mark Parallel Tasks**
   - Identify tasks that can run simultaneously
   - Tasks are parallelizable when:
     - They touch different files
     - They have no data dependencies
     - They belong to independent phases
   - Add `[P]` marker to parallelizable tasks

6. **Generate Output**
   - Create `tasks.md` using template structure
   - Include all file paths for LLM executability
   - Add phase organization with proper markers

**Output:**

Save to the same directory as the plan file:

```
specs/003-feature-name/
├── spec.md     (original specification)
├── plan.md     (input - validated plan)
└── tasks.md    (created by this skill, Stage: Waiting for Validation)
```

## Task Format

Tasks follow a specific format for machine-readability and executability. Each task includes **generated implementation details** based on plan decisions, referencing plan.md for architectural consistency.

```
- [ ] [TaskID] [P] Description with exact file path
        │       │
        │       └─ Parallelizable marker (optional)
        └─ Sequential ID (T001, T002, ...)

  Implementation details from plan:
  - Code samples, type definitions, patterns
  - Specific guidance for this file
```

**Example:**

````markdown
- [ ] [T005] [P] Create message model at `src/models/message.ts`

  ```typescript
  interface Message {
    id: string;
    content: string;
    senderId: string;
    roomId: string;
    createdAt: Date;
  }

  type CreateMessageInput = Omit<Message, "id" | "createdAt">;
  ```

  - Include Zod schema for runtime validation
  - Export both interface and Zod schema

- [ ] [T006] [P] Create user model at `src/models/user.ts`

  ```typescript
  interface User {
    id: string;
    username: string;
    email: string;
    createdAt: Date;
  }
  ```

  - Follow same pattern as Message model
  - Add unique constraint on email
````

## Phase Structure

Tasks are organized into sequential phases matching the plan's implementation phases:

| Phase | Purpose | Characteristics |
|-------|---------|-----------------|
| **Setup** | Project initialization | Bootstrap, dependencies, configuration |
| **Foundational** | Critical infrastructure | Blocks all feature work |
| **Feature Phases** | Core implementation | Organized by plan's implementation phases |
| **Polish** | Cross-cutting improvements | Cleanup, optimization, documentation |

### Phase Rules

1. **No feature work can begin until Foundational phase is complete**
2. Each phase should be independently testable
3. Tasks within a phase may run in parallel when marked `[P]`
4. Phases follow the order defined in the plan

## Quality Guards

- Every task must include exact file paths
- Tasks generate implementation details based on plan's key patterns and decisions
- Tasks reference plan.md for pattern and architecture consistency
- Task descriptions focus on "what" and "where", not "why"
- Parallelization markers only where truly independent
- Tests are optional but if included, must be TDD (write first, ensure fail)

## Template Reference

See [tasks-template.md](assets/tasks-template.md) for the complete task list structure.

## Example Usage

### Generating Tasks

**User:** "Generate tasks for specs/003-realtime-chat/plan.md"

**Agent:**

1. Reads `specs/003-realtime-chat/plan.md`
2. Verifies stage is `Ready for Tasks`
3. Extracts:
   - Tech stack: Node.js, TypeScript, Socket.io
   - Implementation phases from plan
4. Maps implementation phases to tasks:
   - Phase 1 (Foundation) → Setup + Foundational tasks
   - Phase 2 (Core Features) → Basic messaging tasks
   - Phase 3 (Polish) → Cleanup tasks
5. Identifies parallelization:
   - User model and message model can be parallel
   - Socket handler and REST endpoints can be parallel
6. Generates `tasks.md` with implementation details embedded in each task:
   ```markdown
   ## Phase 1: Setup
   - [ ] [T001] Initialize Node.js project at `./package.json`

     Dependencies: socket.io, zod, prisma
     Scripts: dev, build, start

   - [ ] [T002] Configure TypeScript at `./tsconfig.json`

     Target: ES2022, strict mode enabled

   ## Phase 2: Foundational
   - [ ] [T003] [P] Create database connection at `src/db/connection.ts`

     Use Prisma client singleton pattern

   - [ ] [T004] [P] Set up Socket.io server at `src/socket/server.ts`

     ```typescript
     const io = new Server(httpServer, {
       cors: { origin: process.env.CLIENT_URL }
     });
     ```

   ## Phase 3: Core Features
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

   - [ ] [T006] [P] Create user model at `src/models/user.ts`

     ```typescript
     interface User {
       id: string;
       username: string;
       status: 'online' | 'offline';
     }
     ```

   - [ ] [T007] Implement message handler at `src/socket/handlers/message.ts`

     Handle events: message:send, message:edit, message:delete
     Broadcast to room on successful send
````

7. Saves to `specs/003-realtime-chat/tasks.md`

## Relationship to Other Skills

- **draft-plan** (before): Creates the plan this skill uses as input
- **Testing** (after): Tests the implemented code after reaching Ready to Test stage
