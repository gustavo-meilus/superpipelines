---
name: run-parity-test-b
description: Use when the user wants to run the parity-test-b pipeline on Tier 1 (Claude Code) to read a JSON file and produce a validated data quality report with write/review isolation.
disable-model-invocation: true
user-invocable: true
plugin_version: "2.0.0"
---

# run-parity-test-b — Entry Skill

> Entry point for the `parity-test-b` pipeline. Orchestrates the sequential Task()-based dispatch of the `analyzer`, `reviewer`, and `reporter` agents on Tier 1 (Claude Code). The reviewer runs with worktree isolation + `permissionMode: plan` + `disallowedTools: Write, Edit, Bash` — structural write/review isolation.

<overview>
This skill initializes the pipeline run, resolves the scope root and run ID, dispatches the analyzer, reviewer (structural isolation), and reporter agents in sequence via the native_task mechanism, and applies the cleanup contract (C20) on completion. The reviewer cannot write files — its verdict is read from terminal output text.
</overview>

## Platform Context

- **Tier**: `tier_1` (Claude Code)
- **Dispatch mechanism**: `native_task` — `DISPATCH(mode="task", agent="{name}", isolation="worktree", context={...})`.
- **model_field_format**: `shorthand` — `model_tier` in each agent's YAML frontmatter; resolver maps to concrete model.
- **Reviewer isolation**: `structural` — `permissionMode: plan` + `disallowedTools: Write, Edit, Bash` + separate worktree.
- **Degradation warnings**: None for Tier 1.

## Workflow

<protocol>

### PHASE 0: PREFLIGHT

1. Resolve `{ROOT}` via `sk-pipeline-paths`.
2. Resolve `{runId}` = ISO-8601 compact timestamp.
3. Create temp directory: `{ROOT}/superpipelines/temp/parity-test-b/{runId}/`.
4. Create `output/` directory if absent: `{ROOT}/output/`.
5. If the user has not supplied the path to the input JSON file, ask for it now. Record as `{INPUT_PATH}`.
6. Initialize `pipeline-state.json` at `{ROOT}/superpipelines/temp/parity-test-b/{runId}/pipeline-state.json`:

```json
{
  "pipeline_id": "parity-test-b",
  "run_id": "{runId}",
  "started_at": "{iso8601}",
  "plugin_version": "2.0.0",
  "pattern": "1",
  "status": "running",
  "current_phase": 0,
  "metadata": {
    "source_tier": "tier_1",
    "runtime_tier": "tier_1",
    "model_field_format": "shorthand",
    "resolved_models": {
      "analyzer": "claude-haiku-4-5-20251001",
      "reviewer": "claude-sonnet-4-6",
      "reporter": "claude-haiku-4-5-20251001"
    }
  },
  "phases": [
    {
      "index": 0,
      "step_id": "analyzer",
      "name": "analyze",
      "status": "pending",
      "agent": "agents/superpipelines/parity-test-b/analyzer.md",
      "outputs": [],
      "error": null
    },
    {
      "index": 1,
      "step_id": "reviewer",
      "name": "review",
      "status": "pending",
      "agent": "agents/superpipelines/parity-test-b/reviewer.md",
      "reviewer_isolation": "structural",
      "outputs": [],
      "error": null
    },
    {
      "index": 2,
      "step_id": "reporter",
      "name": "report",
      "status": "pending",
      "agent": "agents/superpipelines/parity-test-b/reporter.md",
      "outputs": [],
      "error": null
    }
  ]
}
```

### PHASE 1: DISPATCH ANALYZER (native_task)

```
DISPATCH(
  mode="task",
  agent="analyzer",
  isolation="worktree",
  context={
    "input_path": "{INPUT_PATH}",
    "findings_output_path": "{ROOT}/superpipelines/temp/parity-test-b/{runId}/findings.json",
    "state_path": "{ROOT}/superpipelines/temp/parity-test-b/{runId}/pipeline-state.json",
    "run_id": "{runId}",
    "root": "{ROOT}"
  }
)
```

Wait for terminal status:
- `DONE` → update phases[0].status = "completed"; advance to Phase 2.
- `DONE_WITH_CONCERNS` → update phases[0].status = "completed_with_concerns"; surface concerns; advance to Phase 2.
- `NEEDS_CONTEXT` → update phases[0].status = "blocked"; top-level status = "blocked"; GO TO CLEANUP (preserve).
- `BLOCKED` → update phases[0].status = "blocked"; top-level status = "blocked"; GO TO CLEANUP (preserve).

