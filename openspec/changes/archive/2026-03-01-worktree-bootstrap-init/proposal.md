## Why

Users who install the worktree-bootstrap plugin need to manually create a `.worktreeinclude.yaml` file with the correct format. There is no guided way to generate or update this configuration. A skill would let users naturally say things like "set up worktree config" or "add .env to worktree bootstrap" to scaffold and manage the config file.

## What Changes

- Add a new skill `config` to the worktree-bootstrap plugin that creates or updates `.worktreeinclude.yaml`
- When triggered without specific files: scan for ignored files and scaffold the config
- When triggered with file/directory references: validate they are ignored and add them to the config
- Add a `README.md` to the plugin documenting usage and configuration
- Update `plugin.json` to register the new skill

## Capabilities

### New Capabilities

- `config-management`: Skill that creates or updates `.worktreeinclude.yaml` — scaffolds from ignored file detection when no specific files mentioned, or adds specific entries when the user references files/directories
- `plugin-readme`: README documenting the plugin's purpose, installation, configuration format, and skill usage

### Modified Capabilities

(none)

## Impact

- Affected code: `plugins/worktree-bootstrap/plugin.json`, new directory `plugins/worktree-bootstrap/skills/config/`, new file `plugins/worktree-bootstrap/README.md`
