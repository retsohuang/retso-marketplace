## Summary

Remove the Install column from the README's Available Plugins table.

## Motivation

The Install column distinguished between "Manual" and "Either" installation methods, which only made sense when the CLI installer existed. The CLI has been removed — all plugins now install the same way via marketplace or `--plugin-dir`. The column adds no information.

## Proposed Solution

- Remove the entire Install column from the Available Plugins table
- Remove the footnote explaining manual installation

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none — this is a pure documentation fix with no spec-level behavior changes)

## Impact

- Affected code: `README.md` (Available Plugins table)
