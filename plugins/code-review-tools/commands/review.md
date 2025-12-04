---
description: Review code changes commit-by-commit like a human reviewer
argument-hint: <commit-hash>
allowed-tools: test -f
---

# Code Review

Review changes from a starting commit hash to HEAD, analyzing each commit individually and leaving inline comments at specific lines of code, just like a human code reviewer would on a merge request.

## Usage

```bash
/code-review-tools:review <commit-hash>
```

Where `<commit-hash>` is the starting commit to review from (reviews changes from this commit to HEAD).

## Instructions

Parse the `<commit-hash>` from `$ARGUMENTS` and review changes commit-by-commit from that commit to HEAD.

### Step 0: Load Review Configuration

Before reviewing commits, check for custom configuration:

1. **Check for config file:**
   ```bash
   test -f .claude/code-review-config.json && echo "Config found" || echo "No config"
   ```

2. **If config exists, validate and parse it:**
   ```bash
   # Validate JSON syntax
   if ! jq empty .claude/code-review-config.json 2>/dev/null; then
     echo "ERROR: Invalid JSON in .claude/code-review-config.json"
     echo "Falling back to default built-in rules"
     USE_COMPONENT_EXTRACTION=true
     USE_COMPONENT_REUSE=true
     USE_AI_SLOP=true
     CUSTOM_RULES=()
     REPORT_FORMAT="../rules/report-format.md"
   else
     # Parse configuration
     USE_COMPONENT_EXTRACTION=$(jq -r '.builtInRules.componentExtraction // true' .claude/code-review-config.json)
     USE_COMPONENT_REUSE=$(jq -r '.builtInRules.componentReuse // true' .claude/code-review-config.json)
     USE_AI_SLOP=$(jq -r '.builtInRules.aiSlop // true' .claude/code-review-config.json)

     # Get custom rules
     CUSTOM_RULES=($(jq -r '.customRules[]? | select(.enabled != false) | .file' .claude/code-review-config.json))

     # Validate custom rule files
     for rule_file in "${CUSTOM_RULES[@]}"; do
       if [ ! -f ".claude/code-review-rules/$rule_file" ]; then
         echo "WARNING: Custom rule file not found: .claude/code-review-rules/$rule_file"
         echo "  Skipping this rule..."
       fi
     done

     # Get report format
     CUSTOM_FORMAT=$(jq -r '.reportFormat.customFormatFile // empty' .claude/code-review-config.json)
     if [ -n "$CUSTOM_FORMAT" ]; then
       if [ -f ".claude/code-review-rules/$CUSTOM_FORMAT" ]; then
         REPORT_FORMAT=".claude/code-review-rules/$CUSTOM_FORMAT"
       else
         echo "WARNING: Custom report format not found: .claude/code-review-rules/$CUSTOM_FORMAT"
         echo "  Using default format"
         REPORT_FORMAT="../rules/report-format.md"
       fi
     else
       REPORT_FORMAT="../rules/report-format.md"
     fi
   fi
   ```

3. **If no config exists (fallback behavior):**
   ```bash
   echo "INFO: No config found, using all built-in rules"
   USE_COMPONENT_EXTRACTION=true
   USE_COMPONENT_REUSE=true
   USE_AI_SLOP=true
   CUSTOM_RULES=()
   REPORT_FORMAT="../rules/report-format.md"
   ```

4. **Log active configuration:**
   ```bash
   echo "=== Review Configuration ==="
   echo "Built-in Rules:"
   echo "  Component Extraction: $USE_COMPONENT_EXTRACTION"
   echo "  Component Reuse: $USE_COMPONENT_REUSE"
   echo "  AI Slop Detection: $USE_AI_SLOP"
   echo "Custom Rules: ${#CUSTOM_RULES[@]} file(s)"
   for rule_file in "${CUSTOM_RULES[@]}"; do
     echo "  - $rule_file"
   done
   echo "Report Format: $REPORT_FORMAT"
   echo "============================"
   ```

