---
name: adding-a-pipeline-step
description: Use when the user wants to add a new step, capability, or agent to an existing named pipeline, or invokes /superpipelines:new-step. Selects insertion point, designs the new component, mutates topology.json, audits the delta, and gates on human approval before writing to disk.
---

# Adding a Pipeline Step

Adds a new step to an existing named pipeline. Ensures the insertion is seamless: predecessor outputs wire to the new step's inputs, and the new step's outputs wire to successors.

## When this fires

- `/superpipelines:new-step` invoked.
- "Add a step to [pipeline]" / "Insert [capability] into [pipeline]" / "I need [X] to happen between [A] and [B]".

When NOT to use:

- No pipeline exists yet → `creating-a-pipeline`.
- Updating an existing step → `updating-a-pipeline-step`.
- Deleting a step → `deleting-a-pipeline-step`.

## Workflow

### Phase 0 — Pipeline selection

Read registries from all scopes via `sk-pipeline-paths`. Present the list. Ask via `AskUserQuestion` which pipeline to update. Resolve `{ROOT}` and `{P}`.

### Phase 1 — Topology inspection

Read `{ROOT}/superpipelines/pipelines/{P}/topology.json`. Display the current step graph as a numbered list showing `id → name → depends_on → outputs`.

### Phase 2 — Insertion point

Ask via `AskUserQuestion`:

> Where should the new step be inserted?
> a) Before [step]
> b) After [step]
> c) In parallel with [step] (same parallel group)
> d) Append at the end

Record the insertion point and the IDs of affected predecessor and successor steps.

### Phase 3 — Brief intake (4D)

Apply the 4D Method on the brief. Gate if ≥3 critical slots missing.

Determine component type:
- **Skill-only**: lightweight routing, transformation, or orchestration logic — no dedicated agent needed.
- **Skill + new agent**: the step requires a dedicated subagent.
- **Reuse existing agent**: an agent already in this pipeline (or another registered pipeline) handles this role.

State the choice and rationale before Phase 4.

### Phase 4 — Architect dispatch

Dispatch `pipeline-architect` in STEP-ADD mode with:
- The brief, insertion point, and component type decision.
- Predecessor output schema(s) and successor input schema(s) (from `topology.json`).
- Scope root and pipeline name.

The architect stages all new files to `{ROOT}/superpipelines/temp/{P}/edit-{ts}/` — does NOT write to final paths.

### Phase 5 — Topology mutation validation

Verify the staged `topology.json` patch:
- New step `id` is unique in the graph.
- New step `depends_on` references valid existing step ids.
- Predecessor step outputs are compatible with new step's declared inputs.
- Successor steps updated to include the new step in their `depends_on` where appropriate.

If validation fails: return to architect with specific gaps. Do NOT proceed to audit.

### Phase 6 — Delta audit

Dispatch `pipeline-auditor` in DELTA mode on:
- All new component files in the staging area.
- The staged updated `topology.json`.
- The staged updated entry skill `run-{P}`.
- Immediate neighbor agents and skills (from topology edges).

<HARD-GATE>
If audit returns SEV-0 or SEV-1: dispatch architect in UPDATE mode to fix. Re-audit. Do NOT promote staged files until audit passes with no SEV-0/1.
</HARD-GATE>

### Phase 7 — Human gate

Present to the user:
- What the new step does (from Architect's Brief).
- Updated Mermaid topology snippet showing the insertion.
- Audit result.

Ask via `AskUserQuestion`: `APPROVE | REVISE`.

On `REVISE`: collect feedback; return to Phase 3.

### Phase 8 — Atomic promotion

Move all files from staging to final paths:
- New agent file → `{ROOT}/agents/superpipelines/{P}/`
- New skill dir → `{ROOT}/skills/superpipelines/{P}/`
- Updated `topology.json` → `{ROOT}/superpipelines/pipelines/{P}/`
- Updated entry skill → `{ROOT}/skills/superpipelines/{P}/run-{P}/`

Update `{ROOT}/superpipelines/registry.json` agent/skill lists.

On any promotion failure: leave the staging dir intact; surface the absolute path of the staging dir.

```json
{ "status": "DONE", "outputs": ["<all promoted paths>"] }
```

## Red Flags — STOP

- "The audit found minor issues, let's promote anyway" → SEV-0/1 blocks promotion. Fix, re-audit, then promote.
- "I'll write directly to final paths to save time" → Atomic promotion prevents partial updates. Staging is non-negotiable.
- "The insertion point looks obvious, skip Phase 5 validation" → Topology validation is what catches silent edge mismatches.
