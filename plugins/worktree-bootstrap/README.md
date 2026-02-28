# worktree-bootstrap

Automatically copy gitignored files (like `.env`, credentials, local configs) to new Claude Code worktrees.

## Installation

Install via the [retso-marketplace](https://github.com/retsohuang/retso-marketplace) CLI:

```bash
npx retso-marketplace install worktree-bootstrap
```

## How It Works

When you create a worktree in Claude Code, this plugin:

1. Creates the git worktree at `.claude/worktrees/<name>/`
2. Reads `.worktreeinclude.yaml` from your project root
3. Copies matching gitignored files into the new worktree

When a worktree is removed, it cleans up via `git worktree remove`.

## Configuration

Create a `.worktreeinclude.yaml` file in your project root listing files to copy:

```yaml
files:
  - .env
  - .env.local
  - config/secrets.json
```

Glob patterns are supported:

```yaml
files:
  - .env.*
  - config/*.key
```

Only files that are gitignored (via `.gitignore`, `.git/info/exclude`, or global gitignore) will be copied. Tracked files are skipped.

## Configure Skill

Use the `configure` skill to create or update `.worktreeinclude.yaml`:

```
# Scaffold config by scanning for ignored files
/worktree-bootstrap:configure

# Add specific files
/worktree-bootstrap:configure .env .env.local

# Or use natural language
"add .env.production to worktree bootstrap"
"set up worktree config"
```

## Requirements

- Python 3 (for file copying; falls back to basic worktree creation without it)
- Git
