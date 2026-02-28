## 1. Plugin Scaffold

- [x] 1.1 Create `plugins/worktree-bootstrap/plugin.json` with hooks for WorktreeCreate and WorktreeRemove using `${CLAUDE_PLUGIN_ROOT}/scripts/` paths
- [x] 1.2 Add worktree-bootstrap entry to `.claude-plugin/marketplace.json`
- [x] 1.3 Update root `README.md` Available Plugins table

## 2. Python Script (worktree_bootstrap.py)

- [x] 2.1 Implement JSON stdin parsing for `cwd`, `name`, and `worktree_path` fields
- [x] 2.2 Implement config file format parsing for `.worktreeinclude.yaml` format with glob support — use a Python script for YAML parsing and glob resolution with standard library only
- [x] 2.3 Implement glob pattern resolution expanding entries against the project root
- [x] 2.4 Implement gitignore intersection filter using `git check-ignore` to only copy files in both `.worktreeinclude.yaml` and `.gitignore`
- [x] 2.5 Implement directory structure preservation — preserve directory structure when copying by creating parent directories before copying nested files
- [x] 2.6 Implement worktree creation with file copy — `git worktree add`, copy files; WorktreeCreate must still output the worktree path to stdout
- [x] 2.7 Implement worktree removal with cleanup — `git worktree remove` on the given `worktree_path`
- [x] 2.8 Handle no decision control on removal — log errors to stderr, always exit 0

## 3. Shell Wrappers

- [x] 3.1 Bundle a Python script and thin shell wrappers — create `scripts/worktree-create.sh` for Python-based implementation: check for python3, delegate to `worktree_bootstrap.py create`, fall back to basic worktree creation if unavailable
- [x] 3.2 Create `scripts/worktree-remove.sh` — thin shell wrapper that delegates to `worktree_bootstrap.py remove`, handles cleanup failure as non-blocking
- [x] 3.3 Make both shell scripts executable (`chmod +x`)

## 4. Testing

- [x] 4.1 Test worktree created with `.worktreeinclude.yaml` present — verify files are copied
- [x] 4.2 Test worktree created without `.worktreeinclude.yaml` — verify no-op behavior
- [x] 4.3 Test glob matches multiple files and glob matches no files scenarios
- [x] 4.4 Test file in `.worktreeinclude.yaml` but tracked by git is NOT copied
- [x] 4.5 Test file in `.worktreeinclude.yaml` but does not exist — verify warning logged, no error
- [x] 4.6 Test worktree removal and worktree path does not exist scenarios
