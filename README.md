# Retso Marketplace

Custom marketplace for Claude Code plugins.

## About

This marketplace provides a curated collection of Claude Code extensions including plugins, commands, agents, hooks, and MCP servers.

## Installation

Users can add this marketplace to their Claude Code installation using one of the following methods:

### From GitHub

```bash
/plugin marketplace add retsohuang/retso-marketplace
```

### From Local Path

```bash
/plugin marketplace add /path/to/retso-marketplace
```

### From Git URL

```bash
/plugin marketplace add https://github.com/retsohuang/retso-marketplace.git
```

## Using Plugins

Once the marketplace is added, install plugins with:

```bash
/plugin install plugin-name@retso-marketplace
```

List available plugins:

```bash
/plugin marketplace list
```

## Adding Plugins to This Marketplace

### Local Plugins

1. Create your plugin directory under `plugins/`:

   ```bash
   mkdir -p plugins/my-plugin
   ```

2. Add your plugin files (commands, agents, hooks, etc.)

3. Update `.claude-plugin/marketplace.json` to include your plugin:
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
     "keywords": ["keyword1", "keyword2"]
   }
   ```

### External Plugins (GitHub)

Reference plugins from other repositories:

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

### External Plugins (Git URL)

Reference plugins from any Git server:

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

## Plugin Structure

A typical plugin in this marketplace should follow this structure:

```
plugins/my-plugin/
├── plugin.json          # Plugin metadata (optional if strict: false)
├── commands/            # Slash commands
│   └── my-command.md
├── agents/              # AI agents
│   └── my-agent.md
├── hooks/               # Event hooks
│   └── hooks.json
└── mcp-servers/         # MCP server configs
    └── server-config.json
```

## Marketplace Configuration

The marketplace is configured in `.claude-plugin/marketplace.json`. Key fields:

- **name**: Marketplace identifier (kebab-case)
- **owner**: Maintainer information
- **description**: Marketplace description
- **version**: Marketplace version
- **pluginRoot**: Base path for local plugins (default: `./plugins`)
- **plugins**: Array of plugin definitions

## Available Plugins

| Plugin Name                                                | Description                                                                                                                                                   | Version |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| [code-review-tools](./plugins/code-review-tools/README.md) | Review code changes commit-by-commit with custom rules support. Includes interactive setup and rule creation.                                                 | 2.1.1   |
| [github-tools](./plugins/github-tools/README.md)           | GitHub workflow tools for daily development. Analyze PR review comments and categorize what needs fixing.                                                     | 0.1.1   |
| [spec-kit](./plugins/spec-kit/README.md)                   | Spec-Driven Development toolkit for Claude Code. Create specifications, plans, and tasks following a structured workflow from requirements to implementation. | 0.1.0   |

## Contributing

To contribute a plugin to this marketplace:

1. Fork this repository
2. Add your plugin to the `plugins/` directory or reference it externally
3. Update `.claude-plugin/marketplace.json` with your plugin entry
4. Update the Available Plugins table in this README
5. Submit a pull request

## License

Individual plugins may have their own licenses. Check each plugin's license field in the marketplace configuration.

## Contact

Maintainer: Retso Huang (retsohuang@gmail.com)

## Resources

- [Claude Code Plugin Marketplaces Documentation](https://code.claude.com/docs/en/plugin-marketplaces)
- [Claude Code Documentation](https://code.claude.com/docs)
