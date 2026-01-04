---
description: Review code changes commit-by-commit like a human reviewer
argument-hint: <commit-hash>
allowed-tools: Skill
---

# Code Review

Review changes from a starting commit hash to HEAD, analyzing each commit individually like a human code reviewer would on a merge request.

## Usage

```bash
/code-review-tools:review <commit-hash>
```

Where `<commit-hash>` is the starting commit to review from (reviews changes from this commit to HEAD).

## Instructions

Invoke the `code-review-tools:code-review` skill with the commit hash from `$ARGUMENTS`:

```
/code-review-tools:code-review $ARGUMENTS
```

The skill handles the entire review workflow:

1. Preparing commit data using the CLI
2. Asking which commits to review
3. Loading review rules and analyzing each commit
4. Generating a formatted summary

Pass through all output from the skill without modification.
