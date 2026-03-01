## Context

The README's Available Plugins table had an Install column with values "Manual ¹" and "Either", plus a footnote explaining why manual installation was recommended for `code-review-tools`. This distinction existed when the CLI installer was available. The CLI has been removed.

## Goals / Non-Goals

**Goals:**

- Remove the entire Install column from the Available Plugins table
- Remove the associated footnote

**Non-Goals:**

- Changing other table columns or plugin metadata

## Decisions

### Remove Install column entirely

Rather than just changing the label, remove the entire Install column. Since all plugins install via the same Claude Code ecosystem (marketplace or `--plugin-dir`), the column provides no useful information.

## Risks / Trade-offs

None. This is a cosmetic documentation fix with no behavioral impact.
