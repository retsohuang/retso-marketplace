## ADDED Requirements

### Requirement: Plugin manifest at standard location

Every plugin in the marketplace SHALL place its manifest at `.claude-plugin/plugin.json` inside the plugin directory. The manifest MUST NOT be at the plugin root as `plugin.json`.

#### Scenario: Plugin loaded via --plugin-dir

- **WHEN** Claude Code loads a plugin via `claude --plugin-dir ./plugins/<name>`
- **THEN** Claude Code finds the manifest at `./plugins/<name>/.claude-plugin/plugin.json` and reads plugin metadata, skills, commands, agents, and hooks

### Requirement: Hooks at standard auto-discovery location

Plugins with hooks SHALL define them in `hooks/hooks.json` at the plugin root. The hooks file SHALL use the same JSON format as Claude Code's settings hooks, wrapped in a top-level `hooks` key.

#### Scenario: Hooks auto-discovered on plugin load

- **WHEN** Claude Code loads a plugin that has `hooks/hooks.json`
- **THEN** the hooks are registered and fire on their configured events

#### Scenario: WorktreeCreate and WorktreeRemove hooks registered

- **WHEN** the worktree-bootstrap plugin is loaded via `--plugin-dir`
- **THEN** the WorktreeCreate and WorktreeRemove hooks are registered and execute the Python bootstrap scripts
