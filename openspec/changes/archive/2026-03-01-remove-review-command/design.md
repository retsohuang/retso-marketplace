## Context

The `code-review-tools` plugin has a `/code-review-tools:review` slash command (`commands/review.md`) that is a thin passthrough to the `code-review` skill. Users can already invoke the skill directly via `/code-review <commit-hash>`, making the command redundant.

## Goals / Non-Goals

**Goals:**

- Remove the redundant `review` command
- Clean up `plugin.json` to reflect the removal

**Non-Goals:**

- Modifying the `code-review` skill itself
- Changing any other plugin functionality

## Decisions

### Delete command file and remove commands array

Delete `commands/review.md` and remove the entire `commands` array from `plugin.json` since it's the only command. This is cleaner than leaving an empty array.

## Risks / Trade-offs

- [Users typing `/code-review-tools:review`] → Command will no longer exist. Users should use `/code-review` directly instead. Low risk since the command was just a passthrough.
