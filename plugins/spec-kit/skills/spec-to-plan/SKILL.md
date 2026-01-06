---
name: spec-to-plan
description: Transform feature specifications into implementation plans. Use when users want to "create a plan", "plan implementation", "plan a feature", "define architecture", "make a technical plan", "refine the plan", or "validate the plan". Transforms specs into actionable technical plans with architecture decisions and implementation phases.
license: MIT
metadata:
  author: Retso Huang
  version: "2.0"
---

# Spec to Plan

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

| Stage | Description | Allowed Actions | Exit Criteria |
|-------|-------------|-----------------|---------------|
| **Draft** | Initial plan with potential gaps, `[NEEDS DECISION]` markers, or incomplete sections | Create, Refine | All gaps resolved, all sections complete |
| **Waiting for Validation** | Plan is complete, awaiting validation checks | Validate, Refine | Validation passes all checks |
| **Ready for Tasks** | Validated and ready for implementation | None (terminal) | N/A - hand off to plan-to-code |

### Stage Transition Rules

| From | Action | To | Notes |
|------|--------|-----|-------|
| (none) | Create New Plan | Draft | Initial creation |
| Draft | Refine (complete all gaps) | Waiting for Validation | All `[NEEDS DECISION]` resolved |
| Draft | Validate | ❌ Blocked | Must refine first |
| Waiting for Validation | Validate (pass) | Ready for Tasks | All checks pass |
| Waiting for Validation | Validate (fail) | Waiting for Validation | Fix issues and re-validate |
| Waiting for Validation | Refine | Waiting for Validation | Can refine after failed validation |

## Output

The planning phase generates a single comprehensive document:

| Output    | Purpose                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------ |
| `plan.md` | Complete technical strategy including architecture, data model, implementation details with code samples, and quickstart |

The plan includes optional sections (Data Model, Quickstart) that are included when relevant to the feature.

## Workflows

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

### Refine Existing Plan

Use when the user wants to update or complete an existing plan.

**Stage:** Draft → Waiting for Validation (when all gaps resolved)

**Stage Check:** Before refining, verify the plan is in `Draft` or `Waiting for Validation` stage. If `Ready for Tasks`, inform user the plan is already complete.

**Steps:**

1. **Read existing plan**
   - Load the `plan.md` file from the specified path

2. **Analyze for gaps**
   - Find `[NEEDS DECISION]` markers
   - Identify incomplete sections (empty or placeholder text)
   - Check for missing rationale in decisions
   - Look for undefined implementation phases

3. **Sequential questioning**
   - Ask one decision at a time using AskUserQuestion
   - Focus on most critical gaps first
   - Gather context for each decision

4. **Update plan directly**
   - Replace `[NEEDS DECISION]` markers with actual decisions
   - Add rationale for each decision made
   - Complete any missing sections
   - If all gaps resolved: Update stage from `Draft` to `Waiting for Validation`

**Output:** Updated `plan.md` with resolved decisions and updated stage

### Validate Plan

Use before marking a plan as `Ready for Tasks`. Think of this as "unit tests for English" - ensuring the plan is complete, clear, and consistent.

**Stage:** Waiting for Validation → Ready for Tasks (on pass)

**Stage Check:** Before validating, verify the plan is in `Waiting for Validation` stage.
- If `Draft`: Inform user to refine the plan first to resolve all gaps
- If `Ready for Tasks`: Inform user the plan has already been validated

**When to Run:**

- After refining a plan to `Waiting for Validation` stage
- Before starting plan-to-code

**Validation Checks:**

#### 1. Completeness Checks

| Check                  | Validation                                              | Failure Action      |
| ---------------------- | ------------------------------------------------------- | ------------------- |
| Spec link              | Plan references source spec.md                          | Add spec link       |
| Technical context      | All fields populated (language, dependencies, platform) | Fill missing fields |
| Architecture           | Components and data flow defined                        | Define architecture |
| Implementation details | Code samples for types and APIs present                 | Add code samples    |
| Implementation phases  | At least 2 phases with concrete tasks                   | Define phases       |
| No open markers        | Zero `[NEEDS DECISION]` markers remain                  | Resolve or ask user |

