<!-- SPECTRA:START v1.0.0 -->

# Spectra Instructions

This project uses Spectra for Spec-Driven Development(SDD). Specs live in `openspec/specs/`, change proposals in `openspec/changes/`.

## Use `/spectra:*` skills when:

- A discussion needs structure before coding → `/spectra:discuss`
- User wants to plan, propose, or design a change → `/spectra:propose`
- Tasks are ready to implement → `/spectra:apply`
- There's an in-progress change to continue → `/spectra:ingest`
- User asks about specs or how something works → `/spectra:ask`
- Implementation is done → `/spectra:archive`

## Workflow

discuss? → propose → apply ⇄ ingest → archive

- `discuss` is optional — skip if requirements are clear
- Requirements change mid-work? Plan mode → `ingest` → resume `apply`

<!-- SPECTRA:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Retso Marketplace is a custom plugin marketplace for Claude Code, containing plugins and the marketplace registry.

## Version Bumping

Only bump versions when explicitly requested.

## Architecture

```
.claude-plugin/marketplace.json  # Plugin registry (references plugins via source field)
plugins/
  ├── code-review-tools/         # Commit-by-commit code review
  ├── github-tools/              # PR creation and comment analysis
  └── worktree-bootstrap/        # Auto-copy gitignored files to new worktrees
```

**Key relationship**: `.claude-plugin/marketplace.json` entries have a `source` field pointing to `./plugins/<name>`.

## Plugin Structure

Each plugin contains:
- `.claude-plugin/plugin.json` - Metadata: name, version, commands[], agents[], skills[]
- `commands/*.md` - Slash commands with YAML frontmatter (description, allowed-tools, model)
- `agents/*.md` - Sub-agents for parallel processing with JSON input/output contracts
- `skills/*/SKILL.md` - Auto-invoked skills with their own scripts/assets

## Adding a New Plugin

1. Create `plugins/<name>/` with `.claude-plugin/plugin.json`
2. Add entry to `.claude-plugin/marketplace.json` plugins array
3. Update root `README.md` Available Plugins table
