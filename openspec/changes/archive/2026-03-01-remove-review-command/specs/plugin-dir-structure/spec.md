## REMOVED Requirements

### Requirement: Review command wrapper
**Reason**: The `/code-review-tools:review` command is a thin passthrough to the `code-review` skill, which users can invoke directly.
**Migration**: Use `/code-review <commit-hash>` directly instead of `/code-review-tools:review <commit-hash>`.

#### Scenario: User invokes code review

- **WHEN** a user wants to review code changes from a specific commit
- **THEN** they SHALL use `/code-review <commit-hash>` directly instead of the removed `/code-review-tools:review` command
