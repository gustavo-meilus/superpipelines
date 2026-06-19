# SDD Artifacts — Architect Templates

Templates for `spec.md`, `plan.md`, `tasks.md`, and the human gate prompt. Used by `pipeline-architect` when working in Pattern 5 (Spec-Driven Development).

## Table of contents

1. `spec.md` — what + why
2. `plan.md` — how
3. `tasks.md` — atomic, sequenced
4. Task atomicity rules
5. Human approval gate prompt
6. `pipeline-state.json` initial entry
7. Canonical agent-def template

---

## `spec.md` — what + why

```markdown
# Feature: {name}

## Context & motivation
{Why now? What prompted this? What's the business or technical problem?}

## User journeys
{Scenario → outcome. One bullet per journey. Concrete actors and inputs.}

- As a {role}, I {action}, so that {outcome}.

## Success criteria (acceptance criteria)
- [ ] AC-1: {verifiable outcome — written so a reader can answer "is this true yet?"}
- [ ] AC-2: …

## Non-goals
- {Out-of-scope item 1}
- {Out-of-scope item 2}

## Constraints
- Regulatory: {GDPR, SOC2, etc.}
- Performance: {latency, throughput targets}
- Compatibility: {browsers, SDKs, runtime versions}
- Timeline: {deadline, milestones}

## Open questions (defer to /clarify)
- {Question 1}
- {Question 2}
```

**Gate:** A reader who has never seen the code can answer "what does done look like?" If not, the spec is incomplete.

## `plan.md` — how

```markdown
# Plan: {feature name}

## Tech stack
- Language: {…}
- Frameworks: {…}
- Libraries (with versions): {…}
- Runtime: {…}

## Architecture
{Layer diagram OR sequence diagram OR data flow diagram}

## API contracts
{Schemas, function signatures, request/response shapes. Use code blocks.}

## Dependency matrix
| Component | Depends on | Owned by |
|-----------|-----------|----------|
| {…} | {…} | {…} |

## Risks & mitigations
| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| {…} | {high/med/low} | {…} |

## Rollout plan
- Phase 1: {staged or canary or feature-flagged}
- Phase 2: {…}
- Rollback procedure: {…}

## Explicit design decisions
- {Decision 1}: {chose A over B because …}
- {Decision 2}: {…}
```

## `tasks.md` — atomic, sequenced

```markdown
# Tasks

## T-1: {short name}
- **Description:** {one sentence}
- **Files:** {list of files this task touches}
- **Acceptance:** {a command or check that returns pass/fail}
- **Depends on:** {T-0 or none}
- **Estimated turns:** {5-30 min of agent work}

## T-2: {short name}
…
```

### Task atomicity rules

- One task = one agent session = 5–30 min of work.
- Acceptance criterion is automatable (typecheck, lint, test, grep, file existence).
- Files list is exhaustive (the worker won't touch files outside the list).
- Dependencies form a DAG (no cycles).
- Every spec AC maps to at least one task. No orphan tasks.

## Human approval gate prompt

Use exactly this phrasing for the Phase 4b gate (don't paraphrase — the wording is calibrated to elicit a clean APPROVE/REVISE response):

```
Spec and tasks written. Please review spec.md and tasks.md before I begin parallel implementation.

[APPROVE] — proceed to /implement (parallel dispatch).
[REVISE]  — return to spec or plan with feedback.
```

Wait for APPROVE. If REVISE arrives, route back per the 4D feedback table:

| Feedback signal | Re-entry |
|-----------------|----------|
| Wrong goal / missed problem | re-spec (Phase 1) |
| Right goal, wrong architecture | re-plan (Phase 2) |
| Right plan, task breakdown wrong | re-tasks (Phase 3) |

## `pipeline-state.json` initial entry

```json
{
  "pipeline_id": "<uuid>",
  "started_at": "<iso8601>",
  "pattern": "5",
  "status": "running",
  "current_phase": 0,
  "phases": [
    { "index": 0, "name": "specify",   "status": "pending", "agent": "pipeline-architect", "outputs": [], "error": null },
    { "index": 1, "name": "plan",      "status": "pending", "agent": "pipeline-architect", "outputs": [], "error": null },
    { "index": 2, "name": "tasks",     "status": "pending", "agent": "pipeline-architect", "outputs": [], "error": null },
    { "index": 3, "name": "human-gate","status": "pending", "agent": "user",               "outputs": [], "error": null },
    { "index": 4, "name": "implement", "status": "pending", "agent": "pipeline-task-executor", "outputs": [], "error": null }
  ],
  "metadata": {}
}
```

---

## Canonical agent-def template

Use this template verbatim for every new agent in a data-only pipeline. It is ONE file (data):
tool-neutral frontmatter + inline protocol body. No companion `-protocol` skill, no
frontmatter-only tool-dir agent. The materializer (`sk-platform-dispatch` MATERIALIZE)
translates the capability intent to native frontmatter at dispatch. Schema authority:
`pipeline-auditor-references/references/canonical-agent-def.md`.

### CAD — `DATA_ROOT/pipelines/{P}/agents/{agent-name}.md`

```markdown
---
schema_version: "1.0"
name: {agent-name}
description: Use when {triggering conditions in third-person, ≤1024 chars}.
role: {worker | reviewer | analyzer | tester | fixer | architect | merger}
review_stage: {null | 1 | 2}
model_tier: {triage | fast | medium | deep | inherit}
effort_tier: {low | medium | high | null}
turn_budget: 30
capabilities:
  write_files: {true|false}          # false ⇒ reviewer/read-only ⇒ structural write-deny at materialization
  run_shell: {true|false}
  network: {true|false}
  edit_tracked_source: {true|false}  # true ⇒ legitimate code writer
tool_hints:                          # OPTIONAL; capability-consistent refinement only
  allow: [Read, Glob, Grep]
isolation_required: {true|false}     # true ONLY when edit_tracked_source: true
io_contract:
  inputs:
    - { key: {input-key}, from_step: {upstream-step}, kind: file }
  outputs:
    - { key: {output-key}, path: {relative/to/run-dir.ext}, kind: file }
protocol_skills: []                  # bundle skills to load; MAY be empty
status_protocol: standard
plugin_version: "{current-superpipelines-version}"
---

# {Agent Display Name} - Operational Protocol

<overview>
{One short paragraph describing the agent's responsibility and quality bar.}
</overview>

## Required Sources
- {source} - {why this source is required}

## Protocol

<protocol>
### 1. DISCOVER
{What to read and verify before acting.}

### 2. PROCESS
{Core operational steps.}

### 3. DELIVER
{Output schema, persistence expectations, and terminal status emission.}
</protocol>

## Completion Criterion
{Visible condition that proves this step is done.}

<invariants>
- {Non-negotiable rule.}
- Emit exactly one terminal status: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
</invariants>
```

Reviewer, safety, debugging, and discipline-enforcing agents also include:

```markdown
## Red Flags - STOP
- "{rationalization}" -> {corrective action}
```

If no external source is required, use:

```markdown
## Required Sources
- None. This step is self-contained.
```

Notes:
- Reviewers set `capabilities.write_files: false` — the materializer emits the structural
  write-deny primitive per tier. A reviewer MAY still declare an `io_contract.output` (its
  verdict); the orchestrator persists that from the reviewer's returned content, not an agent write.
- `tool_hints.allow` MUST be a subset of what `capabilities` permits (auditor CAD-01).
- `io_contract` paths are relative to the run dir — no absolute, no scope-root prefix, no `..`.
