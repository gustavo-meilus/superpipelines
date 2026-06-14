# Design Spec — Tool-Neutral Canonical Agent-Def Schema

> Status: **APPROVED 2026-06-14.**
> Parent: `docs/specs/unified-superpipelines-layout-design.md` (§5 Option A, §10.3).
> Purpose: define the single source-of-truth format a generated pipeline agent is stored in
> (as data, under `.superpipelines/pipelines/{P}/agents/{name}.md`) and the **translation
> contract** that materializes it into each tier's native agent file at dispatch.

## 1. Why this exists

Option A (materialize-at-runtime) needs **one canonical def** that losslessly translates to
CC YAML, OpenCode `mode: subagent`, and Codex TOML — and degrades cleanly to Antigravity
(dynamic subagents) and Tier 2 (inline). Today the architect writes **CC-specific** frontmatter
(`tools: Read, Glob, Grep`, `permissionMode: plan`, `isolation: worktree`). CC tool *names*
do not port; `permissionMode` values do not port; TOML `sandbox_mode` has no CC analogue.

The fix: the canonical def expresses **capability intent** (what the agent is allowed to do),
not platform primitives. The translator maps intent → each tier's enforcement primitive. This
is also what makes the security boundary (`WRITE_REVIEW_ISOLATION`) survive translation.

## 2. Canonical def — file shape

