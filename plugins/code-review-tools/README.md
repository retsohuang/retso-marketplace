# Code Review Tools Plugin

Commit-by-commit code review with custom rules support for Claude Code.

## Overview

This plugin provides AI-powered code review capabilities that analyze git commits individually, leaving inline comments at specific lines of code just like a human reviewer would on a merge request.

**Key Features:**
- **Commit-by-commit review**: Analyze changes chronologically from a starting commit to HEAD
- **Built-in rules**: Component extraction verification, reuse opportunities, AI slop detection
- **Custom rules**: Create project-specific review rules interactively
- **Configurable**: Enable/disable rules per project
- **Standards-based**: Follows [Google's Code Review Standards](https://google.github.io/eng-practices/review/reviewer/standard.html)

## Quick Start

### 1. Run a Review

Review all commits from a specific commit hash to HEAD:

```bash
/code-review-tools:review <commit-hash>
```

**Example:**
```bash
/code-review-tools:review abc123
```

### 2. Setup Custom Configuration

First-time setup to configure which rules to use:

```bash
/code-review-tools:init
```

This will:
- Create `.claude/code-review-tools/config.json` in your project
- Let you choose which built-in rules to enable
- Optionally generate example custom rules

### 3. Create Custom Rules

Create project-specific review rules interactively:

```bash
/code-review-tools:create-rule
```

This will guide you through:
- Choosing a rule category (security, performance, team conventions, etc.)
- Defining patterns to detect
- Providing examples
- Automatically adding the rule to your config

## Architecture

This plugin uses a **TypeScript CLI** for robust code processing, compiled to JavaScript and bundled with the plugin for zero-dependency execution.

### Components

```
code-review-tools/
├── commands/         # Slash commands (orchestration)
│   ├── review.md     # Main review command
│   ├── init.md       # Configuration setup
│   └── create-rule.md # Custom rule generator
├── agents/           # Sub-agents for parallel processing
│   ├── commit-reviewer.md  # Reviews individual commits
│   └── report-writer.md    # Aggregates and writes reports
├── scripts/          # TypeScript CLI (compiled to JS)
│   ├── src/          # TypeScript source
│   │   ├── cli.ts    # CLI entry point
│   │   └── commands/ # load-config, collect-commits, build-rules
│   └── dist/         # Compiled JavaScript (committed)
│       └── cli.js    # Single bundled file
└── rules/            # Built-in review rules
    ├── component-extraction-rules.md
    ├── component-reuse-rules.md
    └── ai-slop-rules.md
```

### CLI Usage

The TypeScript CLI can be used standalone:

```bash
# Load configuration
node scripts/dist/cli.js load-config --json

# Collect commits from a range
node scripts/dist/cli.js collect-commits abc123 --json

# Build rules content
node scripts/dist/cli.js build-rules --plugin-root /path/to/plugin --json
```

**Benefits:**
- ✅ **Zero dependencies** for users — compiled JavaScript runs on Node.js (already required by Claude Code)
- ✅ **Type safety** during development with TypeScript
- ✅ **No shell escaping issues** — all logic in TypeScript, not bash
- ✅ **Testable** — comprehensive test suite with Bun
- ✅ **Fast** — ~20ms startup time

## Processing Architecture

The review command uses **parallel sub-agents** for efficient processing of multiple commits:

```
Main Orchestrator
       │
       ├─► Prepare all enabled rules (concatenated)
       │
       ├─► Get list of commits
       │
       ├─► Spawn commit-reviewer agents (batched, parallel)
       │       │
       │       ├─► Agent 1: Review commit 1 with all rules → JSON
       │       ├─► Agent 2: Review commit 2 with all rules → JSON
       │       ├─► Agent 3: Review commit 3 with all rules → JSON
       │       └─► ...
       │
       ├─► Collect all JSON results
       │
       └─► Spawn report-writer agent (Sonnet)
               │
               └─► Generate formatted markdown report
```

**Benefits of this approach:**
- **Simple**: One code path, always parallel
- **Scalable**: Handles 1 commit or 100 commits the same way
- **Performant**: Batched processing respects `maxConcurrentAgents` limit (default: 0 unlimited)
- **Consistent formatting**: Report generation uses Sonnet model for reliable formatting consistency

**Sub-agents:**
- `commit-reviewer` (Sonnet model): Analyzes one commit against all enabled rules, returns JSON
- `report-writer` (Sonnet model): Orchestrates commit-reviewers, aggregates results, writes final report

## Model Configuration

The report-writer agent uses **Claude Sonnet 4.5** for reliable formatting consistency. This ensures generated reports consistently match the template format.

### Cost Considerations

- **Report-writer cost**: ~$0.03-0.10 per review (vs. ~$0.003-0.01 with Haiku)
- **Trade-off**: ~10x cost increase for consistently formatted, production-quality reports
- **Acceptable for**: Most use cases with <100 reviews/day
- **Monitor costs**: For high-frequency usage (100+ reviews/day), track API billing

The quality improvement is worth the cost increase for a production-quality code review tool - consistently formatted reports eliminate manual formatting corrections

## Review Philosophy

The standard for code review is that **the code improves the overall code health of the system**, even if it isn't perfect.

Reviewers should balance:
- Making forward progress
- Ensuring code quality doesn't degrade over time
- Not requiring perfection from developers

Balance offering suggestions for improvement while approving code that makes things better, even if not perfect.

## Built-in Rules

### Component Extraction
Verifies component extraction refactoring:
- **Rule 1: Component Parity** - Ensures extracted components include all sub-components from original implementations
- **Rule 2: Conditional Rendering** - Verifies conditional blocks were present in ALL original files
- **Rule 3: Props/Config Validation** - Checks that page-specific differences are handled via props

### Component Reuse
Detects missed opportunities to reuse existing components:
- **Rule 1: Search Common Components First** - Verify common/ directory before flagging custom implementations
- **Rule 2: Specific Component Usage** - Detect manual implementations that should use shared components
- **Rule 3: Duplicate Implementations** - Find custom versions of standard UI elements
- **Rule 4: Feature Comparison** - Compare feature sets for accessibility, responsive design, error states

### AI Slop Detection
Identifies AI-generated patterns inconsistent with codebase style:
- **Rule 1: Unnecessary Comments** - Obvious explanations, redundant JSDoc
- **Rule 2: Defensive Programming** - Unnecessary try/catch, redundant null checks
- **Rule 3: Type Bypasses** - `as any` casts and excessive type assertions
- **Rule 4: Style Inconsistencies** - Naming conventions, error handling patterns

## Configuration

Configuration is stored in `.claude/code-review-tools/config.json` at your project root.

### Config Structure

```json
{
  "$schema": "${CLAUDE_PLUGIN_ROOT}/config-schema.json",
  "builtInRules": {
    "componentExtraction": true,
    "componentReuse": true,
    "aiSlop": true
  },
  "customRules": [
    {
      "name": "Security Checks",
      "file": "security-checks.md",
      "enabled": true
    }
  ],
  "reports": {
    "template": "custom-report-template.md",
    "summaryTemplate": "custom-summary-template.md",
    "outputDirectory": ".claude/code-review-tools/reports"
  },
  "parallelization": {
    "maxConcurrentAgents": 0
  }
}
```

### Config Options

- **$schema**: Path to JSON Schema for IDE autocomplete/validation (optional)
- **builtInRules**: Enable/disable each built-in rule
- **customRules**: Array of custom rule files from `.claude/code-review-tools/rules/`
- **reports.template**: Custom report template for saved markdown files (optional)
- **reports.summaryTemplate**: Custom summary template for terminal output (optional)
- **reports.outputDirectory**: Where to save detailed markdown reports (default: `.claude/code-review-tools/reports`)
- **parallelization.maxConcurrentAgents**: Max parallel commit-reviewer agents (0=unlimited default, 1-20=batch size)

See [config-schema.json](./config-schema.json) for the complete schema.

### Example Configurations

**Minimal config (disable AI Slop):**
```json
{
  "$schema": "${CLAUDE_PLUGIN_ROOT}/config-schema.json",
  "builtInRules": {
    "componentExtraction": true,
    "componentReuse": true,
    "aiSlop": false
  }
}
```

**Full config with custom rules:**
```json
{
  "$schema": "${CLAUDE_PLUGIN_ROOT}/config-schema.json",
  "builtInRules": {
    "componentExtraction": true,
    "componentReuse": true,
    "aiSlop": true
  },
  "customRules": [
    {
      "name": "Automation Opportunities",
      "file": "automation-opportunities.md",
      "enabled": true
    },
    {
      "name": "Team Conventions",
      "file": "team-conventions.md",
      "enabled": true
    },
    {
      "name": "Security Checks",
      "file": "security-checks.md",
      "enabled": true
    },
    {
      "name": "Performance Patterns",
      "file": "performance-patterns.md",
      "enabled": false
    }
  ],
  "reports": {
    "template": "custom-report-template.md",
    "summaryTemplate": "custom-summary-template.md"
  }
}
```

**Config with parallelization limit:**
```json
{
  "$schema": "${CLAUDE_PLUGIN_ROOT}/config-schema.json",
  "builtInRules": {
    "componentExtraction": true,
    "componentReuse": true,
    "aiSlop": true
  },
  "parallelization": {
    "maxConcurrentAgents": 10
  }
}
```

**Config with custom output directory:**
```json
{
  "$schema": "${CLAUDE_PLUGIN_ROOT}/config-schema.json",
  "builtInRules": {
    "componentExtraction": true,
    "componentReuse": true,
    "aiSlop": true
  },
  "reports": {
    "outputDirectory": ".claude/code-review-tools/reports"
  }
}
```

### Manual Configuration

You can edit `.claude/code-review-tools/config.json` directly:

**Disable a built-in rule:**
```json
"builtInRules": {
  "aiSlop": false
}
```

**Add a custom rule:**
```json
"customRules": [
  {
    "name": "My Custom Rule",
    "file": "my-rule.md",
    "enabled": true
  }
]
```

**Temporarily disable a custom rule:**
```json
{
  "name": "Security Checks",
  "file": "security-checks.md",
  "enabled": false
}
```

**Customize report templates:**
```json
"reports": {
  "template": "my-report-template.md",
  "summaryTemplate": "my-summary-template.md"
}
```

Both template files should be placed in `.claude/code-review-tools/templates/` and follow the structure of the default templates:
- **Report template**: Defines the structure of the full markdown report saved to disk
- **Summary template**: Defines the format of the brief terminal output

See `plugins/code-review-tools/templates/report-template.md` and `plugins/code-review-tools/templates/summary-template.md` for examples and documentation on available variables.

## Custom Rules

Custom rules are markdown files stored in `.claude/code-review-tools/rules/` that define:
- What patterns to check for
- How to detect issues
- Good and bad code examples
- When to flag issues
- When NOT to flag (exceptions)

### Creating Custom Rules

**Interactive (recommended):**
```bash
/code-review-tools:create-rule
```

**Manual:**
1. Create a markdown file in `.claude/code-review-tools/rules/`
2. Follow the structure of built-in rules (see `rules/` directory)
3. Add it to `.claude/code-review-tools/config.json`

### Example Custom Rules

Common custom rule categories:
- **automation-opportunities.md** - Detect repeated patterns for utilities
- **team-conventions.md** - Project-specific patterns and standards
- **security-checks.md** - Security vulnerabilities (SQL injection, XSS, API keys)
- **performance-patterns.md** - Performance best practices
- **a11y-patterns.md** - Accessibility issues and WCAG compliance
- **testing-standards.md** - Test coverage and quality requirements

## Commands

| Command                                   | Description                         |
| ----------------------------------------- | ----------------------------------- |
| `/code-review-tools:review <commit-hash>` | Run code review from commit to HEAD |
| `/code-review-tools:init`                 | Interactive setup for configuration |
| `/code-review-tools:create-rule`          | Create custom rules interactively   |

## Review Output

### Terminal Output

When you run `/code-review-tools:review`, you'll see a concise summary in the terminal:
- Quick statistics: commits reviewed, files changed, issues found
- Review process information (agents used, batching)
- Top issue categories with counts
- Key recommendations (2-3 actionable items)
- File path where full report was saved

The terminal output format can be customized using `reports.summaryTemplate` in your config. See `plugins/code-review-tools/templates/summary-template.md` for the default format and available variables.

**Example terminal output:**
```
## Code Review Summary: abc123..HEAD

| Commits | Files | Issues |
| ------- | ----- | ------ |
| 5       | 12    | 8      |

**Review Process:**
- Reviewed 5 commits using 5 commit-reviewer agents
- Processed in 1 batch (unlimited) (maxConcurrentAgents: 0)

**Top Issues:**
- 🧹 AI Slop: 4
- 💡 Missed Component Reuse: 3

**Key Recommendations:**
1. Remove unnecessary defensive checks
2. Use existing AvatarComponent

📄 Full report saved to: .claude/code-review-tools/reports/feature-auth+2025-12-05T10-30-00.md
```

### Saved Report Files

Full detailed reports are automatically saved to markdown files with:
- Complete summary table of all reviewed commits
- Per-commit detailed reviews with inline comments
- Line numbers and code snippets for every issue
- Categorized issues with emojis (💡 🧹 ⚠️ 🎯 ✅)
- Comprehensive final summary with statistics and key recommendations

**File naming:** `{branch-name}+{timestamp}.md`
- Example: `feature-auth+2025-12-05T10-30-00.md`
- Branch name is sanitized (only alphanumeric and hyphens)

**Default location:** `.claude/code-review-tools/reports/`
- Configurable via `reportOutput.directory` in config
- Directory is created automatically if it doesn't exist
- Add to `.gitignore` if you don't want to commit reports

**Why save to files?**
- Terminal output can be truncated for large reviews
- Files are easy to reference later, share with team, or archive
- Can be committed to the repo for historical record if desired

## Backward Compatibility

**No configuration file:**
- All built-in rules are enabled (default behavior)
- Works exactly as before for existing users

**Empty or minimal configuration:**
- All fields are optional with sensible defaults
- Missing `builtInRules` defaults to all enabled
- Empty `customRules` means no custom rules

**Error handling:**
- Invalid config → falls back to all built-in rules
- Missing custom rule file → warning shown, review continues
- Invalid JSON → error message, uses defaults

## Troubleshooting

**"No config found" message:**
- This is normal if you haven't run `/code-review-tools:init`
- All built-in rules will be used automatically

**Custom rule not being applied:**
- Check the file exists in `.claude/code-review-tools/rules/`
- Verify it's listed in `.claude/code-review-tools/config.json`
- Ensure `enabled: true` (or field is omitted)
- Check for JSON syntax errors with `jq .claude/code-review-tools/config.json`

**"Invalid JSON" error:**
- Validate your config with: `jq empty .claude/code-review-tools/config.json`
- Check for missing commas, brackets, or quotes
- Review [config-schema.json](./config-schema.json) for correct structure

**Rule file format questions:**
- Look at existing rules in `plugins/code-review/rules/` for examples
- Follow the same markdown structure
- Include all sections: What to check, Patterns, Comment format, Examples, When NOT to flag

## Files and Directories

```
plugins/code-review/
├── plugin.json              # Plugin metadata
├── README.md                # This file
├── config-schema.json       # Configuration schema
├── agents/
│   ├── commit-reviewer.md  # Sub-agent: reviews one commit with all rules
│   └── report-writer.md # Sub-agent: orchestrates review, writes report (Sonnet)
├── commands/
│   ├── review.md           # Main review command
│   ├── init.md             # Setup command
│   └── create-rule.md      # Rule creation command
├── rules/
│   ├── component-extraction-rules.md
│   ├── component-reuse-rules.md
│   └── ai-slop-rules.md
└── templates/
    ├── report-template.md   # Template for saved markdown reports
    └── summary-template.md  # Template for terminal output

.claude/                     # Your project (not in plugin)
└── code-review-tools/
    ├── config.json          # Your config
    ├── rules/               # Your custom rules
    │   ├── automation-opportunities.md
    │   ├── team-conventions.md
    │   └── security-checks.md
    ├── templates/           # Your custom templates (optional)
    │   ├── custom-report-template.md
    │   └── custom-summary-template.md
    └── reports/             # Saved review reports (auto-generated)
        ├── main+2025-12-04T14-23-10.md
        ├── feature-auth+2025-12-05T10-30-00.md
        └── bugfix-login+2025-12-05T15-45-22.md
```

## Contributing

### For Users

To improve this plugin:
1. Built-in rules are in `plugins/code-review-tools/rules/`
2. Commands are in `plugins/code-review-tools/commands/`
3. Follow existing patterns for consistency
4. Test with various commit scenarios

### For Developers

The plugin uses a TypeScript CLI for code processing. To contribute:

#### Setup

```bash
cd plugins/code-review-tools/scripts

# Install Bun (one-time)
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install
```

#### Development Workflow

```bash
# Make changes to src/

# Run tests
bun test

# Type check
bun run typecheck

# Build to dist/
bun run build

# Test CLI locally
node dist/cli.js load-config --json
```

#### Before Committing

```bash
# Ensure tests pass
bun test

# Ensure dist/ is up to date
bun run build

# Commit both src/ and dist/
git add src/ dist/
git commit -m "feat: your change"
```

**Important:** Always commit the compiled `dist/` folder. Users run the JavaScript, not TypeScript.

#### CI/CD

GitHub Actions automatically:
- Runs tests on Node.js 18, 20, 22
- Verifies `dist/` matches `src/`
- Fails if `dist/` is out of sync

## License

MIT

## Resources

- [Google's Code Review Standards](https://google.github.io/eng-practices/review/reviewer/standard.html)
- [Claude Code Documentation](https://code.claude.com/docs)
- [Plugin Marketplaces Documentation](https://code.claude.com/docs/en/plugin-marketplaces)
