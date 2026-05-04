---
name: deleting-a-pipeline-step
description: Use when the user wants to remove or delete a step from an existing named pipeline, or invokes /superpipelines:delete-step. Performs gap analysis, optionally rewires edges, audits the delta, and gates on human approval before any deletion occurs.
---

# Deleting a Pipeline Step — Removal Workflow

> Orchestrates the removal of a step from an existing named pipeline while ensuring topology continuity. Trigger when the user requests to delete a capability or invokes `/superpipelines:delete-step`.

<overview>
The Deleting a Pipeline Step workflow guarantees that the removal of a component does not result in a fragmented dependency graph. It utilizes a rigorous gap analysis to identify necessary rewiring, stages all deletions and mutations for audit, and enforces a mandatory human gate before executing irreversible file removals.
</overview>

<glossary>
  <term name="Gap Analysis">The process of identifying predecessor/successor disconnections caused by a step removal.</term>
  <term name="Through-gap">A condition where a deleted step sat between two active steps, requiring direct reconnection.</term>
  <term name="Blocking-gap">A condition where a deleted step was the sole source of required inputs for a successor.</term>
</glossary>

## Workflow Phases

<protocol>
### PHASE 0: PIPELINE & STEP SELECTION
- Resolve scope registries and identify the target pipeline and step.
- Display the current `topology.json` as a graph showing all dependency chains.

### PHASE 1: GAP ANALYSIS
- Analyze the impact of removal on predecessors and successors.
- <HARD-GATE>If a **Blocking-gap** is found (no alternative input source), STOP. The user must provide an alternative source or cancel the deletion.</HARD-GATE>

### PHASE 2: MUTATION DESIGN (REWIRE)
- For through-gaps or entry-gaps, present a rewire plan to the user (e.g., "Wire A directly to C").
- Dispatch `pipeline-architect` in `STEP-DELETE` mode to stage all changes.
- <invariant>All mutations (file removals and topology updates) MUST be staged in `edit-{ts}/`. NEVER delete directly from production paths during design.</invariant>

### PHASE 3: DELTA AUDIT
- Dispatch `pipeline-auditor` in `DELTA` mode on the staged topology, entry skill, and neighbor steps.
- <HARD-GATE>SEV-0 or SEV-1 findings block deletion. A fragmented pipeline is a critical failure. Re-audit until the delta is clear.</HARD-GATE>

### PHASE 4: HUMAN APPROVAL
- Present a "Deletion Manifest" showing exactly which files will be removed and which edges will be rewired.
- <HARD-GATE>Wait for explicit `APPROVE`. On `CANCEL`, discard all staged changes and do NOT delete artifacts.</HARD-GATE>

### PHASE 5: ATOMIC PROMOTION
- Execute file removals (agents/skills) and write updated `topology.json` and `tasks.md`.
- Update the `registry.json` to reflect the removal.
</protocol>

<invariants>
- NEVER assume a step is "unused" without verifying all `depends_on` entries in the topology graph.
- ALWAYS perform atomic promotion from a staging area to ensure rollback capability.
- NEVER delete a step that creates an unresolvable blocking-gap in the orchestration.
</invariants>

## Red Flags — STOP
- "The pipeline will work without rewiring — it's obvious." → **STOP**. Obvious assumptions are the leading source of silent runtime failures.
- "I'll skip the human gate; deletion is a simple task." → **STOP**. Deletion is irreversible; the human gate is the final recovery point.
- "I'll delete the files first, then update the topology." → **STOP**. This results in a broken pipeline if the topology update fails.

## Rationalization Table

<rationalization_table>
| Excuse | Reality |
| :--- | :--- |
| "The step is terminal, why audit?" | Removing a terminal step can still break final status reporting or cleanup logic. |
| "Rewiring is over-engineering." | A broken dependency chain blocks every subsequent pipeline run. Rewiring is essential maintenance. |
| "I can recover from git if I'm wrong." | Relying on git recovery for basic workflow errors indicates a failure of the safety protocol. |
</rationalization_table>

## Reference Files
- `sk-pipeline-paths/SKILL.md` — Path resolution.
- `sk-pipeline-state/SKILL.md` — Run state tracking.
- `adding-a-pipeline-step/SKILL.md` — Insertion workflow.
- `updating-a-pipeline-step/SKILL.md` — Modification workflow.
