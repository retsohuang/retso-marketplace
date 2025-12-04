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
- Create `.claude/code-review-config.json` in your project
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

Configuration is stored in `.claude/code-review-config.json` at your project root.

### Config Structure

```json
{
  "version": "1.0.0",
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
  "reportFormat": {
    "customFormatFile": "custom-report-format.md"
  }
}
```

### Config Options

- **version**: Config schema version (currently "1.0.0")
- **builtInRules**: Enable/disable each built-in rule
- **customRules**: Array of custom rule files from `.claude/code-review-rules/`
- **reportFormat**: Optional custom report format override

See [CONFIG-SCHEMA.json](./CONFIG-SCHEMA.json) for the complete schema.

### Manual Configuration

You can edit `.claude/code-review-config.json` directly:

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

## Custom Rules

Custom rules are markdown files stored in `.claude/code-review-rules/` that define:
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
1. Create a markdown file in `.claude/code-review-rules/`
2. Follow the structure of built-in rules (see `rules/` directory)
3. Add it to `.claude/code-review-config.json`

### Example Custom Rules

Common custom rule categories:
- **automation-opportunities.md** - Detect repeated patterns for utilities
- **team-conventions.md** - Project-specific patterns and standards
- **security-checks.md** - Security vulnerabilities (SQL injection, XSS, API keys)
- **performance-patterns.md** - Performance best practices
- **a11y-patterns.md** - Accessibility issues and WCAG compliance
- **testing-standards.md** - Test coverage and quality requirements

## Commands

| Command | Description |
|---------|-------------|
| `/code-review-tools:review <commit-hash>` | Run code review from commit to HEAD |
| `/code-review-tools:init` | Interactive setup for configuration |
| `/code-review-tools:create-rule` | Create custom rules interactively |

## Review Output

Reviews are formatted as markdown with:
- Summary table of all reviewed commits
- Per-commit detailed reviews with inline comments
- Line numbers and code snippets
- Categorized issues with emojis (💡 🧹 ⚠️ 🎯 ✅)
- Final summary with statistics and key recommendations

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
- Check the file exists in `.claude/code-review-rules/`
- Verify it's listed in `.claude/code-review-config.json`
- Ensure `enabled: true` (or field is omitted)
- Check for JSON syntax errors with `jq .claude/code-review-config.json`

**"Invalid JSON" error:**
- Validate your config with: `jq empty .claude/code-review-config.json`
- Check for missing commas, brackets, or quotes
- Review [CONFIG-SCHEMA.json](./CONFIG-SCHEMA.json) for correct structure

**Rule file format questions:**
- Look at existing rules in `plugins/code-review/rules/` for examples
- Follow the same markdown structure
- Include all sections: What to check, Patterns, Comment format, Examples, When NOT to flag

## Files and Directories

```
plugins/code-review/
├── plugin.json              # Plugin metadata
├── README.md                # This file
├── CONFIG-SCHEMA.json       # Configuration schema
├── commands/
│   ├── review.md           # Main review command
│   ├── init.md             # Setup command
│   └── create-rule.md      # Rule creation command
└── rules/
    ├── component-extraction-rules.md
    ├── component-reuse-rules.md
    ├── ai-slop-rules.md
    └── report-format.md

.claude/                     # Your project (not in plugin)
├── code-review-config.json  # Your config
└── code-review-rules/       # Your custom rules
    ├── automation-opportunities.md
    ├── team-conventions.md
    └── security-checks.md
```

## Contributing

To improve this plugin:
1. Built-in rules are in `plugins/code-review/rules/`
2. Commands are in `plugins/code-review/commands/`
3. Follow existing patterns for consistency
4. Test with various commit scenarios

## License

MIT

## Resources

- [Google's Code Review Standards](https://google.github.io/eng-practices/review/reviewer/standard.html)
- [Claude Code Documentation](https://code.claude.com/docs)
- [Plugin Marketplaces Documentation](https://code.claude.com/docs/en/plugin-marketplaces)
