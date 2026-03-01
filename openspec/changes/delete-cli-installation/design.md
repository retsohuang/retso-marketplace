## Context

The `cli/` directory has been removed (phase 1 complete). However, the CI `check` job now fails because `bun run --filter '*' build` finds no matching workspaces. More broadly, the entire Node.js/Bun toolchain is dead weight — no plugins use node/bun, and the validate script checks for `plugin.json` at the plugin root which no longer exists. Plugins now store metadata at `.claude-plugin/plugin.json`.

## Goals / Non-Goals

**Goals:**

- Fix the CI build failure
- Remove all Node.js/Bun toolchain files (`package.json`, `bun.lock`, `lefthook.yml`, `node_modules/`)
- Replace the TypeScript validation script with a shell script that validates `.claude-plugin/plugin.json`
- Update documentation to reflect the current plugin structure

**Non-Goals:**

- Changing any plugin structure or marketplace behavior
- Adding new CI checks beyond plugin validation

## Decisions

### Replace validate-plugin.ts with shell script

The TypeScript validation script requires Bun and Zod. Since we're removing the entire Node.js toolchain, rewrite it as `scripts/validate-plugin.sh` using `jq` (pre-installed on Ubuntu CI runners). The new script validates `.claude-plugin/plugin.json` instead of root `plugin.json`.

**Alternative**: Keep Bun just for the validate script. Rejected because maintaining an entire runtime for one small script is excessive.

### Remove the check CI job entirely

The `check` job ran `build`, `typecheck`, and `test` — all delegating to workspaces via `--filter '*'`. No workspaces exist anymore. Remove the job entirely rather than trying to make it work.

### Remove lefthook pre-commit hooks

The lefthook hooks only trigger on `plugins/*/scripts/**/*.{ts,js}` files which no longer exist. Remove `lefthook.yml` entirely.

## Risks / Trade-offs

- [No pre-commit hooks] → Losing lint/format checks on commit. Acceptable because no JS/TS plugin code exists to lint.
- [jq dependency in CI] → `jq` is pre-installed on GitHub Actions ubuntu runners, so no additional setup needed.
