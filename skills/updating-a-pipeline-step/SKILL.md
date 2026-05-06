---
name: updating-a-pipeline-step
description: Use when the user wants to modify, change, or update an existing step within a named pipeline, or invokes /superpipelines:update-step. Reads current step, applies changes, re-validates edges with neighbors, audits the delta, and gates on human approval before writing to disk.
---

# Updating a Pipeline Step

Modifies an existing step in a named pipeline. Ensures the change does not break edge contracts with neighboring steps.

## When this fires

- `/superpipelines:update-step` invoked.
- "Update [step] in [pipeline]" / "Change how [step] works" / "Modify [agent/skill] to do X instead of Y".

When NOT to use:

- Adding a new step → `adding-a-pipeline-step`.
- Removing a step → `deleting-a-pipeline-step`.

## Workflow

### Phase 0 — Pipeline and step selection

Read registries (all scopes) via `sk-pipeline-paths`. Ask which pipeline.

Read `topology.json` for the chosen pipeline. Display current steps. Ask which step to update.

Show a summary of the chosen step:
- Agent file path (if any) and current frontmatter (model, effort, tools, permissionMode).
- Skill file path and description.
- Declared `inputs` and `outputs` from `topology.json`.

### Phase 1 — Brief intake (4D)

Apply the 4D Method on the change brief. Gate if ≥3 critical slots missing.

Explicitly identify the change category:

| Category | Impact |
|----------|--------|
| Input schema change | Affects predecessors — they must still satisfy new inputs |
| Output schema change | Affects successors — their inputs must still be satisfied |
| Internal behavior only (new logic, new tools, effort change) | No edge impact |
| Contract change (both I/O schema) | Affects both predecessors and successors |

State the category before Phase 2.

### Phase 2 — Edge re-validation planning

**If input schema changes:** identify all steps whose outputs feed into this step. Verify their declared outputs still satisfy the new input requirements.

**If output schema changes:** identify all steps that consume this step's outputs. Verify their declared inputs will still be satisfied.

Present the impact analysis to the user before dispatching:

> "Updating [step]'s output schema affects [step-X] and [step-Y]. I will propagate the contract change to those steps. Confirm? [YES / REVISE / CANCEL]"

On `REVISE`: collect the user's alternative wiring. On `CANCEL`: emit `BLOCKED`.

### Phase 3 — Architect dispatch

Dispatch `pipeline-architect` in STEP-UPDATE mode with:
- The change brief and Phase 2 impact analysis.
- Current file paths (paths only — architect reads them).
- Scope root and pipeline name.
- List of neighbor steps requiring edge updates (from Phase 2).

The architect stages all changes (including propagated edge updates) to `{ROOT}/superpipelines/temp/{P}/edit-{ts}/`.

### Phase 4 — Delta audit

Dispatch `pipeline-auditor` in DELTA mode on:
- All staged changed files.
- Immediate neighbors of the updated step.
- The staged updated entry skill `run-{P}`.

<HARD-GATE>
SEV-0 or SEV-1 findings block promotion. Dispatch architect in UPDATE mode to fix, then re-audit. Do NOT promote until audit passes with no SEV-0/1.
</HARD-GATE>

### Phase 5 — Human gate

Present:
- Diff summary of all changed files (from Architect's Brief).
- Updated topology edges (if any changed).
- Audit result.

Ask via `AskUserQuestion`: `APPROVE | REVISE`.

On `REVISE`: collect feedback; return to Phase 1.

### Phase 6 — Atomic promotion

Promote staging to final paths. Update `registry.json`. On failure: preserve staging dir and surface its absolute path.

```json
{ "status": "DONE", "outputs": ["<all promoted paths>"] }
```

## Red Flags — STOP

- "The output schema change is minor — no need to check successors" → Contract changes propagate. Always run Phase 2 impact analysis before dispatching.
- "I'll skip the human gate; it's a small change" → Small changes that break edge contracts cause full pipeline failures. Gate cost < recovery cost.
- "The audit found only SEV-2 issues; good enough" → SEV-0/1 blocks promotion. SEV-2/3 are tracked and reported but do not block.

## Rationalization Table

| Excuse | Reality |
|--------|---------|
| "The neighbors clearly accept the new output format" | Topology JSON declares contracts explicitly. Verify from the file, not from intuition. |
| "The user is in a hurry; skip Phase 2" | A 30-second impact check prevents a full pipeline re-design. |
