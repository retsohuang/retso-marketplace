## Why

The CLI installer (`plugin-kit` / `pk`) was built before Claude Code supported `--plugin-dir` and marketplace installation. Now that plugins can be tested and installed natively, the CLI is redundant and adds maintenance burden. This was already acknowledged as "accepted technical debt" in previous changes.

## What Changes

- **Remove** the entire `cli/` directory (React + Ink terminal UI, build scripts, install script)
- **Relocate** `cli/scripts/validate-plugin.ts` to a top-level `scripts/` directory (still used by CI)
- **Inline** the `PluginManifestSchema` into the relocated validate script (eliminating the dependency on `cli/src/types/plugin.ts`)
- **Update** project configuration: `package.json` workspaces, `.gitignore`, CI workflow path, README, CLAUDE.md
- **Regenerate** `bun.lock` without CLI dependencies

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none — this is a pure removal; no spec-level behavior changes)

## Impact

- Affected code: `cli/` (deleted), `scripts/validate-plugin.ts` (new location), `.github/workflows/ci.yml`, `package.json`, `README.md`, `CLAUDE.md`, `.gitignore`, `bun.lock`
- Dependencies removed: `ink`, `react`, `ink-text-input`, `yaml` (CLI-only dependencies)
- No plugin functionality affected — marketplace and `--plugin-dir` workflows remain unchanged
