# GitHub Tools

GitHub workflow automation tools for daily development tasks.

## Overview

This plugin provides commands and agents to streamline GitHub-based development workflows, starting with intelligent PR comment analysis.

## Features

- **Quick PR Creation**: Create pull requests with auto-generated titles and descriptions
- **Duplicate Detection**: Automatically checks if a PR already exists before creating
- **Automated PR Comment Analysis**: Analyze review comments and get intelligent recommendations
- **Parallel Processing**: Leverage multiple agents for fast analysis of many comments
- **Smart Categorization**: Automatically categorize feedback as Must Fix / Consider / Can Skip
- **Research-Backed**: Agents can search for best practices to validate technical claims

## Commands

### `/github-tools:create-pull-request`

Creates a pull request for your current branch, or shows existing PR info if one already exists.

**Usage**:
```bash
/github-tools:create-pull-request
```

**What it does**:
1. Checks if a PR already exists for the current branch
2. If exists: displays PR number, URL, title, and state
3. If not exists: auto-generates title and body from commits
4. Creates the PR against the default branch (main/master)

**Output example** (new PR):
```markdown
## Pull Request Created

**PR #42**: feat: add user authentication
**URL**: https://github.com/user/repo/pull/42

The pull request has been created successfully.
```

**Output example** (existing PR):
```markdown
## Existing Pull Request Found

**PR #42**: feat: add user authentication
**URL**: https://github.com/user/repo/pull/42
**State**: open

A pull request already exists for this branch.
```

**Requirements**:
- GitHub CLI (`gh`) installed and authenticated
- Current branch must have commits ahead of the default branch
- Must not be on the default branch (main/master)

---

### `/github-tools:fix-pr-comment`

Analyzes all review comments on your current branch's PR and categorizes them by priority.

**Usage**:
```bash
/github-tools:fix-pr-comment
```

**What it does**:
1. Auto-detects the PR for your current branch
2. Fetches all review comments from GitHub
3. Spawns parallel agents to analyze each comment
4. Returns a prioritized table with verdicts and reasoning

**Output example**:
```markdown
## PR Review Comment Analysis - PR #123

| # | Comment | Author | File | Verdict | Reason |
|---|---------|--------|------|---------|--------|
| 1 | This will throw TypeError... | @senior-dev | UserProfile.tsx:42 | Must Fix | Potential null reference crash |
| 2 | Consider using useMemo... | @team-lead | Dashboard.tsx:87 | Consider | Valid performance optimization |
| 3 | I prefer const over let | @teammate | helpers.ts:15 | Can Skip | Subjective style preference |

### Summary
- Must Fix: 1
- Consider: 1
- Can Skip: 1
```

**Requirements**:
- GitHub CLI (`gh`) installed and authenticated
- Current branch must have an associated PR

## Agents

### `comment-reviewer`

Specialized agent that analyzes a single PR review comment.

**Capabilities**:
- Deep analysis of comment intent and severity
- Web search for best practices and technical verification
- Structured JSON output with verdict and reasoning
- Considers author role, code context, and impact

**Verdict Categories**:
- **Must Fix**: Bugs, security issues, breaking changes, blocking feedback
- **Consider**: Valid improvements, best practices, good suggestions
- **Can Skip**: Style preferences, minor nits, optional enhancements

## Installation

### From Marketplace

```bash
/plugin install github-tools@retso-marketplace
```

### Local Development

```bash
cc --plugin-dir /path/to/retso-marketplace/plugins/github-tools
```

## Prerequisites

- **Claude Code** - Latest version
- **GitHub CLI** (`gh`) - For GitHub API access
  ```bash
  # Install GitHub CLI
  brew install gh  # macOS
  # or visit: https://cli.github.com/

  # Authenticate
  gh auth login
  ```

## How It Works

```
User runs command
    │
    ├── Detects PR via gh CLI
    ├── Fetches all comments via GitHub API
    │
    ├── Spawns comment-reviewer agent per comment (parallel)
    │       ├── Agent 1: Analyzes comment #1
    │       ├── Agent 2: Analyzes comment #2
    │       └── Agent N: Analyzes comment #N
    │
    └── Aggregates results → Markdown table output
```

## Troubleshooting

### "No pull request found for current branch"

Ensure:
- You're on a branch (not `main` or `master`)
- The branch has an associated PR
- Run `gh pr view` to verify PR exists

### "GitHub API rate limit exceeded"

GitHub API has rate limits:
- Authenticated: 5,000 requests/hour
- Unauthenticated: 60 requests/hour

Solution:
```bash
gh auth login
```

## Contributing

Contributions welcome! Please:
1. Test changes with `cc --plugin-dir`
2. Follow existing code style
3. Update README with new features
4. Submit PR with clear description

## License

MIT License - see LICENSE file for details

## Author

Retso Huang (retsohuang@gmail.com)

## Support

- Issues: [GitHub Issues](https://github.com/retsohuang/retso-marketplace/issues)
- Questions: Open a discussion or issue
