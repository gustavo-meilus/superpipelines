---
description: Update an existing step in a pipeline — select pipeline, select step, apply changes, re-validate edges, audit the delta, then gate on human approval
argument-hint: [description of changes to the step]
---

# Update Step — Command Reference

> Updates an existing step in a pipeline. Includes mandatory edge re-validation, change propagation, and delta audits before promoting changes.

<args>
- **$ARGUMENTS**: Description of the changes to be applied to the step.
</args>

<protocol>
### 1. SELECTION & ANALYSIS
- Read registries and present the pipeline list.
- Parse `topology.json` and display current steps for selection.
- Run the 4D Method on the change brief to identify impacts on input/output schemas or internal behavior.

### 2. IMPACT PROPAGATION
- **Edge Re-validation**: If schemas change, identify affected predecessor and successor steps.
- Present an impact analysis to the user and confirm propagation before proceeding.

### 3. DESIGN & STAGING
- Dispatch `pipeline-architect` in UPDATE mode to apply changes and propagate edge updates.
- Stage all edits to `temp/{P}/edit-{ts}/`.

### 4. VERIFICATION
- **Delta Audit**: Execute `pipeline-auditor` in DELTA mode on the updated step, its neighbors, and the entry skill.
- SEV-0 and SEV-1 findings must be cleared before promotion.

### 5. DELIVERY
- **Human Gate**: Present a diff summary of all changed files for approval.
- **Atomic Promotion**: Move staged files to final paths and update the registry.
</protocol>

<invariants>
- NEVER apply changes to final paths before the delta audit returns a PASS.
- NEVER skip the edge re-validation or impact analysis phases.
- Maintain atomic consistency between the component code and the `topology.json` graph.
</invariants>
