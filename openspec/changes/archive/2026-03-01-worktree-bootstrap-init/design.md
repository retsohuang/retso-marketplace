## Context

The worktree-bootstrap plugin copies ignored files to new worktrees based on `.worktreeinclude.yaml`. Users must manually create this file. Other plugins in the marketplace (e.g., `code-review-tools`) demonstrate the skill pattern: a `SKILL.md` file with YAML frontmatter (`name`, `description`, `allowed-tools`) and instructions.

## Goals / Non-Goals

**Goals:**

- Provide a `config` skill that creates and updates `.worktreeinclude.yaml` via natural language
- Support two modes: scan-and-scaffold (no specific files) and add-specific-entries (files mentioned)
- Add a README documenting the plugin
- Follow existing skill conventions from other plugins

**Non-Goals:**

- Modifying the existing hook scripts or Python code
- Validating existing `.worktreeinclude.yaml` for structural correctness

## Decisions

### Use a skill instead of a command

A skill is the right fit because users should be able to trigger this with natural language (e.g., "set up worktree config", "add .env to worktree bootstrap"). The `description` field in `SKILL.md` provides trigger patterns for Claude to match against. This is more discoverable than a slash command.

### Use Bash tool with git commands for detection

The skill will instruct Claude to run `git ls-files --others --ignored --exclude-standard` via the Bash tool to discover ignored files. The `--exclude-standard` flag covers all ignore sources: `.gitignore`, `.git/info/exclude`, and the global gitignore. For validating specific paths, `git check-ignore` is used (which also respects all ignore sources). This is reliable across all git repositories.

### Dual-mode skill via arguments or user intent

When no specific files are provided (no arguments, no files mentioned), the skill scans and scaffolds. When files are provided — either as arguments (e.g., `/worktree-bootstrap:config .env .env.local`) or via natural language — it adds those specific entries. This avoids needing separate skills while keeping UX simple.

## Risks / Trade-offs

- [Large number of ignored files] → The skill presents candidates and lets the user select, rather than adding all automatically
- [Project not a git repository] → The skill relies on git; if not in a git repo, the Bash command will fail and Claude will inform the user
