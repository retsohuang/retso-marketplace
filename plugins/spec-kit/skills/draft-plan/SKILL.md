---
name: draft-plan
description: Transform feature specifications into implementation plans. Use when users want to "create a plan", "plan implementation", "plan a feature", "define architecture", or "make a technical plan". Transforms specs into actionable technical plans with architecture decisions and implementation phases.
license: MIT
metadata:
  author: Retso Huang
  version: "3.0"
---

# Draft Plan

Creates structured implementation plans from feature specifications. Based on spec-driven development principles where specifications become executable, directly generating working implementations.

## Prerequisites

This skill requires an existing feature specification file (`spec.md`) with status `Ready for Planning`. The spec must be created by the `create-spec` skill and have all clarifications resolved before planning can begin.

## Stages

Plans progress through three stages. Each stage must be completed before moving to the next—no skipping allowed.

```
┌─────────────┐      ┌───────────────────────┐      ┌─────────────────┐
│   Draft     │─────▶│  Waiting for Validation │─────▶│  Ready for Tasks│
└─────────────┘      └───────────────────────┘      └─────────────────┘
      │                        │                           │
      ▼                        ▼                           ▼
  Initial plan           Plan complete,             Validation passed,
  creation,              all sections filled,       ready for plan-to-code
  may have gaps          needs validation
```

### Stage Definitions

| Stage | Description | Next Action | Exit Criteria |
|-------|-------------|-------------|---------------|
| **Draft** | Initial plan with potential gaps or `[NEEDS DECISION]` markers | `/spec-kit:refine-plan` | All gaps resolved |
| **Waiting for Validation** | Plan complete, awaiting validation | `/spec-kit:validate-plan` | Validation passes |
| **Ready for Tasks** | Validated and ready for implementation | plan-to-code skill | N/A - terminal |

### Stage Transition Rules

| From | Action | To | Notes |
|------|--------|-----|-------|
| (none) | Create (this skill) | Draft | Initial creation |
| Draft | `/spec-kit:refine-plan` | Waiting for Validation | All `[NEEDS DECISION]` resolved |
| Draft | `/spec-kit:validate-plan` | ❌ Blocked | Must refine first |
| Waiting for Validation | `/spec-kit:validate-plan` (pass) | Ready for Tasks | All checks pass |
| Waiting for Validation | `/spec-kit:validate-plan` (fail) | Waiting for Validation | Fix and re-validate |
| Waiting for Validation | `/spec-kit:refine-plan` | Waiting for Validation | Can refine after failed validation |

## Output

The planning phase generates a single comprehensive document:

| Output    | Purpose                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------ |
| `plan.md` | Complete technical strategy including architecture, data model, implementation details with code samples, and quickstart |

The plan includes optional sections (Data Model, Quickstart) that are included when relevant to the feature.

## Workflow

This skill handles the initial plan creation. Use `/spec-kit:refine-plan` to resolve gaps and `/spec-kit:validate-plan` to validate before task generation.

### Create New Plan

Use when the user provides a spec file path and wants to create an implementation plan.

**Stage:** (none) → Draft

**Input Required:**

- Path to existing `spec.md` file
- Tech stack preferences (optional - will ask if not provided)

**Steps:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                           INPUTS                                    │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │  spec.md        │  │  Tech Stack     │  │  Constraints        │  │
│  │  (from          │  │  Preferences    │  │  & Requirements     │  │
│  │  /create-spec) │  │                 │  │                     │  │
│  └────────┬────────┘  └────────┬────────┘  └──────────┬──────────┘  │
└───────────┼────────────────────┼─────────────────────┼──────────────┘
            │                    │                     │
            └────────────────────┼─────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       PLANNING PROCESS                              │
├─────────────────────────────────────────────────────────────────────┤
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│   │ 1. Analyze   │───▶│ 2. Research  │───▶│ 3. Design    │         │
│   │    Spec      │    │    Tech      │    │    System    │         │
│   └──────────────┘    └──────────────┘    └──────────────┘         │
│                                                  │                  │
│                                                  ▼                  │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│   │ 6. Validate  │◀───│ 5. Define    │◀───│ 4. Model     │         │
│   │    Plan      │    │    APIs      │    │    Data      │         │
│   └──────────────┘    └──────────────┘    └──────────────┘         │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           OUTPUTS                                   │
├─────────────────────────────────────────────────────────────────────┤
│                      ┌───────────────┐                             │
│                      │   plan.md     │                             │
│                      │  (complete    │                             │
│                      │   strategy)   │                             │
│                      └───────────────┘                             │
└─────────────────────────────────────────────────────────────────────┘
```

**Step Details:**

1. **Analyze Spec**
   - Load the feature specification from the provided path
   - Verify spec status is `Ready for Planning`
   - If status is not ready, inform user to complete the spec first
   - Extract: feature name, user stories, acceptance criteria, constraints

2. **Research Tech**
   - If tech stack not provided, ask user about preferences
   - Research current best practices for chosen technologies
   - Validate technology choices against requirements
   - Document key findings in Key Decisions section

3. **Design System**
   - Define high-level architecture components
   - Map data flow between components
   - Identify integration points

4. **Model Data**
   - Define data entities and relationships
   - Design database schema if persistence needed
   - Include in Data Model section of plan

5. **Define APIs & Implementation Details**
   - Specify component interfaces with code samples
   - Define API contracts (request/response types)
   - Document key patterns and type definitions
   - Include code samples for complex logic

6. **Validate Plan**
   - Cross-check plan against spec requirements
   - Ensure all acceptance criteria can be met
   - Verify no gaps between spec and implementation approach

**Output:**

Save to the same directory as the spec file with stage set to `Draft`:

```
specs/003-feature-name/
├── spec.md     (input - already exists)
└── plan.md     (created by this skill, Stage: Draft)
```

## Quality Guards

- Plan must link to its source spec file
- Include code samples for interfaces, types, and key patterns
- Every decision must include brief rationale
- Unknowns marked with `[NEEDS DECISION: specific question]`
- Architecture stays high-level (components, not classes)
- Implementation phases are sequential and logical

## Template Reference

See [plan-template.md](assets/plan-template.md) for the complete plan structure including optional Data Model and Quickstart sections.

## Example Usage

### Creating a New Plan

**User:** "Create a plan for specs/003-realtime-chat/spec.md using Node.js and WebSockets"

**Agent:**

1. Reads `specs/003-realtime-chat/spec.md`
2. Verifies status is `Ready for Planning`
3. Notes user's tech preferences: Node.js, WebSockets
4. Researches WebSocket libraries (Socket.io vs ws)
5. Identifies decisions needed:
   - Message persistence strategy
   - Authentication approach
   - Scaling strategy
6. Generates `plan.md` with:
   - Architecture and implementation phases
   - Data Model section with message/user schemas
   - Implementation Details with TypeScript interfaces and API contracts
   - Key Decisions documenting Socket.io vs ws choice
   - Quickstart for WebSocket setup
7. Saves to `specs/003-realtime-chat/plan.md`

## Relationship to Other Skills

- **create-spec** (before): Creates the spec this skill uses as input
- **generate-tasks** (after): Uses validated plan to generate implementation tasks
