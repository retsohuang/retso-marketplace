## Summary

Remove the `/code-review-tools:review` slash command since it's a thin wrapper that only invokes the `code-review` skill, which users can invoke directly.

## Motivation

The `review.md` command does nothing beyond forwarding arguments to the `code-review` skill. Users can already invoke `/code-review <commit-hash>` directly, making the wrapper command redundant. Removing it simplifies the plugin surface and eliminates a layer of indirection.

## Proposed Solution

1. Delete `plugins/code-review-tools/commands/review.md`
2. Remove the `commands` entry from `plugin.json` (or remove the `commands` array entirely since it's the only command)

## Impact

- Affected code:
  - `plugins/code-review-tools/commands/review.md` (delete)
  - `plugins/code-review-tools/.claude-plugin/plugin.json` (remove `commands` field)
