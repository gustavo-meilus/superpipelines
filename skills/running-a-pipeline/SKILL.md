---
name: running-a-pipeline
description: Use when the user asks to run a pipeline, execute a workflow, list available pipelines, or invokes /superpipelines:run-pipeline. Reads all scope registries, lets the user pick a pipeline, then invokes its entry skill.
---

# Running a Pipeline — Execution Workflow

> Registry-driven launcher for named Superpipelines. Trigger when the user asks to execute a workflow, list available pipelines, or invokes `/superpipelines:run-pipeline`.

<overview>
The Running a Pipeline workflow acts as the central orchestrator for pipeline execution. It manages the full lifecycle from discovery across multiple scopes (Local, Project, User) to state-aware resumption and terminal completion. It ensures that execution is always grounded in the current `pipeline-state.json` and that escalation states are preserved for human review.
</overview>

<glossary>
  <term name="Pipeline Registry">A central `registry.json` tracking all pipelines within a scope.</term>
  <term name="Resume Protocol">The logic used to recover a crashed or interrupted run using its persisted state.</term>
  <term name="Escalated State">A non-terminal status indicating that a pipeline reached a boundary requiring human intervention.</term>
</glossary>

## Workflow Phases

<protocol>
### PHASE 0: DISCOVERY & SELECTION
- Resolve all scope roots via `sk-pipeline-paths`.
- Read and merge `registry.json` files from `local`, `project`, and `user` scopes.
- Present available pipelines to the user and capture the selection (`{ROOT}`, `{P}`, `pattern`).

### PHASE 1: RESUME CHECK
- Check for existing run directories in `{ROOT}/superpipelines/temp/{P}/`.
- **Logic**: If runs exist, prompt the user to start new or resume.
- <HARD-GATE>NEVER auto-resume an `escalated` or `failed` run. Surface the state path and require explicit user review first.</HARD-GATE>

### PHASE 2: STATE INITIALIZATION
- Generate a new `runId` (format: `{P}-{YYYYMMDD-HHMMSS}`).
- Initialize `pipeline-state.json` using the atomic write protocol (write to `.tmp` then rename).
- **Invariants**: Must include `pipeline_id`, `started_at`, and the selected execution `pattern`.

### PHASE 3: ENTRY SKILL DISPATCH
- Invoke the pipeline's entry skill (`run-{P}`).
- **Context Handoff**: Pass absolute paths to the scope root, state file, and topology.
- **Responsibility**: The entry skill owns step dispatch, two-stage review (Stage 1 gates Stage 2), and cleanup.

### PHASE 4: COMPLETION & CLEANUP
- Read final state from `pipeline-state.json`.
- **Status: `completed`**: Delete the temporary run directory and summarize outputs.
- **Status: `escalated/failed`**: **PRESERVE** the temporary directory and state path for debugging and recovery.
</protocol>

<invariants>
- ALWAYS read from the registry before execution to ensure pipeline validity.
- ALWAYS preserve the temp directory on any status other than `completed`.
- NEVER pass full file content to the entry skill; use absolute paths.
- All state updates must utilize the atomic write pattern.
</invariants>

## Red Flags — STOP
- "The previous run was escalated, but I'll restart it anyway." → **STOP**. Read the state first to avoid repeating the failure.
- "There is no registry, I'll search for artifacts manually." → **STOP**. Direct the user to create a managed pipeline.
- "I'll delete the temp directory to keep the workspace clean." → **STOP**. Deletion on non-completion destroys all recovery findings.

## Rationalization Table

<rationalization_table>
| Excuse | Reality |
| :--- | :--- |
| "I'll resume the escalated run." | Escalation signals a boundary the model cannot cross. Resuming without review wastes tokens. |
| "Registry-only lookup is slow." | Searching without a registry is non-deterministic and risks path leakage. |
| "The entry skill is just a wrapper." | The entry skill is the source of truth for step ordering and review gating. |
</rationalization_table>

## Reference Files
- `sk-pipeline-paths/SKILL.md` — Scope root resolution.
- `sk-pipeline-state/SKILL.md` — State schema and recovery rules.
- `sk-write-review-isolation/SKILL.md` — Two-stage review protocol.
- `creating-a-pipeline/SKILL.md` — Pipeline scaffolding.
