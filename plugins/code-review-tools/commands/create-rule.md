---
description: Interactively create a custom code review rule
argument-hint: Brief description of what this rule should check for
model: claude-opus-4-5
allowed-tools: Bash, Read, Write, AskUserQuestion
---

# Create Custom Rule

Create a new custom code review rule interactively. This command will guide you through defining:
- What patterns to check for
- How to detect issues
- How to format review comments
- Examples of good and bad code

## Usage

```bash
/code-review-tools:create-rule
```

No arguments required - the command will guide you through the rule creation process.

## Rule Creation Process

### Step 1: Check Prerequisites

1. **Check if `.claude/code-review-tools/rules/` directory exists:**
   ```bash
   if [ ! -d .claude/code-review-tools/rules ]; then
     echo "⚠️  Custom rules directory doesn't exist yet."
     echo "Would you like to:"
     echo "  1. Create the directory now"
     echo "  2. Run /code-review-tools:init first (recommended for first-time setup)"
   fi
   ```

2. **Check if `.claude/code-review-tools/config.json` exists:**
   ```bash
   if [ ! -f .claude/code-review-tools/config.json ]; then
     echo "⚠️  No configuration file found."
     echo "Creating basic configuration..."
     # Create minimal config
   fi
   ```

### Step 2: Gather Rule Information

Use the AskUserQuestion tool to collect information about the rule:

**Question 1: "What category does this rule belong to?"**
- Header: "Category"
- MultiSelect: false
- Options:
  1. Code Quality - "General code quality and maintainability"
  2. Security - "Security vulnerabilities and unsafe patterns"
  3. Performance - "Performance issues and optimizations"
  4. Team Conventions - "Project-specific patterns and standards"
  5. Accessibility - "Accessibility issues and WCAG compliance"
  6. Testing - "Test coverage and quality"

**Question 2: "What should this rule be called?"**
- Use AskUserQuestion or prompt for text input
- Validation: lowercase, kebab-case, alphanumeric with hyphens
- Example: "automation-opportunities", "security-checks", "a11y-patterns"

**Question 3: "What does this rule check for? (Brief description)"**
- Free-form text input
- This will be the rule's main description

**Question 4: "Do you have specific code patterns to detect?"**
- Header: "Patterns"
- MultiSelect: false
- Options:
  1. Yes, I'll provide examples - "I can show examples of good and bad code"
  2. No, general guidelines only - "I'll describe what to look for in text"

### Step 3: Collect Pattern Examples (if applicable)

If user chose to provide examples, ask for:
- Bad pattern example (what NOT to do)
- Good pattern example (what TO do)
- When to flag this pattern
- When NOT to flag (exceptions)

### Step 4: Generate Rule File

Based on the collected information, generate a complete rule markdown file:

**File structure:**

