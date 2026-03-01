## Why

When Claude Code creates a git worktree, essential files like `.env`, `.env.local`, or other project-specific configuration files are not carried over. Developers must manually copy these files every time, which is tedious and error-prone. A plugin that automates this via WorktreeCreate/WorktreeRemove hooks eliminates this friction.

## What Changes

- New plugin `worktree-bootstrap` that registers WorktreeCreate and WorktreeRemove hooks
- WorktreeCreate hook checks for a `.worktreeinclude.yaml` YAML config file in the project root (`cwd`). If the file exists, resolves glob/wildcard patterns, filters to only files that are also in `.gitignore`, and copies matches into the newly created worktree. If the file does not exist, silently skips the copy step
- WorktreeRemove hook cleans up any copied files from the worktree before removal
- The `.worktreeinclude.yaml` file lets users define which files/patterns to copy per project
- Uses a Python script (or CLI tool) for proper YAML parsing and glob resolution — no manual string stripping

## Capabilities

### New Capabilities

- `file-copy-on-create`: Checks for `.worktreeinclude.yaml` in the project root. If present, resolves glob patterns, filters to files also in `.gitignore`, and copies them into the new worktree after WorktreeCreate fires. If absent, silently skips
- `cleanup-on-remove`: Removes copied sensitive files from the worktree when WorktreeRemove fires

### Modified Capabilities

None.

## Impact

- **New plugin directory**: `plugins/worktree-bootstrap/`
- **Marketplace registry**: New entry in `.claude-plugin/marketplace.json`
- **Hook system**: Uses `WorktreeCreate` and `WorktreeRemove` command hooks via `plugin.json`
- **Dependencies**: Python 3 (available on macOS and most Linux by default) for YAML parsing and glob resolution
- **User config**: Optional `.worktreeinclude.yaml` YAML file in the project root. Plugin is a no-op without it
