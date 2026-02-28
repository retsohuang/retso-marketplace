## 1. Create Skill

- [x] 1.1 Create `plugins/worktree-bootstrap/skills/config/SKILL.md` with YAML frontmatter (name, description with trigger patterns, allowed-tools: Bash Read Write) — use a skill instead of a command for natural language triggering
- [x] 1.2 Write skill instructions to initialize worktreeinclude configuration and manage it: handle dual-mode skill via arguments or user intent — accept file paths as arguments (e.g., `/worktree-bootstrap:config .env`) or from natural language, scan for ignored files when no specific files provided (use Bash tool with git commands for detection), or add entries to existing configuration when files are provided, and show existing configuration when file exists without specific files
- [x] 1.3 Commit: `feat(worktree-bootstrap): add config skill`

## 2. Register Skill in Plugin

- [x] 2.1 Update `plugins/worktree-bootstrap/plugin.json` to add `skills` array referencing `./skills/config`
- [x] 2.2 Commit: `feat(worktree-bootstrap): register config skill in plugin.json`

## 3. Plugin README

- [x] 3.1 Create `plugins/worktree-bootstrap/README.md` with plugin readme documentation: purpose, installation, `.worktreeinclude.yaml` format with examples, and config skill usage with natural language examples
- [x] 3.2 Commit: `docs(worktree-bootstrap): add README`
