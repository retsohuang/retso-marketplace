## Context

Claude Code's plugin system expects a specific directory structure:
- Manifest at `.claude-plugin/plugin.json`
- Hooks at `hooks/hooks.json` (auto-discovered)
- Skills at `skills/` (auto-discovered)
- Commands at `commands/` (auto-discovered)

Our marketplace plugins all have `plugin.json` at the plugin root, which Claude Code doesn't look for when using `--plugin-dir`. This means hooks (and any metadata-dependent features) don't load. Skills and commands work because they're at the correct auto-discovery paths.

The CLI also reads from the root `plugin.json` in its build/validate/install scripts.

## Goals / Non-Goals

**Goals:**

- Fix hook registration for worktree-bootstrap when using `--plugin-dir`
- Migrate all three plugins to the standard directory structure
- Update CLI scripts to use the new manifest path
- Maintain backward compatibility for the marketplace CLI install flow

**Non-Goals:**

- Adding hook support to the CLI install flow (separate enhancement)
- Changing the marketplace.json registry format

## Decisions

### Move manifest to .claude-plugin/plugin.json

All plugins will have their manifest at `.claude-plugin/plugin.json` matching Claude Code's expected structure. This is the standard location per the official docs. The root `plugin.json` will be removed.

**Alternative considered:** Keep `plugin.json` at root and add a symlink at `.claude-plugin/plugin.json` — rejected because it adds complexity and the root file serves no purpose once migrated.

### Extract hooks to hooks/hooks.json

For worktree-bootstrap, hooks will be moved from inline `plugin.json` to a separate `hooks/hooks.json` file. This uses Claude Code's auto-discovery mechanism, which works independently of the manifest. The `hooks` key will be removed from the manifest.

**Alternative considered:** Keep hooks inline in the moved `.claude-plugin/plugin.json` — this would also work per the docs, but a separate file follows the standard layout and makes hooks easier to maintain independently.

## Risks / Trade-offs

- [Breaking the custom CLI] → The custom CLI (`cli/`) still reads `plugin.json` at the root. Since the CLI will be removed in favor of native `--plugin-dir` and marketplace installation, this is accepted technical debt.
