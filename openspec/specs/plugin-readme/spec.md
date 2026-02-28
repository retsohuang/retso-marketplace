## Purpose

Documentation requirements for the worktree-bootstrap plugin README.

## Requirements

### Requirement: Plugin README documentation

The plugin SHALL include a `README.md` file documenting the plugin's purpose, installation steps, the `.worktreeinclude.yaml` configuration format, and the `config` command usage with examples.

#### Scenario: User reads README for setup guidance

- **WHEN** a user views the plugin's README
- **THEN** they find documentation covering: what the plugin does, how to install it, the config file format with examples, and how to use the `/worktree-bootstrap:config` command

<!-- @trace
source: worktree-bootstrap-init
updated: 2026-03-01
code:
  - plugins/code-review-tools/plugin.json
  - plugins/github-tools/plugin.json
  - plugins/worktree-bootstrap/hooks/hooks.json
  - plugins/worktree-bootstrap/README.md
  - plugins/code-review-tools/.claude-plugin/plugin.json
  - plugins/github-tools/.claude-plugin/plugin.json
  - plugins/worktree-bootstrap/plugin.json
  - plugins/worktree-bootstrap/skills/configure/SKILL.md
  - plugins/worktree-bootstrap/.claude-plugin/plugin.json
-->