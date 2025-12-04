# CLAUDE.md - AI Assistant Guide for Retso Marketplace

This document provides comprehensive guidance for AI assistants (particularly Claude) working with the Retso Marketplace codebase. It explains the repository structure, development workflows, key conventions, and best practices to follow.

---

## Table of Contents

1. [Repository Overview](#repository-overview)
2. [Repository Structure](#repository-structure)
3. [Plugin Architecture](#plugin-architecture)
4. [Development Workflows](#development-workflows)
5. [Key Conventions](#key-conventions)
6. [Configuration Patterns](#configuration-patterns)
7. [Git Workflows](#git-workflows)
8. [Testing and Validation](#testing-and-validation)
9. [Common Tasks](#common-tasks)
10. [Troubleshooting](#troubleshooting)

---

## Repository Overview

### Purpose
The Retso Marketplace is a **custom plugin marketplace for Claude Code**, providing curated collections of:
- Plugins (bundles of commands, agents, hooks)
- Slash commands (user-invokable markdown-based commands)
- AI agents (specialized AI behaviors)
- Hooks (event-driven automation)
- MCP servers (Model Context Protocol integrations)

### Key Technologies
- **Claude Code**: AI-powered coding assistant
- **Markdown**: Command and documentation format
- **JSON**: Configuration and metadata format
- **Git**: Version control
- **Bash**: Scripting and automation

### Repository Location
- GitHub: `retsohuang/retso-marketplace`
- Development Branch Pattern: `claude/claude-md-*` (AI-generated branches)
- Main Branch: (not explicitly set in current context)

---

## Repository Structure

```
retso-marketplace/
├── .claude-plugin/              # Marketplace metadata
│   └── marketplace.json         # Marketplace configuration and plugin registry
├── .git/                        # Git repository data
├── .gitignore                   # Git ignore rules
├── README.md                    # User-facing documentation
├── CLAUDE.md                    # This file - AI assistant guide
└── plugins/                     # Plugin directory (all plugins live here)
    └── code-review-tools/       # Example plugin
        ├── plugin.json          # Plugin metadata
        ├── README.md            # Plugin documentation
        ├── CONFIG-SCHEMA.json   # JSON schema for plugin config
        ├── commands/            # Slash commands
        │   ├── review.md        # Main review command
        │   ├── init.md          # Setup command
        │   └── create-rule.md   # Rule creation command
        └── rules/               # Built-in rule definitions
            ├── report-format.md
            ├── ai-slop-rules.md
            ├── component-reuse-rules.md
            └── component-extraction-rules.md
```

### Important Files

#### `.claude-plugin/marketplace.json`
- **Purpose**: Central marketplace configuration
- **Contains**: Plugin registry, marketplace metadata, owner info
- **Schema**: Uses official Claude Code marketplace schema
- **Critical Fields**:
  - `name`: Marketplace identifier (kebab-case)
  - `plugins[]`: Array of plugin definitions
  - `pluginRoot`: Base path for local plugins (default: `./plugins`)

#### `plugins/{plugin-name}/plugin.json`
- **Purpose**: Individual plugin metadata
- **Contains**: Plugin name, version, commands, keywords, license
- **Optional**: If marketplace has `strict: false`, minimal metadata is acceptable
- **Critical Fields**:
  - `name`: Plugin identifier (kebab-case)
  - `version`: Semantic versioning (e.g., "1.0.0")
  - `commands`: Array of command directory paths

#### `plugins/{plugin-name}/commands/{command}.md`
- **Purpose**: Slash command definitions
- **Format**: Markdown with YAML frontmatter
- **Frontmatter Fields**:
  - `description`: Command description for help text
  - `argument-hint`: Usage hint (e.g., `<commit-hash>`)
  - `allowed-tools`: Tools the command can use (e.g., `test -f`)

---

## Plugin Architecture

### Plugin Types

#### 1. **Local Plugins** (Stored in Repository)
Plugins stored directly in `plugins/` directory.

**Configuration Example:**
```json
{
  "name": "my-plugin",
  "description": "Description of my plugin",
  "version": "1.0.0",
  "source": "./plugins/my-plugin",
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com"
  },
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"],
  "category": "development"
}
```

#### 2. **External Plugins** (GitHub References)
Plugins hosted in other GitHub repositories.

**Configuration Example:**
```json
{
  "name": "external-plugin",
  "description": "Plugin from another repository",
  "version": "1.0.0",
  "source": {
    "source": "github",
    "repo": "organization/plugin-repository"
  },
  "license": "MIT"
}
```

#### 3. **External Plugins** (Git URL)
Plugins from custom Git servers.

**Configuration Example:**
```json
{
  "name": "git-plugin",
  "description": "Plugin from custom Git server",
  "version": "1.0.0",
  "source": {
    "source": "url",
    "url": "https://gitlab.com/team/plugin-repo.git"
  },
  "license": "MIT"
}
```

### Plugin Structure Pattern

A typical plugin follows this structure:

```
plugins/my-plugin/
├── plugin.json          # Plugin metadata (required)
├── README.md            # Plugin documentation (recommended)
├── CONFIG-SCHEMA.json   # JSON schema for config (optional)
├── commands/            # Slash commands (optional)
│   └── my-command.md
├── agents/              # AI agents (optional)
│   └── my-agent.md
├── hooks/               # Event hooks (optional)
│   └── hooks.json
└── mcp-servers/         # MCP server configs (optional)
    └── server-config.json
```

### Command Structure

Commands are markdown files with YAML frontmatter:

```markdown
---
description: Brief description of what this command does
argument-hint: <required-arg> [optional-arg]
allowed-tools: test -f, git log
---

# Command Name

Brief description of the command.

## Usage

\```bash
/plugin-name:command-name <arg>
\```

## Instructions

Detailed instructions for Claude to execute the command.
```

---

## Development Workflows

### Adding a New Plugin

1. **Create Plugin Directory**
   ```bash
   mkdir -p plugins/my-plugin/commands
   ```

2. **Create `plugin.json`**
   ```json
   {
     "name": "my-plugin",
     "description": "Brief description",
     "version": "1.0.0",
     "author": {
       "name": "Your Name",
       "email": "your.email@example.com"
     },
     "license": "MIT",
     "commands": ["commands"]
   }
   ```

3. **Add Commands**
   Create markdown files in `plugins/my-plugin/commands/`

4. **Register in Marketplace**
   Update `.claude-plugin/marketplace.json`:
   ```json
   {
     "plugins": [
       {
         "name": "my-plugin",
         "description": "Brief description",
         "version": "1.0.0",
         "source": "./plugins/my-plugin",
         "author": {
           "name": "Your Name",
           "email": "your.email@example.com"
         },
         "license": "MIT",
         "keywords": ["tag1", "tag2"],
         "category": "development"
       }
     ]
   }
   ```

5. **Update README**
   Add plugin to the Available Plugins table in `README.md`

6. **Test Locally**
   ```bash
   /plugin marketplace add /path/to/retso-marketplace
   /plugin install my-plugin@retso-marketplace
   /my-plugin:command-name
   ```

7. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: add my-plugin with X functionality"
   git push -u origin <branch-name>
   ```

### Modifying an Existing Plugin

1. **Read Current Implementation**
   Always read the existing plugin files before making changes.

2. **Make Targeted Changes**
   Only modify what's explicitly requested. Avoid refactoring unrelated code.

3. **Update Documentation**
   If behavior changes, update:
   - Plugin's `README.md`
   - Main `README.md` (if plugin listing changes)
   - Command descriptions in frontmatter

4. **Update Version**
   Follow semantic versioning:
   - Patch: Bug fixes (1.0.0 → 1.0.1)
   - Minor: New features, backward compatible (1.0.0 → 1.1.0)
   - Major: Breaking changes (1.0.0 → 2.0.0)

5. **Test Changes**
   Run the modified commands to ensure they work as expected.

6. **Commit with Clear Message**
   ```bash
   git commit -m "fix: correct argument parsing in my-plugin:command"
   ```

---

## Key Conventions

### Naming Conventions

#### Plugin Names
- **Format**: `kebab-case` (lowercase with hyphens)
- **Examples**: `code-review-tools`, `my-custom-plugin`
- **Avoid**: camelCase, snake_case, spaces

#### Command Names
- **Format**: `kebab-case` (lowercase with hyphens)
- **Examples**: `create-rule`, `init`, `review`
- **Usage**: `/plugin-name:command-name`

#### File Names
- **Commands**: `{command-name}.md` (kebab-case)
- **Config**: `plugin.json`, `CONFIG-SCHEMA.json`, `marketplace.json`
- **Documentation**: `README.md` (uppercase)

### Code Style

#### Markdown Commands
- Use clear, imperative instructions
- Include code examples in bash blocks
- Structure with clear sections (Usage, Instructions, Error Handling)
- Use YAML frontmatter for metadata

#### JSON Configuration
- Use 2-space indentation
- Always validate with `jq empty file.json`
- Include descriptions for all fields
- Follow JSON Schema standards

#### Bash Scripts (in Commands)
- Always quote paths with spaces: `"$variable"`
- Use `||` for fallback behavior: `command || echo "Failed"`
- Chain commands with `&&`: `cmd1 && cmd2`
- Check file existence: `test -f file.json`
- Use `jq` for JSON parsing: `jq -r '.field // "default"'`

### Configuration Patterns

#### Default Values
Always provide sensible defaults:
```bash
USE_FEATURE=$(jq -r '.feature // true' config.json)
```

#### Backward Compatibility
- If config file missing → use all defaults
- If field missing → use default value
- If invalid JSON → show error, use defaults

#### Error Handling
- **Invalid JSON**: Show error, fallback to defaults
- **Missing file**: Show warning, continue gracefully
- **Missing field**: Use default, no error

---

## Configuration Patterns

### User Configuration Location

User configurations for plugins should be stored in:
```
.claude/
├── {plugin-name}-config.json       # Plugin-specific config
└── {plugin-name}-rules/            # Plugin-specific rules/data
    ├── custom-rule-1.md
    └── custom-rule-2.md
```

**Key Points:**
- `.claude/` is at the root of the user's project (not in marketplace repo)
- Configuration is per-project, not per-marketplace
- `.claude/settings.local.json` is ignored by git (per `.gitignore`)

### Loading Configuration Pattern

**Standard Pattern for Commands:**
```bash
# Step 1: Check if config exists
if test -f .claude/plugin-config.json; then
  echo "✓ Config found"

  # Step 2: Validate JSON
  if ! jq empty .claude/plugin-config.json 2>/dev/null; then
    echo "ERROR: Invalid JSON in config"
    # Use defaults
  else
    # Step 3: Parse with defaults
    SETTING=$(jq -r '.setting // true' .claude/plugin-config.json)
  fi
else
  echo "INFO: No config found, using defaults"
  # Use defaults
fi
```

### JSON Schema Pattern

If your plugin has configuration, provide a schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Plugin Configuration",
  "description": "Configuration for plugin-name",
  "type": "object",
  "properties": {
    "version": {
      "type": "string",
      "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+$",
      "default": "1.0.0"
    },
    "setting": {
      "type": "boolean",
      "description": "Enable or disable feature",
      "default": true
    }
  }
}
```

---

## Git Workflows

### Branch Naming

**For AI-Generated Branches:**
- **Pattern**: `claude/claude-md-{random-id}-{session-id}`
- **Example**: `claude/claude-md-mirrh6bxhic4fu1n-01ADo72YFbZZzMD4UN7wNUJV`
- **Important**: Only branches starting with `claude/` and ending with matching session ID can be pushed (otherwise 403 error)

**For Manual Development:**
- Feature: `feature/short-description`
- Bugfix: `fix/short-description`
- Documentation: `docs/short-description`

### Commit Message Format

Follow conventional commits:

```
<type>(<scope>): <subject>

[optional body]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(code-review): add custom rule creation command
fix(code-review): correct JSON parsing in init command
docs: update CLAUDE.md with configuration patterns
refactor(marketplace): simplify plugin registration logic
```

### Push with Retry Logic

Network issues can occur during push. Always use retry logic:

```bash
# Push with retry (exponential backoff)
for i in 1 2 3 4; do
  if git push -u origin claude/branch-name; then
    echo "✓ Push successful"
    break
  else
    if [ $i -lt 4 ]; then
      sleep $((2**i))  # 2s, 4s, 8s
      echo "Retrying push..."
    else
      echo "ERROR: Push failed after 4 attempts"
      exit 1
    fi
  fi
done
```

### Git Safety Rules

1. **NEVER** update git config
2. **NEVER** force push to main/master
3. **NEVER** skip hooks (--no-verify) unless explicitly requested
4. **ALWAYS** check branch before pushing
5. **ALWAYS** use descriptive commit messages

---

## Testing and Validation

### Before Committing

1. **Validate JSON Files**
   ```bash
   jq empty .claude-plugin/marketplace.json
   jq empty plugins/*/plugin.json
   ```

2. **Check File Structure**
   ```bash
   # Ensure plugin.json exists for each plugin
   for plugin in plugins/*; do
     if [ ! -f "$plugin/plugin.json" ]; then
       echo "WARNING: Missing plugin.json in $plugin"
     fi
   done
   ```

3. **Verify Command Files**
   ```bash
   # Check that commands directory exists if specified
   grep -r '"commands"' plugins/*/plugin.json | while read -r line; do
     # Verify referenced command directories exist
   done
   ```

### Testing Plugins Locally

1. **Add Marketplace**
   ```bash
   /plugin marketplace add /path/to/retso-marketplace
   ```

2. **Install Plugin**
   ```bash
   /plugin install plugin-name@retso-marketplace
   ```

3. **Test Commands**
   ```bash
   /plugin-name:command-name [args]
   ```

4. **Check Output**
   Verify command behavior matches expectations

5. **Uninstall (if needed)**
   ```bash
   /plugin uninstall plugin-name
   ```

---

## Common Tasks

### Task 1: Add a New Command to Existing Plugin

1. **Create command file**
   ```bash
   touch plugins/my-plugin/commands/new-command.md
   ```

2. **Write command content**
   ```markdown
   ---
   description: Brief description
   argument-hint: <arg>
   ---

   # Command Name

   Instructions for Claude...
   ```

3. **Update version**
   Increment minor version in `plugin.json` and `marketplace.json`

4. **Update README**
   Add command to plugin's README

5. **Commit**
   ```bash
   git add .
   git commit -m "feat(my-plugin): add new-command for X functionality"
   ```

### Task 2: Fix a Bug in a Command

1. **Read current implementation**
   ```bash
   # Read the problematic command file
   ```

2. **Identify issue**
   Understand what's broken and why

3. **Make targeted fix**
   Only change what's necessary

4. **Update version**
   Increment patch version

5. **Commit with clear description**
   ```bash
   git commit -m "fix(my-plugin): correct argument parsing in command X"
   ```

### Task 3: Update Plugin Documentation

1. **Read current docs**
   ```bash
   # Read README.md
   ```

2. **Make changes**
   Update only the relevant sections

3. **Verify links**
   Ensure all links still work

4. **Update version if needed**
   Docs-only changes may not need version bump

5. **Commit**
   ```bash
   git commit -m "docs(my-plugin): clarify usage instructions for command X"
   ```

### Task 4: Add Plugin to Available Plugins Table

After adding a new plugin, update `README.md`:

```markdown
| Plugin Name | Description | Version |
|-------------|-------------|---------|
| [plugin-name](./plugins/plugin-name/README.md) | Brief description | 1.0.0 |
```

---

## Troubleshooting

### Issue: Plugin Not Found

**Symptoms:**
```
Error: Plugin 'my-plugin' not found in marketplace
```

**Solutions:**
1. Check `.claude-plugin/marketplace.json` includes the plugin
2. Verify `source` path is correct (relative to marketplace root)
3. Ensure `plugin.json` exists in plugin directory
4. Try reloading marketplace: `/plugin marketplace reload retso-marketplace`

### Issue: Command Not Found

**Symptoms:**
```
Error: Command 'my-command' not found
```

**Solutions:**
1. Check `plugin.json` lists `"commands": ["commands"]`
2. Verify command file exists in `plugins/my-plugin/commands/my-command.md`
3. Check command file has proper YAML frontmatter
4. Ensure plugin is installed: `/plugin list`

### Issue: JSON Validation Errors

**Symptoms:**
```
parse error: Invalid numeric literal at line X, column Y
```

**Solutions:**
1. Validate with `jq`: `jq empty file.json`
2. Check for:
   - Missing commas between array/object elements
   - Trailing commas (not allowed in JSON)
   - Unescaped quotes in strings
   - Missing closing brackets/braces
3. Use a JSON formatter/linter

### Issue: Git Push Fails (403)

**Symptoms:**
```
error: failed to push some refs (403)
```

**Solutions:**
1. Verify branch name starts with `claude/`
2. Verify branch name ends with current session ID
3. Check network connectivity
4. Retry with exponential backoff (script above)
5. If persistent, check GitHub access permissions

### Issue: Configuration Not Loading

**Symptoms:**
Command doesn't respect user's configuration file

**Solutions:**
1. Verify config file location: `.claude/plugin-config.json`
2. Validate JSON: `jq empty .claude/plugin-config.json`
3. Check command properly loads config (see Configuration Patterns)
4. Verify file permissions: `ls -la .claude/`
5. Check for typos in config keys

---

## Best Practices for AI Assistants

### 1. Always Read Before Writing

- **DON'T**: Assume file structure or content
- **DO**: Read existing files before modifying
- **DON'T**: Create new files unnecessarily
- **DO**: Prefer editing existing files

### 2. Make Targeted Changes

- **DON'T**: Refactor unrelated code
- **DO**: Only change what's requested
- **DON'T**: Add "improvements" not asked for
- **DO**: Keep changes focused and minimal

### 3. Maintain Consistency

- **DON'T**: Introduce new naming conventions
- **DO**: Follow existing patterns in codebase
- **DON'T**: Change code style arbitrarily
- **DO**: Match the style of surrounding code

### 4. Document Changes

- **DON'T**: Make changes without updating docs
- **DO**: Update READMEs when behavior changes
- **DON'T**: Leave broken links or outdated examples
- **DO**: Verify documentation accuracy

### 5. Test Before Committing

- **DON'T**: Commit untested changes
- **DO**: Validate JSON files with `jq`
- **DON'T**: Assume changes work
- **DO**: Test commands after modifications

### 6. Use Clear Commit Messages

- **DON'T**: Use vague messages like "update files"
- **DO**: Use conventional commits format
- **DON'T**: Combine unrelated changes in one commit
- **DO**: Make atomic commits (one logical change per commit)

### 7. Handle Errors Gracefully

- **DON'T**: Fail silently
- **DO**: Show clear error messages
- **DON'T**: Crash on missing config files
- **DO**: Fallback to sensible defaults

### 8. Respect Backward Compatibility

- **DON'T**: Break existing functionality
- **DO**: Maintain backward compatibility when possible
- **DON'T**: Remove fields without deprecation
- **DO**: Use optional fields with defaults

---

## Quick Reference

### File Paths
```
.claude-plugin/marketplace.json          # Marketplace config
plugins/{name}/plugin.json               # Plugin metadata
plugins/{name}/commands/{cmd}.md         # Command definition
plugins/{name}/README.md                 # Plugin docs
.claude/{plugin}-config.json             # User config (in user's project)
```

### Commands to Remember
```bash
# Validate JSON
jq empty file.json

# Test plugin locally
/plugin marketplace add /path/to/marketplace
/plugin install plugin@marketplace

# Check file existence
test -f file.json && echo "exists"

# Parse JSON with default
jq -r '.field // "default"' config.json

# Git status
git status

# Git push with retry
git push -u origin branch-name
```

### Common Patterns
```bash
# Check if config exists
test -f .claude/config.json && echo "found" || echo "not found"

# Load config with fallback
VALUE=$(jq -r '.field // true' .claude/config.json 2>/dev/null || echo "true")

# Iterate over array in JSON
jq -r '.array[]? | .field' config.json | while read item; do
  echo "$item"
done
```

---

## Resources

- [Claude Code Documentation](https://code.claude.com/docs)
- [Plugin Marketplaces Documentation](https://code.claude.com/docs/en/plugin-marketplaces)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [JSON Schema](http://json-schema.org/draft-07/schema)
- [Semantic Versioning](https://semver.org/)

---

## Maintenance

**Last Updated**: 2025-12-04
**Document Version**: 1.0.0
**Maintainer**: Retso Huang (retsohuang@gmail.com)

**Update Frequency**: This document should be updated whenever:
- New plugins are added with novel patterns
- Marketplace structure changes significantly
- New conventions are established
- Common issues are discovered and resolved

---

## Appendix: Example Plugin Checklist

When creating a new plugin, use this checklist:

- [ ] Create plugin directory: `plugins/my-plugin/`
- [ ] Create `plugin.json` with required fields
- [ ] Create `README.md` with documentation
- [ ] Create `commands/` directory if needed
- [ ] Write command markdown files with frontmatter
- [ ] Add plugin to `.claude-plugin/marketplace.json`
- [ ] Update main `README.md` Available Plugins table
- [ ] Validate all JSON files: `jq empty *.json`
- [ ] Test plugin installation locally
- [ ] Test all commands work as expected
- [ ] Commit with clear message: `feat: add my-plugin`
- [ ] Push to appropriate branch

---

*This document is maintained as part of the Retso Marketplace and should be the primary reference for AI assistants working with this codebase.*
