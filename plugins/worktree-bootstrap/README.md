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

## Limitations

- **Plugin hooks not fired for `--worktree` startup**: When using `claude --worktree`, Claude Code creates the worktree during initialization **before** plugin hooks are registered. The `WorktreeCreate` hook from this plugin is loaded but not yet active at the time the worktree is created, so the default built-in behavior runs instead.

- **Mid-session worktree creation**: The `/worktree` command and `EnterWorktree` tool used mid-session do not fire `WorktreeCreate` hooks at all. Only `claude --worktree` (CLI flag) and `isolation: "worktree"` (subagent config) trigger these hooks.

### Workaround

Until the plugin hook timing is resolved, add the hooks directly to your project's `.claude/settings.json` or `.claude/settings.local.json` (settings are loaded before worktree creation):

```json
{
  "hooks": {
    "WorktreeCreate": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash /path/to/worktree-bootstrap/scripts/worktree-create.sh"
          }
        ]
      }
    ],
    "WorktreeRemove": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash /path/to/worktree-bootstrap/scripts/worktree-remove.sh"
          }
        ]
      }
    ]
  }
}
```

Replace `/path/to/worktree-bootstrap/` with the actual path to the plugin's directory.

## Requirements

- Python 3 (for file copying; falls back to basic worktree creation without it)
- Git
