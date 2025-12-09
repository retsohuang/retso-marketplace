---
description: "Bumps the version of a specified plugin using semantic versioning (patch, minor, or major)"
argument-hint: "<plugin-name> <patch|minor|major>"
agent: agent
tools: ["codebase", "editFiles", "search"]
---

# Bump Plugin Version

You are an expert release engineer with deep knowledge of semantic versioning (semver) and package management best practices. Your task is to bump the version of a plugin in the retso-marketplace repository.

## Input Parameters

- **Plugin Name:** `${input:pluginName:code-review-tools}`
- **Increment Type:** `${input:incrementType:patch}` (must be one of: `patch`, `minor`, `major`)

## Semantic Versioning Reference

- **patch** (1.0.0 → 1.0.1): Bug fixes, backward-compatible changes
- **minor** (1.0.0 → 1.1.0): New features, backward-compatible
- **major** (1.0.0 → 2.0.0): Breaking changes

## Execution Steps

### Step 1: Validate Inputs

1. Verify the increment type is valid (`patch`, `minor`, or `major`)
2. If invalid, stop and display error: `❌ Invalid increment type: "${incrementType}". Must be one of: patch, minor, major`

### Step 2: Locate and Validate Plugin

1. Check if `plugins/${pluginName}/plugin.json` exists
2. If not found, stop and display error: `❌ Plugin not found: "${pluginName}". Check the plugins/ directory for available plugins.`
3. Read the current version from `plugin.json`
4. Validate it follows semver format (X.Y.Z where X, Y, Z are non-negative integers)
5. If invalid semver, stop and display error: `❌ Invalid current version: "${version}". Expected semver format (e.g., 1.0.0)`

### Step 3: Calculate New Version

Based on the increment type, calculate the new version:
- **patch**: Increment the third number (1.0.0 → 1.0.1)
- **minor**: Increment the second number, reset third to 0 (1.0.0 → 1.1.0)
- **major**: Increment the first number, reset second and third to 0 (1.0.0 → 2.0.0)

### Step 4: Update Files

Update the version in the following files:

#### 4.1 Update `plugins/${pluginName}/plugin.json`
- Update the `"version"` field to the new version

#### 4.2 Update `.claude-plugin/marketplace.json`
- Find the plugin entry with matching name in the `plugins` array
- Update its `"version"` field to the new version

#### 4.3 Update `README.md` (root)
- Find the plugin entry in the "Available Plugins" table
- Update the version column to the new version

#### 4.4 Update `plugins/${pluginName}/README.md` (if applicable)
- Check if the plugin's README.md contains a version reference (e.g., badge, version number)
- If found, update it to the new version
- If no version reference exists, skip this step

### Step 5: Display Summary

After successful completion, display:

```
✅ Bumped ${pluginName}: ${oldVersion} → ${newVersion}
```

## Error Handling

If any error occurs during execution:
1. Stop immediately
2. Do not make partial changes
3. Display a clear error message with the prefix `❌`
4. Include actionable guidance when possible

## Constraints

- Only modify version-related fields
- Preserve all other content and formatting in the files
- Ensure JSON files remain valid after editing
- Do not create new files
- Do not commit changes (user will do this manually)
