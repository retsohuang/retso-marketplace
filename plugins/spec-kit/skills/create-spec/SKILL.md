---
name: create-spec
description: Create feature specifications. Use when users want to "create a spec", "write a specification", "define requirements", or "I want to".
license: MIT
metadata:
  author: Retso Huang
  version: "1.0"
---

# Spec Workflow

Creates structured feature specifications following spec-driven development principles. Focus on WHAT users need and WHY, not HOW to implement.

## Stages

Specs progress through three stages:

| Stage                      | Description                                               | Next Action          |
| -------------------------- | --------------------------------------------------------- | -------------------- |
| **Draft**                  | Initial spec with gaps or `[NEEDS CLARIFICATION]` markers | `/spec-kit:clarify-spec`  |
| **Waiting for Validation** | All gaps resolved, ready for validation                   | `/spec-kit:validate-spec` |
| **Ready for Planning**     | Validated and complete                                    | spec-to-plan skill   |

## Workflow

### Create New Spec

Use when the user provides a new feature description.

**Stage:** (none) → Draft

**Steps:**

1. **Determine feature number**
   - Scan `specs/` directory for existing feature folders
   - Assign next sequential number (001, 002, 003...)

2. **Generate feature name**
   - Create kebab-case name from feature description
   - Example: "user authentication" → `001-user-authentication`

3. **Create directory**
   - Create `specs/{NNN}-{feature-name}/`

4. **Generate spec.md**
   - Use the template from `assets/spec-template.md`
   - Fill in sections based on user's feature description
   - Mark unknowns with `[NEEDS CLARIFICATION: specific question]`

**Quality Guards:**

- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- ❌ No speculative features - only what traces to user stories

## Template Reference

See [assets/spec-template.md](assets/spec-template.md) for the specification template structure.

## Example Usage

**User:** "Create a spec for real-time chat with message history"

**Agent:**

1. Scans `specs/` → finds 2 existing features
2. Creates `specs/003-realtime-chat/`
3. Generates `spec.md` with:
   - Overview of chat functionality
   - User stories for sending/receiving messages
   - Acceptance criteria for message history
   - Non-functional requirements (latency, persistence)
   - `[NEEDS CLARIFICATION]` markers for unknowns

**Next Steps:**

1. `/spec-kit:clarify-spec specs/003-realtime-chat` - Resolve gaps
2. `/spec-kit:validate-spec specs/003-realtime-chat` - Validate before planning