#### 2. Consistency Checks

| Check              | Validation                                                  | Failure Action                    |
| ------------------ | ----------------------------------------------------------- | --------------------------------- |
| Spec alignment     | Every acceptance criterion from spec is addressable by plan | Map missing criteria to phases    |
| Tech stack match   | Dependencies align with stated language/platform            | Correct mismatches                |
| Data flow coverage | All components in data flow are defined in Components       | Add missing components            |
| Phase dependencies | Later phases don't depend on undefined earlier work         | Reorder or add prerequisite tasks |

#### 3. Clarity Checks

| Check              | Validation                                                          | Failure Action                      |
| ------------------ | ------------------------------------------------------------------- | ----------------------------------- |
| Decision rationale | Every key decision has rationale and alternatives                   | Add missing rationale               |
| Type definitions   | Interfaces have field descriptions or are self-documenting          | Add clarity to types                |
| Phase scope        | Each phase has concrete tasks with detailed implementation guidance | Add implementation details to tasks |
| Risk coverage      | Major technical risks identified with mitigations                   | Add risk analysis                   |

**Validation Output:**

```
## Validation Results

### Completeness: ✅ PASS | ❌ FAIL
- [x] Spec link present
- [x] Technical context complete
- [ ] Missing: Implementation details code samples

### Consistency: ✅ PASS | ❌ FAIL
- [x] All acceptance criteria mapped
- [ ] Issue: Component "Cache" in data flow not defined

### Clarity: ✅ PASS | ❌ FAIL
- [x] All decisions have rationale
- [x] Phases appropriately scoped

### Stage Transition: Waiting for Validation → Ready for Tasks | Needs Revision
```

**Steps:**

1. **Load plan and spec**
   - Read plan.md from specified path
   - Read linked spec.md for cross-reference

2. **Run completeness checks**
   - Verify all required sections exist and are populated
   - Check for remaining `[NEEDS DECISION]` markers
   - Validate code samples exist in Implementation Details

3. **Run consistency checks**
   - Cross-reference spec acceptance criteria with plan phases
   - Verify architecture components match data flow
   - Check tech stack coherence

4. **Run clarity checks**
   - Validate decisions have rationale
   - Check phase task granularity
   - Verify risks are identified

5. **Report results**
   - Output validation summary
   - If all pass: Update stage to `Ready for Tasks`
   - If failures: Keep stage as `Waiting for Validation`, list issues for user to address

**Example:**

**User:** "Validate the plan at specs/003-realtime-chat/plan.md"

**Agent:**

1. Loads plan and linked spec
2. Runs validation checks
3. Finds issues:
   - Missing code sample for WebSocket message handler
   - Acceptance criterion "offline message queue" not mapped to any phase
4. Reports:

   ```
   Completeness: ❌ FAIL - Missing Implementation Details code samples
   Consistency: ❌ FAIL - Spec criterion "offline message queue" not addressed
   Clarity: ✅ PASS

   Status: Needs Revision
   ```

5. Offers to help fix issues or asks user for guidance

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

### Refining a Plan

**User:** "Refine the plan at specs/003-realtime-chat/plan.md"

**Agent:**

1. Reads existing plan
2. Finds 2 `[NEEDS DECISION]` markers:
   - Message storage: Redis vs PostgreSQL
   - Auth: JWT vs session-based
3. Asks about message storage first
4. User chooses Redis for speed
5. Asks about auth approach
6. User chooses JWT for stateless scaling
7. Updates plan with decisions and rationale

## Relationship to Other Skills

- **create-spec** (before): Creates the spec this skill uses as input
- **plan-to-code** (after): Uses validated plan to generate implementation
