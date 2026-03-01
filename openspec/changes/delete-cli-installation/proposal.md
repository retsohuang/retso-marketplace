## Why

The CLI installer (`plugin-kit` / `pk`) was built before Claude Code supported `--plugin-dir` and marketplace installation. Now that plugins can be tested and installed natively, the CLI is redundant and adds maintenance burden. This was already acknowledged as "accepted technical debt" in previous changes.

## What Changes

- **Remove** the entire `cli/` directory (React + Ink terminal UI, build scripts, install script) *(done)*
- **Remove** the entire Node.js/Bun toolchain: `package.json`, `bun.lock`, `node_modules/`, `lefthook.yml`
- **Replace** `scripts/validate-plugin.ts` (Bun + Zod) with `scripts/validate-plugin.sh` (shell + jq), validating `.claude-plugin/plugin.json` instead of root `plugin.json`
- **Rewrite** CI workflow: remove `check` job, simplify `validate-plugins` to use shell script without bun
- **Update** documentation: README Plugin Structure section, CLAUDE.md, `.gitignore`

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none — this is a pure removal; no spec-level behavior changes)

## Impact

- Affected code: `cli/` (deleted), `scripts/validate-plugin.ts` → `scripts/validate-plugin.sh`, `.github/workflows/ci.yml`, `package.json` (deleted), `bun.lock` (deleted), `lefthook.yml` (deleted), `README.md`, `CLAUDE.md`, `.gitignore`
- All npm dependencies removed — project no longer uses Node.js/Bun runtime
- No plugin functionality affected — marketplace and `--plugin-dir` workflows remain unchanged
