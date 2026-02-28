## ADDED Requirements

### Requirement: Worktree removal with cleanup

The WorktreeRemove hook SHALL remove the worktree directory specified by `worktree_path` from the stdin JSON. The hook SHALL run `git worktree remove` to cleanly detach the worktree.

#### Scenario: Worktree removed successfully

- **WHEN** WorktreeRemove fires with a valid `worktree_path`
- **THEN** the hook removes the worktree directory and its git worktree reference

#### Scenario: Worktree path does not exist

- **WHEN** WorktreeRemove fires with a `worktree_path` that no longer exists
- **THEN** the hook logs a message to stderr and exits without error


<!-- @trace
source: worktree-bootstrap
updated: 2026-03-01
code:
  - plugins/worktree-bootstrap/scripts/worktree-remove.sh
  - README.md
  - plugins/worktree-bootstrap/scripts/worktree-create.sh
  - .claude-plugin/marketplace.json
  - plugins/worktree-bootstrap/scripts/worktree_bootstrap.py
  - plugins/worktree-bootstrap/plugin.json
-->

### Requirement: No decision control on removal

The WorktreeRemove hook SHALL NOT block or prevent worktree removal. Failures during cleanup SHALL be logged to stderr but SHALL NOT cause a non-zero exit code.

#### Scenario: Cleanup failure is non-blocking

- **WHEN** the worktree removal encounters an error (e.g., permission denied)
- **THEN** the hook logs the error to stderr and exits with code 0

## Requirements


<!-- @trace
source: worktree-bootstrap
updated: 2026-03-01
code:
  - plugins/worktree-bootstrap/scripts/worktree-remove.sh
  - README.md
  - plugins/worktree-bootstrap/scripts/worktree-create.sh
  - .claude-plugin/marketplace.json
  - plugins/worktree-bootstrap/scripts/worktree_bootstrap.py
  - plugins/worktree-bootstrap/plugin.json
-->

### Requirement: Worktree removal with cleanup

The WorktreeRemove hook SHALL remove the worktree directory specified by `worktree_path` from the stdin JSON. The hook SHALL run `git worktree remove` to cleanly detach the worktree.

#### Scenario: Worktree removed successfully

- **WHEN** WorktreeRemove fires with a valid `worktree_path`
- **THEN** the hook removes the worktree directory and its git worktree reference

#### Scenario: Worktree path does not exist

- **WHEN** WorktreeRemove fires with a `worktree_path` that no longer exists
- **THEN** the hook logs a message to stderr and exits without error

---
### Requirement: No decision control on removal

The WorktreeRemove hook SHALL NOT block or prevent worktree removal. Failures during cleanup SHALL be logged to stderr but SHALL NOT cause a non-zero exit code.

#### Scenario: Cleanup failure is non-blocking

- **WHEN** the worktree removal encounters an error (e.g., permission denied)
- **THEN** the hook logs the error to stderr and exits with code 0