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

  {Implementation details from plan: dependencies, scripts, configuration}

- [ ] [T002] {Description} at `{file-path}`

  {Implementation details from plan}

---

## Phase 2: Foundational

Critical infrastructure that blocks all feature work. **No feature work can begin until this phase is complete.**

- [ ] [T003] [P] {Description} at `{file-path}`

  {Implementation details: patterns, code samples}

- [ ] [T004] [P] {Description} at `{file-path}`

  ```typescript
  // Code sample from plan
  {type definitions, interfaces, patterns}
  ```

- [ ] [T005] {Description} at `{file-path}`

  {Implementation guidance from plan}

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

  - {Additional guidance from plan}
  - {Patterns to follow}

- [ ] [T007] [P] {Description} at `{file-path}`

  ```typescript
  // API contract from plan
  type {Request} = { {fields} };
  type {Response} = { {fields} };
  ```

- [ ] [T008] {Description} at `{file-path}`

  {Implementation details: logic, patterns, integrations}

### Verification

- [ ] {Acceptance criterion 1}
- [ ] {Acceptance criterion 2}

---

## Phase 4: {Phase Name from Plan}

{Brief description of phase goal}

- [ ] [T009] [P] {Description} at `{file-path}`

  {Implementation details from plan}

- [ ] [T010] {Description} at `{file-path}`

  {Implementation details from plan}

### Verification

- [ ] {Acceptance criterion 1}

---

## Phase 5: Polish

Cross-cutting improvements and cleanup.

- [ ] [T011] [P] {Description} at `{file-path}`

  {Implementation details}

- [ ] [T012] [P] {Description} at `{file-path}`

  {Implementation details}

- [ ] [T013] {Description} at `{file-path}`

  {Implementation details}

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

Each task includes all implementation details from plan.md so it can be executed without referring back to the plan.

```
- [ ] [TaskID] [P] Description with exact `file/path.ts`
        │       │
        │       └─ Parallelizable marker - only when truly independent
        └─ Sequential ID - T001, T002, T003...

  Implementation details from plan:
  - Code samples (types, interfaces, patterns)
  - Specific guidance for this file
  - API contracts, dependencies
```

**Rules:**
- Checkbox prefix `- [ ]` is required
- TaskID is sequential across entire file
- `[P]` marker only for tasks that can run simultaneously
- Description must include exact file path in backticks
- **Each task must include all relevant implementation details from plan.md**

