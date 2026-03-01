## Context

The README's Available Plugins table has an Install column with two values: "Manual ¹" and "Either". The footnote (¹) explains that manual installation is recommended for `code-review-tools` because it uses a `references/` directory requiring local file access. This distinction existed when the CLI installer was available as an alternative to marketplace installation. The CLI has since been removed.

## Goals / Non-Goals

**Goals:**

- Remove the outdated "Manual ¹" label and footnote from README

**Non-Goals:**

- Changing the Install column semantics or adding new install methods

## Decisions

### Unify Install column value for code-review-tools

Change the Install value from `Manual ¹` to `Either` to match the other plugins, and remove the footnote. The `references/` directory concern mentioned in the footnote is a usage detail, not an installation method distinction.

## Risks / Trade-offs

None. This is a cosmetic documentation fix with no behavioral impact.
