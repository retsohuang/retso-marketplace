---
description: Analyze PR review comments and categorize what needs fixing
allowed-tools: Bash, Task
model: claude-haiku-4-5
---

# Fix PR Comment

Analyze all review comments on the current branch's pull request, using parallel agents to determine which comments require action and which can be skipped.

## Usage

```bash
/github-tools:fix-pr-comment
```

## Instructions

### Step 1: Detect Current PR

Get the PR number and basic info for the current branch:

```bash
PR_INFO=$(gh pr view --json number,url,title 2>&1)

if [ $? -ne 0 ]; then
  echo "ERROR: No pull request found for current branch"
  echo "Make sure you're on a branch with an associated PR"
  exit 1
fi

PR_NUMBER=$(echo "$PR_INFO" | jq -r '.number')
PR_URL=$(echo "$PR_INFO" | jq -r '.url')
PR_TITLE=$(echo "$PR_INFO" | jq -r '.title')

echo "Analyzing PR #$PR_NUMBER: $PR_TITLE"
echo "URL: $PR_URL"
echo ""
```

### Step 2: Fetch Review Comments

```bash
REPO_INFO=$(gh repo view --json nameWithOwner)
REPO=$(echo "$REPO_INFO" | jq -r '.nameWithOwner')

COMMENTS=$(gh api "/repos/$REPO/pulls/$PR_NUMBER/comments" --jq '[.[] | {
  id: .id,
  author: .user.login,
  body: .body,
  path: .path,
  line: .line,
  created_at: .created_at,
  html_url: .html_url
}]')

COMMENT_COUNT=$(echo "$COMMENTS" | jq 'length')

if [ "$COMMENT_COUNT" -eq 0 ]; then
  echo "No review comments found on this PR."
  exit 0
fi

echo "Found $COMMENT_COUNT review comments. Analyzing..."
echo ""
```

### Step 3: Spawn Parallel Comment Reviewer Agents

For each comment, spawn a `comment-reviewer` agent to analyze it in parallel.

The command should:
1. Parse the comments JSON array
2. For each comment, invoke the Task tool with subagent_type="comment-reviewer"
3. Pass the comment data to each agent
4. Collect all agent outputs

Example agent invocation for a comment:

```
For comment: {comment data}

Spawn agent with:
- subagent_type: "comment-reviewer"
- description: "Analyze comment #{index}"
- prompt: "Analyze this PR review comment and determine if it should be fixed:

Comment: {comment.body}
Author: @{comment.author}
File: {comment.path}
Line: {comment.line}
URL: {comment.html_url}

Return JSON with verdict, reason, author, commentPreview, and optional researchInsights."
```

**Important**: Spawn ALL agents in parallel in a single message using multiple Task tool calls.

### Step 4: Aggregate Results

After all agents complete:
1. Parse each agent's JSON output
2. Sort by verdict priority (Must Fix → Consider → Can Skip)
3. Format as markdown table with row numbers

### Step 5: Display Results

Output the analysis in a formatted markdown table:

```markdown
## PR Review Comment Analysis - PR #{PR_NUMBER}

**PR**: {PR_TITLE}
**URL**: {PR_URL}
**Total Comments**: {COMMENT_COUNT}

| # | Comment | Author | File | Verdict | Reason |
|---|---------|--------|------|---------|--------|
| 1 | {truncated comment} | @author | path/to/file.ts:42 | Must Fix | {reason} |
| 2 | {truncated comment} | @author | path/to/file.ts:87 | Consider | {reason} |
| 3 | {truncated comment} | @author | path/to/file.ts:15 | Can Skip | {reason} |

### Summary

- **Must Fix**: {count}
- **Consider**: {count}
- **Can Skip**: {count}

### Research Insights

{If any agents performed research, include their insights here}
```

## Output Guidelines

- **Truncate comments**: Show first 60 chars in table, full text in reason if needed
- **File paths**: Show relative path with line number
- **Sort order**: Must Fix → Consider → Can Skip
- **Numbering**: Sequential from 1
- **Research**: Only include if agents performed WebSearch

## Error Handling

Handle common errors gracefully:

```bash
# No PR found
if [ $? -ne 0 ]; then
  echo "ERROR: No pull request found for current branch"
  echo "Run 'gh pr create' to create a PR first"
  exit 1
fi

# API rate limit
if echo "$COMMENTS" | grep -q "rate limit"; then
  echo "ERROR: GitHub API rate limit exceeded"
  echo "Wait a few minutes or authenticate with 'gh auth login'"
  exit 1
fi

# Agent failures
# If an agent fails to return valid JSON, mark as error in the table
```
