---
name: version-bump
description: Bump plugin versions in the marketplace. Use when the user mentions "bump version", "release", "version update", "update version", or wants to prepare a new release. Analyzes git changes to determine affected plugins and appropriate version increment.
---

# Version Bump

Automate version bumping for Claude Code plugins in this marketplace. Analyzes changes, determines the appropriate version increment (major/minor/patch), and updates all version-containing files.

## When to use

- User wants to bump version(s)
- User wants to release or prepare a release
- User mentions "version update" or "update version"
- Before creating a release PR

## Instructions

### Step 1: Analyze changes

First, identify what has changed by comparing the current branch to `main`:

```bash
# Get the list of changed files
git diff --name-only main...HEAD

# Get detailed diff for analysis
git diff main...HEAD --stat
```

### Step 2: Identify affected plugins

From the changed files, determine which plugins are affected. Plugins are located in `plugins/` directory. A plugin is affected if any file under `plugins/<plugin-name>/` was modified.

### Step 3: Determine version bump type

For each affected plugin, analyze the changes to decide the version increment:

**Major (x.0.0)** - Breaking changes:
- Removed commands, agents, or hooks
- Renamed commands or changed their behavior incompatibly
- Changed required configuration structure
- API contract changes that break existing users

**Minor (0.x.0)** - New features (backwards compatible):
- Added new commands, agents, or hooks
- Added new optional configuration options
- Added new functionality to existing commands
- Enhanced capabilities without breaking existing behavior

**Patch (0.0.x)** - Bug fixes and minor improvements:
- Bug fixes
- Documentation updates
- Typo corrections
- Performance improvements
- Refactoring without behavior changes
- Dependency updates (non-breaking)

### Step 4: Present the analysis

Before making changes, present the findings to the user:

```
## Version Bump Analysis

### Affected Plugins

| Plugin | Current Version | Suggested Bump | New Version | Reason |
|--------|-----------------|----------------|-------------|--------|
| plugin-name | 1.0.0 | patch | 1.0.1 | Bug fix in command X |

### Changes Summary

- **plugin-name**: Brief description of changes
```

Ask for confirmation before proceeding.

### Step 5: Update version files

For each affected plugin, update these files in order:

1. **Plugin's `plugin.json`**:
   - Path: `plugins/<plugin-name>/plugin.json`
   - Update the `"version"` field

2. **Marketplace configuration**:
   - Path: `.claude-plugin/marketplace.json`
   - Find the plugin entry in the `"plugins"` array
   - Update its `"version"` field

3. **README.md**:
   - Path: `README.md`
   - Find the plugin in the "Available Plugins" table
   - Update the Version column

### Step 6: Verify consistency

After updates, verify all version numbers match:

```bash
# Check plugin.json
grep -o '"version": "[^"]*"' plugins/<plugin-name>/plugin.json

# Check marketplace.json
grep -A 5 '"name": "<plugin-name>"' .claude-plugin/marketplace.json | grep version

# Check README.md table
grep "<plugin-name>" README.md
```

## File locations reference

- Plugin metadata: `plugins/<plugin-name>/plugin.json`
- Marketplace config: `.claude-plugin/marketplace.json`
- README with version table: `README.md`

## Example workflow

User: "Bump version for the spec-kit plugin"

1. Check changes: `git diff main...HEAD -- plugins/spec-kit/`
2. Analyze: Added new command → minor bump
3. Current: 0.1.0 → New: 0.2.0
4. Present analysis and ask for confirmation
5. Update:
   - `plugins/spec-kit/plugin.json`: version → "0.2.0"
   - `.claude-plugin/marketplace.json`: spec-kit version → "0.2.0"
   - `README.md`: spec-kit row → 0.2.0
6. Verify all files have matching versions

## Important notes

- Always analyze git changes first, don't guess the version type
- Keep versions synchronized across all three files
- Follow semantic versioning strictly
- Ask for user confirmation before making changes
- If no changes detected for a plugin, inform the user instead of bumping
