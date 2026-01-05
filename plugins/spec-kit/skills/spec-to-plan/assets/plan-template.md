# Implementation Plan: {Feature Name}

**Spec**: {link to spec.md}
**Created**: {date}
**Stage**: Draft | Ready for Validation | Ready for Tasks

---

## Summary

{One paragraph distilling the primary requirement and technical approach from the feature specification}

---

## Technical Context

- **Language/Runtime**: {e.g., TypeScript/Node.js 20, Python 3.12, Go 1.22}
- **Key Dependencies**: {Major frameworks and libraries}
- **Target Platform**: {e.g., Web, iOS, CLI, Server}
- **Constraints**: {Performance requirements, compatibility needs}

---

## Architecture Overview

### Components

{List or diagram of major system components}

- **Component 1**: {Brief description and responsibility}
- **Component 2**: {Brief description and responsibility}
- **Component 3**: {Brief description and responsibility}

### Data Flow

{How data moves through the system - can be text description or ASCII diagram}

```
[Input] -> [Component A] -> [Component B] -> [Output]
                |
                v
           [Storage]
```

---

## Data Model

{Include this section when data persistence is needed}

### Entities

| Entity | Fields | Description |
|--------|--------|-------------|
| {Entity1} | id, {field}, {field}, createdAt | {What it represents} |
| {Entity2} | id, {field}, {foreignKey} | {What it represents} |

### Relationships

```
[Entity1] 1:N [Entity2]
    |
    1:1
    v
[Entity3]
```

### Storage Choice

- **Database**: {PostgreSQL / MongoDB / Redis / etc.}
- **Rationale**: {Why this choice}

---

## Key Decisions

### Decision 1: {Title}

- **Choice**: {What was decided}
- **Rationale**: {Why this choice was made}
- **Alternatives considered**: {Brief mention of other options}

### Decision 2: {Title}

- **Choice**: {What was decided}
- **Rationale**: {Why this choice was made}
- **Alternatives considered**: {Brief mention of other options}

---

## Implementation Details

{Include code samples for key interfaces, types, and patterns that guide implementation}

### Core Types

```typescript
// Example: Define key interfaces and types
interface {EntityName} {
  id: string;
  {field}: {type};
  {field}: {type};
  createdAt: Date;
  updatedAt: Date;
}

type {ActionResult} = {
  success: boolean;
  data?: {DataType};
  error?: string;
};
```

### API Contracts

```typescript
// Example: Key API endpoints or function signatures
// POST /api/{resource}
type Create{Resource}Request = {
  {field}: {type};
};

type Create{Resource}Response = {
  id: string;
  {field}: {type};
};

// GET /api/{resource}/:id
type Get{Resource}Response = {EntityName};
```

### Key Patterns

{Include code samples for important implementation patterns}

```typescript
// Example: Error handling pattern
const handle{Action} = async (input: {InputType}): Promise<{ResultType}> => {
  // Validation
  // Core logic
  // Error handling
};
```

---

## Implementation Phases

### Phase 1: {Name} - Foundation

**{Task 1}**
- What: {Description of what to build}
- How: {Implementation approach and key steps}
- Files: {Files to create or modify}

**{Task 2}**
- What: {Description of what to build}
- How: {Implementation approach and key steps}
- Files: {Files to create or modify}

### Phase 2: {Name} - Core Features

**{Task 1}**
- What: {Description of what to build}
- How: {Implementation approach and key steps}
- Files: {Files to create or modify}

**{Task 2}**
- What: {Description of what to build}
- How: {Implementation approach and key steps}
- Files: {Files to create or modify}

### Phase 3: {Name} - Polish & Integration

**{Task 1}**
- What: {Description of what to build}
- How: {Implementation approach and key steps}
- Files: {Files to create or modify}

---

## Quickstart

{Include this section for complex setups}

### Prerequisites

- {Prerequisite 1} (version X.X+)
- {Prerequisite 2}

### Setup

```bash
# Install dependencies
{install-command}

# Environment variables
{VAR_NAME}={description}

# Database setup (if applicable)
{db-setup-command}
```

### Run

```bash
{dev-command}
```

### Verify

- Health check: `{endpoint}` returns `{expected}`
- {Other verification steps}

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| {Risk description} | {High/Medium/Low} | {How to address} |
| {Risk description} | {High/Medium/Low} | {How to address} |

---

## Open Items

- [NEEDS DECISION: {Question about technical choice}]
- [NEEDS DECISION: {Question about architecture}]

---

## Completeness Checklist

Before advancing to the next stage, verify:

### Draft → Ready for Validation
- [ ] All `[NEEDS DECISION]` markers are resolved
- [ ] Technical context is fully specified
- [ ] Architecture components are defined
- [ ] Data model defined (if applicable)
- [ ] Implementation details with code samples provided
- [ ] Key decisions include rationale
- [ ] Implementation phases are sequential and logical
- [ ] Quickstart provided (if complex setup)
- [ ] Risks have mitigations

### Ready for Validation → Ready for Tasks
- [ ] Run validation workflow
- [ ] All completeness checks pass
- [ ] All consistency checks pass
- [ ] All clarity checks pass
- [ ] Ready for plan-to-code
