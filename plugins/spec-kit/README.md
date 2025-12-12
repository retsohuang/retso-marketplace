# Spec-Kit Plugin

Spec-Driven Development toolkit for Claude Code. Create specifications, plans, and tasks following a structured workflow from requirements to implementation.

## Overview

This plugin brings GitHub's spec-kit methodology to Claude Code, enabling a systematic approach to software development that starts with specifications and flows through to implementation.

**Key Features:**
- **Structured workflow**: From constitution → specifications → plans → tasks → implementation
- **Sequential feature tracking**: Automatic numbering and branch management for features
- **Template-driven**: Consistent format for all spec artifacts
- **Git integration**: Automatic branch creation and feature directory management
- **Quality validation**: Analyze cross-artifact consistency before implementation
- **Interactive clarification**: Ask targeted questions to resolve ambiguities

## Quick Start

### 1. Initialize Your Project

Set up spec-kit in your project:

```bash
/spec-kit:init
```

This will:
- Create `.claude/spec-kit/memory/` for project governance
- Create `.claude/spec-kit/specs/` for feature specifications
- Generate a constitution template with project principles

### 2. Create a Specification

Define requirements for a new feature:

```bash
/spec-kit:specify <feature-name>
```

**Example:**
```bash
/spec-kit:specify user-authentication
```

This will:
- Create `.claude/spec-kit/specs/001-user-authentication/`
- Generate `spec.md` with requirements and user stories
- Create git branch `spec-kit/001-user-authentication`

### 3. Create an Implementation Plan

Design the technical approach:

```bash
/spec-kit:plan
```

This will:
- Read your `spec.md` and `constitution.md`
- Generate `plan.md` with architectural decisions
- Include file structures and dependencies

### 4. Generate Tasks

Break down the plan into actionable tasks:

```bash
/spec-kit:tasks
```

This will:
- Parse your `plan.md`
- Generate `tasks.md` with dependency-ordered tasks
- Include acceptance criteria for each task

### 5. Implement the Feature

Execute the tasks:

```bash
/spec-kit:implement
```

This will:
- Read `tasks.md`
- Execute tasks in dependency order
- Check off completed tasks

## Workflow

The complete spec-driven development workflow:

```
1. Constitution     → Define project governance principles
2. Specify          → Write requirements and user stories
3. Clarify          → Resolve ambiguities interactively
4. Plan             → Design technical implementation
5. Analyze          → Validate cross-artifact consistency
6. Tasks            → Generate dependency-ordered task list
7. Implement        → Execute tasks to build feature
```

### Optional Commands

- **Clarify**: `/spec-kit:clarify` - Ask questions to resolve spec ambiguities
- **Analyze**: `/spec-kit:analyze` - Read-only consistency validation across artifacts
- **Constitution**: `/spec-kit:constitution` - Update project governance principles

## Architecture

This plugin uses a **TypeScript CLI** for robust git operations and artifact management, compiled to JavaScript and bundled with the plugin for zero-dependency execution.

### Components

```
spec-kit/
├── commands/                    # Slash commands (8 total)
│   ├── init.md                  # Project setup
│   ├── constitution.md          # Governance principles
│   ├── specify.md               # Requirements definition
│   ├── clarify.md               # Interactive ambiguity resolution
│   ├── plan.md                  # Technical planning
│   ├── tasks.md                 # Task generation
│   ├── analyze.md               # Consistency validation
│   └── implement.md             # Task execution
├── templates/                   # Artifact templates
│   ├── constitution-template.md
│   ├── spec-template.md
│   ├── plan-template.md
│   ├── tasks-template.md
│   └── checklist-template.md
└── scripts/                     # TypeScript CLI (compiled to JS)
    ├── src/                     # TypeScript source
    │   ├── cli.ts               # CLI entry point
    │   └── cli.test.ts          # Test suite
    └── dist/                    # Compiled JavaScript (committed)
        └── cli.js               # Single bundled file
```

### CLI Usage

The TypeScript CLI can be used standalone:

