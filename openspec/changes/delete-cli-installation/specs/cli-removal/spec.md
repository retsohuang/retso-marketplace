## REMOVED Requirements

### Requirement: CLI plugin installer
**Reason**: Replaced by Claude Code's native `--plugin-dir` flag and marketplace installation
**Migration**: Use `claude --plugin-dir ./plugins/<name>` for local testing, or `/plugin marketplace add` for marketplace installation

#### Scenario: CLI binary no longer available
- **WHEN** user attempts to run `plugin-kit` or `pk`
- **THEN** the command SHALL NOT be available as the binary is no longer built or distributed