### PHASE 2: DISPATCH REVIEWER (native_task — structural isolation)

The reviewer agent has `permissionMode: plan` and `disallowedTools: Write, Edit, Bash`. It cannot write files. Capture the REVIEWER VERDICT block from its terminal output text.

```
DISPATCH(
  mode="task",
  agent="reviewer",
  isolation="worktree",
  context={
    "findings_path": "{ROOT}/superpipelines/temp/parity-test-b/{runId}/findings.json",
    "state_path": "{ROOT}/superpipelines/temp/parity-test-b/{runId}/pipeline-state.json",
    "run_id": "{runId}",
    "root": "{ROOT}"
  }
)
```

After the reviewer completes:
1. Extract the REVIEWER VERDICT block from terminal output text. Record as `{REVIEWER_OUTPUT}`.
2. Parse `verdict` from the block: `approved`, `approved_with_concerns`, or `rejected`.
3. Update `pipeline-state.json`:
   - `phases[1].outputs` → `[{ "verdict": "{verdict}", "reviewer_notes": "{REVIEWER_OUTPUT}" }]`

Wait for terminal status:
- `DONE` (verdict: approved) → update phases[1].status = "completed"; advance to Phase 3.
- `DONE_WITH_CONCERNS` (verdict: approved_with_concerns) → update phases[1].status = "completed_with_concerns"; surface concerns; advance to Phase 3.
- `BLOCKED` (verdict: rejected) → update phases[1].status = "blocked"; top-level status = "blocked"; surface rejection; GO TO CLEANUP (preserve). DO NOT dispatch reporter.
- `NEEDS_CONTEXT` → update phases[1].status = "blocked"; GO TO CLEANUP (preserve).

### PHASE 3: DISPATCH REPORTER (native_task)

Only dispatched if reviewer verdict is `approved` or `approved_with_concerns`.

```
DISPATCH(
  mode="task",
  agent="reporter",
  isolation="worktree",
  context={
    "findings_path": "{ROOT}/superpipelines/temp/parity-test-b/{runId}/findings.json",
    "reviewer_verdict": "{verdict}",
    "reviewer_notes": "{REVIEWER_OUTPUT}",
    "report_output_path": "{ROOT}/output/parity-test-b-report.md",
    "state_path": "{ROOT}/superpipelines/temp/parity-test-b/{runId}/pipeline-state.json",
    "run_id": "{runId}",
    "root": "{ROOT}"
  }
)
```

Wait for terminal status:
- `DONE` → update phases[2].status = "completed"; advance to Phase 4.
- `DONE_WITH_CONCERNS` → update phases[2].status = "completed_with_concerns"; surface concerns; advance to Phase 4.
- `NEEDS_CONTEXT` → update phases[2].status = "blocked"; GO TO CLEANUP (preserve).
- `BLOCKED` → update phases[2].status = "blocked"; GO TO CLEANUP (preserve).

### PHASE 4: FINALIZE

1. Update `pipeline-state.json`:
   - `status`: `"completed"` (or `"completed_with_concerns"`)
   - `completed_at`: ISO-8601 timestamp
2. **Cleanup contract (C20)**:
   - On `DONE` or `DONE_WITH_CONCERNS`: write `status: completed` to `pipeline-state.json`, then delete `{ROOT}/superpipelines/temp/parity-test-b/{runId}/`.
   - On `BLOCKED` or `NEEDS_CONTEXT`: preserve the temp directory.
3. Confirm to the user:
   > Pipeline `parity-test-b` completed. Data quality report written to: `{ROOT}/output/parity-test-b-report.md`
4. Emit terminal status: `DONE` (or `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT` as applicable).

</protocol>

<invariants>
- NEVER call `Task(subagent_type=...)` directly — use abstract `DISPATCH(mode="task", ...)` notation.
- NEVER hardcode platform paths — always use `{ROOT}` resolved via `sk-pipeline-paths`.
- NEVER pass file contents in dispatch context — pass file paths only.
- NEVER dispatch the reporter if the reviewer verdict is `rejected` or the reviewer emits `BLOCKED`.
- ALWAYS capture the REVIEWER VERDICT block from the reviewer's terminal output before advancing.
- ALWAYS update `pipeline-state.json` after each phase completes.
- NEVER advance past a `BLOCKED` or `NEEDS_CONTEXT` status without human input.
- ALWAYS apply the C20 cleanup contract: delete temp dir on DONE/DONE_WITH_CONCERNS, preserve on BLOCKED/NEEDS_CONTEXT.
- Emit exactly one terminal status: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
</invariants>