```bash
# Initialize project
node scripts/dist/cli.js init --plugin-root ${CLAUDE_PLUGIN_ROOT}

# Create new feature (sequential numbering)
node scripts/dist/cli.js create-feature user-auth --plugin-root ${CLAUDE_PLUGIN_ROOT}

# List existing features
node scripts/dist/cli.js list-features --plugin-root ${CLAUDE_PLUGIN_ROOT}

# Load a template
node scripts/dist/cli.js template spec-template --plugin-root ${CLAUDE_PLUGIN_ROOT}

# List artifacts for a feature
node scripts/dist/cli.js artifacts .claude/spec-kit/specs/001-user-auth

# Validate branch name
node scripts/dist/cli.js validate-branch spec-kit/001-user-auth
```

**Benefits:**
- ✅ **Zero dependencies** for users — compiled JavaScript runs on Node.js
- ✅ **Type safety** during development with TypeScript
- ✅ **No shell escaping issues** — all logic in TypeScript
- ✅ **Testable** — comprehensive test suite with Bun
- ✅ **Fast** — ~20ms startup time

## Storage Structure

When you use spec-kit, artifacts are organized as:

```
.claude/spec-kit/
├── memory/
│   └── constitution.md          # Project governance principles
└── specs/
    ├── 001-user-authentication/ # Sequential feature directories
    │   ├── spec.md              # Requirements and user stories
    │   ├── plan.md              # Technical implementation plan
    │   ├── tasks.md             # Actionable task list
    │   └── checklists/          # Optional quality checklists
    │       └── requirements.md
    ├── 002-payment-integration/
    │   ├── spec.md
    │   ├── plan.md
    │   └── tasks.md
    └── 003-admin-dashboard/
        ├── spec.md
        └── plan.md
```

### Branch Naming Convention

Features are tracked using git branches:
- **Pattern**: `spec-kit/{number}-{feature-name}`
- **Examples**:
  - `spec-kit/001-user-authentication`
  - `spec-kit/002-payment-integration`
  - `spec-kit/003-admin-dashboard`

The CLI automatically:
- Determines the next sequential number
- Creates the feature directory
- Creates and checks out the branch

## Commands Reference

| Command                      | Model  | Description                               |
| ---------------------------- | ------ | ----------------------------------------- |
| `/spec-kit:init`             | Haiku  | Initialize project for spec-kit           |
| `/spec-kit:constitution`     | Sonnet | Create/update governance principles       |
| `/spec-kit:specify <name>`   | Opus   | Define requirements and user stories      |
| `/spec-kit:clarify`          | Sonnet | Resolve specification ambiguities         |
| `/spec-kit:plan`             | Opus   | Create technical implementation plan      |
| `/spec-kit:tasks`            | Sonnet | Generate actionable task list             |
| `/spec-kit:analyze`          | Sonnet | Validate cross-artifact consistency       |
| `/spec-kit:implement`        | Sonnet | Execute tasks to build feature            |

### Command Details

#### /spec-kit:init
- Interactive setup with project name and guiding principles
- Creates directory structure
- Generates constitution from template
- **Model**: Haiku (simple setup task)

#### /spec-kit:constitution
- Updates project governance principles
- Validates consistency with existing specs
- Can be run anytime to refine principles
- **Model**: Sonnet (complex governance reasoning)

#### /spec-kit:specify
- Requires feature name argument
- Creates sequential feature directory
- Generates spec.md with requirements and user stories
- Creates git branch automatically
- **Model**: Opus (deep requirement analysis)

#### /spec-kit:clarify
- Interactive Q&A session (max 5 questions)
- Updates spec.md with clarifications
- Must be run from within a feature directory
- **Model**: Sonnet (interactive clarification)

#### /spec-kit:plan
- Reads spec.md and constitution.md
- Generates plan.md with:
  - Architectural decisions
  - File structures
  - Dependencies
  - Data models
  - API contracts
- **Model**: Opus (architecture planning)

#### /spec-kit:tasks
- Reads plan.md
- Generates tasks.md with:
  - Dependency-ordered tasks
  - Acceptance criteria
  - Estimated complexity
  - Prerequisites
- **Model**: Sonnet (task decomposition)

#### /spec-kit:analyze
- **Read-only validation** (never modifies files)
- Checks consistency across:
  - Constitution ↔ spec.md
  - spec.md ↔ plan.md
  - plan.md ↔ tasks.md
- Reports inconsistencies and gaps
- **Model**: Sonnet (consistency analysis)

