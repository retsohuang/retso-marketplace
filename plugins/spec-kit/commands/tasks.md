---
description: Generate actionable task list with dependencies from implementation plan
allowed-tools: Read, Write
model: claude-sonnet-4-5
---

# Generate Task List

Break down the implementation plan into actionable, dependency-ordered tasks with acceptance criteria and effort estimates.

## Usage

```bash
/spec-kit:tasks
```

Optionally specify a spec: `/spec-kit:tasks 001` or `/spec-kit:tasks user-auth`

## Process

### Step 1: Get Current Spec Context

Use the get-current-spec skill to determine which spec to work with.

The skill will:
1. Check if user mentioned a spec in their input (e.g., "001", "user-auth")
2. Read from progress.yml if no spec mentioned
3. Prompt user to select if neither available
4. Update progress.yml via set-current-spec skill when a new spec is chosen

After the skill completes, you will have:
- Feature number: {NNN}
- Feature name: {feature-name}
- Feature directory: .claude/spec-kit/specs/{NNN}-{feature-name}/

### Step 2: Read Plan

Read the implementation plan:

```bash
cat .claude/spec-kit/specs/{NNN}-{feature-name}/plan.md
```

If plan.md doesn't exist, direct user to run `/spec-kit:plan` first.

### Step 3: Load Tasks Template

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/cli.js template tasks-template --plugin-root ${CLAUDE_PLUGIN_ROOT}
```

### Step 4: Identify Tasks

Break the plan into tasks by analyzing:
- **Files to create**: Each significant file is a task
- **Files to modify**: Group related changes
- **Integration points**: Connecting systems is a task
- **Testing**: Each test category is a task
- **Documentation**: Docs and guides are tasks

Each task should:
- Be completable in 0.5-1 day (XS/S/M)
- Have clear acceptance criteria
- Be independently testable
- Have clear inputs and outputs

### Step 5: Organize by Phase

Group tasks into implementation phases from the plan:
- **Phase 1: Foundation** - Core setup, data models, basic structure
- **Phase 2: Core Features** - Main functionality, business logic
- **Phase 3: Polish and Launch** - Edge cases, error handling, deployment

### Step 6: Define Dependencies

For each task, identify:
- What must be done before it (dependencies)
- What can be done in parallel
- What blocks other tasks

Map dependencies clearly:
```
Phase 1: Foundation
  ├─ Task 1.1 (no dependencies)
  ├─ Task 1.2 → depends on 1.1
  └─ Task 1.3 → depends on 1.1

Phase 2: Core Features
  ├─ Task 2.1 → depends on 1.2, 1.3
  ├─ Task 2.2 → depends on 2.1
  └─ Task 2.3 → depends on 2.1
```

### Step 7: Write Tasks

For each task, create a detailed entry with:

**Status**: ⬜ Not Started (all tasks start here)

**Priority**: High | Medium | Low
- High: Blocks other work or critical path
- Medium: Important but not blocking
- Low: Nice-to-have or polish

**Complexity**: Low | Medium | High
- Low: Straightforward, well-understood
- Medium: Some unknowns or moderate scope
- High: Complex, unclear, or risky

**Estimated Effort**:
- XS: <2 hours
- S: 2-4 hours
- M: 4-8 hours (1 day)
- L: 1-2 days
- XL: 2-5 days

**Description**:
Clear explanation of what needs to be done and why

**Acceptance Criteria**:
3-5 checkboxes of what "done" looks like:
- [ ] Specific, testable criteria
- [ ] Include testing requirements
- [ ] Consider edge cases

**Implementation Notes**:
- Technical hints or gotchas
- References to patterns in existing code
- Links to docs or examples

**Files to Create/Modify**:
List specific files with purpose

**Testing Requirements**:
- Unit tests needed
- Integration tests needed
- Manual testing steps

### Step 8: Add Testing and Deployment Tasks

Include explicit tasks for:
- **Testing Strategy** (Phase 1)
  - Set up test infrastructure
  - Write unit test helpers

- **End-to-End Testing** (Phase 3)
  - Write E2E tests for user flows
  - Test error scenarios

- **Deployment Checklist** (Phase 3)
  - Pre-deployment checks
  - Deployment steps
  - Post-deployment validation

### Step 9: Calculate Summary

Count:
- Total tasks per phase
- Total estimated effort (sum of estimates)
- High/Medium/Low priority breakdown
- Critical path (longest dependency chain)

### Step 10: Show Summary

```
✅ Task List Generated!

