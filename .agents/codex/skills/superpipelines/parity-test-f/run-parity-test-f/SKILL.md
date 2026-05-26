---
name: run-parity-test-f
description: Use when the user wants to run the parity-test-f pipeline on Tier 1d (Codex CLI) to analyze a pull request diff for code issues and produce a validated review report.
disable-model-invocation: true
user-invocable: true
plugin_version: "2.0.0"
---

# run-parity-test-f — Entry Skill

> Entry point for the `parity-test-f` pipeline. Orchestrates the sequential dispatch of `analyzer`, `reviewer`, and `reporter` agents on Tier 1d (Codex CLI) via model_driven dispatch.

<overview>
This skill initializes the pipeline run, resolves the scope root and run ID, dispatches the analyzer, reviewer, and reporter agents in sequence via the model_driven path of `sk-platform-dispatch`, and applies the cleanup contract (C20) on completion. The reviewer agent runs with `sandbox_mode = "read-only"` (structural isolation); the orchestrator must not pass write-capable context to the reviewer dispatch.
</overview>

## Platform Context

- **Tier**: `tier_1d` (Codex CLI)
- **Dispatch mechanism**: `model_driven` — the host orchestrator drives subagent sequencing; no `Task()` primitive available.
- **model_field_format**: `toml_split` — agents declare `model` and `model_reasoning_effort` in their TOML files; the entry skill does NOT stamp model fields into dispatch prompts.
- **Degradation warnings**: None for Tier 1d.

## Workflow

<protocol>

### PHASE 0: PREFLIGHT

1. Resolve `{ROOT}` via `sk-pipeline-paths` (scope root resolved from the active tier profile at runtime — never hardcode `.agents/codex/` or any platform path).
2. Resolve `{runId}` = ISO-8601 compact timestamp (e.g., `20260526T143000Z`).
3. Create temp directory: `{ROOT}/superpipelines/temp/parity-test-f/{runId}/`.
4. Create `output/` directory if absent: `{ROOT}/output/`.
5. Initialize `pipeline-state.json` at `{ROOT}/superpipelines/temp/parity-test-f/{runId}/pipeline-state.json`:

```json
{
  "pipeline_id": "parity-test-f",
  "run_id": "{runId}",
  "started_at": "{iso8601}",
  "plugin_version": "2.0.0",
  "pattern": "1",
  "status": "running",
  "current_phase": 0,
  "metadata": {
    "source_tier": "tier_1d",
    "runtime_tier": "tier_1d",
    "model_field_format": "toml_split",
    "resolved_models": {
      "analyzer": "gpt-5.4-mini",
      "reviewer": "gpt-5.5",
      "reporter": "gpt-5.4-mini"
    }
  },
  "phases": [
    {
      "index": 0,
      "step_id": "analyzer",
      "name": "analyze",
      "status": "pending",
      "agent": "agents/superpipelines/parity-test-f/analyzer.toml",
      "outputs": [],
      "error": null
    },
    {
      "index": 1,
      "step_id": "reviewer",
      "name": "review",
      "status": "pending",
      "agent": "agents/superpipelines/parity-test-f/reviewer.toml",
      "outputs": [],
      "error": null
    },
    {
      "index": 2,
      "step_id": "reporter",
      "name": "report",
      "status": "pending",
      "agent": "agents/superpipelines/parity-test-f/reporter.toml",
      "outputs": [],
      "error": null
    }
  ]
}
```

6. If the user has not supplied the path to the pull request diff file, ask for it now. Record as `{DIFF_PATH}`.

### PHASE 1: DISPATCH ANALYZER (model_driven)

DISPATCH via model_driven orchestration:

```
Agent: analyzer  (analyzer.toml)
Protocol: {ROOT}/skills/superpipelines/parity-test-f/analyzer-protocol/SKILL.md
Context to pass:
  - diff_path: {DIFF_PATH}
  - findings_output_path: {ROOT}/superpipelines/temp/parity-test-f/{runId}/findings.json
  - state_path: {ROOT}/superpipelines/temp/parity-test-f/{runId}/pipeline-state.json
  - run_id: {runId}
  - root: {ROOT}
```

Wait for terminal status from analyzer:
- `DONE` → update `pipeline-state.json` phases[0].status = "completed"; advance to Phase 2.
- `DONE_WITH_CONCERNS` → update phases[0].status = "completed_with_concerns"; surface concerns to user; advance to Phase 2.
- `NEEDS_CONTEXT` → update phases[0].status = "blocked"; update top-level status = "blocked"; surface message to user; GO TO CLEANUP (preserve).
- `BLOCKED` → update phases[0].status = "blocked"; update top-level status = "blocked"; surface message to user; GO TO CLEANUP (preserve).

