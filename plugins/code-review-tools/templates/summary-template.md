# Code Review Summary Template

This template defines the structure and format for the terminal summary output displayed after code review completion.

---

## TEMPLATE START

## Code Review Summary: {commitRange}

| Commits   | Files   | Issues   |
| --------- | ------- | -------- |
| {commits} | {files} | {issues} |

**Review Process:**
- Reviewed {commits} commits using {agentCount} commit-reviewer agents
- Processed in {batchCount} batch(es) (maxConcurrentAgents: {maxConcurrent})
{dedupLine}

**Top Issues:**
{topIssues}

**Key Recommendations:**
{recommendations}

📄 Full report saved to: {outputFile}

## TEMPLATE END

---

## Template Usage Guide

### Available Variables

Replace these placeholders with actual values:

| Variable            | Description                              | Example                                           |
| ------------------- | ---------------------------------------- | ------------------------------------------------- |
| `{commitRange}`     | Git commit range being reviewed          | `abc123..HEAD`                                    |
| `{commits}`         | Total number of commits reviewed         | `14`                                              |
| `{files}`           | Total number of files changed            | `412`                                             |
| `{issues}`          | Total number of issues found             | `5`                                               |
| `{agentCount}`      | Number of commit-reviewer agents spawned | `14`                                              |
| `{batchCount}`      | Number of batches processed              | `3` or `1 batch (unlimited)`                      |
| `{maxConcurrent}`   | Max concurrent agents setting            | `5` or `0`                                        |
| `{dedupLine}`       | Deduplication info (if applicable)       | `- 3 duplicate issue(s) removed`                  |
| `{topIssues}`       | List of top issue categories with counts | See format below                                  |
| `{recommendations}` | List of key actionable recommendations   | See format below                                  |
| `{outputFile}`      | Full path to the saved report file       | `.claude/code-review-reports/branch+timestamp.md` |

### Top Issues Format

List issue categories with emoji icons and counts:

```markdown
- 🧹 AI Slop: 5
- 💡 Missed Component Reuse: 2
- ⚠️ Component Extraction Issues: 1
```

**Guidelines:**
- Show top 2-4 categories (most common issues first)
- Use category icons from the report template
- If no issues found, display: `- ✅ No issues found`

### Recommendations Format

List 1-3 most important actionable recommendations:

```markdown
1. Remove unnecessary disabled={false} props - React treats missing boolean props as false by default
2. Investigate proper types to eliminate double type assertion workarounds
```

**Guidelines:**
- Keep each recommendation to 1 line (no line breaks)
- Be specific and actionable
- Focus on high-impact or recurring issues
- Omit commit references (they're in the full report)

### Deduplication Line

Only include the `{dedupLine}` if duplicates were removed:
- **If duplicates removed**: `- 3 duplicate issue(s) removed`
- **If no duplicates**: Remove the entire line (including the line break)

### Batch Count Format

Format based on `maxConcurrentAgents` setting:
- **If maxConcurrentAgents = 0**: `1 batch (unlimited)`
- **If maxConcurrentAgents > 0**: Calculate batches: `ceil(commits / maxConcurrent)` (e.g., `3`)

---

## Formatting Guidelines

### Keep It Brief

- Summary should be 15-20 lines max (fits in typical terminal view)
- Focus on high-level statistics and key takeaways
- Save details for the full report file

### Use Tables for Stats

- Use markdown tables for structured data (commits/files/issues)
- Keeps format clean and scannable
- Easy to parse programmatically if needed

### Clear File Path

- Always show full relative path to report file
- Use emoji (📄) for visual recognition
- Make it easy to copy-paste the path

### No Prose

- Don't add conversational preambles ("The code review has been completed!")
- Don't add congratulatory messages or closing remarks
- Stick to the structured format for consistency

---

## Complete Example

## Code Review Summary: abc123..HEAD

| Commits | Files | Issues |
| ------- | ----- | ------ |
| 14      | 412   | 5      |

**Review Process:**
- Reviewed 14 commits using 14 commit-reviewer agents
- Processed in 2 batch(es) (maxConcurrentAgents: 10)

**Top Issues:**
- 🧹 AI Slop: 5

**Key Recommendations:**
1. Remove unnecessary disabled={false} props - React treats missing boolean props as false by default
2. Investigate proper types to eliminate double type assertion workarounds

📄 Full report saved to: .claude/code-review-reports/feat-137-ryan-client-upgrade-antd-6+2025-12-05T23-09-36.md

---

## Example with No Issues

## Code Review Summary: feature-123..HEAD

| Commits | Files | Issues |
| ------- | ----- | ------ |
| 5       | 23    | 0      |

**Review Process:**
- Reviewed 5 commits using 5 commit-reviewer agents
- Processed in 1 batch (unlimited) (maxConcurrentAgents: 0)

**Top Issues:**
- ✅ No issues found

**Key Recommendations:**
1. All commits look clean - great work!

📄 Full report saved to: .claude/code-review-reports/feature-123+2025-12-05T15-30-45.md

---

## Example with Deduplication

## Code Review Summary: refactor-auth..HEAD

| Commits | Files | Issues |
| ------- | ----- | ------ |
| 8       | 45    | 12     |

**Review Process:**
- Reviewed 8 commits using 8 commit-reviewer agents
- Processed in 1 batch (unlimited) (maxConcurrentAgents: 0)
- 3 duplicate issue(s) removed

**Top Issues:**
- 💡 Missed Component Reuse: 7
- 🧹 AI Slop: 3
- ⚠️ Component Extraction Issues: 2

**Key Recommendations:**
1. Consolidate repeated auth form patterns into a shared AuthForm component
2. Replace manual user avatar rendering with existing UserAvatar component
3. Fix type definitions for API responses instead of using type assertions

📄 Full report saved to: .claude/code-review-reports/refactor-auth+2025-12-05T18-45-12.md
