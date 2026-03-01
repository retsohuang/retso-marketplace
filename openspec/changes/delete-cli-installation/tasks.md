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
- [x] 4.3 Commit all changes: `refactor: remove CLI installer in favor of native plugin-dir support`
