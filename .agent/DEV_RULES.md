# Development Process & Protocols

**Purpose**: Standardized development workflow for parallel feature development across any project
**Use**: Copy to new projects in `_git_init/` directory, customize as needed

---

## Core Philosophy

**Why This Matters**: LLMs often presume knowledge they don't have. Proper research upfront prevents wasted time debugging issues that could have been avoided with better planning.

**Core Principle**: Projects start with research and planning to the point of an exclusively executable implementation plan. No guessing, no "we'll figure it out when we get there."

---

## Git Branching & Merging Protocol

We use a persistent `dev` branch for ongoing development integration, and `main` is strictly reserved for production-ready, tagged releases. 

### Branch Structure
*   `main` — Production-ready code only. No direct commits; only fast-forward merges from stable releases.
*   `dev` — The primary integration branch for all ongoing development.
*   `feat/*` or `fix/*` — Temporary branches for specific features or bugfixes.

### 0. Initializing a New Project
When starting a brand new repository, you must create the `main` branch first before setting up the `dev` environment:
```bash
# 1. Initialize git and make the first commit
git init
git add .
git commit -m "chore: initial commit"

# 2. Assign the primary branch as main (if not default)
git branch -M main

# 3. Create and switch to the development branch immediately
git checkout -b dev
```

### 1. Starting a New Feature
Always branch off the latest `main` to ensure a clean slate:
```bash
git checkout main
git pull origin main
git checkout -b feat/your-feature-name
```

### 2. Update Ready To Ship (Merging to Main)
When a feature is tested and ready to go live, use this exact 5-step process to ensure tags and remote repositories stay perfectly synced:
```bash
# 1. Move to the production branch
git checkout main

# 2. Fast-forward main to your feature branch state
git merge --ff-only feat/your-feature-name

# 3. Push the clean update to remote main
git push origin main

# 4. Give the clean push a version tag
git tag vX.Y.Z-descriptive-name

# 5. Push the version tag to the remote
git push origin vX.Y.Z-descriptive-name
```

### 3. Syncing the Development Branch
After successfully releasing a feature to `main`, keep `dev` up to date with the latest production state so parallel features don't drift:
```bash
# 1. Switch to the persistent development branch
git checkout dev

# 2. Merge the latest production code into dev
git merge main

# 3. Push the updated dev branch to remote
git push origin dev
```

---

## Exclusively Executable Implementation Plans

### Requirements for Every Update Document

#### 1. Research Phase Complete

- All APIs/libraries documented with current (2026) best practices
- Browser/platform compatibility confirmed
- Performance implications understood
- Alternative approaches evaluated
- **Critical**: Don't presume you know how something works — verify with documentation

#### 2. Architecture Decisions Documented

- Why this approach over alternatives
- What trade-offs were made
- What constraints influenced the decision
- Future extensibility considerations

#### 3. Implementation Details Specified

- Exact file changes needed
- Dependencies to add (with specific versions)
- Configuration changes required
- Test cases defined
- Edge cases identified

#### 4. Common Pitfalls Identified

- Known issues with this approach
- Edge cases to handle
- Rollback strategy if needed
- Performance considerations

### Template Structure

```markdown
# [Feature Name] Implementation Plan

## Research Summary
[What we learned, what APIs/libraries we'll use, why]

## Architecture Decision
[Approach chosen, alternatives considered, trade-offs]

## Implementation Steps
[Detailed, sequential steps with file paths]

## Testing Strategy
[How to verify it works]

## Rollback Plan
[How to undo if it breaks]
```

---

## Context Management Strategy

### Problem

Agents working on specific features don't need the entire roadmap in their context — it's noise and wastes tokens.

### Solution

1. **High-level roadmap** stays in `docs/UPDATE_MAP.md` or similar
2. **Feature-specific plans** go in `docs/plans/vX_Y_Z_feature_name.md`
3. **Agent instructions**: "Read `docs/plans/vX_Y_Z_feature_name.md` for your task. Do NOT read UPDATE_MAP.md"
4. **After completion**: Update roadmap with status, archive the plan to `docs/archive/vX/`

### Directory Structure

```
docs/
├── PROJECT_NAME.md          # Main technical reference
├── UPDATE_MAP.md            # Strategic roadmap (this stays high-level)
├── plans/                   # Active feature plans
│   ├── v3_0_0_paired_delimiters.md
│   ├── v3_0_0_file_operations.md
│   └── research_custom_highlighter.md
└── archive/
    ├── v2/                  # Completed v2 updates
    ├── v3/                  # Completed v3 updates
    └── v4/                  # Future version docs
```

---

## Parallel Development Workflow

### How Companies Do This (and How We Can)

#### 1. Multiple Agents on Different Branches Simultaneously

- Agent A: `feat/paired-delimiters` (v3.0.0)
- Agent B: `feat/file-operations` (v3.0.0)
- Agent C: `research/custom-highlighter` (future)

#### 2. Merge Conflict Prevention

**Before starting parallel work:**

