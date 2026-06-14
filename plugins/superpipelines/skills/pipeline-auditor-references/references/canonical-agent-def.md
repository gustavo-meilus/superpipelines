# Canonical Agent-Def Schema — Auditor Reference

Normative reference for the tool-neutral canonical agent definition (CAD). Every generated
pipeline agent is stored as data under `.superpipelines/pipelines/{P}/agents/{name}.md`
in this format and materialized into each tier's native agent file at dispatch (Option A —
materialize-at-runtime). The def expresses **capability intent**, not platform primitives, so a
single portable field drives each tier's enforcement primitive — this is what makes the
`WRITE_REVIEW_ISOLATION` security boundary survive translation.

Source of truth: `docs/specs/canonical-agent-def-schema.md`. This reference restates the
schema, the translation contract, and the worked round-trip for the auditor; the validation
rules themselves are enforced via criteria `CAD-01..CAD-05` in `compliance-matrix.md`.

## Table of contents

1. Canonical def — file shape
2. Field reference
3. Translation contract (capability → primitive)
4. Worked round-trip (losslessness proof)
5. Validation rules (pointer)

---

## 1. Canonical def — file shape

`.superpipelines/pipelines/{P}/agents/{name}.md`: YAML frontmatter (tier-neutral) +
inline protocol body (the agent's full operational protocol). One file per agent — the protocol
body is stored inline, not in a companion skill, maximizing copy-paste portability.

```yaml
---
schema_version: "1.0"          # canonical-def schema version (distinct from plugin_version)
name: spec-reviewer            # [a-z0-9-]+, unique within pipeline
description: >                 # third-person, triggering-only
  Stage 1 review: checks output matches spec exactly. Read-only.
role: reviewer                 # worker | reviewer | analyzer | tester | fixer | architect | merger
review_stage: 1                # null | 1 (spec/compliance) | 2 (quality)
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
  inputs:
    - { key: task_output, from_step: executor, kind: file }
  outputs:                     # paths RELATIVE to the run dir; never absolute, never .claude/
    - { key: verdict, path: review/stage1-verdict.md, kind: file }
protocol_skills: []            # bundle skills to load; MAY be empty (self-contained pipeline)
status_protocol: standard      # standard ⇒ {DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED}
plugin_version: "2.2.3"        # stamped per PLUGIN_VERSION_STAMPING on every mutation
---

<protocol body — markdown, the agent's operational instructions>
```

---

## 2. Field reference

| Field | Type | Notes |
|---|---|---|
| `schema_version` | string | Canonical-def schema version. Required. `"1.0"` for v2.x. |
| `name` | string | `[a-z0-9-]+`, unique within the pipeline, matches filename. |
| `description` | string | Third-person, triggering-only. |
| `role` | enum | `worker \| reviewer \| analyzer \| tester \| fixer \| architect \| merger`. |
| `review_stage` | int\|null | `null` (not a review role), `1` (spec/compliance), `2` (quality). Drives Stage-1-gates-Stage-2 ordering. |
| `model_tier` | enum | `triage \| fast \| medium \| deep \| inherit`. Resolved to a concrete model at runtime. |
| `effort_tier` | enum\|null | `low \| medium \| high \| null`. |
| `turn_budget` | int\|null | Maps to `maxTurns` / per-tier equivalent. |
| `capabilities` | object | **Load-bearing.** The portable security contract — see §3. All four keys required. |
| `capabilities.write_files` | bool | `false` ⇒ reviewer/read-only ⇒ structural write-deny. The single canonical source for reviewer isolation. |
| `capabilities.run_shell` | bool | `false` ⇒ no shell/exec tool. |
| `capabilities.network` | bool | `false` ⇒ no fetch/web tool. |
| `capabilities.edit_tracked_source` | bool | `true` ⇒ legitimate tracked-code writer (worktree candidate). |
| `tool_hints.allow` | list | **Optional, advisory.** Refines *which* concrete tools satisfy an allowed capability; MUST be a subset of what `capabilities` permits. |
| `isolation_required` | bool | `true` ⇒ writer isolation (worktree on capable tiers). Only coherent with `edit_tracked_source: true`. |
| `io_contract.inputs` | list | Logical input keys, resolved from upstream step outputs. |
| `io_contract.outputs` | list | Output keys with paths **relative to the run dir**. Never absolute, never a scope-root name, never `..`. |
| `protocol_skills` | list | Bundle skills to load (tier-discovered, unchanged). MAY be empty. |
| `status_protocol` | enum | `standard` ⇒ the four terminal statuses. |
| `plugin_version` | string | Current package version. Stamped on every mutation. |

**`capabilities` is load-bearing; `tool_hints` is advisory.** Translation enforces
`capabilities`; `tool_hints` only refines which concrete tools satisfy an allowed capability
(e.g. choose `Grep` not `Bash`-grep). A `tool_hints.allow` granting a denied capability is a
validation error (`CAD-01`), never silently honored.

---

## 3. Translation contract (capability → primitive)

At dispatch, `sk-platform-dispatch` reads the canonical def + `state.metadata.resolved_models[step_id]`
and emits a native agent file. This is the normative capability → primitive map:

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
| `role: reviewer` / `review_stage` | drives Stage-1-gates-Stage-2 (orchestrator) | same | same | same | same (convention) |
| `status_protocol: standard` | the 4 terminal statuses | same | same | same | same |

**Reviewer-isolation invariant preserved.** `capabilities.write_files: false` is the *single
canonical source* for reviewer write-deny. It emits the structural primitive on T1/T1b/T1d
(`permissionMode: plan` + tool exclusion / `edit: deny` / `read-only` sandbox), matching each
profile's `extensions.reviewer_isolation_recipe`. On T1c/T2 it degrades to convention with the
profile's `degradation_warnings` surfaced. This matches `WRITE_REVIEW_ISOLATION:
STRUCTURAL_ON_TIER1_1B_1D; CONVENTION_ONLY_ON_TIER2`, now driven from one portable field.

---

## 4. Worked round-trip (losslessness proof)

The two current hand-written agents express in the canonical schema with no field lost.

### 4.1 `agents/pipeline-spec-reviewer.md` → canonical

Current frontmatter: `tools: Read, Glob, Grep` · `disallowedTools: Write, Edit, Bash` ·
`model_tier: medium` · `effort_tier: medium` · `maxTurns: 15` · `permissionMode: plan` ·
`version: "2.0"` · `skills: [sk-claude-code-conventions, sk-write-review-isolation, …]`.

```yaml
schema_version: "1.0"
name: spec-reviewer
role: reviewer
review_stage: 1
model_tier: medium
effort_tier: medium
turn_budget: 15
capabilities: { write_files: false, run_shell: false, network: false, edit_tracked_source: false }
tool_hints: { allow: [Read, Glob, Grep] }
isolation_required: false
protocol_skills: [sk-write-review-isolation]
status_protocol: standard
```

Mapping: `tools` + `permissionMode: plan` + `disallowedTools: Write, Edit, Bash` →
`write_files: false`, `run_shell: false` (no `Bash`), `network: false` (no web tool);
`Read, Glob, Grep` → `tool_hints.allow`; reviewer role + Stage 1 → `role: reviewer`,
`review_stage: 1`. No field lost. Materializing back yields the identical-in-effect CC agent.

### 4.2 `agents/pipeline-task-executor.md` → canonical

Current frontmatter: `tools: Read, Write, Edit, Bash, Glob, Grep` · `model_tier: medium` ·
`effort_tier: medium` · `maxTurns: 30` · `isolation: worktree` · `permissionMode: acceptEdits` ·
`version: "2.0"`.

```yaml
schema_version: "1.0"
name: task-executor
role: worker
review_stage: null
model_tier: medium
effort_tier: medium
turn_budget: 30
capabilities: { write_files: true, run_shell: true, network: false, edit_tracked_source: true }
isolation_required: true
status_protocol: standard
```

Mapping: `Write`/`Edit` present + `permissionMode: acceptEdits` → `write_files: true`,
`edit_tracked_source: true`; `Bash` present → `run_shell: true`; no web tool → `network: false`;
`isolation: worktree` → `isolation_required: true`. No field lost.

---

## 5. Validation rules (pointer)

The auditor enforces the canonical def via criteria `CAD-01..CAD-05` in
`compliance-matrix.md` (§6 Canonical agent-def). Severity examples appear in
`severity-classification.md`. Fixtures: `fixtures/cad-00-valid-canonical-def.md` (passing) and
`fixtures/cad-contradictions.md` (one failing section per rule with its cited SEV).