```markdown
# [Rule Name]

[Description from user]

## Rule 1: [First Pattern/Check]

**What to check**: [Description of what to look for]

[If user provided examples:]
**Patterns to detect**:

### 1.1 [Pattern Name]
```[language]
// ❌ Bad pattern
[user's bad example]

// ✅ Good pattern
[user's good example]
```

**What to flag**: [When to flag this issue]

---

## Comment Format

When flagging issues from this rule set:

```markdown
**Line X-Y:**
```[language]
{/* problematic code */}
```
> **[Icon] [Category]**: [Brief description]. [Suggestion to fix].
```

**Icon and Category:**
- Use appropriate emoji: 💡 (suggestion), 🧹 (cleanup), ⚠️ (bug/issue), 🎯 (design), 🔒 (security), ⚡ (performance), ♿ (accessibility), 🧪 (testing)
- Category name: "[Rule Name]"

## Examples

[Generate example using user's patterns if provided]

## When NOT to Flag

[Use user's exceptions if provided, or generate common sense exceptions]

Don't flag this rule if:
1. [Exception 1]
2. [Exception 2]
3. [Exception 3]
```

**Example generated file** (automation-opportunities.md):

```markdown
# Automation Opportunities

Identify repetitive patterns that could be automated or abstracted into utilities.

## Rule 1: Repeated Logic

**What to check**: Same logic appearing in multiple places.

**Patterns to detect**:

### 1.1 Duplicate Code
```tsx
// ❌ Repeated in multiple files
const fullName = `${user.firstName} ${user.lastName}`;

// ✅ Extract to utility function
const fullName = formatUserFullName(user);
```

**What to flag**: Same logic appearing in 2+ files.

---

## Comment Format

```markdown
**Line X-Y:**
```tsx
{/* repeated code */}
```
> **💡 Automation Opportunity**: This logic appears in [X other files]. Consider extracting to a utility function.
```

## Examples

### Example 1: Duplicate String Formatting

```markdown
**Line 23-25:**
```tsx
const name = `${user.firstName} ${user.lastName}`;
```
> **💡 Automation Opportunity**: This name formatting appears in 3 other files. Extract to `formatUserFullName(user)`.
```

## When NOT to Flag

Don't flag if:
1. Logic is a simple one-liner that's clearer inline
2. Code is context-specific to that component
3. Refactoring would increase complexity
```

### Step 5: Write File

1. **Validate filename:**
   ```bash
   # Convert to kebab-case if not already
   # Ensure .md extension
   # Check if file already exists
   ```

2. **Write to `.claude/code-review-tools/rules/{rule-name}.md`:**
   ```bash
   cat > .claude/code-review-tools/rules/${RULE_NAME}.md <<'EOF'
   [Generated rule content]
   EOF
   ```

3. **Verify file was created:**
   ```bash
   if [ -f .claude/code-review-tools/rules/${RULE_NAME}.md ]; then
     echo "✅ Rule file created successfully"
   else
     echo "❌ Failed to create rule file"
     exit 1
   fi
   ```

### Step 6: Update Configuration

Automatically add the new rule to `.claude/code-review-tools/config.json`:

1. **Read current config:**
   ```bash
   current_config=$(cat .claude/code-review-tools/config.json)
   ```

2. **Add new rule to customRules array:**
   ```bash
   updated_config=$(echo "$current_config" | jq '.customRules += [{
     "name": "'"${RULE_DISPLAY_NAME}"'",
     "file": "'"${RULE_NAME}.md"'",
     "enabled": true
   }]')
   ```

3. **Write updated config:**
   ```bash
   echo "$updated_config" | jq '.' > .claude/code-review-tools/config.json
   ```

### Step 7: Show Summary and Next Steps

Display a summary of what was created:

```
✅ Custom Rule Created!

Rule file: .claude/code-review-tools/rules/[rule-name].md
Category: [Category]
Status: Enabled

The rule has been automatically added to your configuration.

Next steps:
1. Review and customize the rule file:
   - Add more specific patterns
   - Refine the examples
   - Add more "When NOT to Flag" cases

2. Test the rule by running a review:
   /code-review-tools:review <commit-hash>

3. Disable the rule temporarily (edit .claude/code-review-tools/config.json):
   "enabled": false

4. Create more rules:
   /code-review-tools:create-rule

Tip: Check existing rules in plugins/code-review/rules/ for inspiration.
```

## Advanced Options

For power users, optionally ask:

**"Would you like to add verification commands?"**
- e.g., `grep`, `rg`, or `git` commands to help identify patterns
- Include in the "How to verify" section

**"What severity level?"**
- Error (critical issues that must be fixed)
- Warning (issues that should be addressed)
- Info (suggestions for improvement)

## Error Handling

- **Directory doesn't exist**: Offer to create or suggest `/code-review-tools:init`
- **File already exists**: Ask to overwrite, rename, or cancel
- **Invalid rule name**: Show validation error and ask again
- **Config update fails**: Show error but keep the rule file

## Validation Rules

**Rule name:**
- Lowercase letters, numbers, hyphens only
- Must start with a letter
- No consecutive hyphens
- 3-50 characters long
- Must end with `.md` extension

**Examples:**
- ✅ `automation-opportunities.md`
- ✅ `security-checks.md`
- ✅ `a11y-patterns.md`
- ❌ `My Rule.md` (spaces, capital letters)
- ❌ `-invalid.md` (starts with hyphen)
- ❌ `rule--name.md` (consecutive hyphens)

## Notes

- Generated rules follow the same structure as built-in rules
- Users can manually edit the generated file afterward
- The rule is immediately active (enabled: true by default)
- Multiple rules can be created - run this command multiple times
- Rules are project-specific (stored in `.claude/` directory)
