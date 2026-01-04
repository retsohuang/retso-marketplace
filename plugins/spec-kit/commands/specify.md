---
description: Define requirements and user stories for a new feature
allowed-tools: Read, Write, Bash
model: claude-opus-4-5
---

# Create Feature Specification

Define detailed requirements, user stories, and acceptance criteria for a new feature. This creates a specification document that serves as the foundation for planning and implementation.

## Usage

```bash
/spec-kit:specify <feature-name>
```

**Example:**
```bash
/spec-kit:specify user-authentication
```

The feature name should be short, descriptive, and kebab-case (e.g., "user-auth", "payment-flow", "admin-dashboard").

## Process

### Step 1: Validate Setup

Check if spec-kit is initialized:

```bash
if [ ! -d .claude/spec-kit ]; then
  echo "❌ Spec-kit not initialized. Run: /spec-kit:init"
  exit 1
fi
```

### Step 2: Create Feature Directory

Use the CLI to create the feature with sequential numbering:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/cli.js create-feature <feature-name> --plugin-root ${CLAUDE_PLUGIN_ROOT}
```

This will:
- Determine the next feature number (e.g., 001, 002, 003)
- Create `.claude/spec-kit/specs/{NNN}-{feature-name}/`
- Set this spec as the current working spec in `progress.yml`

The CLI outputs JSON with the spec ID, feature directory, and feature number.

### Step 3: Read Constitution

Read the project constitution to understand guiding principles:

```bash
cat .claude/spec-kit/memory/constitution.md
```

Keep these principles in mind when creating the spec.

### Step 4: Gather Requirements

Have a conversation with the user to understand:
- What problem are we solving?
- Who are the users?
- What should the feature do?
- What should it NOT do?
- What are the success criteria?
- What are the constraints (timeline, resources, technical)?

Ask clarifying questions to ensure you understand the full scope.

### Step 5: Load Spec Template

Load the spec template from the CLI:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/cli.js template spec-template --plugin-root ${CLAUDE_PLUGIN_ROOT}
```

### Step 6: Write Specification

Create `.claude/spec-kit/specs/{NNN}-{feature-name}/spec.md` with:

**Overview Section:**
- Problem statement (what pain point does this solve?)
- Proposed solution (high-level approach)
- Goals (what we want to achieve)
- Non-goals (what's explicitly out of scope)

**User Stories:**
- Primary user stories with acceptance criteria
- Cover different user personas
- Use format: "As a [user], I want [goal] so that [benefit]"
- Include 3-5 checkbox items per story for acceptance criteria

**Requirements:**
- Functional requirements (what the system must do)
- Non-functional requirements (performance, scalability, security)
- Technical requirements (dependencies, constraints)
- Number them (FR-1, NFR-1, TR-1) for easy reference

**Additional Sections:**
- User interface (mockups or descriptions)
- Data requirements (models, sources, persistence)
- Integration points (external services, internal systems)
- Security considerations
- Success metrics
- Risks and mitigation
- Open questions
- Out of scope items

### Step 7: Align with Constitution

Ensure the spec aligns with the project constitution:
- Do the requirements match the project vision?
- Are technical requirements consistent with standards?
- Does the scope match "when to write a spec" guidelines?

### Step 8: Show Summary

Display what was created:

```
Specification Created!

Feature: {NNN}-{feature-name}
Location: .claude/spec-kit/specs/{NNN}-{feature-name}/spec.md
Current Spec: Set in progress.yml

Sections Completed:
- Overview (problem, solution, goals)
- User Stories ({count} stories, {count} acceptance criteria)
- Requirements (FR: {count}, NFR: {count}, TR: {count})
- Data Models ({count} models)
- Success Metrics ({count} metrics)

Next Steps:
1. Review and refine: .claude/spec-kit/specs/{NNN}-{feature-name}/spec.md
2. Resolve ambiguities: /spec-kit:clarify
3. Create implementation plan: /spec-kit:plan

Tip: Run /spec-kit:clarify to identify and resolve any unclear requirements.
```

## Writing Good Specifications

### Problem Statement

**Good:**
> Users currently have to manually copy data between systems, which takes 30 minutes daily per user and is error-prone. We're seeing 15% error rate in data entry.

**Bad:**
> We need better data management.

### User Stories

**Good:**
> **As a** customer service rep
> **I want** to search orders by customer email
> **So that** I can quickly find order history during support calls
>
> **Acceptance Criteria:**
> - [ ] Search returns results in <2 seconds
> - [ ] Shows orders from past 2 years
> - [ ] Displays order ID, date, status, and total

**Bad:**
> Users should be able to search orders.

### Requirements

**Good:**
> **FR-1**: Order Search
> - Description: System must allow searching orders by email, order ID, or date range
> - Priority: High
> - Dependencies: None

**Bad:**
> Need search feature.

### Non-Functional Requirements

**Good:**
> **NFR-1**: Search Performance
> - Description: Search queries must return results quickly
> - Metric: P95 response time
> - Target: <2 seconds for 95% of queries

**Bad:**
> Should be fast.

## Error Handling

- If spec-kit not initialized, direct user to `/spec-kit:init`
- If feature name contains spaces or invalid characters, normalize it
- If feature directory creation fails, report the error clearly
- If user provides insufficient information, ask clarifying questions

## Notes

- The spec is the source of truth for what we're building
- It should be detailed enough to plan from, but not prescriptive about implementation
- Keep it focused - large features may need multiple specs
- Update the spec if requirements change during implementation
- Link to design mockups, research docs, or related specs
- The feature number is permanent - don't renumber existing features
