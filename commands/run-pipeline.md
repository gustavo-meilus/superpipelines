---
description: List all pipelines in the current workspace (all scopes) and run the entry skill of the user-selected one
argument-hint: [optional: --resume]
---

# Run Pipeline — Command Reference

> Orchestrates the execution of a selected pipeline. Handles registry discovery, state initialization, and support for run resumption.

<args>
- **$ARGUMENTS**: Optional flags, such as `--resume`.
</args>

<protocol>
### 1. DISCOVERY
- Read `registry.json` from all scopes (`local`, `project`, `user`).
- Present a deduplicated list of available pipelines with scope labels.

### 2. INITIALIZATION
- Resolve the pipeline to run via user selection.
- **Resume Mode**: If `--resume` is active, present available `runId`s from staging for selection.
- Initialize run state in the canonical `pipeline-state.json` file.

### 3. EXECUTION
- Invoke the pipeline's entry skill (`run-{P}`) to begin orchestration.
- **Success Path**: On terminal `DONE`, delete the temporary run directory.
- **Failure Path**: On `ESCALATED`, `FAILED`, or `BLOCKED`, preserve the temporary state for diagnosis.
</protocol>

<invariants>
- NEVER auto-resume an `escalated` or `failed` state without explicit user confirmation.
- Always provide the absolute path to the temporary state directory if execution does not reach `DONE`.
</invariants>
