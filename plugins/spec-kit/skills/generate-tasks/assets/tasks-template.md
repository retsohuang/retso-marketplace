# Task List: {Feature Name}

**Plan**: {link to plan.md}
**Created**: {date}
**Stage**: {stage}

---

## Summary

**Total Tasks**: {count}
**Parallelizable**: {count} tasks marked [P]
**Phases**: {count}

---

## Phase 1: Setup

Project initialization and configuration.

- [ ] [T001] {Description} at `{file-path}`

  {Implementation details based on plan decisions: dependencies, scripts, configuration}

- [ ] [T002] {Description} at `{file-path}`

  {Implementation details based on plan decisions}

---

## Phase 2: Foundational

Critical infrastructure that blocks all feature work. **No feature work can begin until this phase is complete.**

- [ ] [T003] [P] {Description} at `{file-path}`

  {Implementation details based on plan patterns}

- [ ] [T004] [P] {Description} at `{file-path}`

  ```typescript
  // Code sample from plan
  {type definitions, interfaces, patterns}
  ```

- [ ] [T005] {Description} at `{file-path}`

  {Implementation guidance based on plan decisions}

---

## Phase 3: {Phase Name from Plan}

{Brief description of phase goal}

- [ ] [T006] [P] {Description} at `{file-path}`

  ```typescript
  // Type definition from plan
  interface {EntityName} {
    id: string;
    {field}: {type};
  }
  ```

  - {Additional guidance based on plan decisions}
  - {Patterns to follow from plan}

- [ ] [T007] [P] {Description} at `{file-path}`

  ```typescript
  // API contract from plan
  type {Request} = { {fields} };
  type {Response} = { {fields} };
  ```

- [ ] [T008] {Description} at `{file-path}`

  {Implementation details based on plan decisions}

### Verification

- [ ] {Acceptance criterion 1}
- [ ] {Acceptance criterion 2}

---

## Phase 4: {Phase Name from Plan}

{Brief description of phase goal}

- [ ] [T009] [P] {Description} at `{file-path}`

  {Implementation details based on plan decisions}

- [ ] [T010] {Description} at `{file-path}`

  {Implementation details based on plan decisions}

### Verification

- [ ] {Acceptance criterion 1}

---

## Phase 5: Polish

Cross-cutting improvements and cleanup.

- [ ] [T011] [P] {Description} at `{file-path}`

  {Implementation details based on plan decisions}

- [ ] [T012] [P] {Description} at `{file-path}`

  {Implementation details based on plan decisions}

- [ ] [T013] {Description} at `{file-path}`

  {Implementation details based on plan decisions}

---

## Parallelization Guide

Tasks marked `[P]` can execute simultaneously when they:
- Touch different files with no shared dependencies
- Belong to independent phases (after Foundational phase)

### Parallel Execution Examples

```
After Phase 2 (Foundational) completes:

  ┌──────────────────────────────────────────────────────┐
  │                   Can Run in Parallel                │
  ├──────────────┬──────────────┬──────────────┬─────────┤
  │   Phase 3    │   Phase 4    │   Phase 5    │  ...    │
  │              │              │              │         │
  └──────────────┴──────────────┴──────────────┴─────────┘

Within a single Phase:

  T006 [P] ──┬──> T008 (depends on T006/T007)
  T007 [P] ──┘
```

---

## Path Conventions

Adjust paths based on project structure:

| Project Type | Source | Tests |
|--------------|--------|-------|
| Single project | `src/` | `tests/` |
| Web app (monorepo) | `backend/src/`, `frontend/src/` | `backend/tests/`, `frontend/tests/` |
| Mobile | `api/src/`, `ios/`, `android/` | `api/tests/` |

---

## Task Format Reference

Tasks reference plan.md for architectural context and pattern consistency. Implementation details are generated based on plan decisions.

```
- [ ] [TaskID] [P] Description with exact `file/path.ts`
        │       │
        │       └─ Parallelizable marker - only when truly independent
        └─ Sequential ID - T001, T002, T003...

  Implementation details (generated based on plan decisions):
  - Code samples following plan's key patterns
  - Type definitions aligned with plan's architecture
  - Specific guidance for this file
```

**Rules:**
- Checkbox prefix `- [ ]` is required
- TaskID is sequential across entire file
- `[P]` marker only for tasks that can run simultaneously
- Description must include exact file path in backticks
- **Tasks reference plan.md for pattern and architecture consistency**

