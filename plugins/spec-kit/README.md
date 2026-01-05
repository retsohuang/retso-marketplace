# Spec-Kit Plugin

Spec-Driven Development toolkit for Claude Code. Create specifications, plans, and tasks following a structured workflow from requirements to implementation.

## Overview

This plugin brings spec-driven development methodology to Claude Code, enabling a systematic approach to software development that starts with specifications and flows through to implementation.

**Key Features:**

- **Three-skill workflow**: spec-workflow → spec-to-plan → plan-to-code
- **Stage progression**: Each artifact progresses through stages (Draft → Waiting for Validation → Ready)
- **Embedded implementation details**: Tasks include all code samples and patterns for immediate execution
- **Parallelization markers**: Tasks marked with `[P]` can run simultaneously

## Quick Start

### 1. Create a Specification

Ask Claude to create a spec for your feature:

```
Create a spec for user authentication with email/password login
```

The **spec-workflow** skill will:
- Create `specs/001-user-authentication/spec.md`
- Focus on WHAT users need and WHY (not HOW)
- Mark unknowns with `[NEEDS CLARIFICATION]` markers

### 2. Clarify and Validate the Spec

```
Clarify the spec
```

The skill will ask questions to resolve ambiguities, then validate readiness for planning.

### 3. Create an Implementation Plan

```
Create a plan for the user-authentication spec
```

The **spec-to-plan** skill will:
- Read the validated spec
- Ask about tech stack preferences
- Generate `plan.md` with architecture, data models, and implementation phases
- Include code samples for types and APIs

### 4. Generate Tasks

```
Generate tasks for the plan
```

The **plan-to-code** skill will:
- Create `tasks.md` with dependency-ordered tasks
- Embed all implementation details in each task
- Mark parallelizable tasks with `[P]`

### 5. Implement

```
Implement the tasks
```

Tasks are executed phase by phase, marked complete as they finish.

## Workflow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  spec-workflow  │────▶│  spec-to-plan   │────▶│  plan-to-code   │
│                 │     │                 │     │                 │
│  Create spec    │     │  Create plan    │     │  Generate tasks │
│  Clarify        │     │  Refine         │     │  Refine         │
│  Validate       │     │  Validate       │     │  Validate       │
│                 │     │                 │     │  Implement      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
    spec.md               plan.md                 tasks.md
    (Ready for            (Ready for              (Ready to
     Planning)             Tasks)                  Test)
```

## Skills

### spec-workflow

Creates, refines, and validates feature specifications.

**Triggers:** "create a spec", "write a specification", "define requirements", "clarify the spec", "validate spec"

**Stages:**
| Stage | Description |
|-------|-------------|
| Draft | Initial spec with potential `[NEEDS CLARIFICATION]` markers |
| Waiting for Validation | All gaps resolved, ready for validation |
| Ready for Planning | Validated, ready for spec-to-plan |

**Workflows:**
- **Create**: Generate new spec from feature description
- **Clarify**: Ask questions to resolve ambiguities
- **Validate**: Run 6-point validation checklist

### spec-to-plan

Transforms specifications into implementation plans.

**Triggers:** "create a plan", "plan implementation", "define architecture", "refine the plan", "validate the plan"

**Stages:**
| Stage | Description |
|-------|-------------|
| Draft | Initial plan with potential `[NEEDS DECISION]` markers |
| Waiting for Validation | All decisions made, ready for validation |
| Ready for Tasks | Validated, ready for plan-to-code |

**Workflows:**
- **Create**: Generate plan with architecture, data models, implementation phases
- **Refine**: Resolve `[NEEDS DECISION]` markers
- **Validate**: Check completeness, consistency, and clarity

### plan-to-code

Generates and executes actionable task lists from plans.

**Triggers:** "create tasks", "generate tasks", "break down the plan", "validate tasks", "implement tasks"

**Stages:**
| Stage | Description |
|-------|-------------|
| Waiting for Validation | Task list created, may need refinement |
| Ready for Implementation | Validated, ready for execution |
| In Progress | Tasks being implemented |
| Ready to Test | All phases completed |

**Workflows:**
- **Generate**: Create dependency-ordered tasks with embedded implementation details
- **Refine**: Update tasks based on feedback
- **Validate**: Check completeness, consistency, and executability
- **Implement**: Execute tasks phase by phase

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

### Specifications (spec-workflow)
- Focus on WHAT users need and WHY
- No implementation details (tech stack, APIs, code structure)
- Mark unknowns with `[NEEDS CLARIFICATION: specific question]`

### Plans (spec-to-plan)
- Include code samples for types and APIs
- Every decision includes rationale
- Mark unknowns with `[NEEDS DECISION: specific question]`

### Tasks (plan-to-code)
- Every task includes exact file paths
- Embed all implementation details from plan
- Tasks executable without referring back to plan.md

## Plugin Structure

```
plugins/spec-kit/
├── plugin.json
├── README.md
└── skills/
    ├── spec-workflow/
    │   ├── SKILL.md
    │   └── assets/
    │       └── spec-template.md
    ├── spec-to-plan/
    │   ├── SKILL.md
    │   └── assets/
    │       └── plan-template.md
    └── plan-to-code/
        ├── SKILL.md
        ├── assets/
        │   └── tasks-template.md
        └── workflows/
            ├── implement-tasks.md
            ├── refine-tasks.md
            └── validate-tasks.md
```

## License

MIT
