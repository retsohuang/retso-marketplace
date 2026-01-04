---
description: Create or update project governance principles and constitution
allowed-tools: Read, Write, Bash
model: claude-sonnet-4-5
---

# Update Project Constitution

Create or update your project's constitution with governance principles, technical standards, and decision-making guidelines.

## Usage

```bash
/spec-kit:constitution
```

No arguments required - the command will read the existing constitution (if any) and help you update it.

## Process

### Step 1: Check for Existing Constitution

Read the current constitution:

```bash
cat .claude/spec-kit/memory/constitution.md
```

If it doesn't exist, inform the user and suggest running `/spec-kit:init` first.

### Step 2: Review Current Constitution

If a constitution exists, show the user the current:
- Project vision
- Core principles
- Technical standards
- Decision-making guidelines

### Step 3: Understand What to Update

Ask the user what they want to update or add to the constitution. Common updates include:
- Refining core principles based on project learnings
- Adding new technical standards
- Updating decision-making criteria
- Adding success metrics
- Documenting new team agreements

### Step 4: Review Existing Specs for Consistency

Check if there are existing specs in `.claude/spec-kit/specs/`:

```bash
ls -la .claude/spec-kit/specs/
```

If specs exist, note that you'll validate consistency between the updated constitution and existing specs.

### Step 5: Update Constitution

Update `.claude/spec-kit/memory/constitution.md` with:
- User's requested changes
- Current date in "Last Updated" field
- Incremented version number
- Clear reasoning for changes in the Evolution section

Maintain the template structure:
- Project Vision
- Core Principles (Technical Excellence, User Experience, Team Collaboration, Velocity)
- Technical Standards (Architecture, Code Style, Testing, Documentation)
- Decision-Making Guidelines
- Success Criteria
- Evolution notes

### Step 6: Validate Consistency

If existing specs are found, check consistency:
- Do updated principles align with decisions made in existing specs?
- Are there conflicts between new standards and existing plans?
- Do any specs need updates to reflect the new constitution?

Report any inconsistencies and suggest running `/spec-kit:analyze` for a detailed consistency check.

### Step 7: Show Summary

Display what changed:

```
✅ Constitution Updated!

Changes Made:
- Updated: {What was changed}
- Added: {What was added}
- Version: {Old Version} → {New Version}

Existing Features: {Count} feature specs found
- Consider running: /spec-kit:analyze

Next Steps:
1. Review the updated constitution: .claude/spec-kit/memory/constitution.md
2. Validate consistency with specs: /spec-kit:analyze
3. Share updates with the team

Tip: Use /spec-kit:analyze to check if existing specs align with updated principles.
```

## Key Principles for Constitution Updates

### What Belongs in the Constitution

**Do Include:**
- Core values and principles
- Technical standards that apply project-wide
- Decision-making frameworks
- When to write specs vs. implement directly
- Definition of "done" and success criteria

**Don't Include:**
- Specific feature requirements (those go in specs)
- Implementation details (those go in plans)
- Temporary decisions (those go in plans with rationale)
- Personal preferences that don't affect the team

### Making Good Updates

- **Be Specific**: "Write tests" → "Unit test all business logic with >80% coverage"
- **Be Actionable**: Principles should guide concrete decisions
- **Be Realistic**: Don't set standards you can't maintain
- **Be Consistent**: New principles should work with existing ones
- **Document Why**: Explain the reasoning behind changes

## Common Constitution Updates

### Adding a New Principle

When the team agrees on a new way of working:
```markdown
### New Principle: Performance Budget
- All pages load in <3s on 3G networks
- Measure with Lighthouse in CI
- Reject PRs that degrade performance >10%
```

### Refining an Existing Standard

When you learn a better approach:
```markdown
### Testing Strategy
~~- Write tests when you have time~~
- Unit tests for business logic (required)
- Integration tests for API endpoints (required)
- E2E tests for critical user flows (optional)
- Aim for 80% coverage, enforce 60% minimum
```

### Updating Decision Criteria

When the project phase changes:
```markdown
### When to Write a Spec
// MVP Phase: Only for multi-day features
// Scale Phase: For anything >1 day or touching >3 files
- Features requiring architectural decisions
- Changes that affect multiple systems
- Anything requiring stakeholder alignment
```

## Error Handling

- If constitution file doesn't exist, guide user to run `/spec-kit:init`
- If user's changes conflict with existing principles, point it out
- If specs directory doesn't exist, that's OK (no specs yet)

## Notes

- Constitution updates should be team decisions, not individual preferences
- Version numbers help track evolution over time
- The Evolution section should explain why updates were made
- Consistency with existing specs matters - run `/spec-kit:analyze` after major updates
