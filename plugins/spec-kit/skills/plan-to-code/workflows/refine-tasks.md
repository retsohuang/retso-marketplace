# Refine Existing Tasks

Use when the user wants to update or improve task details based on their feedback. Ensures all related tasks are updated to reflect changes.

**Stage Transition:** Any Stage → Waiting for Validation

**Stage Check:** Check the current stage before refining.

- If `Waiting for Validation`: Refine and stay in Waiting for Validation
- If `Ready for Implementation`: Refine and move back to Waiting for Validation (requires re-validation)

**Input Required:**

- Path to existing `tasks.md` file
- User feedback or requested changes

## Steps

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INPUTS                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │    tasks.md     │  │    plan.md      │  │  User Feedback  │              │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              │
└───────────┼────────────────────┼────────────────────┼────────────────────────┘
            │                    │                    │
            └────────────────────┼────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       REFINEMENT PROCESS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                 │
│   │ 1. Analyze   │───▶│ 2. Apply     │───▶│ 3. Update    │                 │
│   │    Feedback  │    │    Changes   │    │    Related   │                 │
│   │              │    │              │    │    Tasks     │                 │
│   └──────────────┘    └──────────────┘    └──────────────┘                 │
│                                                  │                          │
│                                                  ▼                          │
│                                           ┌──────────────┐                 │
│                                           │ 4. Report    │                 │
│                                           └──────────────┘                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              OUTPUT                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                        ┌─────────────────┐                                  │
│                        │    tasks.md     │                                  │
│                        │  (updated)      │                                  │
│                        └─────────────────┘                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Step Details

1. **Analyze Feedback**
   - Load the `tasks.md` file from the specified path
   - Load the linked `plan.md` for reference
   - Understand user's requested changes or feedback
   - Identify which tasks are affected

2. **Apply Changes**
   - Update task details based on user feedback
   - Modify implementation details, code samples, or descriptions
   - Add, remove, or reorder tasks as requested
   - Ensure changes align with plan.md where applicable

3. **Update Related Tasks**
   - Identify tasks that depend on or relate to changed tasks
   - Propagate changes to maintain consistency
   - Update shared types, interfaces, or patterns across tasks
   - Adjust parallelization markers if dependencies changed

4. **Report**
   - Summarize changes made
   - List all tasks that were updated
   - Highlight any cascading changes to related tasks
   - Suggest running validation to verify completeness

**Output:** Updated `tasks.md` with user's changes reflected across all related tasks

## Example

**User:** "Change T005 to use Drizzle ORM instead of Prisma, and update the schema accordingly"

**Agent:**

1. Analyzes feedback:
   - T005 (database setup) needs ORM change
   - Related tasks: T006-T008 (models using the ORM)
2. Applies changes to T005:
   - Updates code samples from Prisma to Drizzle
   - Changes schema definition syntax
3. Updates related tasks:
   - T006: Updates User model to Drizzle schema
   - T007: Updates Message model to Drizzle schema
   - T008: Updates query patterns to Drizzle syntax
4. Reports: "Updated T005 with Drizzle ORM. Cascaded changes to T006, T007, T008 to maintain consistency."
