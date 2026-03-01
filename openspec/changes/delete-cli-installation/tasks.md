## 1. Delete CLI and Relocate Validation Script

- [x] 1.1 Delete cli/ entirely before relocating the validation script
- [x] 1.2 Create `scripts/validate-plugin.ts` with inlined Zod schema (inline the Zod schema into validate-plugin.ts as per design decision)
- [x] 1.3 Verify `bun scripts/validate-plugin.ts plugins/github-tools` runs successfully

## 2. Update Project Configuration

- [x] 2.1 Remove `"cli"` from `workspaces` array in `package.json`
- [x] 2.2 Remove `cli/src/generated/` entry from `.gitignore`
- [x] 2.3 Update `.github/workflows/ci.yml` to use `bun scripts/validate-plugin.ts` instead of `bun cli/scripts/validate-plugin.ts`
- [x] 2.4 Run `bun install` to regenerate `bun.lock` without CLI dependencies

## 3. Update Documentation

- [x] 3.1 Remove the "CLI Tool (Manual Installation)" section from `README.md` (lines 31–64)
- [x] 3.2 Remove the `cli/` line from the Architecture section in `CLAUDE.md`

## 4. Verification

- [x] 4.1 Run `bun run typecheck` — should pass
- [x] 4.2 Run `bun test` — should pass
- [x] 4.3 Commit all changes: `refactor: remove CLI plugin installer in favor of native plugin-dir support`

## 5. Replace validate-plugin.ts with shell script

- [x] 5.1 Delete `scripts/validate-plugin.ts`
- [x] 5.2 Create `scripts/validate-plugin.sh` using jq to validate `.claude-plugin/plugin.json` (check required fields: name matches directory, description, version semver, referenced commands/agents files exist)
- [x] 5.3 Verify `bash scripts/validate-plugin.sh plugins/github-tools` runs successfully

## 6. Remove Node.js toolchain

- [x] 6.1 Delete `package.json`
- [x] 6.2 Delete `bun.lock`
- [x] 6.3 Remove lefthook pre-commit hooks — delete `lefthook.yml`
- [x] 6.4 Delete `node_modules/` directory
- [x] 6.5 Clean up `.gitignore` — remove `node_modules/` and npm/yarn log entries

## 7. Rewrite CI workflow

- [x] 7.1 Remove the check CI job entirely from `.github/workflows/ci.yml`
- [x] 7.2 Update `validate-plugins` job: remove bun setup and `bun install`, use `bash scripts/validate-plugin.sh` instead

## 8. Update documentation

- [x] 8.1 Update Plugin Structure section in `README.md` — change `plugin.json` at root to `.claude-plugin/plugin.json`
- [x] 8.2 Update `CLAUDE.md` — remove any remaining bun/node references

## 9. Verification

- [x] 9.1 Push and confirm CI passes on PR #17
- [x] 9.2 Commit all changes

## 10. Cleanup orphaned Node.js config files

- [x] 10.1 Delete `.oxlintrc.json` — references `node_modules/oxlint` which no longer exists
- [x] 10.2 Delete `.prettierrc` — Node tooling config with no runtime to use it
- [x] 10.3 Add `worktree-bootstrap` to the Architecture diagram in `CLAUDE.md`
- [x] 10.4 Commit cleanup changes
