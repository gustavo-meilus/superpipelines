# Plan: Zero-Body Agents — Skills Own Everything

**Goal:** Eliminate all body text from agent files. Agents become pure frontmatter configuration envelopes (model, effort, maxTurns, permissionMode, tools). Every operational concern — protocol, modes, invariants, rationalization resistance — lives in a companion `{agent-name}-protocol` skill.

**Why:** `permissionMode` and `disallowedTools` can only be declared in agent frontmatter, so agent files cannot be deleted entirely. But the body serves no purpose now that protocol skills exist. Removing the body enforces a clean contract: *if it's about configuration, it's in the agent; if it's about behavior, it's in a skill.*

**Architecture after this plan:**

```
agents/{name}.md                          ← frontmatter only, zero body
skills/{name}-protocol/SKILL.md           ← full protocol, disable-model-invocation: true
skills/{name}-references/references/*.md  ← deep reference material (unchanged)
```

**Tech stack:** Markdown, YAML frontmatter, Claude Code agent/skill conventions.

---

## File Map

| File | Change |
|------|--------|
| `agents/pipeline-architect.md` | Remove 4-line body → zero-body |
| `agents/pipeline-auditor.md` | Remove 4-line body → zero-body |
| `agents/pipeline-failure-analyzer.md` | Remove 4-line body → zero-body |
| `agents/pipeline-quality-reviewer.md` | Remove 4-line body → zero-body |
| `agents/pipeline-spec-reviewer.md` | Remove 4-line body → zero-body |
| `agents/pipeline-task-executor.md` | Remove 4-line body → zero-body |
| `agents/skill-architect.md` | Remove 4-line body → zero-body |
| `CLAUDE.md` | Update `LEAN_AGENTS` invariant; remove capability-contract rule |
| `skills/pipeline-architect-protocol/SKILL.md` | Update DESIGN/DEVELOP to generate zero-body stubs + protocol skills for new pipelines |
| `skills/pipeline-architect-references/references/agent-frontmatter-schema.md` | Remove "Capability contract" section; add "Protocol skill companion" section; update `skills:` field rule |
| `skills/pipeline-auditor-references/references/compliance-matrix.md` | Add criterion 22 (agent body empty); fix criterion 10 and 18 cross-references |

---

## Task 1 — Strip bodies from all 7 existing agents

**Files:** all 7 `agents/*.md`

Each agent file must end immediately after the closing `---` of the frontmatter block. No blank lines, no headings, no body text of any kind.

- [ ] Open `agents/pipeline-architect.md`. The current file ends at line 23 with `Constraint: Operate exclusively per...`. Delete everything after the closing `---` on line 17.

  Final file content:
  ```markdown
  ---
  name: pipeline-architect
  description: Use when designing a new multi-agent pipeline, generating spec/plan/tasks/topology artifacts, adding a step to an existing pipeline, updating a step, deleting a step, creating a single subagent definition, or diagnosing a pipeline topology failure.
  tools: Read, Write, Edit, Glob, Grep, Bash
  model: opus
  effort: medium
  maxTurns: 40
  version: "3.0"
  permissionMode: plan
  skills:
    - sk-4d-method
    - sk-spec-driven-development
    - sk-dynamic-routing
    - sk-claude-code-conventions
    - sk-pipeline-patterns
    - sk-pipeline-paths
    - pipeline-architect-protocol
  ---
  ```

- [ ] Open `agents/pipeline-auditor.md`. Delete everything after closing `---` on line 15.

  Final file content:
  ```markdown
  ---
  name: pipeline-auditor
  description: Use when auditing existing pipeline bundles, agent files, or skills against superpipelines v2 layout, frontmatter, topology, and runtime-safety standards. Invoked automatically after new-pipeline, new-step, update-step, and delete-step. Produces severity-classified reports (SEV-0/1/2/3) with cited file:line evidence.
  tools: Read, Glob, Grep
  disallowedTools: Write, Edit, Bash
  model: sonnet
  effort: high
  maxTurns: 30
  version: "3.0"
  permissionMode: plan
  skills:
    - sk-4d-method
    - sk-claude-code-conventions
    - sk-pipeline-paths
    - pipeline-auditor-protocol
  ---
  ```