`.superpipelines/pipelines/{P}/agents/{name}.md`: YAML frontmatter (tier-neutral) + protocol
body (the agent's full operational protocol, formerly the `{name}-protocol` skill).

```yaml
---
schema_version: "1.0"          # canonical-def schema version (not plugin_version)
name: spec-reviewer            # [a-z0-9-]+, unique within pipeline
description: >                  # third-person, triggering-only
  Stage 1 review: checks output matches spec exactly. Read-only.
role: reviewer                 # enum: worker | reviewer | analyzer | tester | fixer | architect | merger
review_stage: 1                # null | 1 (spec/compliance) | 2 (quality) — drives Stage-1-gates-Stage-2
model_tier: medium             # triage | fast | medium | deep | inherit
effort_tier: medium            # low | medium | high | null
turn_budget: 15                # int | null  (maps to maxTurns / equivalents)
capabilities:                  # CAPABILITY INTENT — the portable security contract
  write_files: false           # false ⇒ reviewer/read-only ⇒ structural write-deny
  run_shell: false             # false ⇒ no shell/exec
  network: false               # false ⇒ no fetch/web
  edit_tracked_source: false   # true ⇒ legitimate code writer (worktree candidate)
tool_hints:                    # OPTIONAL explicit tool allow-list, capability-consistent
  allow: [Read, Glob, Grep]    # advisory refinement; MUST NOT contradict `capabilities`
isolation_required: false      # true ⇒ needs writer isolation (worktree on capable tiers)
io_contract:
  inputs:                      # logical input keys; resolved from upstream step outputs
    - { key: task_output, from_step: executor, kind: file }
  outputs:                     # paths RELATIVE to the run dir; never absolute, never .claude/
    - { key: verdict, path: review/stage1-verdict.md, kind: file }
protocol_skills: []            # bundle skills to load (e.g. sk-write-review-isolation) — bundle-resident, tier-discovered as today
status_protocol: standard      # standard ⇒ {DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED}
plugin_version: "2.3.0"        # stamped per ATOMIC_MUTATION / version-stamping invariant
---

<protocol body — markdown, the agent's operational instructions>
```

### 2.1 Field rationale

- **`capabilities` is load-bearing, `tool_hints` is advisory.** Translation enforces
  `capabilities`; `tool_hints` only refines *which* concrete tools satisfy an allowed
  capability (e.g. choose `Grep` not `Bash`-grep). A `tool_hints.allow` that grants a denied
  capability is a **validation error** (auditor SEV-1), never silently honored.
- **`isolation_required` is derived-checkable:** true only makes sense with
  `edit_tracked_source: true`. A reviewer (`write_files:false`) with `isolation_required:true`
  is a contradiction → validation error.
- **`io_contract.outputs[].path` is relative.** This is the copy-paste-portability guarantee:
  the orchestrator resolves it against the active run dir at run time. No `.claude/`, no
  absolute paths, ever (auditor #22 carries over).
- **`protocol_skills`** still reference **bundle** skills (tier-discovered, unchanged). Only
  the *generated* protocol body moves into the canonical def. Bundle skills are not generated
  artifacts, so they keep native discovery.

## 3. Translation contract (materialization)

At dispatch, `sk-platform-dispatch` reads the canonical def + `state.metadata.resolved_models[step_id]`
and emits a native agent file. The capability→primitive map:

| Canonical | CC (T1) YAML | OpenCode (T1b) | Codex (T1d) TOML | Antigravity (T1c) | Tier 2 |
|---|---|---|---|---|---|
| `name` | `name:` | `name:` | agent name | n/a (dynamic) | n/a (inline) |
| `model_tier` → resolved | `Task(model=…)` override | `model:` (provider-prefixed) | `model = "…"` | orchestrator tier only | omit (host) |
| `effort_tier` | — (no effort field) | `reasoningEffort:` for `opencode*` providers | `model_reasoning_effort` via `effort_emit_map` | — | — |
| `turn_budget` | `maxTurns:` | maxTurns equiv | turn limit | — | inline cap |
| `capabilities.write_files: false` | `tools:` excludes Write/Edit/Bash **+** `permissionMode: plan` | `permission: { edit: deny }` | `sandbox_mode = "read-only"` | convention | convention |
| `capabilities.write_files: true` | `tools:` includes Write/Edit | default edit | `sandbox_mode = "workspace-write"` | convention | convention |
| `capabilities.run_shell` | include/exclude `Bash` | include/exclude shell tool | sandbox/exec policy | convention | convention |
| `capabilities.network` | include/exclude web tools | include/exclude | exec network policy | convention | convention |
| `isolation_required: true` | `isolation: worktree` | (no worktree primitive) → degrade warn | per-thread worktree (app level) | unverified | none → degrade warn |
| `tool_hints.allow` | concrete `tools:` list (capability-consistent) | concrete tool list | concrete tool list | — | — |
| `role: reviewer` / `review_stage` | drives Stage-1-gates-Stage-2 ordering (orchestrator) | same | same | same | same (convention) |
| `status_protocol: standard` | the 4 terminal statuses | same | same | same | same |

**Reviewer-isolation invariant preserved:** `write_files:false` is the *single canonical
source* for reviewer write-deny. It emits the structural primitive on T1/T1b/T1d
(`permissionMode:plan`+tool exclusion / `edit:deny` / `read-only` sandbox) — matching each
profile's `extensions.reviewer_isolation_recipe`. On T1c/T2 it degrades to convention with the
profile's existing `degradation_warnings` surfaced. This is exactly today's posture, now driven
from one portable field.

## 4. Worked example (validates losslessness)

Canonical `spec-reviewer` (from §2) materializes to:

**CC** (`.claude/agents/superpipelines/{P}/spec-reviewer.md`, ephemeral):
```yaml
name: spec-reviewer
tools: Read, Glob, Grep
disallowedTools: Write, Edit, Bash
model_tier: medium
maxTurns: 15
permissionMode: plan
skills: [sk-write-review-isolation, ...]
```
→ identical in effect to the current hand-written `agents/pipeline-spec-reviewer.md`.

**Codex** (TOML): `sandbox_mode = "read-only"`, `model = "gpt-5.4"`,
`model_reasoning_effort = "medium"`.

**OpenCode**: `mode: subagent`, `permission: { edit: deny }`, `model: opencode-go/qwen3.6-plus`.

Round-trip check: the current `pipeline-spec-reviewer` and `pipeline-task-executor` frontmatter
(read 2026-06-14) both express cleanly in the canonical schema — `tools`+`permissionMode:plan`
→ `write_files:false`; `isolation: worktree`+`permissionMode: acceptEdits` →
`write_files:true, edit_tracked_source:true, isolation_required:true`. No field is lost.

## 5. Validation rules (auditor)

1. `capabilities` present and complete; `tool_hints.allow` ⊆ what `capabilities` permits
   (contradiction = SEV-1).
2. `isolation_required:true` ⇒ `edit_tracked_source:true` (else SEV-1).
3. `role:reviewer` ⇒ `write_files:false` unless `review_stage` is a fixer-style role
   (advisory SEV-2 otherwise — a writing reviewer breaks the isolation boundary).
4. All `io_contract` paths relative; no `.claude/`/absolute/`..` escapes (SEV-1, carries #22).
5. `model_tier` ∈ enum; `plugin_version` stamped (SEV-2 if absent).
6. `schema_version` present and supported.

## 6. Out of scope (handled elsewhere)

- The *protocol body* content authoring — unchanged from today's protocol-skill authoring;
  only its **location** moves into the canonical def.
- Bundle skills — keep native discovery; not generated artifacts.
- Dispatch mechanics / cleanup of materialized files — parent spec §5 Option A and §9.

## 7. Resolutions (2026-06-14)

1. ✅ **Protocol body stored inline** in the canonical `.md` — one file per agent, best for
   copy-paste portability.
2. ✅ **`tool_hints` kept as optional refinement** — covers specific tools the capability flags
   can't express (e.g. NotebookEdit). Must stay capability-consistent (§5 rule 1).
3. ✅ **`protocol_skills` MAY be empty** — fully self-contained, inlined pipelines are allowed,
   maximizing standalone portability.
```

