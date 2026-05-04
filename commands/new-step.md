---
description: Add a new step to an existing pipeline — select pipeline, choose insertion point, design component, audit the delta, then gate on human approval
argument-hint: [description of the new step]
---

# New Step — Command Reference

> Adds a new step to an existing pipeline. Handles insertion point selection, component design, and mandatory topology mutation validation.

<args>
- **$ARGUMENTS**: Description of the new step to be added.
</args>

<protocol>
### 1. INITIALIZATION
- Read registries from all scopes and present the pipeline list.
- Parse `topology.json` and display the current step graph.
- **Insertion Point**: Choose between `before`, `after`, `parallel-to`, or `append-end`.

### 2. DESIGN & STAGING
- Run the 4D Method on the brief to determine component type (skill, agent, or reuse).
- Dispatch `pipeline-architect` in STEP-ADD mode.
- **Staging**: Stage all new files to `temp/{P}/edit-{ts}/`.

### 3. VERIFICATION
- **Topology Validation**: Verify the staged `topology.json` for wiring consistency and absence of dangling edges.
- **Delta Audit**: Execute `pipeline-auditor` in DELTA mode on the new component and its neighbors.
- SEV-0 and SEV-1 findings must be cleared before promotion.

### 4. DELIVERY
- **Human Gate**: Present a summary of changes and the updated topology for approval.
- **Atomic Promotion**: Move staged files to final paths and update the registry.
</protocol>

<invariants>
- NEVER skip the delta audit or the human gate.
- NEVER write directly to final paths; all mutations must be staged and validated first.
</invariants>
