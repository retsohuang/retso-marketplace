---
description: Create a pull request for the current branch, or show existing PR info if one already exists
allowed-tools: Bash
model: claude-haiku-4-5
---

# Create Pull Request

Create a pull request for the current branch with auto-generated title and body, or display existing PR info.

## Instructions

### Step 1: Check for Existing PR

Check if a pull request already exists for the current branch:

```bash
PR_INFO=$(gh pr view --json number,url,title,state 2>&1)
PR_EXISTS=$?
```

If a PR exists (`$PR_EXISTS -eq 0`), display the existing PR information and exit:

```markdown
## Existing Pull Request Found

**PR #[number]**: [title]
**URL**: [url]
**State**: [state]

A pull request already exists for this branch.
```

### Step 2: Get Repository and Branch Info

```bash
DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name')
CURRENT_BRANCH=$(git branch --show-current)

if [ -z "$CURRENT_BRANCH" ]; then
  echo "ERROR: Not on a branch. Please checkout a branch first."
  exit 1
fi

if [ "$CURRENT_BRANCH" = "$DEFAULT_BRANCH" ]; then
  echo "ERROR: Cannot create PR from the default branch ($DEFAULT_BRANCH)."
  echo "Please create a feature branch first."
  exit 1
fi
```

### Step 3: Check for Commits

```bash
COMMIT_COUNT=$(git rev-list --count origin/$DEFAULT_BRANCH..HEAD 2>/dev/null || echo "0")

if [ "$COMMIT_COUNT" -eq 0 ]; then
  echo "ERROR: No commits found ahead of $DEFAULT_BRANCH."
  echo "Make some commits first before creating a PR."
  exit 1
fi
```

### Step 4: Gather Commit Information

```bash
COMMITS=$(git log origin/$DEFAULT_BRANCH..HEAD --pretty=format:"- %s" --reverse)
FIRST_COMMIT=$(git log origin/$DEFAULT_BRANCH..HEAD --pretty=format:"%s" --reverse | head -1)
```

### Step 5: Generate PR Title and Body

**Title generation rules**:
1. If there's only one commit, use its subject as the title
2. If there are multiple commits, derive a title from the branch name or summarize the changes

**Body generation**:
- Create a summary section
- List all commits as bullet points
- Add the standard Claude Code footer

Example body format:

```markdown
## Summary

[Brief description based on commits]

## Changes

[List of commits as bullet points]

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

### Step 6: Create the Pull Request

```bash
gh pr create \
  --base "$DEFAULT_BRANCH" \
  --title "$PR_TITLE" \
  --body "$PR_BODY"
```

### Step 7: Display Result

```bash
NEW_PR=$(gh pr view --json number,url,title)
PR_NUMBER=$(echo "$NEW_PR" | jq -r '.number')
PR_URL=$(echo "$NEW_PR" | jq -r '.url')
PR_TITLE=$(echo "$NEW_PR" | jq -r '.title')
```

Output:

```markdown
## Pull Request Created

**PR #[number]**: [title]
**URL**: [url]

The pull request has been created successfully.
```

## Error Handling

Handle common errors gracefully:

```bash
# Not in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "ERROR: Not in a git repository"
  exit 1
fi

# GitHub CLI not authenticated
if ! gh auth status > /dev/null 2>&1; then
  echo "ERROR: GitHub CLI not authenticated"
  echo "Run 'gh auth login' to authenticate"
  exit 1
fi

# Remote doesn't exist
if ! git remote get-url origin > /dev/null 2>&1; then
  echo "ERROR: No 'origin' remote found"
  echo "Add a remote with 'git remote add origin <url>'"
  exit 1
fi
```

## Output Guidelines

- Use markdown formatting for clear output
- Include PR number, title, and URL in results
- Provide actionable error messages
- Keep output concise but informative
