---
description: Delete a step from an existing pipeline — select pipeline, select step, perform gap analysis, optionally rewire, audit the delta, then gate on human approval before any deletion
argument-hint: [optional: step name]
---

# Delete Step — Command Reference

> Deletes a step from an existing pipeline. Performs mandatory gap analysis and optional rewiring, followed by a delta audit and human approval before execution.

<args>
- **$ARGUMENTS**: Optional step name. If provided, skips the selection prompt when unambiguous.
</args>

<protocol>
### 1. SELECTION
- Read registries and present the pipeline list.
- Parse `topology.json` and display current steps.
- Resolve the target step to delete.

### 2. GAP ANALYSIS
Identify predecessors and successors of the target step. Classify the gap:
- **None**: No dependent successors.
- **Through-gap**: Rewire required.
- **Blocking-gap**: No valid rewire path exists.

### 3. DESIGN & STAGING
- Present rewire options if a gap exists.
- Dispatch `pipeline-architect` in STEP-DELETE mode to stage changes to `temp/{P}/edit-{ts}/`.

### 4. VERIFICATION
- **Delta Audit**: Execute `pipeline-auditor` in DELTA mode on affected neighbors and the entry skill.
- SEV-0 and SEV-1 findings must be cleared before promotion.

### 5. DELIVERY
- **Human Gate**: Present a summary of deletions and rewiring for approval.
- **Atomic Promotion**: Upon approval, move staged files to final paths and update the registry and topology.
</protocol>

<invariants>
- NEVER delete a step that creates an unresolvable gap without a verified rewire plan and explicit confirmation.
- NEVER skip the delta audit during the deletion process.
- On CANCEL at the human gate, all staged changes MUST be discarded.
</invariants>