### PHASE 2: DISPATCH REVIEWER (model_driven — READ-ONLY)

DISPATCH via model_driven orchestration:

```
Agent: reviewer  (reviewer.toml — sandbox_mode = "read-only")
Protocol: {ROOT}/skills/superpipelines/parity-test-f/reviewer-protocol/SKILL.md
Context to pass:
  - findings_path: {ROOT}/superpipelines/temp/parity-test-f/{runId}/findings.json
  - verdict_output_path: {ROOT}/superpipelines/temp/parity-test-f/{runId}/verdict.json
  - state_path: {ROOT}/superpipelines/temp/parity-test-f/{runId}/pipeline-state.json
  - run_id: {runId}
  - root: {ROOT}
```

NOTE: The reviewer agent has `sandbox_mode = "read-only"`. The Codex host enforces structural write-deny. Do NOT pass any write-capable context beyond `verdict_output_path`.

Wait for terminal status from reviewer:
- `DONE` → update `pipeline-state.json` phases[1].status = "completed"; advance to Phase 3.
- `DONE_WITH_CONCERNS` → update phases[1].status = "completed_with_concerns"; surface concerns to user; advance to Phase 3.
- `BLOCKED` → update phases[1].status = "blocked"; update top-level status = "blocked"; surface message to user; GO TO CLEANUP (preserve).

### PHASE 3: DISPATCH REPORTER (model_driven)

DISPATCH via model_driven orchestration:

```
Agent: reporter  (reporter.toml)
Protocol: {ROOT}/skills/superpipelines/parity-test-f/reporter-protocol/SKILL.md
Context to pass:
  - findings_path: {ROOT}/superpipelines/temp/parity-test-f/{runId}/findings.json
  - verdict_path: {ROOT}/superpipelines/temp/parity-test-f/{runId}/verdict.json
  - output_path: {ROOT}/output/parity-test-f-review-report.md
  - state_path: {ROOT}/superpipelines/temp/parity-test-f/{runId}/pipeline-state.json
  - run_id: {runId}
  - root: {ROOT}
```

Wait for terminal status from reporter:
- `DONE` → update phases[2].status = "completed"; advance to Phase 4.
- `DONE_WITH_CONCERNS` → update phases[2].status = "completed_with_concerns"; surface concerns to user; advance to Phase 4.
- `NEEDS_CONTEXT` → update phases[2].status = "blocked"; update top-level status = "blocked"; surface message to user; GO TO CLEANUP (preserve).
- `BLOCKED` → update phases[2].status = "blocked"; update top-level status = "blocked"; surface message to user; GO TO CLEANUP (preserve).

### PHASE 4: FINALIZE

1. Update `pipeline-state.json`:
   - `status`: `"completed"` (or `"completed_with_concerns"` if any phase had concerns)
   - `completed_at`: ISO-8601 timestamp
2. **Cleanup contract (C20)**:
   - On `DONE` or `DONE_WITH_CONCERNS`: write `status: completed` to `pipeline-state.json`, then delete the temp directory `{ROOT}/superpipelines/temp/parity-test-f/{runId}/`.
   - On `BLOCKED` or `NEEDS_CONTEXT`: preserve the temp directory (do NOT delete); it holds resume state for diagnosis.
3. Confirm to the user:
   > Pipeline `parity-test-f` completed. Code review report written to: `{ROOT}/output/parity-test-f-review-report.md`
4. Emit terminal status: `DONE` (or `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT` as applicable).

</protocol>

<invariants>
- NEVER use `Task()` — Tier 1d has `task_primitive: false`. All dispatch is model_driven.
- NEVER hardcode platform paths (`.agents/codex/`, `.claude/`, etc.) — always use `{ROOT}` resolved via `sk-pipeline-paths`.
- NEVER pass file contents in dispatch prompts — pass file paths only (anti-pattern #3 Context Dumping).
- ALWAYS update `pipeline-state.json` after each phase completes.
- NEVER advance past a `BLOCKED` or `NEEDS_CONTEXT` status without human input.
- ALWAYS apply the C20 cleanup contract: delete temp dir on DONE/DONE_WITH_CONCERNS, preserve on BLOCKED/NEEDS_CONTEXT.
- NEVER pass write-capable context to the reviewer dispatch — `sandbox_mode = "read-only"` is enforced by the host; the entry skill must not attempt to circumvent it.
- Emit exactly one terminal status at the end of this skill's own execution: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
</invariants>
