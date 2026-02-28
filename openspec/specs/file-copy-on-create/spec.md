## ADDED Requirements

### Requirement: Worktree creation with file copy

The WorktreeCreate hook SHALL create a git worktree at `.claude/worktrees/<name>/` using `git worktree add`, then check for a `.worktreeinclude.yaml` file in the project root (`cwd`). If the file exists, the hook SHALL resolve patterns, filter, and copy matching files. The hook SHALL print the absolute worktree path to stdout.

#### Scenario: Worktree created with .worktreeinclude.yaml present

- **WHEN** WorktreeCreate fires with `cwd` pointing to a project that has a `.worktreeinclude.yaml` file
- **THEN** the hook creates the worktree, copies matching files, and prints the worktree path to stdout

#### Scenario: Worktree created without .worktreeinclude.yaml

- **WHEN** WorktreeCreate fires with `cwd` pointing to a project that has no `.worktreeinclude.yaml` file
- **THEN** the hook creates the worktree and prints the worktree path to stdout without copying any files


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

### Requirement: Config file format

The `.worktreeinclude.yaml` file SHALL be a YAML file with a top-level `files` key containing a list of file paths or glob patterns.

#### Scenario: Valid config with exact paths and globs

- **WHEN** `.worktreeinclude.yaml` contains `files: [".env", ".env.local", "config/*.yml"]`
- **THEN** the hook resolves each entry against the project root, expanding glob patterns to matching files

#### Scenario: Empty files list

- **WHEN** `.worktreeinclude.yaml` contains `files: []` or the `files` key is missing
- **THEN** the hook skips the copy step without error


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

### Requirement: Glob pattern resolution

The hook SHALL expand glob/wildcard patterns in `.worktreeinclude.yaml` entries against the project root directory.

#### Scenario: Glob matches multiple files

- **WHEN** `.worktreeinclude.yaml` contains `.env*` and the project root has `.env`, `.env.local`, `.env.production`
- **THEN** all three files are resolved as candidates for copying

#### Scenario: Glob matches no files

- **WHEN** `.worktreeinclude.yaml` contains `secrets/*.key` but no files match that pattern
- **THEN** the hook logs a message to stderr and continues without error


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

### Requirement: Gitignore intersection filter

The hook SHALL only copy files that are both matched by `.worktreeinclude.yaml` patterns AND ignored by `.gitignore`. Files tracked by git SHALL NOT be copied.

#### Scenario: File is in both .worktreeinclude.yaml and .gitignore

- **WHEN** `.env` is listed in `.worktreeinclude.yaml` and `.env` is ignored by `.gitignore`
- **THEN** `.env` is copied to the worktree

#### Scenario: File is in .worktreeinclude.yaml but tracked by git

- **WHEN** `README.md` is listed in `.worktreeinclude.yaml` but is tracked by git (not in `.gitignore`)
- **THEN** `README.md` is NOT copied (it already exists in the worktree via git)

#### Scenario: File is in .worktreeinclude.yaml but does not exist

- **WHEN** `.env.local` is listed in `.worktreeinclude.yaml` but the file does not exist in the project root
- **THEN** the hook logs a message to stderr and continues without error


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

### Requirement: Directory structure preservation

The hook SHALL create parent directories in the worktree as needed when copying files with nested paths.

#### Scenario: Copying a file in a subdirectory

- **WHEN** `config/secrets.yml` is resolved for copying
- **THEN** the hook creates `config/` in the worktree before copying the file


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

### Requirement: Python-based implementation

The hook SHALL use a Python 3 script for YAML parsing, glob resolution, and gitignore checking. The script SHALL use only Python standard library modules (no PyYAML dependency).

#### Scenario: Python 3 is available

- **WHEN** `python3` is found on the system PATH
- **THEN** the hook delegates to the Python script for file resolution and copying

#### Scenario: Python 3 is not available

- **WHEN** `python3` is not found on the system PATH
- **THEN** the hook creates the worktree without copying files and logs a warning to stderr

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

