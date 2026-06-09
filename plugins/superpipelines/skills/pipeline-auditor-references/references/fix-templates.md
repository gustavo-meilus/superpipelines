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
11. Data-agent worktree artifact loss

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

## Fix 11 — Data-agent worktree artifact loss

**Symptom (compliance criteria #23 / #24):** an agent declares
`isolation: worktree` while **every one of its topology-declared `outputs`
resolves under `superpipelines/temp/`** and it carries no host-anchor note —
i.e. it is artifact-only, not a tracked-code writer. Such an agent writes only
gitignored artifacts; Claude Code auto-cleans its worktree on teardown and the
artifact is destroyed (issue #31).

> **Detection note — `tools` cannot discriminate this.** Claude Code `tools:`
> grants are name-only, not path-scoped (verified against the sub-agents
> reference), so "Write/Edit to source paths" is NOT expressible in frontmatter.
> Most data agents legitimately include `Write` (they write temp artifacts). The
> sole reliable discriminator is the topology `outputs` path + absence of a
> host-anchor note. Legitimate tracked-code writers (topology outputs include
> tracked source paths, OR a host-anchor note present) are NOT affected and MUST
> keep `isolation: worktree`.

**Before (data agent):**
```yaml
permissionMode: acceptEdits
isolation: worktree
skills:
  - researcher-protocol
```

**After:**
```yaml
permissionMode: acceptEdits
skills:
  - researcher-protocol
```

**Action:**
1. Remove the `isolation: worktree` line from each flagged data-only agent.
   Claude Code has no `isolation: none` — omit the field entirely.
2. Re-stamp each touched agent's `plugin_version` to the current plugin version.
3. **Bump the pipeline-level `plugin_version`** to current in BOTH `topology.json`
   and the pipeline's `registry.json` entry. This keeps criterion #21 (version
   consistency) satisfied and ensures the run-time Phase 0.7 tripwire's
   version-drift arming condition is no longer met on the next launch.

**Applied by** `pipeline-architect` under `/superpipelines:audit-steps` with a
git checkpoint and explicit user authorization (auditor is read-only; SEV-0/1
fixes route to the architect).
