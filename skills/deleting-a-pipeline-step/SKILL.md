---
name: deleting-a-pipeline-step
description: Use when the user wants to remove or delete a step from an existing named pipeline, or invokes /superpipelines:delete-step. Performs gap analysis, optionally rewires edges, audits the delta, and gates on human approval before any deletion occurs.
---

# Deleting a Pipeline Step

Removes a step from a named pipeline while guaranteeing the remaining topology stays seamless. Deletion is staged, audited, and human-gated before any file is removed.

## When this fires

- `/superpipelines:delete-step` invoked.
- "Remove [step] from [pipeline]" / "Delete [step]" / "I don't need [capability] anymore in [pipeline]".

When NOT to use:

- Updating a step → `updating-a-pipeline-step`.
- Adding a step → `adding-a-pipeline-step`.

## Workflow

### Phase 0 — Pipeline and step selection

Read registries (all scopes) via `sk-pipeline-paths`. Ask which pipeline.

Read `topology.json`. Display current steps with their dependency chains. Ask which step to delete (skip if `$ARGUMENTS` identifies it unambiguously).

### Phase 1 — Gap analysis

From `topology.json`, find all predecessors and successors of the target step. Classify the gap:

| Gap type | Condition | Resolution options |
|----------|-----------|-------------------|
| **None** | Step has no successors (terminal step) | Safe to delete; no rewire needed |
| **Through-gap** | Step has both predecessors and successors | Predecessors must connect directly to successors |
| **Blocking-gap** | Step is the ONLY source for a successor's required inputs | Must rewire with an alternative source, or cancel |
| **Entry-gap** | Step is the first step in the pipeline | Entry skill `run-{P}` must be updated to start from the next step |

Present the gap analysis to the user before proceeding.

<HARD-GATE>
If gap type is "blocking-gap" and no valid predecessor exists to rewire from: surface to the user. Options: "Provide an alternative source | Cancel deletion". Do NOT delete without a complete resolution plan.
</HARD-GATE>

### Phase 2 — Rewire planning (if gap exists)

If a through-gap or entry-gap exists, present the proposed rewire to the user:

> "Deleting [step] will disconnect [predecessor(s)] from [successor(s)].
> Proposed: wire [predecessor] → [successor] directly.
> Assumption: [predecessor]'s outputs satisfy [successor]'s inputs.
> Proceed? [YES / REVISE / CANCEL]"

On `REVISE`: let the user specify the wiring. On `CANCEL`: emit `BLOCKED`.

### Phase 3 — Architect dispatch (if rewire needed)

Dispatch `pipeline-architect` in STEP-DELETE mode with:
- Target step ID.
- Rewire plan from Phase 2.
- Scope root and pipeline name.

The architect stages to `{ROOT}/superpipelines/temp/{P}/edit-{ts}/`:
- Marks agent file and skill directory for deletion.
- Updates `topology.json` (removes step, adds rewire edges).
- Updates `tasks.md` (removes tasks for the deleted step).
- Updates entry skill `run-{P}` (removes dispatch for deleted step; adds rewire dispatch if needed).

**If NO rewire is needed** (gap type "none"): the orchestrating skill may stage the deletion directly without architect dispatch:
1. Mark agent and skill paths for deletion in a staging manifest.
2. Prepare updated `topology.json` and `tasks.md` with the step removed.

### Phase 4 — Delta audit

Dispatch `pipeline-auditor` in DELTA mode on:
- The staged updated `topology.json`.
- The staged updated entry skill `run-{P}`.
- All neighbor steps whose `depends_on` changed.

<HARD-GATE>
SEV-0 or SEV-1 findings block deletion. A pipeline with a gap is worse than a pipeline with an extra step. Fix, re-audit. Do NOT proceed until no SEV-0/1 remain in the changed scope.
</HARD-GATE>

### Phase 5 — Human gate

Show the user exactly what will be deleted and what (if anything) will be rewired:

```
Deleting:
  agents/superpipelines/{P}/{step}.md
  skills/superpipelines/{P}/{step}/

Updating:
  topology.json — step "{id}" removed; edge {pred} → {succ} added (if rewire)
  run-{P}/SKILL.md — dispatch for "{step}" removed

Audit: PASS (no SEV-0/1 findings)
```

Ask via `AskUserQuestion`: `APPROVE | CANCEL`.

<HARD-GATE>
On CANCEL: discard all staged changes. Do NOT delete anything. Emit `BLOCKED` with reason "user cancelled".
</HARD-GATE>

### Phase 6 — Atomic promotion

Promote staged changes to final paths:
- Delete marked agent and skill files.
- Write updated `topology.json`, `tasks.md`, and entry skill.
- Update `{ROOT}/superpipelines/registry.json` agent/skill lists.

On any failure: preserve the staging dir; surface its absolute path.

```json
{ "status": "DONE", "outputs": ["<updated topology path>", "<updated entry skill path>"] }
```

## Red Flags — STOP

- "The pipeline still works without rewiring — it's obvious" → Always run gap analysis. Obvious assumptions are the most common source of silent pipeline failures.
- "I'll skip the human gate; deletion is simple" → Deletion is irreversible. The gate exists precisely because files cannot easily be recovered.
- "I'll delete the files directly, then update topology" → Non-atomic deletion leaves the pipeline in a broken state if anything fails mid-way. Always stage first.

## Rationalization Table

| Excuse | Reality |
|--------|---------|
| "The step is unused, clearly safe to delete" | The topology graph is the truth. Read `depends_on` before assuming. |
| "Rewiring will take too long; just delete and fix later" | A broken pipeline blocks every subsequent run. The rewire prevents the breakage. |
