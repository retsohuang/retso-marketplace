# Spec-Kit Plugin

Spec-Driven Development toolkit for Claude Code. Create specifications, plans, and tasks following a structured workflow from requirements to implementation.

## Overview

This plugin brings spec-driven development methodology to Claude Code, enabling a systematic approach to software development that starts with specifications and flows through to implementation.

**Key Features:**

- **Three-skill workflow**: create-spec → draft-plan → generate-tasks
- **Stage progression**: Each artifact progresses through stages (Draft → Waiting for Validation → Ready)
- **Embedded implementation details**: Tasks include all code samples and patterns for immediate execution
- **Parallelization markers**: Tasks marked with `[P]` can run simultaneously

## Quick Start

### 1. Create a Specification

Ask Claude to create a spec for your feature:

```
Create a spec for user authentication with email/password login
```

The **create-spec** skill will:
- Create `specs/001-user-authentication/spec.md`
- Focus on WHAT users need and WHY (not HOW)
- Mark unknowns with `[NEEDS CLARIFICATION]` markers

### 2. Clarify the Spec

```bash
/spec-kit:clarify-spec specs/001-user-authentication
```

Resolves `[NEEDS CLARIFICATION]` markers by asking questions.

### 3. Validate the Spec

```bash
/spec-kit:validate-spec specs/001-user-authentication
```

Runs a 6-point validation checklist to ensure the spec is ready for planning.

### 4. Create an Implementation Plan

```
Create a plan for the user-authentication spec
```

The **draft-plan** skill will:
- Read the validated spec
- Ask about tech stack preferences
- Generate `plan.md` with architecture, data models, and implementation phases
- Include code samples for types and APIs

### 5. Refine and Validate Plan

```bash
/spec-kit:refine-plan specs/001-user-authentication
/spec-kit:validate-plan specs/001-user-authentication
```

Refine resolves `[NEEDS DECISION]` markers, validate ensures the plan is ready for tasks.

### 6. Generate Tasks

```
Generate tasks for the plan
```

The **generate-tasks** skill will:
- Create `tasks.md` with dependency-ordered tasks
- Embed all implementation details in each task
- Mark parallelizable tasks with `[P]`

### 7. Refine and Validate Tasks

```bash
/spec-kit:refine-tasks specs/001-user-authentication
/spec-kit:validate-tasks specs/001-user-authentication
```

Refine updates task details, validate ensures tasks are ready for implementation.

### 8. Implement

```bash
/spec-kit:implement-tasks specs/001-user-authentication
```

Executes tasks phase by phase, marking each complete as it finishes.

## Workflow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   create-spec   │────▶│   draft-plan    │────▶│ generate-tasks  │
│                 │     │                 │     │                 │
│  Create spec    │     │  Create plan    │     │  Generate tasks │
│                 │     │                 │     │                 │
│ /spec-kit:      │     │ /spec-kit:      │     │ /spec-kit:      │
│   clarify       │     │   refine-plan   │     │   refine-tasks  │
│   validate      │     │   validate-plan │     │   validate-tasks│
│                 │     │                 │     │   implement     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
    spec.md               plan.md                 tasks.md
    (Ready for            (Ready for              (Ready to
     Planning)             Tasks)                  Test)
```

## Skills

### create-spec

Creates feature specifications from user descriptions.

**Triggers:** "create a spec", "write a specification", "define requirements"

**Stages:**

```
┌─────────────┐      ┌───────────────────────┐      ┌─────────────────────┐
│   Draft     │─────▶│  Waiting for          │─────▶│  Ready for Planning │
│             │      │  Validation           │      │                     │
└─────────────┘      └───────────────────────┘      └─────────────────────┘
      │                        │                              │
      ▼                        ▼                              ▼
  Initial spec           All clarifications             Validation passed,
  creation,              resolved, all                  ready for draft-plan
  may have gaps          sections complete
