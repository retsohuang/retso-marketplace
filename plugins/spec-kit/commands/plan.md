---
description: Create technical implementation plan with architecture and design decisions
allowed-tools: Read, Write, Bash, Glob, Grep
model: claude-opus-4-5
---

# Create Implementation Plan

Design the technical approach for implementing a feature. This creates a detailed plan with architectural decisions, file structure, data models, API contracts, and implementation phases.

## Usage

```bash
/spec-kit:plan
```

Optionally specify a spec: `/spec-kit:plan 001` or `/spec-kit:plan user-auth`

## Process

### Step 1: Get Current Spec Context

Use the get-current-spec skill to determine which spec to work with.

The skill will:
1. Check if user mentioned a spec in their input (e.g., "001", "user-auth")
2. Read from progress.yml if no spec mentioned
3. Prompt user to select if neither available
4. Update progress.yml via set-current-spec skill when a new spec is chosen

After the skill completes, you will have:
- Feature number: {NNN}
- Feature name: {feature-name}
- Feature directory: .claude/spec-kit/specs/{NNN}-{feature-name}/

### Step 2: Read Specification and Constitution

Read the feature spec and project constitution:

```bash
cat .claude/spec-kit/specs/{NNN}-{feature-name}/spec.md
cat .claude/spec-kit/memory/constitution.md
```

### Step 3: Explore Codebase

Understand existing architecture and patterns:

```bash
# Find existing similar features
fd -t f -e ts -e tsx -e js -e jsx | head -20

# Look for architectural patterns
rg "export.*class|export.*function|export default" --type ts -g "!node_modules" | head -50

# Find data models
rg "interface|type.*=" --type ts -g "*types.ts" -g "*models.ts"

# Find API patterns
rg "router\.|app\.(get|post|put|delete)" --type ts

# Check testing patterns
fd -t f test.ts$ | head -10
```

Understand:
- How similar features are structured
- Naming conventions and patterns
- Where different types of code live (components, services, utilities)
- How data flows through the system
- Testing approach

### Step 4: Load Plan Template

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/cli.js template plan-template --plugin-root ${CLAUDE_PLUGIN_ROOT}
```

### Step 5: Design Architecture

Create `.claude/spec-kit/specs/{NNN}-{feature-name}/plan.md` with:

**Architecture Overview:**
- High-level design principles for this feature
- How it fits into existing architecture
- Key architectural decisions with rationale

**Architectural Decisions:**
For each major decision, document:
- Context: Why this decision is needed
- Options considered: 2-3 alternatives
- Decision: Chosen approach
- Rationale: Why this option
- Consequences: Trade-offs and implications

**File Structure:**
- New files to create (with purpose and complexity)
- Existing files to modify (with changes needed)
- Follow existing project structure
- Use realistic file paths from your exploration

**Data Models:**
- Define interfaces/types for domain models
- Show relationships between models
- Include field descriptions
- Consider validation and constraints

**API Contracts:**
- Endpoint definitions (method, path, auth)
- Request/response schemas
- Error responses
- Status codes

**Component Hierarchy:**
- Visual representation of component relationships
- Props flow between components
- State management approach

**State Management:**
- What needs to be global vs local
- Where state lives
- How state updates

**Dependencies:**
- New packages to add (with justification)
- Version constraints
- Bundle size impact

**Database Changes:**
- New tables/collections
- Schema migrations
- Indexes needed
- Migration strategy

**Integration Points:**
- External services (auth, rate limits, error handling)
- Internal APIs (contracts, error handling)

**Testing Strategy:**
- Unit tests (what needs testing)
- Integration tests (critical flows)
- E2E tests (user flows)

**Security Considerations:**
- Authentication/authorization approach
- Data protection strategy
- Input validation approach

**Performance Considerations:**
- Optimization strategies
- Monitoring approach
- Performance targets

**Implementation Phases:**
Break work into 3-4 phases:
- Phase 1: Foundation (core setup)
- Phase 2: Core Features (main functionality)
- Phase 3: Polish (refinements, edge cases)
- Phase 4: Launch (deployment, monitoring)

Each phase should have:
- Clear goal
- Rough duration estimate
- Key deliverables
- Dependencies

**Rollout Strategy:**
- Feature flags
- Deployment phases (staging, canary, full)
- Rollback plan

**Risks and Mitigation:**
- Technical risks
- Mitigation strategies
- Contingency plans

### Step 6: Align with Constitution

Ensure the plan follows project standards:
- Architecture decisions align with technical standards
- Testing strategy matches constitution requirements
- Code organization follows project conventions
- Dependencies are justified and minimal

### Step 7: Validate Completeness

Check that the plan answers:
- ✅ What files will be created/modified?
- ✅ What data models are needed?
- ✅ What APIs will be built?
- ✅ How will it be tested?
- ✅ How will it be deployed?
- ✅ What could go wrong?

### Step 8: Show Summary

```
✅ Implementation Plan Created!

