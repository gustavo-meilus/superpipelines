# Fix Templates — Auditor Reference

Canonical fixes for common findings. Use as Edit templates when the user requests remediation.

## Table of contents

1. Description summarizes workflow
2. Agent body is non-empty
3. `permissionMode` in frontmatter
4. `memory: project` / `memory: local`
5. Skill preload includes workflow skill
6. Reviewer agent has Write/Edit
7. Pattern 3 missing iteration cap
8. Hardcoded plugin path
9. Missing capability contract
10. Per-agent Bash hook with global allow

---

## Fix 1 — Description summarizes workflow

**Symptom:** Description includes verbs describing what the skill does ("processes", "reads", "writes").

**Before:**
```yaml
description: Processes Excel files by reading sheets, cleaning data, and generating charts. Use when working with spreadsheets.
```

**After:**
```yaml
description: Use when working with Excel files, spreadsheets, or .xlsx data extraction.
```

## Fix 2 — Agent body is non-empty

**Action:** Move all body content to a companion `{agent-name}-protocol/SKILL.md`; leave the agent file as frontmatter-only.

1. Create `skills/superpipelines/{P}/{agent-name}-protocol/SKILL.md` with `disable-model-invocation: true` and `user-invocable: false`.
2. Move every line after the closing `---` of the agent file into the new protocol skill.
3. Add `{agent-name}-protocol` to the agent's `skills:` list in frontmatter.
4. Delete all body text from the agent file. Nothing may appear after the closing `---`.

## Fix 3 — `permissionMode` in frontmatter

**Symptom:** Missing `permissionMode` in agent frontmatter.

**Action:** Add `permissionMode` based on the agent's role.

- **Executors:** `permissionMode: acceptEdits`
- **Reviewers/Architects/Auditors:** `permissionMode: plan`

**Example (Executor):**
```yaml
permissionMode: acceptEdits
```

**Example (Reviewer):**
```yaml
permissionMode: plan
```

## Fix 4 — `memory: project` / `memory: local`

**Symptom:** Agent uses `memory: project` (forbidden).

**Action:** Replace `memory: project` with `memory: local` (if persisting cross-run heuristics) or remove it.

**Correct Usage:**
- **Allowed:** `memory: local` (for workers/executors).
- **Forbidden:** `memory: project`.

**Wait:** If the agent needs to persist pipeline-specific state, use `sk-pipeline-state` to write to `pipeline-state.json` instead of relying on model memory.

## Fix 5 — Skill preload includes workflow skill

**Before:**
```yaml
skills:
  - sk-4d-method
  - brainstorming
  - running-a-pipeline
```

**After:**
```yaml
skills:
  - sk-4d-method
```

Workflow skills (`brainstorming`, `running-a-pipeline`, `creating-a-pipeline`) are session-level lazy invocation, not pre-injection. Reference them in the companion `{agent-name}-protocol` skill instead.

## Fix 6 — Reviewer agent has Write/Edit

**Before:**
```yaml
tools: Read, Write, Edit, Glob, Grep
```

**After:**
```yaml
tools: Read, Glob, Grep
disallowedTools: Write, Edit
```

## Fix 7 — Pattern 3 missing iteration cap

**Before (in body):**
```markdown
Loop until tests pass.
```

**After:**
```markdown
Loop bounded by `MAX_ITERATIONS: 3`. After 3 failures without measurable progress (failure count not decreasing), STOP and escalate per `sk-pipeline-patterns` Pattern 3 escalation protocol.
```

## Fix 8 — Hardcoded plugin path

**Before:**
```markdown
Read ~/.claude/agents/code-reviewer.md
```

**After:**
```markdown
Resolve path via `sk-pipeline-paths` using the appropriate scope (local/project/user). Avoid hardcoded absolute paths.
```

## Fix 9 — Missing companion protocol skill

**Action:** Every agent must have a companion `{agent-name}-protocol` skill. If absent:

1. Create `skills/superpipelines/{P}/{agent-name}-protocol/SKILL.md`:
```markdown
---
name: {agent-name}-protocol
description: Loaded by the {agent-name} agent to supply operating modes, protocol, and invariants. Not user-invocable.
disable-model-invocation: true
user-invocable: false
---

# {Agent Name} — Operational Protocol

<overview>...</overview>
<protocol>...</protocol>
<invariants>...</invariants>
```
2. Add `{agent-name}-protocol` to the agent's `skills:` frontmatter list.
3. Ensure the agent file body is empty (criterion 10a).

## Fix 10 — Per-agent Bash hook with global allow

**Action:** Remove the hooks block from agent frontmatter when plugin `settings.json` already has `Bash(*)` in `permissions.allow`. Verify before removing — without the global allow, removing the hook breaks the agent.
