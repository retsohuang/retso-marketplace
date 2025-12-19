# Quality Checklist: [FEATURE NAME]

**Feature**: [Feature Name]
**Date**: [DATE]
**Reviewed By**: [Name]

---

## Specification Quality

*Like "unit tests for English" - validate requirements before implementation*

### Completeness

- [ ] All user stories have acceptance scenarios (Given/When/Then)
- [ ] No [NEEDS CLARIFICATION] markers remain unresolved
- [ ] Edge cases are identified and documented
- [ ] Error scenarios are specified
- [ ] Success criteria are measurable

### Clarity

- [ ] Requirements are testable and unambiguous
- [ ] User types and permissions are clearly defined
- [ ] Data retention/deletion policies are specified
- [ ] Performance targets are quantified
- [ ] Scope boundaries are explicit

### Consistency

- [ ] No contradictions between requirements
- [ ] User stories align with functional requirements
- [ ] Non-functional requirements don't conflict
- [ ] Terminology is consistent throughout

### No Implementation Details

- [ ] No programming languages mentioned
- [ ] No frameworks or libraries specified
- [ ] No API structure defined
- [ ] No database schema included
- [ ] Written for business stakeholders

---

## Plan Quality

### Technical Context

- [ ] All NEEDS CLARIFICATION markers resolved
- [ ] Technology choices have rationale in research.md
- [ ] Alternatives were considered and documented
- [ ] Project type correctly identified (single/web/mobile)

### Constitution Compliance

- [ ] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS
- [ ] Complexity deviations documented and justified
- [ ] Simplicity principle followed (max 3 projects)

### Design Artifacts

- [ ] research.md complete with decisions and rationale
- [ ] data-model.md has all entities from spec
- [ ] contracts/ has schemas for all user actions
- [ ] quickstart.md provides validation steps

### Testing Strategy

- [ ] TDD order enforced (tests before implementation)
- [ ] Contract tests defined for each endpoint
- [ ] Integration tests mapped to user stories
- [ ] Real dependencies used (no excessive mocking)

---

## Task Quality

### Organization

- [ ] Tasks grouped by user story
- [ ] Each story independently testable
- [ ] Foundational phase blocks all stories (correct dependency)
- [ ] Parallel tasks marked with [P]
- [ ] Story labels [US1], [US2] applied consistently

### Completeness

- [ ] Every spec requirement maps to a task
- [ ] Test tasks precede implementation tasks
- [ ] File paths are explicit
- [ ] Checkpoints defined for validation

### Dependencies

- [ ] No circular dependencies
- [ ] Dependency order correct (models → services → endpoints)
- [ ] Cross-story dependencies minimize coupling
- [ ] MVP deliverable after User Story 1

---

## Implementation Quality

### Code Quality

- [ ] Follows project constitution principles
- [ ] No implementation before failing test
- [ ] Single responsibility per module
- [ ] Clear error messages with context

### Testing

- [ ] Tests fail before implementation (RED phase)
- [ ] Tests pass after implementation (GREEN phase)
- [ ] Contract tests validate schemas
- [ ] Integration tests cover user journeys
- [ ] Quickstart.md executes successfully

### Documentation

- [ ] Code is self-documenting
- [ ] Complex logic has explanatory comments
- [ ] API contracts match implementation
- [ ] README updated if needed

---

## Cross-Artifact Consistency

*Run after /tasks, before /implement*

### Spec ↔ Plan Alignment

- [ ] Every spec requirement addressed in plan
- [ ] Data model covers all spec entities
- [ ] API contracts handle all user actions
- [ ] No plan features not in spec (scope creep)

### Plan ↔ Tasks Alignment

- [ ] Every plan component has tasks
- [ ] Task dependencies match plan phases
- [ ] File paths consistent with plan structure
- [ ] Estimated task count reasonable (25-30 typical)

### Tasks ↔ Implementation Alignment

- [ ] All tasks completed or explicitly deferred
- [ ] No uncommitted code changes
- [ ] Tests passing for completed stories
- [ ] Checkpoints validated

---

## Final Validation

### Functional

- [ ] All acceptance scenarios pass
- [ ] Edge cases handled correctly
- [ ] Error scenarios return appropriate feedback
- [ ] User flows work end-to-end

### Non-Functional

- [ ] Performance targets met
- [ ] Security requirements satisfied
- [ ] Accessibility standards followed
- [ ] Scalability assumptions validated

### Documentation

- [ ] Spec marked complete
- [ ] Plan updated with final status
- [ ] Tasks closed out
- [ ] Any deviations documented

---

## Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| Developer | | | |
| Reviewer | | | |
| Product | | | |

---

## Notes

<!-- Any observations, lessons learned, or items for follow-up -->