1. List all files each feature will modify
2. Check for overlaps
3. If overlap exists, sequence the work or refactor to separate concerns

**Example:**
- Feature A modifies `src/editor.ts` (keymap section)
- Feature B modifies `src/editor.ts` (extensions array)
- **Decision**: Merge A first, B rebases and adds changes

#### 3. Integration Protocol

1. Complete feature A, merge to primary dev branch
2. Feature B rebases on updated branch
3. Resolve conflicts (should be minimal if planned well)
4. Run full test suite after each merge
5. Update roadmap with completion status

#### 4. Detailed Change Logs

Each agent creates `docs/archive/vX/vX_Y_Z_UPDATES.md` documenting:

- What changed (file-by-file)
- Why it changed
- Git diff confirmation
- Test results
- Any unexpected discoveries

### Best Practices

**During parallel work:**

- Each agent maintains detailed change log
- Test in isolation on feature branch
- Document any unexpected discoveries
- Don't merge until fully tested

**Merging finished updates:**

- Merge in order of completion
- Second feature rebases before merging
- Confirm no regressions
- Update documentation

---

## Agent Documentation Standards

### Every Agent Working on an Update Must

1. **Start with research** (even if it seems simple)
   - Read official documentation
   - Check current (2026) best practices
   - Verify browser/platform compatibility
   - Don't rely on training data alone

2. **Document assumptions** and verify them
   - "I assume X works this way" → verify with docs
   - "This should be compatible with Y" → test it
   - "Performance should be fine" → measure it

3. **Create before/after examples** for testing
   - What should work before the change
   - What should work after the change
   - Edge cases to test

4. **Confirm changes via git diff** before marking complete
   - Review every changed line
   - Verify no unintended changes
   - Check for debug code or comments left behind

5. **Update main technical doc** if architecture changes
   - Keep `docs/PROJECT_NAME.md` current
   - Document new patterns or conventions
   - Update architecture diagrams if needed

6. **Create archive document** in `docs/archive/vX/`
   - Full change log
   - Lessons learned
   - Known issues or limitations

### Question for Future Standardization

Should agents confirm diffs against git automatically as part of their completion checklist?

---

## Research Phase Best Practices

### When Research Is Needed

- New API or library being introduced
- Unfamiliar technology or pattern
- Multiple implementation approaches possible
- Performance implications unclear
- Browser/platform compatibility unknown

### Research Deliverables

1. **API/Library Documentation Summary**
   - What it does
   - How to use it
   - Browser/platform support
   - Known issues or limitations

2. **Approach Comparison**
   - List 2-4 viable approaches
   - Pros/cons of each
   - Recommendation with reasoning

3. **Implementation Sketch**
   - Rough code outline
   - Key integration points
   - Dependencies needed

4. **Risk Assessment**
   - What could go wrong
   - Mitigation strategies
   - Rollback plan

### Research Document Template

```markdown
# Research: [Topic]

## Question
[What we're trying to figure out]

## Findings
[What we learned from documentation, testing, research]

## Approaches Considered
### Approach A: [Name]
- Pros: ...
- Cons: ...
- Complexity: Low/Medium/High

### Approach B: [Name]
- Pros: ...
- Cons: ...
- Complexity: Low/Medium/High

## Recommendation
[Which approach and why]

## Implementation Sketch
[Rough code outline or integration points]

## Risks & Mitigation
[What could go wrong and how to handle it]
```

---

## Testing Standards

### Before Merging Any Feature

1. **Functionality tests**
   - Core feature works as expected
   - Edge cases handled
   - Error states graceful

2. **Regression tests**
   - Existing features still work
   - No unintended side effects
   - Performance not degraded

3. **Cross-browser/platform tests** (if applicable)
   - Chrome, Safari, Firefox
   - Desktop, tablet, mobile
   - Different screen sizes

4. **Documentation updated**
   - README if user-facing
   - Technical docs if architecture changed
   - Comments for complex logic

---

## Common Pitfalls to Avoid

### 1. Presuming Knowledge

**Bad**: "This API probably works like this..."
**Good**: "Let me check the documentation to confirm..."

**Lesson**: The v2.0.8 highlighting rewrite could have been avoided with proper upfront research.

### 2. Skipping Research Phase

**Bad**: "This seems simple, I'll just implement it"
**Good**: "Let me research best practices first, even if it seems simple"

**Why**: Simple features often have hidden complexity. 30 minutes of research can save hours of debugging.

### 3. Not Documenting Decisions

**Bad**: Implement feature, merge, move on
**Good**: Document why you chose this approach over alternatives

**Why**: Future developers (including AI agents) need to understand the reasoning to maintain or extend the feature.

### 4. Ignoring Edge Cases

**Bad**: "It works for the happy path"
**Good**: "I've tested error states, empty inputs, edge cases"

**Why**: Edge cases cause bugs in production. Handle them upfront.

### 5. Not Confirming Changes