Feature: {NNN}-{feature-name}
Location: .claude/spec-kit/specs/{NNN}-{feature-name}/plan.md

Plan Details:
- Architectural Decisions: {count}
- New Files: {count}
- Modified Files: {count}
- Data Models: {count}
- API Endpoints: {count}
- Implementation Phases: {count}
- Total Estimated Duration: {rough estimate}

Key Decisions:
1. {Decision 1}: {Chosen approach}
2. {Decision 2}: {Chosen approach}
3. {Decision 3}: {Chosen approach}

Next Steps:
1. Review plan: .claude/spec-kit/specs/{NNN}-{feature-name}/plan.md
2. Validate consistency: /spec-kit:analyze
3. Generate tasks: /spec-kit:tasks

Tip: Run /spec-kit:analyze to check consistency between spec, plan, and constitution.
```

## Writing Good Plans

### Good Architectural Decision

```markdown
#### Decision: State Management Approach

**Context**: User authentication state needs to be accessible across many components

**Options Considered:**
1. React Context - Simple, built-in, no dependencies
2. Redux - Robust, time-travel debugging, more boilerplate
3. Zustand - Minimal, hooks-based, less boilerplate than Redux

**Decision**: Use React Context

**Rationale**:
- Auth state is simple (logged in/out, user object)
- No complex state interactions that need Redux
- Avoid dependency for this simple use case
- Team is familiar with Context

**Consequences**:
- May need to refactor if state becomes complex
- No built-in dev tools for debugging state
- Good enough for current requirements
```

### Good File Structure

```
src/
├── features/
│   └── user-auth/
│       ├── components/
│       │   ├── LoginForm.tsx          # Main login component
│       │   ├── RegisterForm.tsx       # Registration form
│       │   └── AuthProvider.tsx       # Context provider
│       ├── hooks/
│       │   └── useAuth.ts             # Auth hook for consuming context
│       ├── services/
│       │   └── authService.ts         # API calls for auth
│       ├── types.ts                   # Auth-related types
│       └── index.ts                   # Public API
```

### Good Data Model

```typescript
interface User {
  id: string;              // UUID from database
  email: string;           // Validated email, used for login
  name: string;            // Display name
  role: UserRole;          // admin | user | guest
  createdAt: Date;         // Account creation timestamp
  lastLoginAt: Date | null; // Last successful login
}

type UserRole = 'admin' | 'user' | 'guest';
```

## Error Handling

- If not on spec-kit branch, show how to checkout
- If spec.md doesn't exist, direct to `/spec-kit:specify`
- If constitution doesn't exist, mention it but continue
- If codebase exploration fails, work with what you found

## Notes

- Plans should be detailed but not prescriptive - leave room for learning during implementation
- Reference specific files and patterns from the actual codebase
- Estimate durations in ranges (1-2 days, 3-5 days) not exact numbers
- Document trade-offs honestly - every decision has pros and cons
- The plan is a living document - update it if you learn something during implementation
