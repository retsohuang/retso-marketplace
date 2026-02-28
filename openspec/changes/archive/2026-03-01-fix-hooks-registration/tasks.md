## 1. Move manifest to .claude-plugin/plugin.json

- [x] 1.1 Move `plugins/worktree-bootstrap/plugin.json` to `plugins/worktree-bootstrap/.claude-plugin/plugin.json` — plugin manifest at standard location
- [x] 1.2 Move `plugins/github-tools/plugin.json` to `plugins/github-tools/.claude-plugin/plugin.json`
- [x] 1.3 Move `plugins/code-review-tools/plugin.json` to `plugins/code-review-tools/.claude-plugin/plugin.json`
- [x] 1.4 Commit: `fix(plugins): move manifest to .claude-plugin/plugin.json`

## 2. Extract hooks to hooks/hooks.json

- [x] 2.1 Create `plugins/worktree-bootstrap/hooks/hooks.json` with WorktreeCreate and WorktreeRemove hooks — extract hooks to standard auto-discovery location, ensuring hooks at standard auto-discovery location so WorktreeCreate and WorktreeRemove hooks are registered
- [x] 2.2 Remove the `hooks` key from `plugins/worktree-bootstrap/.claude-plugin/plugin.json`
- [x] 2.3 Commit: `fix(worktree-bootstrap): extract hooks to hooks/hooks.json`
