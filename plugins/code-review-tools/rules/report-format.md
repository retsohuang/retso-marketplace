# Code Review Report Format

This document defines the output format for code review results.

## Overall Structure

```markdown
## Code Review: <commit-hash>..HEAD

### Commits Reviewed

[Summary table of all commits]

---

### Commit N: `<sha>` - <message>

[Issues found in this commit, organized by file]

---

## Summary

[Overall statistics and key recommendations]
```

## 1. Header

Start with the commit range being reviewed:

```markdown
## Code Review: abc123..HEAD
```

## 2. Commits Summary Table

Provide a table summarizing all reviewed commits:

```markdown
### Commits Reviewed

| # | Commit | Message                 | Files Changed | Issues Found |
|---|--------|-------------------------|---------------|--------------|
| 1 | abc123 | Add feature X           | 3             | 2            |
| 2 | def456 | Refactor component Y    | 5             | 1            |
| 3 | 789ghi | Extract shared logic    | 2             | 0            |
```

**Columns**:
- `#`: Sequential number (oldest = 1)
- `Commit`: Short SHA (7 characters)
- `Message`: First line of commit message (truncate if > 50 chars)
- `Files Changed`: Number of files modified in the commit
- `Issues Found`: Total issues found in this commit

## 3. Per-Commit Reviews

For each commit, use this format:

```markdown
---

### Commit 1: `abc123` - Add feature X

#### `path/to/file.tsx`

**Line X-Y:**
```tsx
{/* code snippet */}
```
> **[Icon] [Category]**: [Issue description]. [Suggestion].

**Line Z:**
```tsx
{/* another code snippet */}
```
> **[Icon] [Category]**: [Issue description]. [Suggestion].

#### `path/to/another-file.tsx`

[Issues in this file...]
```

### Icons and Categories

Use these emoji icons for visual categorization:

| Icon | Category | Usage |
|------|----------|-------|
| ⚠️ | Component Extraction Issue | Problems with shared component extraction |
| 💡 | Missed Component Reuse | Opportunities to use existing components |
| 🧹 | AI Slop | AI-generated patterns to remove |
| 🐛 | Bug | Actual bugs or errors |
| ⚡ | Performance | Performance improvements |
| 📝 | Documentation | Missing or incorrect documentation |
| ♻️ | Refactoring | Code that should be refactored |
| ✅ | Clean | No issues found |

### Issue Format

Each issue should include:

1. **Line range**: The specific lines where the issue occurs
2. **Code snippet**: Relevant code showing the issue (3-10 lines of context)
3. **Category with icon**: Clear categorization with visual indicator
4. **Description**: Brief explanation of what's wrong (1-2 sentences)
5. **Suggestion**: Actionable recommendation to fix it (1 sentence)

**Example**:

```markdown
**Line 45-48:**
```tsx
{kols.map((kol) => (
  <div key={kol.id}>
    <KolThumbnail kol={kol} />
  </div>
))}
```
> **💡 Missed Component Reuse**: Consider using `KolThumbnailGroup` from `@/components/common/kol-thumbnail-group` instead of manual mapping. It provides blur support, tooltips, click handlers, and proper spacing.
```

### Clean Commits

If a commit has no issues, mark it as clean:

```markdown
---

### Commit 3: `789ghi` - Extract shared logic

✅ No issues found.
```

## 4. Final Summary

End with a summary section:

```markdown
---

## Summary

- **Total commits reviewed**: 3
- **Commits with issues**: 2
- **Total comments**: 4
  - Component Extraction Issues: 1
  - Missed Component Reuse: 1
  - AI Slop: 2

### Key Recommendations

1. **Commit abc123**: [Brief summary of main issue and fix]
2. **Commit abc123**: [Another issue and fix from same commit]
3. **Commit def456**: [Issue and fix from different commit]
```

### Summary Statistics

Include these metrics:
- Total commits reviewed
- Commits with issues (vs. clean commits)
- Total comments/issues found
- Breakdown by category

### Key Recommendations

List top 3-5 most important issues with:
- Commit identifier
- Brief issue description
- Recommended action

**Format**: `**Commit <sha>**: [Issue description and suggested fix]`

## Example Complete Report

```markdown
## Code Review: a1b2c3d..HEAD

### Commits Reviewed

| # | Commit | Message | Files Changed | Issues Found |
|---|--------|---------|---------------|--------------|
| 1 | a1b2c3d | Add KOL analytics dashboard | 3 | 2 |
| 2 | e4f5g6h | Extract shared overview component | 5 | 1 |
| 3 | i7j8k9l | Update styling for mobile | 2 | 0 |

---

### Commit 1: `a1b2c3d` - Add KOL analytics dashboard

#### `pages/kol/analytics.tsx`

**Line 45-48:**
```tsx
{kols.map((kol) => (
  <div key={kol.id}>
    <KolThumbnail kol={kol} />
  </div>
))}
```
> **💡 Missed Component Reuse**: Consider using `KolThumbnailGroup` from `@/components/common/kol-thumbnail-group` instead of manual mapping. It provides blur support, tooltips, click handlers, and proper spacing.

**Line 120:**
```tsx
const result = response.data as any;
```
> **🧹 AI Slop**: Type bypass using `as any`. Fix the type definition for `response.data` instead of casting to `any`.

---

### Commit 2: `e4f5g6h` - Extract shared overview component

#### `components/shared/overview-section.tsx`

**Line 89-92:**
```tsx
{statisticPlatformSupport.metricPerformance.includes(platform.shortcode) && (
  <PlatformMetricsSummary platform={platform} metrics={metrics} />
)}
```
> **⚠️ Component Extraction Issue**: Verify that ALL pages using this component originally had `PlatformMetricsSummary`. Check `pages/kol/self/[kolId].tsx` - if it didn't have this component before, add a prop to control its visibility (e.g., `showMetricsSummary`).

---

### Commit 3: `i7j8k9l` - Update styling for mobile

✅ No issues found.

---

## Summary

- **Total commits reviewed**: 3
- **Commits with issues**: 2
- **Total comments**: 3
  - Component Extraction Issues: 1
  - Missed Component Reuse: 1
  - AI Slop: 1

### Key Recommendations

1. **Commit a1b2c3d**: Replace manual KOL thumbnail mapping with `KolThumbnailGroup` component
2. **Commit a1b2c3d**: Fix type definition instead of using `as any` cast for response data
3. **Commit e4f5g6h**: Add `showMetricsSummary` prop to `OverviewSection` to handle page-specific differences
```

## Guidelines

### Code Snippets

- Include 3-10 lines of context
- Show enough code to understand the issue
- Use proper syntax highlighting (```tsx, ```ts, etc.)
- Don't truncate with `...` unless snippet is very long

### Descriptions

- Keep descriptions to 1-2 sentences
- Be specific and actionable
- Focus on "what" and "why", not "how" (save that for suggestions)
- Avoid redundancy with the code snippet

### Suggestions

- Keep suggestions to 1 sentence
- Be concrete and actionable
- Provide specific component names, file paths, or code patterns
- Don't repeat the description

### Tone

- Professional and constructive
- Focus on improvement, not criticism
- Use "Consider", "Verify", "Check" rather than "You must", "This is wrong"
- Acknowledge clean code with ✅

### Organization

- Group issues by file within each commit
- List files in alphabetical order
- List issues by line number within each file
- Use horizontal rules (`---`) to separate commits