Feature: {NNN}-{feature-name}
Location: .claude/spec-kit/specs/{NNN}-{feature-name}/tasks.md

Task Breakdown:
- Phase 1 (Foundation): {count} tasks, ~{effort} days
- Phase 2 (Core Features): {count} tasks, ~{effort} days
- Phase 3 (Polish & Launch): {count} tasks, ~{effort} days
- Total: {count} tasks, ~{effort} days estimated

Priority Distribution:
- 🔴 High: {count} tasks
- 🟡 Medium: {count} tasks
- 🟢 Low: {count} tasks

Critical Path: {count} sequential tasks (~{effort} days)

Next Steps:
1. Review task breakdown: .claude/spec-kit/specs/{NNN}-{feature-name}/tasks.md
2. Validate consistency: /spec-kit:analyze
3. Begin implementation: /spec-kit:implement

Tip: Start with Phase 1 foundation tasks. They unblock the rest of the work.
```

## Writing Good Tasks

### Good Task

```markdown
### Task 2.1: Implement User Authentication Service

- **Status**: ⬜ Not Started
- **Priority**: High
- **Complexity**: Medium
- **Estimated Effort**: M (1 day)
- **Dependencies**: Task 1.1 (User model), Task 1.2 (Database setup)

**Description:**
Create authentication service that handles user login, logout, and token management using JWT tokens.

**Acceptance Criteria:**
- [ ] Service validates email/password credentials
- [ ] Returns JWT token on successful login
- [ ] Token includes user ID and role
- [ ] Token expires after 24 hours
- [ ] Handles invalid credentials gracefully

**Implementation Notes:**
- Use bcrypt for password hashing (already in dependencies)
- Follow pattern in `src/services/apiService.ts`
- Store tokens in httpOnly cookies for security
- Use zod to validate login payload

**Files to Create/Modify:**
- `src/services/authService.ts` - Main service
- `src/types/auth.ts` - Auth-related types

**Testing Requirements:**
- [ ] Unit tests for login success/failure
- [ ] Unit tests for token generation
- [ ] Integration test for full auth flow
```

### Bad Task

```markdown
### Task: Auth Stuff

- Do authentication
- Make it work
- Test it
```

## Task Sizing Guidelines

**XS Tasks (< 2 hours):**
- Add a utility function
- Update a type definition
- Fix a small bug
- Add a test case

**S Tasks (2-4 hours):**
- Create a simple component
- Add an API endpoint
- Write a service function
- Add integration test

**M Tasks (4-8 hours / 1 day):**
- Implement a feature component with state
- Build a complete API route with validation
- Integrate with external service
- Write comprehensive test suite

**L Tasks (1-2 days):**
- Build a complex multi-component feature
- Design and implement data model with migrations
- Integrate multiple services
- Build authentication system

**XL Tasks (2-5 days):**
- These should be broken down into smaller tasks
- If a task is XL, split it into multiple M/L tasks

## Error Handling

- If plan.md doesn't exist, direct to `/spec-kit:plan`
- If plan is vague, note which areas need clarification
- If task seems too large (>2 days), suggest breaking it down
- If dependencies are circular, flag the issue

## Notes

- Tasks should be ordered by dependencies, not arbitrary sequence
- Some tasks can be done in parallel - note this in the dependency tree
- Err on the side of smaller tasks - easier to track progress
- Update task status as you work through implementation
- It's OK to add tasks during implementation if you discover more work
- Estimates are rough - learning and blockers will affect actual time
