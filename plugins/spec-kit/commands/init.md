---
description: Initialize project for spec-kit with governance principles
allowed-tools: Bash, Write, AskUserQuestion, Read
model: claude-haiku-4-5
---

# Spec-Kit Initialization

Initialize your project for spec-driven development. This command sets up the directory structure and creates a project constitution with governance principles.

## Usage

```bash
/spec-kit:init
```

No arguments required - the command will guide you through the setup interactively.

## Setup Process

### Step 1: Check Existing Setup

Check if `.claude/spec-kit/` already exists:

```bash
if [ -d .claude/spec-kit ]; then
  echo "⚠️ Spec-kit is already initialized in this project"
fi
```

If it exists, ask the user if they want to:
- Continue and update the constitution
- Cancel (keep existing setup)

### Step 2: Initialize Directory Structure

Use the CLI to create the directory structure:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/cli.js init --plugin-root ${CLAUDE_PLUGIN_ROOT}
```

This creates:
- `.claude/spec-kit/`
- `.claude/spec-kit/memory/`
- `.claude/spec-kit/specs/`

The CLI outputs JSON with the constitution template.

### Step 3: Ask About Project Details

Use AskUserQuestion to gather information for the constitution:

**Question 1: "What is your project name?"**
- Header: "Project Name"
- This will be used in the constitution header

**Question 2: "What are your key guiding principles? (Select all that apply)"**
- Header: "Principles"
- MultiSelect: true
- Options:
  1. "Ship fast, iterate quickly" - "Prioritize velocity and learning"
  2. "Quality over speed" - "Thorough testing and review first"
  3. "User-centered design" - "Always start with user needs"
  4. "Technical excellence" - "Clean code and best practices"
  5. "Pragmatic simplicity" - "Choose simple solutions that work"

### Step 4: Create Constitution

Create `.claude/spec-kit/memory/constitution.md` with the template from the CLI output, customized with user inputs:

```markdown
# Project Constitution: {Project Name}

## Project Vision

{Brief vision based on user input}

## Core Principles

### Technical Excellence
- {Based on user selections}
- Maintain high code quality standards
- Write tests for critical functionality

### User Experience
- {Based on user selections}
- Focus on solving real user problems
- Design for accessibility and performance

### Team Collaboration
- Clear communication in specs and code
- Constructive code reviews
- Share knowledge proactively

### Velocity and Iteration
- {Based on user selections}
- Ship MVPs to learn quickly
- Balance technical debt and feature delivery

## Technical Standards

### Architecture
- Follow established patterns in the codebase
- Document architectural decisions in plans
- Consider scalability for critical systems

### Code Style
- Follow the project's style guide
- Use consistent naming conventions
- Keep functions focused and testable

### Testing Strategy
- Unit tests for business logic
- Integration tests for critical flows
- Manual testing for user experience

### Documentation
- README for project setup
- Inline comments for complex logic
- API documentation for endpoints

## Decision-Making Guidelines

### When to Write a Spec
- New features that touch multiple files
- Significant refactoring or architecture changes
- Features that require stakeholder alignment
- Anything that takes more than 2 days to implement

### When to Skip the Spec
- Bug fixes that don't change architecture
- Small UI tweaks or copy changes
- Straightforward CRUD operations
- Emergency hotfixes

### Trade-off Framework
- Consider: Impact, Effort, Risk, Learning
- Document trade-offs in the plan
- Review with team for major decisions

## Success Criteria

- Features meet spec requirements
- Code passes review and tests
- Documentation is complete
- User feedback is positive

## Evolution

This constitution is a living document. Update it when:
- Team grows or composition changes
- Project phase shifts (MVP → scale)
- You learn better approaches
- Principles no longer serve the project

---

**Last Updated**: {Current Date}
**Version**: 1.0
```

### Step 5: Show Summary

Display a completion message:

```
✅ Spec-Kit Initialized!

Created:
- .claude/spec-kit/memory/constitution.md
- .claude/spec-kit/specs/ (feature directory)

Your Project: {Project Name}

Guiding Principles:
- {Selected principle 1}
- {Selected principle 2}
- {Selected principle 3}

Next Steps:
1. Review and customize: .claude/spec-kit/memory/constitution.md
2. Create your first spec: /spec-kit:specify <feature-name>
3. Read the workflow guide: /help spec-kit

Tip: Use /spec-kit:constitution to update your governance principles anytime.
```

## Error Handling

- If directory creation fails, show clear error message
- If file write fails, show error and what was created
- If user cancels, exit gracefully without creating files
- If CLI command fails, show the error from the CLI

## Notes

- The constitution is stored in `.claude/spec-kit/memory/constitution.md`
- Features are stored in `.claude/spec-kit/specs/{NNN}-{feature-name}/`
- You can run `/spec-kit:init` again to reset the constitution
- Always customize the constitution to fit your project's needs
- The constitution should evolve as your project grows
