---
name: run-parity-test-c
description: Use when the user wants to run the parity-test-c pipeline on Tier 1c (Antigravity CLI) to analyze a text document and produce a structured markdown summary.
disable-model-invocation: true
user-invocable: true
plugin_version: "2.0.0"
---

# run-parity-test-c — Entry Skill

> Entry point for the `parity-test-c` pipeline. Orchestrates the sequential dispatch of `analyzer` and `summarizer` agents on Tier 1c (Antigravity CLI) via model_driven dispatch.

<overview>
This skill initializes the pipeline run, surfaces Tier 1c degradation warnings, dispatches the analyzer and summarizer agents in sequence via the model_driven path of `sk-platform-dispatch`, and confirms the output file location on completion.
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
2. Resolve `{ROOT}` via `sk-pipeline-paths` (the scope root for tier_1c is the `.agents/antigravity` subdirectory of the workspace root — resolved at runtime, never hardcoded). <!-- PORTABILITY_REWRITE: runtime resolution required -->
3. Resolve `{runId}` = ISO-8601 timestamp (e.g., `20260526T143000Z`).
4. Create temp directory: `{ROOT}/superpipelines/temp/parity-test-c/{runId}/`.
5. Create `output/` directory if absent: `{ROOT}/output/`.
6. Initialize `pipeline-state.json` at `{ROOT}/superpipelines/temp/parity-test-c/{runId}/pipeline-state.json`:

```json
{
  "pipeline_id": "parity-test-c",
  "run_id": "{runId}",
  "started_at": "{iso8601}",
  "plugin_version": "2.0.0",
  "pattern": "1",
  "status": "running",
  "current_phase": 0,
  "metadata": {
    "source_tier": "tier_1c",
    "runtime_tier": "tier_1c",
    "orchestrator_tier": "medium",
    "resolved_models": {}
  },
  "phases": [
    {
      "index": 0,
      "step_id": "analyzer",
      "name": "analyze",
      "status": "pending",
      "agent": "agents/superpipelines/parity-test-c/analyzer.md",
      "outputs": [],
      "error": null
    },
    {
      "index": 1,
      "step_id": "summarizer",
      "name": "summarize",
      "status": "pending",
      "agent": "agents/superpipelines/parity-test-c/summarizer.md",
      "outputs": [],
      "error": null
    }
  ]
}
```

7. Ask the user to provide the path to the input text document if not already supplied. Record as `{INPUT_DOC}`.

### PHASE 1: DISPATCH ANALYZER (model_driven)

DISPATCH via model_driven orchestration:

```
Agent: analyzer
Protocol: {ROOT}/skills/superpipelines/parity-test-c/analyzer-protocol/SKILL.md
Context to pass:
  - input_document_path: {INPUT_DOC}
  - state_path: {ROOT}/superpipelines/temp/parity-test-c/{runId}/pipeline-state.json
  - findings_output_path: {ROOT}/superpipelines/temp/parity-test-c/{runId}/analyzer-findings.json
  - run_id: {runId}
  - root: {ROOT}
```

Wait for terminal status from analyzer:
- `DONE` → update `pipeline-state.json` phases[0].status = "completed"; advance to Phase 2.
- `DONE_WITH_CONCERNS` → update phases[0].status = "completed_with_concerns"; emit concerns; advance to Phase 2.
- `NEEDS_CONTEXT` → update phases[0].status = "blocked"; surface message to user; STOP.
- `BLOCKED` → update phases[0].status = "blocked"; surface message to user; STOP.

### PHASE 2: DISPATCH SUMMARIZER (model_driven)

DISPATCH via model_driven orchestration:

```
Agent: summarizer
Protocol: {ROOT}/skills/superpipelines/parity-test-c/summarizer-protocol/SKILL.md
Context to pass:
  - findings_path: {ROOT}/superpipelines/temp/parity-test-c/{runId}/analyzer-findings.json
  - output_path: {ROOT}/output/parity-test-c-summary.md
  - state_path: {ROOT}/superpipelines/temp/parity-test-c/{runId}/pipeline-state.json
  - run_id: {runId}
  - root: {ROOT}
```

Wait for terminal status from summarizer:
- `DONE` → update phases[1].status = "completed"; advance to Phase 3.
- `DONE_WITH_CONCERNS` → update phases[1].status = "completed_with_concerns"; emit concerns; advance to Phase 3.
- `NEEDS_CONTEXT` → update phases[1].status = "blocked"; surface message to user; STOP.
- `BLOCKED` → update phases[1].status = "blocked"; surface message to user; STOP.

### PHASE 3: FINALIZE

1. Update `pipeline-state.json`:
   - `status`: `"completed"` (or `"completed_with_concerns"` if any phase had concerns)
   - `completed_at`: ISO-8601 timestamp
2. Delete the temp run directory: `{ROOT}/superpipelines/temp/parity-test-c/{runId}/`
   - On BLOCKED or NEEDS_CONTEXT: preserve the directory (do NOT delete); it holds resume state.
3. Confirm to the user:
   > Pipeline `parity-test-c` completed. Summary written to: `{ROOT}/output/parity-test-c-summary.md`

</protocol>

<invariants>
- NEVER use `Task()` — Tier 1c has `task_primitive: false`. All dispatch is model_driven.
- NEVER pass file contents in dispatch prompts — pass file paths only (anti-pattern #3 Context Dumping).
- ALWAYS surface the Tier 1c degradation warning before dispatching any agent.
- ALWAYS update `pipeline-state.json` after each phase completes.
- NEVER advance past a `BLOCKED` or `NEEDS_CONTEXT` status without human input.
- Emit exactly one terminal status at the end of this skill's own execution (not the subagents').
</invariants>