- [ ] Open `agents/pipeline-failure-analyzer.md`. Delete everything after closing `---` on line 14.

  Final file content:
  ```markdown
  ---
  name: pipeline-failure-analyzer
  description: Use during a Pattern 3 iterative loop after a tester reports failures, before dispatching a fixer — diagnoses whether failures are fixable bugs or architectural problems, detects "fixes reveal new failures in new locations" pattern, and decides whether to continue or escalate per Pattern 3 protocol.
  tools: Read, Glob, Grep, Bash
  model: sonnet
  effort: high
  maxTurns: 20
  permissionMode: plan
  version: "2.0"
  skills:
    - sk-4d-method
    - sk-pipeline-patterns
    - sk-rationalization-resistance
    - pipeline-failure-analyzer-protocol
  ---
  ```

- [ ] Open `agents/pipeline-quality-reviewer.md`. Delete everything after closing `---` on line 15.

  Final file content:
  ```markdown
  ---
  name: pipeline-quality-reviewer
  description: Use as Stage 2 review ONLY after pipeline-spec-reviewer returned PASS — checks code quality, idiom, maintainability, naming, structure, and tests against the spec. Refuses to run if Stage 1 not yet PASSed. Read-only; never edits.
  tools: Read, Glob, Grep
  disallowedTools: Write, Edit, Bash
  model: haiku
  effort: medium
  maxTurns: 15
  permissionMode: plan
  version: "2.0"
  skills:
    - sk-claude-code-conventions
    - sk-write-review-isolation
    - sk-dynamic-routing
    - pipeline-quality-reviewer-protocol
  ---
  ```

- [ ] Open `agents/pipeline-spec-reviewer.md`. Delete everything after closing `---` on line 14.

  Final file content:
  ```markdown
  ---
  name: pipeline-spec-reviewer
  description: Use as Stage 1 review after a pipeline-task-executor produces output — checks ONLY whether the output matches the spec exactly. Under-build AND over-build both FAIL. Stage 2 (code quality) cannot begin until this passes. Read-only; never edits.
  tools: Read, Glob, Grep
  disallowedTools: Write, Edit, Bash
  model: sonnet
  effort: medium
  maxTurns: 15
  permissionMode: plan
  version: "2.0"
  skills:
    - sk-claude-code-conventions
    - sk-write-review-isolation
    - pipeline-spec-reviewer-protocol
  ---
  ```

- [ ] Open `agents/pipeline-task-executor.md`. Delete everything after closing `---` on line 16.

  Final file content:
  ```markdown
  ---
  name: pipeline-task-executor
  description: Use when implementing exactly ONE task from a tasks.md file as part of a Pattern 5 (SDD) parallel implementation phase, or when a single bounded implementation task needs a fresh-context worker. Receives extracted task text plus spec/plan paths; performs the task; self-verifies; emits terminal status.
  tools: Read, Write, Edit, Bash, Glob, Grep
  model: sonnet
  effort: medium
  maxTurns: 30
  version: "2.0"
  isolation: worktree
  permissionMode: acceptEdits
  skills:
    - sk-4d-method
    - sk-spec-driven-development
    - sk-claude-code-conventions
    - sk-hashline-protocol
    - pipeline-task-executor-protocol
  ---
  ```

- [ ] Open `agents/skill-architect.md`. Delete everything after closing `---` on line 13.

  Final file content:
  ```markdown
  ---
  name: skill-architect
  description: Use when designing a new SKILL.md file, refining an existing skill's description for triggering, restructuring a skill into SKILL.md plus references for progressive disclosure, or extracting a skill from a workflow conversation. Does NOT design subagents (pipeline-architect) or audit existing skills (pipeline-auditor).
  tools: Read, Write, Edit, Glob, Grep, Bash
  model: sonnet
  effort: high
  maxTurns: 30
  version: "2.0"
  permissionMode: plan
  skills:
    - sk-4d-method
    - sk-claude-code-conventions
    - skill-architect-protocol
  ---
  ```

