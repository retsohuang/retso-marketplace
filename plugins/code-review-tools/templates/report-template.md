# Code Review Report Template

---

## Code Review: {commitRange}

### Commits Reviewed

| #   | Commit | Message | Files Changed | Issues Found |
| --- | ------ | ------- | ------------- | ------------ |
| {N} | {sha7} | {msg}   | {files}       | {issues}     |

---

### Commit {N}: `{sha7}` - {message}

#### `{filepath}`

**Line {start}-{end}:**
```{lang}
{codeSnippet}
```
> **{icon} {category}**: {description}. {suggestion}.

---

### Commit {M}: `{sha7}` - {message}

✅ No issues found.

---

## Summary

- **Total commits reviewed**: {N}
- **Commits with issues**: {M}
- **Total comments**: {X}
  - {Category1}: {count1}
  - {Category2}: {count2}

### Key Recommendations

1. **Commit {sha}**: {issue summary and fix}
