# Copilot Instructions for retso-marketplace

This is a Claude Code plugin marketplace containing custom plugins, commands, and agents.

## Architecture Overview

```
retso-marketplace/
├── .claude-plugin/marketplace.json  # Marketplace registry (plugin entries)
├── plugins/                         # Local plugins directory
│   └── code-review-tools/           # Main plugin
│       ├── plugin.json              # Plugin metadata
│       ├── commands/                # Slash commands (*.md)
│       ├── agents/                  # Sub-agents for parallel processing
│       └── rules/                   # Review rule definitions
```

**Key Relationship**: `.claude-plugin/marketplace.json` references plugins via `source` field pointing to `./plugins/<name>`.

## Plugin Development Patterns

### Command Files (`commands/*.md`)

- YAML frontmatter defines metadata: `description`, `argument-hint`, `allowed-tools`, `model`
- Body contains markdown instructions for the AI agent to execute
- Use `$ARGUMENTS` to access user-provided arguments
- Reference other plugin files with relative paths (`../rules/`, `../agents/`)

### Agent Files (`agents/*.md`)

- Frontmatter: `name`, `description`, `tools`, `model` (use `inherit` or specific model like `haiku`)
- Define structured input/output contracts (JSON schemas in the agent body)
- Used for parallel processing via sub-agent invocation

### Rule Files (`rules/*.md`)

- Define review patterns with: what to check, patterns to detect, examples (✅/❌), when to flag, exceptions
- Follow the structure in `rules/ai-slop-rules.md` as the canonical example

## Configuration Schema

User projects configure the code-review-tools plugin via `.claude/code-review-config.json`:

```json
{
  "$schema": "${CLAUDE_PLUGIN_ROOT}/config-schema.json",
  "builtInRules": {
    "componentExtraction": true,
    "componentReuse": true,
    "aiSlop": true
  },
  "customRules": [{ "name": "...", "file": "my-rule.md", "enabled": true }],
  "parallelization": { "maxConcurrentAgents": 5 }
}
```

Custom rules live in `.claude/code-review-rules/` directory. Validate schema against `config-schema.json`.

## Critical Conventions

1. **File naming**: Commands use kebab-case (`create-rule.md`), rules append `-rules.md`
2. **Error handling**: Commands must provide fallback behavior when config is missing/invalid
3. **Backward compatibility**: Missing config = all built-in rules enabled (no breaking changes)
4. **Model selection**: Use `inherit` for heavy analysis, `haiku` for fast aggregation tasks

## Adding New Plugins

1. Create directory under `plugins/<plugin-name>/`
2. Add `plugin.json` with: `name`, `description`, `version`, `author`, `commands` array
3. Register in `.claude-plugin/marketplace.json` plugins array
4. Update `README.md` Available Plugins table

## Review Command Data Flow

```
review.md → loads config → spawns commit-reviewer agents (parallel, batched)
         → collects JSON results → spawns report-aggregator (haiku)
         → outputs final markdown report
```

Sub-agents return structured JSON, not markdown. The aggregator transforms JSON to formatted output.
