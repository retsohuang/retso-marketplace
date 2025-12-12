---
description: Resolve specification ambiguities through interactive Q&A
allowed-tools: Read, Write, AskUserQuestion
model: claude-sonnet-4-5
---

# Clarify Specification

Resolve ambiguities, answer open questions, and refine requirements in an existing specification through an interactive Q&A session.

## Usage

```bash
/spec-kit:clarify
```

Must be run from within a feature branch (e.g., `spec-kit/001-feature-name`).

## Process

### Step 1: Validate Context

Check the current branch to determine which feature to clarify:

```bash
CURRENT_BRANCH=$(git branch --show-current)
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/cli.js validate-branch "$CURRENT_BRANCH"
```

If not on a spec-kit branch, prompt the user to checkout the feature branch first.

### Step 2: Read Current Spec

Read the spec.md from the feature directory:

```bash
cat .claude/spec-kit/specs/{NNN}-{feature-name}/spec.md
```

### Step 3: Analyze for Ambiguities

Review the spec and identify:
- **Vague requirements**: Requirements without specific criteria
- **Open questions**: Questions listed in the "Open Questions" section
- **Missing details**: User stories without clear acceptance criteria
- **Unclear scope**: Features mentioned but not fully defined
- **Conflicting requirements**: Requirements that contradict each other
- **Undefined terms**: Technical terms or concepts not explained

Look for phrases like:
- "Should be fast", "should be easy", "should be intuitive"
- "As needed", "when appropriate", "if possible"
- "TBD", "TODO", "figure this out later"
- Missing success metrics or acceptance criteria

### Step 4: Prioritize Questions

Group questions by:
1. **Blockers**: Must be answered before planning (e.g., fundamental architecture choices)
2. **Important**: Should be answered before implementation (e.g., edge cases, error handling)
3. **Nice-to-have**: Can be decided during implementation (e.g., UI polish details)

Focus on blockers and important questions. Limit to **5 questions maximum** per session.

### Step 5: Ask Questions

Use AskUserQuestion to ask up to 5 clarifying questions:

**Format each question clearly:**
- Header: Brief topic (max 12 chars)
- Question: Complete, specific question
- Options: 2-4 concrete choices with implications explained
- MultiSelect: true if multiple options can be selected

**Example Questions:**

**Question 1: Authentication Method**
- Header: "Auth Method"
- Question: "Which authentication method should we use for the API?"
- Options:
  1. "OAuth 2.0" - "Standard, works with third-party services, more complex"
  2. "JWT tokens" - "Simpler, stateless, need to manage expiration"
  3. "Session cookies" - "Traditional, server-side state, works with SSR"
- MultiSelect: false

**Question 2: Error Handling**
- Header: "Error UX"
- Question: "How should we handle validation errors in the form?"
- Options:
  1. "Inline errors" - "Show errors next to each field immediately"
  2. "Toast notifications" - "Show error message at top of screen"
  3. "Summary at bottom" - "List all errors below the form"
- MultiSelect: true

### Step 6: Update Specification

Based on user answers, update the spec.md:

1. **Remove from Open Questions**: Questions that were answered
2. **Add to Requirements**: New requirements clarified
3. **Update User Stories**: Add acceptance criteria based on answers
4. **Clarify Success Metrics**: Add specific targets based on answers
5. **Update Out of Scope**: Add things explicitly decided against
6. **Add to Assumptions**: Document decisions made

**Mark updates clearly:**
```markdown
<!-- Updated YYYY-MM-DD: Clarified authentication approach -->
## Authentication

We will use JWT tokens for API authentication because:
- Stateless approach fits our microservices architecture
- Simpler to implement than OAuth for our use case
- Mobile apps can easily store and send tokens
```

### Step 7: Update Open Questions

If any questions remain unanswered or new questions emerged:
- Keep them in the "Open Questions" section
- Add priority labels (🔴 Blocker, 🟡 Important, 🟢 Nice-to-have)

### Step 8: Show Summary

Display what was clarified:

```
✅ Specification Clarified!

Questions Resolved: {count}/5
- ✅ Authentication method: JWT tokens
- ✅ Error handling: Inline errors + toast for critical errors
- ✅ Performance target: <2s page load
- ✅ Data retention: 2 years, then archive
- ✅ Mobile support: Responsive web, native app later

Updates Made:
- Added: 3 new functional requirements
- Updated: 2 user stories with acceptance criteria
- Resolved: 4 open questions
- Remaining questions: 2

Spec Location: .claude/spec-kit/specs/{NNN}-{feature-name}/spec.md

Next Steps:
1. Review updates: git diff spec.md
2. Run clarify again if needed: /spec-kit:clarify
3. Create implementation plan: /spec-kit:plan

Tip: You can run /spec-kit:clarify multiple times until all questions are resolved.
```

## Best Practices

### Ask Smart Questions

**Good Questions:**
- "Should search support fuzzy matching or exact match only?"
- "What happens when the API is down? Show cached data or error?"
- "Should admins see all users or only their organization's users?"

**Bad Questions:**
- "Should this be good?" (too vague)
- "What color should the button be?" (implementation detail, not spec-level)
- "Do you want this?" (question already answered in spec)

### Provide Context in Questions

Include **why** the question matters:

> "How should we handle concurrent edits to the same document? This affects our data model design and conflict resolution strategy."

### Offer Clear Options

Each option should include:
- **What**: The approach
- **Why**: When it makes sense
- **Trade-offs**: Pros and cons

### Limit Scope

Don't try to resolve everything at once:
- Max 5 questions per session
- Focus on blockers first
- Save implementation details for the planning phase

## When to Use Clarify

**Use /spec-kit:clarify when:**
- Spec has open questions that need answers
- Requirements are vague or ambiguous
- User stories lack acceptance criteria
- You're unsure about edge cases
- Multiple approaches are possible

**Skip /spec-kit:clarify when:**
- Spec is clear and complete
- Questions are implementation details (save for plan)
- Answers require technical investigation (do that in plan)

## Error Handling

- If not on a spec-kit branch, show which branch to checkout
- If spec.md doesn't exist, direct user to `/spec-kit:specify`
- If no ambiguities found, inform user and suggest moving to `/spec-kit:plan`
- If user provides unclear answers, ask follow-up questions

## Notes

- You can run clarify multiple times until the spec is clear
- Each session should resolve at least 1-2 key questions
- Document the reasoning behind decisions
- Update the spec date and note what changed
- If new questions arise during clarification, add them to Open Questions
