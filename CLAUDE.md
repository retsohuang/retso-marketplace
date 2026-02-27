# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Retso Marketplace is a custom plugin marketplace for Claude Code. It's a Bun monorepo containing plugins, a CLI installer, and the marketplace registry.

## Version Bumping

Only bump versions when explicitly requested.

## Architecture

```
.claude-plugin/marketplace.json  # Plugin registry (references plugins via source field)
cli/                             # React + Ink terminal UI for plugin installation
plugins/
  ├── code-review-tools/         # Commit-by-commit code review
  └── github-tools/              # PR creation and comment analysis
```

**Key relationship**: `.claude-plugin/marketplace.json` entries have a `source` field pointing to `./plugins/<name>`.

## Plugin Structure

Each plugin contains:
- `plugin.json` - Metadata: name, version, commands[], agents[], skills[]
- `commands/*.md` - Slash commands with YAML frontmatter (description, allowed-tools, model)
- `agents/*.md` - Sub-agents for parallel processing with JSON input/output contracts
- `skills/*/SKILL.md` - Auto-invoked skills with their own scripts/assets

## Adding a New Plugin

1. Create `plugins/<name>/` with `plugin.json`
2. Add entry to `.claude-plugin/marketplace.json` plugins array
3. Update root `README.md` Available Plugins table
