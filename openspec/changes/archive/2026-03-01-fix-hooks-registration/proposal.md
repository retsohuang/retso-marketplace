## Problem

When the worktree-bootstrap plugin is loaded via `claude --plugin-dir`, the WorktreeCreate and WorktreeRemove hooks are not registered. Skills work (auto-discovered at `skills/`), but hooks are silently ignored.

## Root Cause

Two issues:

1. **Wrong manifest location**: Claude Code expects the plugin manifest at `.claude-plugin/plugin.json`, but all marketplace plugins have `plugin.json` at the root. Without a valid manifest, Claude Code cannot read inline hooks.
2. **No hooks file at default location**: Claude Code auto-discovers hooks at `hooks/hooks.json`, but the plugin defines hooks inline in `plugin.json` at the root — a file Claude Code doesn't look for.

This affects all three marketplace plugins (`worktree-bootstrap`, `github-tools`, `code-review-tools`), but only worktree-bootstrap is visibly broken because it's the only plugin using hooks.

## Proposed Solution

Migrate all plugins to the standard Claude Code plugin directory structure:
- Move `plugin.json` to `.claude-plugin/plugin.json`
- For worktree-bootstrap: extract hooks to `hooks/hooks.json` (standard auto-discovery location)

## Capabilities

### New Capabilities

- `plugin-dir-structure`: Standard plugin directory layout matching Claude Code's expected structure (`.claude-plugin/plugin.json` for manifest, `hooks/hooks.json` for hooks)

### Modified Capabilities

(none)

## Success Criteria

- `claude --plugin-dir ./plugins/worktree-bootstrap` correctly registers WorktreeCreate and WorktreeRemove hooks
- All three plugins load correctly with `--plugin-dir`
- The marketplace CLI install workflow still works after the path change

## Impact

- Affected code: All plugin directories (`plugins/*/`)
