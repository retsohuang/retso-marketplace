---
description: Review code changes commit-by-commit like a human reviewer
argument-hint: <commit-hash>
allowed-tools: Bash
model: claude-haiku-4-5
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

```bash
# Parse arguments
COMMIT_HASH="$ARGUMENTS"
```

### Step 1: Prepare Review Data

Run the CLI to prepare all review data as a single JSON object:

```bash
if [ -z "$COMMIT_HASH" ]; then
  echo "ERROR: No commit hash provided"
  echo "Usage: /code-review-tools:review <commit-hash>"
  exit 1
fi

REVIEW_DATA=$(node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/cli.js prepare "$COMMIT_HASH" --plugin-root ${CLAUDE_PLUGIN_ROOT})

if [ $? -ne 0 ]; then
  echo "ERROR: Failed to prepare review data"
  echo "$REVIEW_DATA"
  exit 1
fi
```

### Step 2: Invoke Report Writer Agent

Invoke the `report-writer` agent with the prepared JSON data directly. The CLI outputs a structured JSON object containing all necessary artifacts:

```json
{
  "success": true,
  "data": {
    "commits": [...],
    "commitList": ["sha1", "sha2", ...],
    "branch": "feature-branch",
    "commitRange": "abc123..HEAD",
    "totalCommits": 5,
    "rulesContent": "...",
    "reportTemplate": "...",
    "summaryTemplate": "...",
    "outputDirectory": ".claude/code-review-reports",
    "maxConcurrentAgents": 0
  }
}
```

**Agent invocation:**
- Agent name: `report-writer`
- Input: Pass `$REVIEW_DATA` directly as JSON
- Output: Terminal summary (report file is written by the agent)

The agent will handle:
- Parsing the JSON input to extract commits, rules, templates, and config
- Spawning commit-reviewer agents for each commit
- Aggregating and deduplicating results
- Writing the report file
- Returning the terminal summary

### Step 3: Display Results

Simply display the output returned by the report-writer agent. The agent will have already:
- Written the full report to disk
- Included the file path in the terminal summary

```bash
echo "=== Code Review Complete ==="
echo ""
# Display whatever the report-writer returned (terminal summary)
echo "$AGENT_OUTPUT"
```

**Output Behavior:**
- Terminal displays: Brief summary with file path
- File contains: Complete detailed report with all issues and code snippets
- All orchestration happens inside the report-writer agent
