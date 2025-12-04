---
description: Interactive setup for code review configuration and custom rules
---

# Code Review Setup

Initialize code review configuration for your project. This command will guide you through setting up:
- Configuration file (`.claude/code-review-config.json`)
- Built-in rule preferences

## Usage

```bash
/code-review-tools:init
```

No arguments required - the command will guide you through the setup interactively.

## Setup Process

### Step 1: Check Existing Configuration

Check if `.claude/code-review-config.json` already exists:

```bash
if [ -f .claude/code-review-config.json ]; then
  echo "⚠️ Configuration file already exists at .claude/code-review-config.json"
  # Ask user if they want to overwrite or cancel
fi
```

If the file exists, use the AskUserQuestion tool to ask whether to:
- Overwrite (create new config, losing current settings)
- Cancel (keep existing config, exit setup)

### Step 2: Ask About Built-in Rules

Use the AskUserQuestion tool to ask which built-in rules to enable:

**Question 1: "Which built-in rules would you like to enable?"**
- Header: "Built-in Rules"
- MultiSelect: true
- Options:
  1. Component Extraction - "Verify component extraction for proper parity and conditional rendering"
  2. Component Reuse - "Check for missed opportunities to reuse existing components"
  3. AI Slop Detection - "Detect AI-generated patterns inconsistent with codebase style"

**Default**: All three enabled

### Step 3: Generate Configuration File

Create `.claude/` directory if it doesn't exist:

```bash
mkdir -p .claude
```

Generate `.claude/code-review-config.json` based on user selections:

```json
{
  "version": "1.0.0",
  "builtInRules": {
    "componentExtraction": true,  // based on user selection
    "componentReuse": true,        // based on user selection
    "aiSlop": true                // based on user selection
  },
  "customRules": []
}
```

### Step 4: Show Summary

Display a summary of what was created:

```
✅ Setup Complete!

Created:
- .claude/code-review-config.json

Built-in rules enabled:
- ✅ Component Extraction
- ✅ Component Reuse
- ✅ AI Slop Detection

Next steps:
1. Run a review: /code-review-tools:review <commit-hash>
2. Create custom rules: /code-review-tools:create-rule
3. Edit .claude/code-review-config.json to enable/disable rules

Tip: Use /code-review-tools:create-rule to add project-specific review rules.
```

## Error Handling

- If directory creation fails, show clear error message
- If file write fails, show error and partial state
- If user cancels, show cancellation message and clean up partial files

## Notes

- Config file location: `.claude/code-review-config.json`
- Custom rules directory: `.claude/code-review-rules/` (created when you add custom rules)
- Use `/code-review-tools:create-rule` to generate custom rules interactively
- Users can always run this command again to regenerate config
