## Context

Claude Code's WorktreeCreate hook receives JSON on stdin with `cwd` (project root) and `name` (worktree slug). The hook must print the absolute worktree path to stdout. WorktreeRemove receives `worktree_path` for cleanup.

Plugins define hooks in `plugin.json` using `${CLAUDE_PLUGIN_ROOT}` to reference bundled scripts. Only `type: "command"` hooks are supported for worktree events.

The existing marketplace has two plugins (code-review-tools, github-tools) that use commands, agents, and skills — but none use hooks yet. This would be the first hook-based plugin.

## Goals / Non-Goals

**Goals:**

- Copy user-specified files from the project root into a new worktree automatically
- Support glob/wildcard patterns in `.worktreeinclude.yaml` (e.g., `.env*`, `config/*.yml`)
- Only copy files that are both listed in `.worktreeinclude.yaml` AND tracked by `.gitignore` (safety: never copy tracked files)
- Use a simple `.worktreeinclude.yaml` YAML config per project
- Be a no-op when `.worktreeinclude.yaml` is absent
- Clean up copied files on worktree removal

**Non-Goals:**

- Templating or variable substitution in copied files
- Watching for config changes after worktree creation
- Supporting non-file resources (databases, services)
- Copying files that are tracked by git (those already exist in the worktree)

## Decisions

### Use a Python script for YAML parsing and glob resolution

The hook scripts delegate to a Python script (`scripts/worktree_bootstrap.py`) that handles:
- JSON parsing from stdin (built-in `json` module)
- YAML parsing of `.worktreeinclude.yaml` (built-in `yaml` module via PyYAML, or simple line parsing since the format is flat)
- Glob pattern resolution (built-in `glob` module)
- `.gitignore` intersection check via `git check-ignore`

Python 3 is available by default on macOS and most Linux distros, making it a safe dependency. This avoids fragile `sed`/`grep` string manipulation.

**Alternative considered:** Shell-only with `sed`/`grep` — rejected because glob expansion and YAML parsing in bash is fragile and error-prone.
**Alternative considered:** Requiring `yq` + `jq` — rejected because neither ships by default on most systems.

### `.worktreeinclude.yaml` format with glob support

```yaml
files:
  - .env*
  - config/secrets.yml
  - "*.local"
```

Each entry can be an exact path or a glob pattern. The Python script expands globs against the project root, then filters results through `git check-ignore` to ensure only gitignored files are copied.

### Only copy files in both `.worktreeinclude.yaml` and `.gitignore`

This is a safety constraint. Files tracked by git already exist in the worktree via `git worktree add`. Copying tracked files would overwrite worktree content. By requiring files to be gitignored, the plugin only handles the gap — files that git intentionally excludes from worktrees.

The check uses `git check-ignore -q <file>` for each resolved file. Files that pass both filters (matched by `.worktreeinclude.yaml` pattern AND ignored by git) get copied.

### Bundle a Python script and thin shell wrappers

The plugin ships:

- `scripts/worktree_bootstrap.py` — main logic: JSON/YAML parsing, glob resolution, gitignore check, file copy
- `scripts/worktree-create.sh` — thin wrapper that pipes stdin to Python script with `create` action
- `scripts/worktree-remove.sh` — thin wrapper that pipes stdin to Python script with `remove` action

Shell wrappers are needed because `plugin.json` hooks use `type: "command"` which runs a shell command.

### Preserve directory structure when copying

When a resolved file is `config/secrets.yml`, the script creates `config/` in the worktree before copying. This ensures nested paths work without manual directory creation.

### WorktreeCreate must still output the worktree path

The hook must create the worktree (via `git worktree add`) and print its path to stdout. The file-copy logic runs after worktree creation but before the path is echoed. This means the plugin fully replaces Claude Code's default worktree creation behavior.

## Risks / Trade-offs

- **Python availability**: While Python 3 is standard on macOS and most Linux, some minimal environments may not have it. → Mitigation: The shell wrapper checks for `python3` and falls back to basic worktree creation (without file copy) if unavailable, logging a warning to stderr.
- **PyYAML not guaranteed**: Python's standard library doesn't include `yaml`. → Mitigation: Use a simple line-based parser for the flat `files:` list format (strip `- ` prefix), avoiding the PyYAML dependency entirely. The format is simple enough that a proper YAML parser isn't strictly necessary for a flat list.
- **File copy failures are silent**: If a file matched by a pattern doesn't exist or can't be copied, the script logs to stderr but continues. → This is intentional; missing optional files (e.g., `.env.local`) shouldn't block worktree creation.
- **Plugin replaces default worktree behavior**: Since WorktreeCreate hooks override Claude Code's built-in logic, the plugin must handle `git worktree add` itself. → Mitigation: Follow Claude Code's default pattern (worktree in `.claude/worktrees/<name>/`).