### Requirement: Worktree creation with file copy

The WorktreeCreate hook SHALL create a git worktree at `.claude/worktrees/<name>/` using `git worktree add`, then check for a `.worktreeinclude.yaml` file in the project root (`cwd`). If the file exists, the hook SHALL resolve patterns, filter, and copy matching files. The hook SHALL print the absolute worktree path to stdout.

#### Scenario: Worktree created with .worktreeinclude.yaml present

- **WHEN** WorktreeCreate fires with `cwd` pointing to a project that has a `.worktreeinclude.yaml` file
- **THEN** the hook creates the worktree, copies matching files, and prints the worktree path to stdout

#### Scenario: Worktree created without .worktreeinclude.yaml

- **WHEN** WorktreeCreate fires with `cwd` pointing to a project that has no `.worktreeinclude.yaml` file
- **THEN** the hook creates the worktree and prints the worktree path to stdout without copying any files

---
### Requirement: Config file format

The `.worktreeinclude.yaml` file SHALL be a YAML file with a top-level `files` key containing a list of file paths or glob patterns.

#### Scenario: Valid config with exact paths and globs

- **WHEN** `.worktreeinclude.yaml` contains `files: [".env", ".env.local", "config/*.yml"]`
- **THEN** the hook resolves each entry against the project root, expanding glob patterns to matching files

#### Scenario: Empty files list

- **WHEN** `.worktreeinclude.yaml` contains `files: []` or the `files` key is missing
- **THEN** the hook skips the copy step without error

---
### Requirement: Glob pattern resolution

The hook SHALL expand glob/wildcard patterns in `.worktreeinclude.yaml` entries against the project root directory.

#### Scenario: Glob matches multiple files

- **WHEN** `.worktreeinclude.yaml` contains `.env*` and the project root has `.env`, `.env.local`, `.env.production`
- **THEN** all three files are resolved as candidates for copying

#### Scenario: Glob matches no files

- **WHEN** `.worktreeinclude.yaml` contains `secrets/*.key` but no files match that pattern
- **THEN** the hook logs a message to stderr and continues without error

---
### Requirement: Gitignore intersection filter

The hook SHALL only copy files that are both matched by `.worktreeinclude.yaml` patterns AND ignored by `.gitignore`. Files tracked by git SHALL NOT be copied.

#### Scenario: File is in both .worktreeinclude.yaml and .gitignore

- **WHEN** `.env` is listed in `.worktreeinclude.yaml` and `.env` is ignored by `.gitignore`
- **THEN** `.env` is copied to the worktree

#### Scenario: File is in .worktreeinclude.yaml but tracked by git

- **WHEN** `README.md` is listed in `.worktreeinclude.yaml` but is tracked by git (not in `.gitignore`)
- **THEN** `README.md` is NOT copied (it already exists in the worktree via git)

#### Scenario: File is in .worktreeinclude.yaml but does not exist

- **WHEN** `.env.local` is listed in `.worktreeinclude.yaml` but the file does not exist in the project root
- **THEN** the hook logs a message to stderr and continues without error

---
### Requirement: Directory structure preservation

The hook SHALL create parent directories in the worktree as needed when copying files with nested paths.

#### Scenario: Copying a file in a subdirectory

- **WHEN** `config/secrets.yml` is resolved for copying
- **THEN** the hook creates `config/` in the worktree before copying the file

---
### Requirement: Python-based implementation

The hook SHALL use a Python 3 script for YAML parsing, glob resolution, and gitignore checking. The script SHALL use only Python standard library modules (no PyYAML dependency).

#### Scenario: Python 3 is available

- **WHEN** `python3` is found on the system PATH
- **THEN** the hook delegates to the Python script for file resolution and copying

#### Scenario: Python 3 is not available

- **WHEN** `python3` is not found on the system PATH
- **THEN** the hook creates the worktree without copying files and logs a warning to stderr