## ADDED Requirements

### Requirement: Initialize worktreeinclude configuration

The `config` skill SHALL create a `.worktreeinclude.yaml` file in the project root when one does not already exist. The skill SHALL scan the project for ignored files using `git ls-files --others --ignored --exclude-standard`, which covers all ignore sources (`.gitignore`, `.git/info/exclude`, and global gitignore). The skill SHALL present discovered files to the user as candidates. The generated file SHALL use the `files:` key with a YAML list of selected file paths.

#### Scenario: No existing configuration file and no specific files mentioned

- **WHEN** user triggers the skill (e.g., "set up worktree config") and no `.worktreeinclude.yaml` exists
- **THEN** the skill scans for ignored files, presents candidates to the user, and writes a `.worktreeinclude.yaml` with the selected entries

#### Scenario: No ignored files found

- **WHEN** the project contains no ignored files
- **THEN** the skill SHALL inform the user and create a `.worktreeinclude.yaml` with an empty `files:` list and a comment explaining the format

### Requirement: Add entries to existing configuration

The `config` skill SHALL accept file or directory paths via arguments (e.g., `/worktree-bootstrap:config .env .env.local`) or from the user's natural language input. When specific files are provided, the skill SHALL verify each path is ignored (via `.gitignore`, `.git/info/exclude`, or global gitignore) using `git check-ignore`, then add the valid entries to the existing `.worktreeinclude.yaml`. If the config file does not exist, it SHALL be created with the provided entries.

#### Scenario: Add specific files via arguments

- **WHEN** user runs `/worktree-bootstrap:config .env.production` and the path is ignored
- **THEN** the skill adds `.env.production` to the `files:` list in `.worktreeinclude.yaml`

#### Scenario: Add specific files via natural language

- **WHEN** user says "add .env.production to worktree bootstrap" and the path is ignored
- **THEN** the skill adds `.env.production` to the `files:` list in `.worktreeinclude.yaml`

#### Scenario: Referenced file is not ignored

- **WHEN** user references a file that is not ignored (via arguments or natural language)
- **THEN** the skill SHALL warn the user that the file is not ignored and skip adding it

### Requirement: Show existing configuration

The `config` skill SHALL display the current contents of `.worktreeinclude.yaml` when the file already exists and no specific files are mentioned.

#### Scenario: Configuration file already exists without specific files

- **WHEN** user triggers the skill and `.worktreeinclude.yaml` already exists without mentioning specific files
- **THEN** the skill SHALL show the current configuration contents and offer to scan for additional ignored files to add
