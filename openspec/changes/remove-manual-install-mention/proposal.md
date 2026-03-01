## Summary

Remove the "Manual ¹" install label and its footnote from the README's Available Plugins table.

## Motivation

The "Manual installation recommended" footnote was added when the CLI installer existed and marketplace installation couldn't handle plugins with local `references/` directories. The CLI has since been removed, making the distinction between "Manual" and "Either" install methods meaningless — all plugins now install the same way via `--plugin-dir` or marketplace.

## Proposed Solution

- Change `code-review-tools` Install column from `Manual ¹` to `Either`
- Remove the footnote explaining manual installation

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none — this is a pure documentation fix with no spec-level behavior changes)

## Impact

- Affected code: `README.md` (Available Plugins table, footnote)
