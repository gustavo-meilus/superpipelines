---
name: updating-a-pipeline-step
description: Use when the user wants to modify, change, or update an existing step within a named pipeline, or invokes /superpipelines:update-step. Reads current step, applies changes, re-validates edges with neighbors, audits the delta, and gates on human approval before writing to disk.
---

# Updating a Pipeline Step — Modification Workflow

> Orchestrates the modification of an existing step within a named pipeline. Trigger when the user requests to change logic, tools, or I/O contracts for a step or invokes `/superpipelines:update-step`.

<overview>
The Updating a Pipeline Step workflow ensures that modifications to individual components do not break the larger orchestration contract. It focuses on impact analysis—identifying how I/O schema changes propagate to predecessors and successors—and enforces a rigorous audit-and-stage protocol before promoting changes to production paths.
</overview>

<glossary>
  <term name="Edge Re-validation">The process of verifying that neighbor steps still satisfy (or consume) modified input/output contracts.</term>
  <term name="Internal Behavior Change">A modification affecting only a step's logic or tools, with no impact on the topology edges.</term>
  <term name="Contract Propagation">The automatic update of neighboring steps to accommodate a changed I/O schema.</term>
</glossary>

## Workflow Phases

<protocol>
### PHASE 0: PIPELINE & STEP SELECTION
- Resolve registries and identify the target pipeline and step via `AskUserQuestion`.
- Display step metadata: agent/skill paths, current frontmatter, and declared I/O schemas.

### PHASE 1: IMPACT ANALYSIS (4D)
- Apply the 4D Method to deconstruct the brief.
- Classify the change category: Input Change, Output Change, Internal Change, or Full Contract Change.
- **Goal**: Identify exactly which predecessors or successors are affected by the mutation.

### PHASE 2: EDGE RE-VALIDATION
- If I/O schemas change, verify that all neighbor steps remain compatible.
- Present the impact analysis to the user (e.g., "Updating A's output affects B and C").
- <invariant>Obtain explicit user confirmation before propagating contract changes to neighboring steps.</invariant>

### PHASE 3: ARCHITECTED STAGING
- Dispatch `pipeline-architect` in `STEP-UPDATE` mode to generate modified artifacts.
- <invariant>All changes MUST be written to `{ROOT}/superpipelines/temp/{P}/edit-{ts}/` for staging. NEVER overwrite production files during design.</invariant>

### PHASE 4: DELTA AUDIT
- Dispatch `pipeline-auditor` in `DELTA` mode on the staged artifacts and neighbor components.
- <HARD-GATE>SEV-0 or SEV-1 findings block promotion. Dispatch the Architect to remediate and re-audit until the delta is clear.</HARD-GATE>

### PHASE 5: HUMAN APPROVAL & PROMOTION
- Present a diff summary, updated topology edges, and audit results for human review (`AskUserQuestion`).
- Upon `APPROVE`, atomically move staged files to their final absolute paths and update `registry.json`.
</protocol>

<invariants>
- NEVER assume an I/O change is "minor"; always run the Phase 2 impact analysis.
- ALWAYS use a staging directory (`edit-{ts}/`) for all modifications to allow for safe rollback.
- Propagate contract changes to neighbors ONLY after explicit user authorization.
</invariants>

## Red Flags — STOP
- "The output schema change is minor — no need to check successors." → **STOP**. Contract changes propagate; skipping re-validation causes runtime cascading failures.
- "I'll skip the human gate; it's just a small logic tweak." → **STOP**. Small logic changes can have non-obvious impacts on state management or neighbor agents.
- "The audit found only SEV-2 issues; good enough." → **STOP**. SEV-0/1 findings are hard blockers for promotion.

## Rationalization Table

<rationalization_table>
| Excuse | Reality |
| :--- | :--- |
| "The neighbors clearly accept the new format." | Contracts are explicit in `topology.json`. Verify against the schema, not from intuition. |
| "Skip Phase 2 to save time." | A 30-second impact check prevents a multi-hour pipeline redesign. |
| "I'll update the neighbors in a separate task." | Neighbor updates must be atomic with the step update to prevent an inconsistent topology state. |
</rationalization_table>

## Reference Files
- `sk-pipeline-paths/SKILL.md` — Path resolution.
- `sk-write-review-isolation/SKILL.md` — Review loop rules.
- `adding-a-pipeline-step/SKILL.md` — Insertion workflow.
- `deleting-a-pipeline-step/SKILL.md` — Removal workflow.