```

| Stage | Description | Next Action |
|-------|-------------|-------------|
| Draft | Initial spec with `[NEEDS CLARIFICATION]` markers | `/spec-kit:clarify-spec` |
| Waiting for Validation | All gaps resolved, ready for validation | `/spec-kit:validate-spec` |
| Ready for Planning | Validated, ready for draft-plan | draft-plan skill |

### draft-plan

Transforms specifications into implementation plans.

**Triggers:** "create a plan", "plan implementation", "define architecture"

**Stages:**
| Stage | Description | Next Action |
|-------|-------------|-------------|
| Draft | Initial plan with potential `[NEEDS DECISION]` markers | `/spec-kit:refine-plan` |
| Waiting for Validation | All decisions made, ready for validation | `/spec-kit:validate-plan` |
| Ready for Tasks | Validated, ready for generate-tasks | generate-tasks skill |

**Workflow:**
- **Create**: Generate plan with architecture, data models, implementation phases

### generate-tasks

Generates actionable task lists from plans.

**Triggers:** "create tasks", "generate tasks", "break down the plan"

**Stages:**
| Stage | Description | Next Action |
|-------|-------------|-------------|
| Waiting for Validation | Task list created, may need refinement | `/spec-kit:refine-tasks` or `/spec-kit:validate-tasks` |
| Ready for Implementation | Validated, ready for execution | `/spec-kit:implement-tasks` |
| In Progress | Tasks being implemented | `/spec-kit:implement-tasks` |
| Ready to Test | All phases completed | Hand off to testing |

**Workflow:**
- **Generate**: Create dependency-ordered tasks with embedded implementation details

## Commands

### /spec-kit:create-spec

Create a new feature specification from a description.

```bash
/spec-kit:create-spec user authentication with email/password login
```

### /spec-kit:clarify-spec

Refine an existing spec by resolving gaps and clarifying requirements.

```bash
/spec-kit:clarify-spec specs/001-feature-name
```

### /spec-kit:validate-spec

Validate a spec before marking it ready for planning. Runs a 6-point checklist.

```bash
/spec-kit:validate-spec specs/001-feature-name
```

### /spec-kit:refine-plan

Refine an existing plan by resolving `[NEEDS DECISION]` markers and completing gaps.

```bash
/spec-kit:refine-plan specs/001-feature-name
```

### /spec-kit:validate-plan

Validate a plan before marking it ready for tasks. Runs completeness, consistency, and clarity checks.

```bash
/spec-kit:validate-plan specs/001-feature-name
```

### /spec-kit:refine-tasks

Refine existing tasks by updating details based on user feedback.

```bash
/spec-kit:refine-tasks specs/001-feature-name
```

### /spec-kit:validate-tasks

Validate tasks before marking them ready for implementation. Runs completeness, consistency, and executability checks.

```bash
/spec-kit:validate-tasks specs/001-feature-name
```

### /spec-kit:implement-tasks

Execute tasks from a validated task list, implementing code phase by phase.

```bash
/spec-kit:implement-tasks specs/001-feature-name
/spec-kit:implement-tasks specs/001-feature-name 2-3
```

## Storage Structure

```
specs/
├── 001-user-authentication/
│   ├── spec.md              # Requirements and user stories
│   ├── plan.md              # Architecture and implementation phases
│   └── tasks.md             # Dependency-ordered task list
├── 002-payment-integration/
│   ├── spec.md
│   ├── plan.md
│   └── tasks.md
└── 003-admin-dashboard/
    └── spec.md              # Can stop at any stage
```

## Task Format

Tasks include all information needed for immediate execution:

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

- `[T005]` - Sequential task ID
- `[P]` - Parallelizable marker (optional)
- Backtick paths - Exact file locations
- Code blocks - Implementation details from plan

## Quality Principles

### Specifications (create-spec)
- Focus on WHAT users need and WHY
- No implementation details (tech stack, APIs, code structure)
- Mark unknowns with `[NEEDS CLARIFICATION: specific question]`

### Plans (draft-plan)
- Include code samples for types and APIs
- Every decision includes rationale
- Mark unknowns with `[NEEDS DECISION: specific question]`

### Tasks (generate-tasks)
- Every task includes exact file paths
- Embed all implementation details from plan
- Tasks executable without referring back to plan.md

## Plugin Structure

```
plugins/spec-kit/
├── plugin.json
├── README.md
├── commands/
│   ├── create-spec.md
│   ├── clarify-spec.md
│   ├── validate-spec.md
│   ├── refine-plan.md
│   ├── validate-plan.md
│   ├── refine-tasks.md
│   ├── validate-tasks.md
│   └── implement-tasks.md
└── skills/
    ├── create-spec/
    │   ├── SKILL.md
    │   └── assets/
    │       └── spec-template.md
    ├── draft-plan/
    │   ├── SKILL.md
    │   └── assets/
    │       └── plan-template.md
    └── generate-tasks/
        ├── SKILL.md
        └── assets/
            └── tasks-template.md
```

## License

MIT