**Error Handling:**
- Invalid JSON → Error message, use all built-in rules (default behavior)
- Missing custom rule file → Warning, skip that rule, continue with others
- Missing custom format → Warning, use default format
- No config file → Use all built-in rules (backward compatible)

### Step 1: Get List of Commits

Run the following command to get all commits in the range:

```bash
git log --oneline <commit-hash>..HEAD
```

This gives you a list of commits to review individually.

### Step 2: Review Each Commit Individually

For each commit in the list (oldest to newest):

1. **Get commit info and files changed:**
   ```bash
   git show <commit-sha> --stat
   ```

2. **Get the full diff for the commit:**
   ```bash
   git show <commit-sha>
   ```

3. **Review the changes** against code review standards and rules

### Step 3: Apply Review Standards

Review each commit following these principles based on [Google's Code Review Standards](https://google.github.io/eng-practices/review/reviewer/standard.html):

**Primary Review Criteria:**
- **Design**: Is the code well-designed and appropriate for the system?
- **Functionality**: Does the code behave as the author intended? Is it good for users?
- **Complexity**: Can other developers understand and use this code easily?
- **Tests**: Does the code have correct and well-designed automated tests?
- **Naming**: Are variables, functions, classes named clearly?
- **Comments**: Are comments clear, useful, and explain *why* rather than *what*?
- **Style**: Does the code follow style guidelines?
- **Documentation**: Are relevant docs updated?

**Additional Rule Sets:**

Apply rules based on the configuration loaded in Step 0:

1. **Built-in Rules (apply if enabled):**
   - If `USE_COMPONENT_EXTRACTION` is true: Apply [Component Extraction Rules](../rules/component-extraction-rules.md)
   - If `USE_COMPONENT_REUSE` is true: Apply [Component Reuse Rules](../rules/component-reuse-rules.md)
   - If `USE_AI_SLOP` is true: Apply [AI Slop Detection Rules](../rules/ai-slop-rules.md)

2. **Custom Rules (from configuration):**
   - For each file in the `CUSTOM_RULES` array:
     - Read the rule file from `.claude/code-review-rules/{filename}`
     - Apply the rules as defined in that markdown file
     - Use the rule's name from config to categorize issues in the report

**Rule Reading Process:**
For each enabled rule file (built-in or custom):
1. Read the entire markdown file
2. Understand the patterns, checks, and examples defined
3. Apply those checks to the commit being reviewed
4. Format issues according to the comment format specified in the rule file

### Step 4: Leave Inline Comments

For each issue found, note:
1. The commit SHA
2. The file path
3. The specific line number(s) where the issue occurs
4. A code snippet showing the problematic code
5. The issue category (Design, Functionality, Complexity, Naming, Style, etc.)
6. A brief, actionable description of the issue

### Step 5: Report Format

Provide output in the report format determined in Step 0:

- Use the format from the `REPORT_FORMAT` variable (set in Step 0)
- If custom format configured: `.claude/code-review-rules/{customFormatFile}`
- Otherwise: Default format from [rules/report-format.md](../rules/report-format.md)

The report format file defines the structure, icons, categories, and tone for the review output.

**Important Guidelines:**
- Review commits in chronological order (oldest to newest)
- Leave comments at specific line numbers with code snippets
- Use emojis for quick visual categorization: 💡 (suggestion), 🧹 (cleanup), ⚠️ (bug/issue), 🎯 (design), ✅ (clean)
- Keep comments concise and actionable (1-2 sentences)
- Show full context for each issue (include enough code to understand the problem)
- Group all issues for a file together under that file's section
- Focus on code health improvements over nitpicking
- Consider the broader system context and maintainability

## Review Philosophy

The standard for code review is that **the code improves the overall code health of the system**, even if it isn't perfect. Reviewers should balance:
- Making forward progress
- Ensuring code quality doesn't degrade over time
- Not requiring perfection from developers

Balance offering suggestions for improvement while approving code that makes things better, even if not perfect.