- [ ] Verify: `grep -c "" agents/*.md` — each file should report ≤18 lines (frontmatter block only).

  Expected output:
  ```
  agents/pipeline-architect.md:18
  agents/pipeline-auditor.md:16
  agents/pipeline-failure-analyzer.md:15
  agents/pipeline-quality-reviewer.md:16
  agents/pipeline-spec-reviewer.md:15
  agents/pipeline-task-executor.md:17
  agents/skill-architect.md:14
  ```

- [ ] Verify no body text leaked through: `grep -l "Capability:\|Scope:\|Authority:\|Constraint:" agents/` should return nothing.

**Checkpoint:** All 7 agent files contain only frontmatter. ✓

---

## Task 2 — Update CLAUDE.md architecture rules

**Files:** `CLAUDE.md`

Two changes: (a) tighten the `LEAN_AGENTS` invariant wording from "4-line body" to "zero-body"; (b) remove the old "capability contract in first 10 lines" requirement from the `<authoring_rules>` section (it no longer applies since bodies are empty).

- [ ] In `CLAUDE.md`, find the `LEAN_AGENTS` line and replace:

  Old:
  ```
  - `LEAN_AGENTS: TRUE` — Agent bodies contain only a 4-line capability contract (Capability / Scope / Authority / Constraint). All operational protocol resides in a companion `{agent-name}-protocol` skill loaded via the `skills:` frontmatter list.
  ```

  New:
  ```
  - `LEAN_AGENTS: TRUE` — Agent files are frontmatter-only; zero body text is permitted. All operational protocol resides in a companion `{agent-name}-protocol` skill (loaded via the `skills:` list) with `disable-model-invocation: true` and `user-invocable: false`.
  ```

