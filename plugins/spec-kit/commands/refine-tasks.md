---
description: Refine tasks by updating details based on user feedback
argument-hint: <tasks-path>
allowed-tools: Read, Edit, AskUserQuestion, Glob
---

# Refine Tasks

Refine existing tasks by updating details based on user feedback. Ensures all related tasks are updated to reflect changes and maintain consistency.

**Stage Transition:** Any Stage → Waiting for Validation

## Usage

```bash
/spec-kit:refine-tasks specs/001-feature-name
```

Where `<tasks-path>` is the path to the spec directory (e.g., `specs/001-feature-name`).

## Instructions

### Step 1: Load and Validate Stage

Read the tasks file at `$ARGUMENTS/tasks.md`.

**Stage Check:** Check the current stage before refining:
- If `Waiting for Validation`: Refine and stay in Waiting for Validation
- If `Ready for Implementation`: Refine and move back to Waiting for Validation (requires re-validation)
- If `In Progress` or `Ready to Test`: Inform user that tasks cannot be refined after implementation starts

### Step 2: Analyze Feedback

Understand what needs to be changed:
- Load the linked `plan.md` for reference
- Identify which tasks are affected by user's requested changes
- Determine if changes will cascade to related tasks

### Step 3: Apply Changes

Update task details based on user feedback:
- Modify implementation details, code samples, or descriptions
- Add, remove, or reorder tasks as requested
- Ensure changes align with plan.md where applicable

### Step 4: Update Related Tasks

Propagate changes to maintain consistency:
- Identify tasks that depend on or relate to changed tasks
- Update shared types, interfaces, or patterns across tasks
- Adjust parallelization markers if dependencies changed
- Update stage to `Waiting for Validation` if was `Ready for Implementation`

### Step 5: Report Results

Output a summary of changes:

```
## Tasks Refinement: {feature-name}

### Tasks Updated
- T005: {summary of change}
- T006: {summary of change}

### Cascaded Changes
- T007-T008: Updated to match new ORM patterns

### Status
Stage: {Waiting for Validation}

Ready for validation with `/spec-kit:validate-tasks`
```

## Example

**User:** "/spec-kit:refine-tasks specs/003-realtime-chat" with feedback "Change T005 to use Drizzle ORM instead of Prisma"

**Agent:**

1. Loads `specs/003-realtime-chat/tasks.md` and linked plan.md
2. Analyzes feedback:
   - T005 (database setup) needs ORM change
   - Related tasks: T006-T008 (models using the ORM)
3. Applies changes to T005:
   - Updates code samples from Prisma to Drizzle
   - Changes schema definition syntax
4. Updates related tasks:
   - T006: Updates User model to Drizzle schema
   - T007: Updates Message model to Drizzle schema
   - T008: Updates query patterns to Drizzle syntax
5. Reports:
   ```
   ## Tasks Refinement: realtime-chat

   ### Tasks Updated
   - T005: Changed ORM from Prisma to Drizzle

   ### Cascaded Changes
   - T006-T008: Updated model schemas and query patterns

   ### Status
   Stage: Waiting for Validation

   Ready for validation with `/spec-kit:validate-tasks`
   ```
