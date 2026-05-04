---
name: adding-a-pipeline-step
description: Use when the user wants to add a new step, capability, or agent to an existing named pipeline, or invokes /superpipelines:new-step. Selects insertion point, designs the new component, mutates topology.json, audits the delta, and gates on human approval before writing to disk.
---

# Adding a Pipeline Step — Mutation Workflow

> Orchestrates the insertion of a new step, capability, or agent into an existing named pipeline. Trigger when the user requests to expand a workflow or invokes `/superpipelines:new-step`.

<overview>
The Adding a Pipeline Step workflow ensures that any mutation to an existing topology is seamless, audited, and atomic. It manages the full lifecycle from insertion point selection and architected design to rigorous topology validation and staging-to-production promotion, preventing broken edges or invalid dependency graphs.
</overview>

<glossary>
  <term name="Insertion Point">The specific location in the topology (Before, After, Parallel, or Append) where the new step is added.</term>
  <term name="Topology Mutation">The process of updating `topology.json` and the entry skill to reflect new dependency edges.</term>
  <term name="Atomic Promotion">Moving all verified artifacts from a temporary staging directory to final production paths in a single operation.</term>
</glossary>

## Workflow Phases

<protocol>
### PHASE 0: PIPELINE SELECTION & INSPECTION
- Resolve scope registries and select the target pipeline via `AskUserQuestion`.
- Read and display the current `topology.json` as a numbered list of steps and dependency edges.

### PHASE 1: INSERTION DESIGN
- Identify the insertion point (Before/After/Parallel/Append) and affected neighbors.
- Apply the 4D Method to define the new step's intent, inputs, and outputs.
- Determine the component type: Skill-only, Skill + Agent, or Reuse Existing.

### PHASE 2: ARCHITECTED STAGING
- Dispatch `pipeline-architect` in `STEP-ADD` mode to generate new artifacts.
- <invariant>All new artifacts MUST be written to `{ROOT}/superpipelines/temp/{P}/edit-{ts}/` for staging. NEVER write directly to production paths during design.</invariant>

### PHASE 3: TOPOLOGY VALIDATION
- Verify the staged `topology.json` for:
  - Unique Step ID.
  - Valid `depends_on` references.
  - Schema compatibility between predecessor outputs and new step inputs.
- **Failures**: Return to the Architect with specific error logs.

### PHASE 4: DELTA AUDIT
- Dispatch `pipeline-auditor` in `DELTA` mode on all staged files (components, topology, and entry skill).
- <HARD-GATE>If the audit returns SEV-0 or SEV-1 findings, remediate and re-audit. Do NOT proceed to promotion until the delta is clear.</HARD-GATE>

### PHASE 5: PROMOTION & REGISTRATION
- Present the updated topology and audit results for human approval (`AskUserQuestion`).
- Upon `APPROVE`, move staged files to their final absolute paths in agents, skills, and pipeline directories.
- Update the `registry.json` lists to include new components.
</protocol>

<invariants>
- NEVER skip the delta audit; topology mutations are the primary source of runtime orchestration failures.
- ALWAYS use a staging directory (`edit-{ts}/`) for artifact generation to prevent partial, unverified updates.
- Promote changes ONLY after explicit human approval of the updated `tasks.md` and topology snippet.
</invariants>

## Red Flags — STOP
- "The audit found minor issues, let's promote anyway." → **STOP**. SEV-0/1 findings are hard blockers for promotion.
- "I'll write directly to production paths to save time." → **STOP**. Direct writes bypass the mutation safety protocol.
- "The insertion point looks obvious, skip validation." → **STOP**. Topology validation catches silent edge mismatches.

## Rationalization Table

<rationalization_table>
| Excuse | Reality |
| :--- | :--- |
| "Staging is extra overhead." | Staging allows for a rollback if the audit or human review fails. Direct writes are permanent and destructive. |
| "Topology validation is redundant." | Manual inspection often misses transitive dependency breaks caused by insertion. |
| "Minor audit findings won't break it." | Even SEV-1 findings can cause context leakage or state corruption during execution. |
</rationalization_table>

## Reference Files
- `sk-pipeline-paths/SKILL.md` — Path resolution.
- `sk-4d-method/SKILL.md` — Brief refinement.
- `creating-a-pipeline/SKILL.md` — Core scaffolding rules.
- `deleting-a-pipeline-step/SKILL.md` — Removal workflow.