- [ ] In `CLAUDE.md`, the `<authoring_rules>` section currently has no explicit capability-contract line (that rule lives in the protocol skill). Confirm the section reads:

  ```markdown
  <authoring_rules>
  - **Skill Descriptions**: Use triggering conditions only; avoid workflow summaries.
  - **Voice**: Enforce third-person impersonal voice throughout all documentation and skills.
  - **Constraints**: Skill bodies ≤500 lines; agent bodies are empty (frontmatter only); every skill description ≤1024 characters.
  - **Reference Topology**: References >100 lines must include a Table of Contents.
  - **Status Reporting**: Agents must emit exactly one terminal status: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`.
  </authoring_rules>
  ```

  Change the **Constraints** line from:
  ```
  - **Constraints**: Skill bodies ≤500 lines; agent bodies ≤150 lines; every skill description ≤1024 characters.
  ```
  to:
  ```
  - **Constraints**: Skill bodies ≤500 lines; agent bodies are empty (frontmatter only); every skill description ≤1024 characters.
  ```

- [ ] Update project version at the bottom of `CLAUDE.md`:

  Old: `- **Project Version**: v1.1.0`
  New: `- **Project Version**: v1.2.0`

**Checkpoint:** `CLAUDE.md` no longer references "150 lines" or "capability contract" for agents. ✓

---

## Task 3 — Update pipeline-architect-protocol: generate zero-body stubs

**Files:** `skills/pipeline-architect-protocol/SKILL.md`

The protocol skill instructs the architect how to build new pipelines. Two places need updating: the DESIGN constraint (line referencing "≤150 lines") and the DEVELOP frontmatter rules (add explicit zero-body + protocol-skill companion instruction).

- [ ] In `skills/pipeline-architect-protocol/SKILL.md`, find the DESIGN section constraint:

  Old:
  ```
  - **Constraint**: Maintain agent bodies ≤150 lines and preload only `sk-*` method skills.
  ```

  New:
  ```
  - **Constraint**: Agent files are zero-body (frontmatter only). Preload `sk-*` method skills and the companion `{agent-name}-protocol` skill. All protocol goes into the companion skill.
  ```

- [ ] In the same file, in the DEVELOP section under **Frontmatter**, add a new bullet after `Set user-invocable: false for internal step skills`:

  ```
  - For every new agent, create a companion `skills/superpipelines/{P}/{agent-name}-protocol/SKILL.md` with `disable-model-invocation: true` and `user-invocable: false`. The agent body is left empty; add the companion skill to the agent's `skills:` list.
  ```

- [ ] In the same file, update the invariants block — replace:

  Old:
  ```
  - All agent bodies must declare a capability contract (Inputs / Output schema / Breaking change log) in the first 10 lines.
  - No agent body may exceed 150 lines.
  ```

  New:
  ```
  - Agent files are zero-body. No text may appear after the closing `---` of the frontmatter block.
  - Every agent must have a companion `{agent-name}-protocol` skill listed in its `skills:` frontmatter.
  ```

**Checkpoint:** The architect protocol now generates zero-body stubs with companion protocol skills. ✓

---

## Task 4 — Update agent-frontmatter-schema reference

**Files:** `skills/pipeline-architect-references/references/agent-frontmatter-schema.md`

This is the canonical reference the architect reads when building agent files. It must reflect zero-body stubs and document the protocol-skill companion pattern.

- [ ] In the **Schema** YAML block, add `pipeline-{name}-protocol` as an example entry in `skills:`:

  Old:
  ```yaml
  skills:                                       # ONLY sk-* preloaded method skills
    - sk-4d-method
    - sk-pipeline-paths
  ```

  New:
  ```yaml
  skills:                                       # sk-* method skills + ONE companion {name}-protocol skill
    - sk-4d-method
    - sk-pipeline-paths
    - pipeline-{name}-protocol                  # companion protocol skill; holds all operational logic
  ```

- [ ] Update the `skills` row in the **Field rules** table:

  Old:
  ```
  | `skills` | recommended | ONLY shared `sk-*` skills. Never large workflow skills. Never companion-reference skills. |
  ```

  New:
  ```
  | `skills` | recommended | `sk-*` method skills plus the ONE companion `{agent-name}-protocol` skill. Never large workflow skills. Never `*-references` skills. |
  ```

- [ ] Replace the entire **Capability contract (agent body)** section (lines 84–92) with a **Protocol skill companion** section:

  Old section to remove:
  ```markdown
  ## Capability contract (agent body)

  Every agent body must declare its contract near the top:

  ```markdown
  # Inputs required: {task_file_path}, {project_context}, {scope_root}
  # Output schema: { "status": "DONE|BLOCKED|...", "outputs": [...] }
  # Breaking change log: v1.0 — initial release
  ```
  ```

  New section to add in its place:
  ```markdown
  ## Protocol skill companion

  Every agent file is zero-body (no text after the closing `---`). All operational logic lives in a companion skill:

  ```markdown
  ---
  name: pipeline-{name}-protocol
  description: Loaded by the pipeline-{name} agent to supply operating modes, protocol, and invariants. Not user-invocable.
  disable-model-invocation: true
  user-invocable: false
  ---

  # Pipeline {Name} — Operational Protocol

  <overview>...</overview>
  <glossary>...</glossary>
  ## Operating Modes / Workflow
  <protocol>...</protocol>
  <invariants>...</invariants>
  ## Reference Files
  ```

  Place the companion skill at `skills/superpipelines/{P}/{agent-name}-protocol/SKILL.md`.
  ```

- [ ] Update the `permissionMode` selection guide note for `bypassPermissions` — the justification must now go in the companion protocol skill, not the agent body:

  Old:
  ```
  | Agent requiring unrestricted access | `bypassPermissions` — ONLY with documented user justification in agent body |
  ```

  New:
  ```
  | Agent requiring unrestricted access | `bypassPermissions` — ONLY with documented user justification in the companion `{name}-protocol` skill |
  ```

**Checkpoint:** `agent-frontmatter-schema.md` shows zero-body stubs with protocol-skill companions. ✓

---

## Task 5 — Update compliance matrix: add zero-body criterion

**Files:** `skills/pipeline-auditor-references/references/compliance-matrix.md`

The auditor's 20-criterion checklist needs three targeted updates: (a) add a new criterion requiring zero-body agents, (b) fix the `bypassPermissions` cross-reference in criterion 10, and (c) extend criterion 18 to cover protocol skills.

- [ ] In the **Frontmatter** table, update criterion 10's PASS condition:

  Old:
  ```
  | 10 | `permissionMode` valid | If present: one of `default \| acceptEdits \| plan \| bypassPermissions`; `bypassPermissions` requires an inline justification comment in the agent body |
  ```

  New:
  ```
  | 10 | `permissionMode` valid | If present: one of `default \| acceptEdits \| plan \| bypassPermissions`; `bypassPermissions` requires an inline justification comment in the companion `{agent-name}-protocol` skill |
  ```

- [ ] In the **Frontmatter** table, add criterion 10a immediately after criterion 10:

  ```markdown
  | 10a | Agent body is empty | No text appears after the closing `---` of the agent frontmatter block; agent has a companion `{agent-name}-protocol` skill listed in `skills:` |
  ```

- [ ] In the **Runtime safety** table, update criterion 18:

  Old:
  ```
  | 18 | No hardcoded absolute paths in agent bodies | Agent bodies reference paths via a scope-root variable (`${SCOPE_ROOT}` or equivalent), never literal `/home/...` or `~/.claude/...` |
  ```

  New:
  ```
  | 18 | No hardcoded absolute paths in agent or protocol skill bodies | Agent files are zero-body; companion `{agent-name}-protocol` skills reference paths via a scope-root variable (`${SCOPE_ROOT}` or equivalent), never literal `/home/...` or `~/.claude/...` |
  ```

- [ ] Update the Table of Contents to add "10a" and note the total is now 21 criteria (10a is additive):

  Old first line of TOC:
  ```
  1. Layout & registry (criteria 1–5)
  2. Frontmatter (criteria 6–11)
  ```

  New:
  ```
  1. Layout & registry (criteria 1–5)
  2. Frontmatter (criteria 6–11, including 10a)
  ```

**Checkpoint:** Auditor will now flag any agent with body text as a compliance violation. ✓

---

## Task 6 — Commit

- [ ] Stage all changed files:
  ```bash
  git add agents/ CLAUDE.md \
    skills/pipeline-architect-protocol/SKILL.md \
    skills/pipeline-architect-references/references/agent-frontmatter-schema.md \
    skills/pipeline-auditor-references/references/compliance-matrix.md
  ```

- [ ] Commit:
  ```bash
  git commit -m "feat: zero-body agents — frontmatter-only stubs, protocol entirely in skills

  Agent files now contain only YAML frontmatter; no body text permitted after
  the closing ---. All operational protocol, modes, invariants, and
  rationalization tables reside in companion {agent-name}-protocol skills.

  - Strip 4-line capability contracts from all 7 existing agent files
  - CLAUDE.md: LEAN_AGENTS tightened to zero-body; Constraints line updated
  - pipeline-architect-protocol: DESIGN/DEVELOP/invariants updated to
    generate zero-body stubs + companion protocol skills for new pipelines
  - agent-frontmatter-schema.md: replace Capability contract section with
    Protocol skill companion section; update skills field rule and
    bypassPermissions guidance
  - compliance-matrix.md: add criterion 10a (agent body empty); update
    criteria 10 and 18 cross-references"
  ```

- [ ] Push:
  ```bash
  git push -u origin claude/lean-agents-skills-2NORP
  ```

**Checkpoint:** Branch pushed; all files consistent with zero-body agent architecture. ✓

---

## Execution modes

**Subagent-driven:** Hand this plan to a `pipeline-task-executor` per task (Tasks 1–5 can run in parallel; Task 6 sequentially after all pass their checkpoints).

**Inline:** Execute tasks in order in this session, running each `Checkpoint` verification before proceeding.