#### /spec-kit:implement
- Reads tasks.md
- Executes tasks in dependency order
- Checks off completed tasks
- Can resume interrupted implementation
- **Model**: Sonnet (implementation)

## Templates

All artifacts follow consistent templates:

### constitution-template.md
- Project vision and goals
- Guiding principles
- Technical standards
- Decision-making guidelines

### spec-template.md
- Feature overview
- User stories
- Requirements (functional, non-functional, technical)
- Success criteria
- Out of scope

### plan-template.md
- Architecture overview
- File structure
- Dependencies
- Data models
- API contracts
- Implementation phases

### tasks-template.md
- Phase-organized tasks
- Acceptance criteria
- Dependencies
- Complexity estimates

### checklist-template.md
- Quality checkpoints
- Testing requirements
- Documentation needs
- Review criteria

## Feature Numbering

Features are numbered sequentially:
1. First feature: `001-feature-name`
2. Second feature: `002-another-feature`
3. Third feature: `003-yet-another`

The CLI automatically:
- Scans `.claude/spec-kit/specs/` for existing features
- Determines the next available number
- Creates the directory with correct padding

## Best Practices

### Constitution First
Start every project with `/spec-kit:init` to establish governance principles. These guide all future specifications.

### One Feature, One Branch
Always create a new branch for each feature. This keeps work isolated and makes tracking easier.

### Clarify Early
Use `/spec-kit:clarify` after writing your spec to resolve ambiguities before planning. This saves rework.

### Analyze Before Implementing
Run `/spec-kit:analyze` after generating tasks to catch inconsistencies before writing code.

### Sequential Workflow
Follow the workflow order: constitution → specify → clarify → plan → analyze → tasks → implement

### Regular Constitution Updates
Update your constitution as you learn. Use `/spec-kit:constitution` to refine principles based on project evolution.

## Files and Directories

```
plugins/spec-kit/
├── plugin.json                  # Plugin metadata
├── README.md                    # This file
├── commands/
│   ├── init.md
│   ├── constitution.md
│   ├── specify.md
│   ├── clarify.md
│   ├── plan.md
│   ├── tasks.md
│   ├── analyze.md
│   └── implement.md
├── templates/
│   ├── constitution-template.md
│   ├── spec-template.md
│   ├── plan-template.md
│   ├── tasks-template.md
│   └── checklist-template.md
└── scripts/
    ├── src/
    │   ├── cli.ts               # TypeScript CLI
    │   └── cli.test.ts          # Test suite
    ├── dist/
    │   └── cli.js               # Compiled JavaScript
    ├── package.json
    └── tsconfig.json

.claude/                         # Your project (not in plugin)
└── spec-kit/
    ├── memory/
    │   └── constitution.md      # Your project principles
    └── specs/
        ├── 001-feature-name/
        │   ├── spec.md
        │   ├── plan.md
        │   ├── tasks.md
        │   └── checklists/
        ├── 002-another-feature/
        │   ├── spec.md
        │   └── plan.md
        └── 003-yet-another/
            └── spec.md
```

## Contributing

### For Users

To improve this plugin:
1. Commands are in `plugins/spec-kit/commands/`
2. Templates are in `plugins/spec-kit/templates/`
3. Follow existing patterns for consistency
4. Test with various feature scenarios

### For Developers

The plugin uses a TypeScript CLI for git operations. To contribute:

#### Setup

```bash
cd plugins/spec-kit/scripts

# Install Bun (one-time)
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install
```

#### Development Workflow

```bash
# Make changes to src/

# Run tests
bun test

# Type check
bun run typecheck

# Build to dist/
bun run build

# Test CLI locally
node dist/cli.js init --plugin-root ${CLAUDE_PLUGIN_ROOT}
```

#### Before Committing

```bash
# Ensure tests pass
bun test

# Ensure dist/ is up to date
bun run build

# Commit both src/ and dist/
git add src/ dist/
git commit -m "feat: your change"
```

**Important:** Always commit the compiled `dist/` folder. Users run the JavaScript, not TypeScript.

## License

MIT

## Resources

- [GitHub's spec-kit](https://github.com/github/spec-kit) - Original inspiration
- [Claude Code Documentation](https://code.claude.com/docs)
- [Plugin Marketplaces Documentation](https://code.claude.com/docs/en/plugin-marketplaces)
