## Context

The `cli/` directory contains a React + Ink terminal UI (`plugin-kit`) for interactive plugin installation. It was the only way to install plugins before Claude Code added native `--plugin-dir` and marketplace support. The CLI is now unused but still referenced in workspaces, CI, README, and project docs.

The `cli/scripts/validate-plugin.ts` script is independently useful — it validates `plugin.json` manifests in CI — and must be preserved.

## Goals / Non-Goals

**Goals:**

- Remove all CLI installer code and its dependencies
- Preserve the plugin validation script for CI use
- Clean up all references to the CLI across project files

**Non-Goals:**

- Changing any plugin structure or marketplace behavior
- Modifying the validation logic itself
- Removing CLI-related dependencies from root `package.json` (only workspace removal)

## Decisions

### Inline the Zod schema into validate-plugin.ts

The validate script imports `PluginManifestSchema` from `cli/src/types/plugin.ts`. Rather than keeping a separate types file, inline the schema directly into `scripts/validate-plugin.ts`. The schema is small (~15 lines) and the validate script is its only remaining consumer.

**Alternative**: Create `scripts/types/plugin.ts` as a separate file. Rejected because it adds unnecessary file structure for a single small schema.

### Delete cli/ entirely before relocating

Delete the entire `cli/` directory first, then create the new `scripts/validate-plugin.ts` with inlined schema. This is cleaner than a partial move.

## Risks / Trade-offs

- [Removing install method] → Users who relied on `plugin-kit` CLI lose that path. Mitigated by `--plugin-dir` and marketplace being strictly better alternatives.
- [CI breakage during transition] → If CI runs between deleting `cli/` and updating the workflow path. Mitigated by making all changes in a single commit.