**Bad**: "I made the changes, should be good"
**Good**: "Let me review the git diff to confirm every change is intentional"

**Why**: Unintended changes cause subtle bugs. Always review diffs.

---

## File Organization Standards

### Documentation Structure

```
docs/
├── PROJECT_NAME.md          # Main technical reference (AI context primer)
├── UPDATE_MAP.md            # Strategic roadmap (high-level only)
├── CHANGELOG.md             # User-facing change log
├── plans/                   # Active implementation plans
│   ├── vX_Y_Z_feature.md
│   └── research_topic.md
├── archive/                 # Historical documentation
│   ├── v1/
│   ├── v2/
│   └── v3/
└── images/                  # Screenshots, diagrams
```

### Code Structure

```
src/
├── main.ts                  # Entry point
├── [feature]/               # Feature-specific modules
│   ├── index.ts
│   ├── types.ts
│   └── utils.ts
├── styles/                  # Global styles
└── types/                   # Shared type definitions
```

---

## Commit Message Standards

### Format

```
type(scope): brief description

Longer explanation if needed.

- Bullet points for multiple changes
- Reference issues: Fixes #123
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code restructuring, no behavior change
- `test`: Adding tests
- `chore`: Maintenance (deps, config)

### Examples

```
feat(editor): add paired delimiter behavior

- Auto-insert closing brackets/quotes
- Skip over auto-inserted characters
- Wrap selection with delimiters
- Delete pairs when empty

Fixes #42
```

```
fix(highlighting): inline code markers now match content color

The tick marks for inline code were not adopting the red-orange
color. Fixed by adjusting CSS cascade order in theme.ts.

Fixes #38
```

---

## Deployment Protocol

### Pre-Deployment Checklist

1. All tests passing
2. Documentation updated
3. CHANGELOG.md updated
4. Version bumped in package.json
5. Git tag created
6. Build successful (`npm run build` or equivalent)

### Deployment Steps

1. Merge to `main`
2. Create git tag (e.g., `v2.2.0`)
3. Push to remote
4. Trigger deployment (CI/CD or manual)
5. Verify in production
6. Monitor for errors

### Post-Deployment

1. Verify core functionality works
2. Check error logs
3. Monitor performance metrics
4. Collect user feedback

---

## Communication Standards

### When to Ask Questions

- Requirements are ambiguous
- Multiple valid approaches exist
- User preference needed
- Risk of breaking existing functionality

### How to Ask Questions

- Be specific about what you need to know
- Provide context for why it matters
- Suggest options if applicable
- Don't ask questions you can answer through research

### When to Make Decisions

- Best practice is clear from documentation
- Technical constraint dictates approach
- Previous patterns established in codebase
- Low-risk change with easy rollback

---

## Scaling Parallel Development

### Managing Multiple Projects

1. **Standardize structure** across projects
   - Same directory layout
   - Same documentation format
   - Same git workflow

2. **Reusable protocols** (like this document)
   - Copy to new projects
   - Customize as needed
   - Maintain consistency

3. **Context boundaries**
   - Each project has own UPDATE_MAP
   - Each feature has own implementation plan
   - Agents stay focused on their task

### Maximizing AI Subscription Value

**Strategy**: Run multiple agents in parallel across projects

- Claude Code: Project A, feature X
- Anti-Gravity: Project B, feature Y
- Cursor Pro: Project A, feature Z

**Key**: Clear documentation and context management prevent agents from interfering with each other.

---

## Lessons Learned

### From Thot v2.0.8 Highlighting Rewrite

**What happened**: Implemented highlighting system based on assumptions, discovered systemic issues, had to completely rewrite.

**What we learned**: 
- Research the actual system architecture first
- Don't guess at how complex systems work
- 30 minutes of research saves hours of debugging
- Document findings so future work doesn't repeat mistakes

**How to prevent**: 
- Always start with research phase
- Verify assumptions with documentation
- Test approach on small scale before full implementation
- Document architecture decisions with reasoning

### From Parallel Development Attempts

**What happened**: Multiple features touching same files caused merge conflicts.

**What we learned**:
- Map file changes before starting parallel work
- Sequence work if overlaps exist
- Communicate between agents (via documentation)
- Rebase frequently to catch conflicts early

**How to prevent**:
- List files each feature will modify in implementation plan
- Check for overlaps before starting
- Merge frequently to minimize drift

---

## Quick Reference

### Starting a New Feature

1. Create implementation plan in `docs/plans/`
2. Research phase (if needed)
3. Create feature branch
4. Implement with tests
5. Review git diff
6. Merge to dev branch
7. Archive plan to `docs/archive/`

### Starting Research

1. Create research branch
2. Document questions to answer
3. Research and test
4. Document findings
5. Recommend approach
6. Create implementation plan

### Merging Features

1. Ensure tests pass
2. Review git diff
3. Update documentation
4. Merge to dev branch
5. Delete feature branch
6. Update roadmap status

---

*This document should be copied to new projects and customized as needed. Maintain consistency across projects for easier context switching.*
