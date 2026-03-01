#!/usr/bin/env bash
set -euo pipefail

plugin_path="${1:?Usage: validate-plugin.sh <plugin-path>}"
plugin_name="$(basename "$plugin_path")"
manifest="$plugin_path/.claude-plugin/plugin.json"

# Check .claude-plugin/plugin.json exists
if [ ! -f "$manifest" ]; then
  echo "✗ Invalid: .claude-plugin/plugin.json not found" >&2
  exit 1
fi

# Check valid JSON
if ! jq empty "$manifest" 2>/dev/null; then
  echo "✗ Invalid: .claude-plugin/plugin.json is not valid JSON" >&2
  exit 1
fi

# Check required fields
for field in name description version; do
  value="$(jq -r ".$field // empty" "$manifest")"
  if [ -z "$value" ]; then
    echo "✗ Invalid: missing required field '$field'" >&2
    exit 1
  fi
done

# Check name matches directory
manifest_name="$(jq -r '.name' "$manifest")"
if [ "$manifest_name" != "$plugin_name" ]; then
  echo "✗ Invalid: plugin name '$manifest_name' does not match directory name '$plugin_name'" >&2
  exit 1
fi

# Check version is semver
version="$(jq -r '.version' "$manifest")"
if ! echo "$version" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "✗ Invalid: version '$version' is not valid semver" >&2
  exit 1
fi

# Check referenced commands exist
for cmd in $(jq -r '.commands[]? // empty' "$manifest"); do
  clean="${cmd#./}"
  if [ ! -f "$plugin_path/$clean" ]; then
    echo "✗ Invalid: command file not found: $clean" >&2
    exit 1
  fi
done

# Check referenced agents exist
for agent in $(jq -r '.agents[]? // empty' "$manifest"); do
  clean="${agent#./}"
  if [ ! -f "$plugin_path/$clean" ]; then
    echo "✗ Invalid: agent file not found: $clean" >&2
    exit 1
  fi
done

echo "✓ Valid: $manifest_name v$version"
