---
name: run-parity-test-d
description: Use when the user wants to run the parity-test-d pipeline on Tier 1c (Antigravity CLI) to scan a source directory and produce a code health report.
disable-model-invocation: true
user-invocable: true
plugin_version: "2.0.0"
---

# run-parity-test-d — Entry Skill

> Entry point for the `parity-test-d` pipeline. Orchestrates the sequential dispatch of `scanner` and `reporter` agents on Tier 1c (Antigravity CLI) via model_driven dispatch.

<overview>
This skill initializes the pipeline run, surfaces Tier 1c degradation warnings, dispatches the scanner and reporter agents in sequence via the model_driven path of `sk-platform-dispatch`, and confirms the output file location on completion.
</overview>

## Platform Context

- **Tier**: `tier_1c` (Antigravity CLI)
- **Dispatch mechanism**: `model_driven` — the host orchestrator drives subagent sequencing; no `Task()` primitive available.
- **model_field_format**: `omit` — agents do not declare `model:` or `model_tier:` in their dispatch prompts; the host owns model selection.
- **Degradation warning (MUST surface before execution)**:
  > "Antigravity uses dynamic subagents — per-step model assignment is not supported. Only the orchestrator's model tier is user-configurable. Subagent model selection is owned by Antigravity's orchestrator."

## Workflow

<protocol>

### PHASE 0: PREFLIGHT

1. Emit the Tier 1c degradation warning above.
2. Resolve `{ROOT}` via `sk-pipeline-paths` (scope root resolved from the active tier profile at runtime — never hardcoded).
3. Resolve `{runId}` = ISO-8601 timestamp (e.g., `20260526T143000Z`).
4. Create temp directory: `{ROOT}/superpipelines/temp/parity-test-d/{runId}/`.
5. Create `output/` directory if absent: `{ROOT}/output/`.
6. Initialize `pipeline-state.json` at `{ROOT}/superpipelines/temp/parity-test-d/{runId}/pipeline-state.json`:

```json
{
  "pipeline_id": "parity-test-d",
  "run_id": "{runId}",
  "started_at": "{iso8601}",
  "plugin_version": "2.0.0",
  "pattern": "1",
  "status": "running",
  "current_phase": 0,
  "metadata": {
    "source_tier": "tier_1c",
    "runtime_tier": "tier_1c",
    "orchestrator_tier": "fast",
    "resolved_models": {}
  },
  "phases": [
    {
      "index": 0,
      "step_id": "scanner",
      "name": "scan",
      "status": "pending",
      "agent": "agents/superpipelines/parity-test-d/scanner.md",
      "outputs": [],
      "error": null
    },
    {
      "index": 1,
      "step_id": "reporter",
      "name": "report",
      "status": "pending",
      "agent": "agents/superpipelines/parity-test-d/reporter.md",
      "outputs": [],
      "error": null
    }
  ]
}
```

7. Ask the user to provide the path to the source directory to scan if not already supplied. Record as `{SOURCE_DIR}`.

### PHASE 1: DISPATCH SCANNER (model_driven)

DISPATCH via model_driven orchestration:

```
Agent: scanner
Protocol: {ROOT}/skills/superpipelines/parity-test-d/scanner-protocol/SKILL.md
Context to pass:
  - source_directory: {SOURCE_DIR}
  - state_path: {ROOT}/superpipelines/temp/parity-test-d/{runId}/pipeline-state.json
  - metrics_output_path: {ROOT}/superpipelines/temp/parity-test-d/{runId}/scanner-metrics.json
  - run_id: {runId}
  - root: {ROOT}
```

Wait for terminal status from scanner:
- `DONE` → update `pipeline-state.json` phases[0].status = "completed"; advance to Phase 2.
- `DONE_WITH_CONCERNS` → update phases[0].status = "completed_with_concerns"; emit concerns; advance to Phase 2.
- `NEEDS_CONTEXT` → update phases[0].status = "blocked"; surface message to user; STOP.
- `BLOCKED` → update phases[0].status = "blocked"; surface message to user; STOP.

### PHASE 2: DISPATCH REPORTER (model_driven)

DISPATCH via model_driven orchestration:

```
Agent: reporter
Protocol: {ROOT}/skills/superpipelines/parity-test-d/reporter-protocol/SKILL.md
Context to pass:
  - metrics_path: {ROOT}/superpipelines/temp/parity-test-d/{runId}/scanner-metrics.json
  - output_path: {ROOT}/output/parity-test-d-health-report.md
  - state_path: {ROOT}/superpipelines/temp/parity-test-d/{runId}/pipeline-state.json
  - run_id: {runId}
  - root: {ROOT}
```

Wait for terminal status from reporter:
- `DONE` → update phases[1].status = "completed"; advance to Phase 3.
- `DONE_WITH_CONCERNS` → update phases[1].status = "completed_with_concerns"; emit concerns; advance to Phase 3.
- `NEEDS_CONTEXT` → update phases[1].status = "blocked"; surface message to user; STOP.
- `BLOCKED` → update phases[1].status = "blocked"; surface message to user; STOP.

### PHASE 3: FINALIZE

1. Update `pipeline-state.json`:
   - `status`: `"completed"` (or `"completed_with_concerns"` if any phase had concerns)
   - `completed_at`: ISO-8601 timestamp
2. Delete the temp run directory: `{ROOT}/superpipelines/temp/parity-test-d/{runId}/`
   - On BLOCKED or NEEDS_CONTEXT: preserve the directory (do NOT delete); it holds resume state.
3. Confirm to the user:
   > Pipeline `parity-test-d` completed. Health report written to: `{ROOT}/output/parity-test-d-health-report.md`

</protocol>

<invariants>
- NEVER use `Task()` — Tier 1c has `task_primitive: false`. All dispatch is model_driven.
- NEVER pass file contents in dispatch prompts — pass file paths only (anti-pattern #3 Context Dumping).
- ALWAYS surface the Tier 1c degradation warning before dispatching any agent.
- ALWAYS update `pipeline-state.json` after each phase completes.
- NEVER advance past a `BLOCKED` or `NEEDS_CONTEXT` status without human input.
- Emit exactly one terminal status at the end of this skill's own execution (not the subagents').
</invariants>
