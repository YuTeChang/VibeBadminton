# Agent Usage Guide

This guide explains how to use the specialized AI agents for the PoweredByPace project.

---

## Agent Overview

The project uses three specialized agents:

1. **PM Agent** - Product Manager + Documentation Lead
2. **QA Agent** - Quality Assurance + Testing
3. **Engineer Agent** - Lead Implementation Engineer

Each agent has a specific role and maintains context across sessions.

---

## How to Trigger Agents

### PM Agent

**Trigger phrases:**
- "PM agent, update the docs based on what we just did"
- "PM agent, review and refresh the plan"
- "PM agent: run a documentation pass"
- "PM agent: update dev_plan and progress_log after [feature]"

**What PM Agent does:**
- Updates documentation (vision, MVP, process docs)
- Tracks progress in dev_plan.md
- Logs work in progress_log.md
- Records decisions in decisions.md
- Maintains engineering documentation

**Example:**
```
You: PM agent, update the docs based on what we just did

[PM Agent reads context, scans code, updates documentation]
```

---

### QA Agent

**Trigger phrases:**
- "QA agent: design tests for the [feature]"
- "QA agent: create manual test checklist for [page]"
- "QA agent: write automated tests for [component]"
- "QA agent: after implementing [feature], generate manual and automated tests"

**What QA Agent does:**
- Designs test coverage
- Creates manual test checklists
- Writes automated tests
- Ensures behavior matches MVP spec

**Example:**
```
You: QA agent: design tests for the create session page

[QA Agent reads context, designs tests, creates test files]
```

---

### Engineer Agent

**Trigger phrases:**
- "Engineer agent: implement [feature]"
- "Engineer agent: create [component]"
- "Engineer agent: add [endpoint]"
- "Engineer agent: implement the [page] page"

**What Engineer Agent does:**
- Writes production code
- Implements features per MVP spec
- Follows coding standards
- Coordinates with PM and QA agents

**Example:**
```
You: Engineer agent: implement the create session page

[Engineer Agent reads context, implements code, explains how to test]
```

---

## Common Workflows

### Starting a New Feature

```
1. "Engineer agent: implement [feature]"
2. Engineer: [Implements code]
3. "PM agent, update the docs based on what we just did"
4. PM: [Updates documentation]
5. "QA agent: design tests for [feature]"
6. QA: [Creates tests]
```

### After Implementing Code

```
1. "PM agent, update the docs based on what we just did"
2. PM: [Updates dev_plan.md, progress_log.md]
```

### Before Testing

```
1. "QA agent: design tests for [feature]"
2. QA: [Creates manual checklist and automated tests]
```

---

## Context Files

Each agent maintains a context file in `docs/prompts/context/`:
- `pm_agent_context.md`
- `qa_agent_context.md`
- `engineer_agent_context.md`

These files help agents remember:
- What they were working on last time
- Recent work history
- Current focus

Agents automatically read and update these files.

---

## Agent Boundaries

**PM Agent:**
- ✅ Owns all documentation
- ❌ Cannot write production code
- ❌ Cannot modify test files (unless updating test documentation)

**QA Agent:**
- ✅ Owns all testing
- ❌ Cannot change production code behavior (unless explicitly asked)
- ❌ Cannot modify documentation (that's PM's job)

**Engineer Agent:**
- ✅ Owns all production code
- ❌ Cannot modify documentation (that's PM's job)
- ❌ Cannot change test setup without QA coordination

---

## Tips

1. **Use agents consistently** - Each agent has a specific role
2. **Update context files** - Agents remember work through context files
3. **Keep docs updated** - PM agent should update docs regularly
4. **Start simple** - Don't over-document initially, build as you go
5. **Iterate** - Refine vision and MVP as you learn

---

## Example: Complete Workflow

```
Session 1:
You: "Engineer agent: implement the create session page"
Engineer: [Implements code, updates context]

Session 2:
You: "PM agent, update the docs based on what we just did"
PM: [Updates dev_plan.md, progress_log.md, updates context]

Session 3:
You: "QA agent: design tests for the create session page"
QA: [Creates tests, updates context]
```

---

## Troubleshooting

**Q: Agent doesn't remember previous work**  
A: Make sure context files exist and are being updated. Remind agents to read/update them.

**Q: Which agent should I use?**  
A: 
- Documentation/planning → PM Agent
- Testing → QA Agent
- Implementation → Engineer Agent

**Q: Can I customize the methodology?**  
A: Yes! Adjust templates and prompts to fit your project needs.

