---
name: run-parity-test-a
description: Use when the user wants to run the parity-test-a pipeline on Tier 1 (Claude Code) to read a YAML file and produce a flat key-value summary.
disable-model-invocation: true
user-invocable: true
plugin_version: "2.0.0"
---

# run-parity-test-a — Entry Skill

> Entry point for the `parity-test-a` pipeline. Orchestrates the sequential Task()-based dispatch of the `reader` and `summarizer` agents on Tier 1 (Claude Code). Each step runs as a distinct worktree-isolated subagent.

<overview>
This skill initializes the pipeline run, resolves the scope root and run ID, dispatches the reader and summarizer agents in sequence via the native_task mechanism (Task() primitive), and applies the cleanup contract (C20) on completion. Model tier is declared per-agent in frontmatter; the entry skill itself uses disable-model-invocation: true.
</overview>

## Platform Context

- **Tier**: `tier_1` (Claude Code)
- **Dispatch mechanism**: `native_task` — `DISPATCH(mode="task", agent="{name}", isolation="worktree", context={...})`. This translates to `Task(subagent_type="{name}", ...)` at runtime.
- **model_field_format**: `shorthand` — `model_tier: fast` declared in each agent's YAML frontmatter; runtime resolver maps to concrete model via tier_1 profile.
- **Reviewer isolation**: N/A for parity-test-a (no reviewer step).
- **Degradation warnings**: None for Tier 1.

## Workflow

<protocol>

### PHASE 0: PREFLIGHT

1. Resolve `{ROOT}` via `sk-pipeline-paths` (scope root resolved from the active tier profile at runtime — NEVER hardcode `.claude/`, `.superpipelines/`, or any platform path).
2. Resolve `{runId}` = ISO-8601 compact timestamp (e.g., `20260526T143000Z`).
3. Create temp directory: `{ROOT}/superpipelines/temp/parity-test-a/{runId}/`.
4. Create `output/` directory if absent: `{ROOT}/output/`.
5. If the user has not supplied the path to the input YAML file, ask for it now. Record as `{INPUT_PATH}`.
6. Initialize `pipeline-state.json` at `{ROOT}/superpipelines/temp/parity-test-a/{runId}/pipeline-state.json`:

```json
{
  "pipeline_id": "parity-test-a",
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
      "reader": "claude-haiku-4-5-20251001",
      "summarizer": "claude-haiku-4-5-20251001"
    }
  },
  "phases": [
    {
      "index": 0,
      "step_id": "reader",
      "name": "read",
      "status": "pending",
      "agent": "agents/superpipelines/parity-test-a/reader.md",
      "outputs": [],
      "error": null
    },
    {
      "index": 1,
      "step_id": "summarizer",
      "name": "summarize",
      "status": "pending",
      "agent": "agents/superpipelines/parity-test-a/summarizer.md",
      "outputs": [],
      "error": null
    }
  ]
}
```

### PHASE 1: DISPATCH READER (native_task)

```
DISPATCH(
  mode="task",
  agent="reader",
  isolation="worktree",
  context={
    "input_path": "{INPUT_PATH}",
    "kv_output_path": "{ROOT}/superpipelines/temp/parity-test-a/{runId}/key-value-data.json",
    "state_path": "{ROOT}/superpipelines/temp/parity-test-a/{runId}/pipeline-state.json",
    "run_id": "{runId}",
    "root": "{ROOT}"
  }
)
```

Wait for terminal status from reader:
- `DONE` → update `pipeline-state.json` phases[0].status = "completed"; advance to Phase 2.
- `DONE_WITH_CONCERNS` → update phases[0].status = "completed_with_concerns"; surface concerns; advance to Phase 2.
- `NEEDS_CONTEXT` → update phases[0].status = "blocked"; top-level status = "blocked"; GO TO CLEANUP (preserve).
- `BLOCKED` → update phases[0].status = "blocked"; top-level status = "blocked"; GO TO CLEANUP (preserve).

### PHASE 2: DISPATCH SUMMARIZER (native_task)

```
DISPATCH(
  mode="task",
  agent="summarizer",
  isolation="worktree",
  context={
    "kv_data_path": "{ROOT}/superpipelines/temp/parity-test-a/{runId}/key-value-data.json",
    "summary_output_path": "{ROOT}/output/parity-test-a-summary.txt",
    "state_path": "{ROOT}/superpipelines/temp/parity-test-a/{runId}/pipeline-state.json",
    "run_id": "{runId}",
    "root": "{ROOT}"
  }
)
```

Wait for terminal status from summarizer:
- `DONE` → update phases[1].status = "completed"; advance to Phase 3.
- `DONE_WITH_CONCERNS` → update phases[1].status = "completed_with_concerns"; surface concerns; advance to Phase 3.
- `NEEDS_CONTEXT` → update phases[1].status = "blocked"; top-level status = "blocked"; GO TO CLEANUP (preserve).
- `BLOCKED` → update phases[1].status = "blocked"; top-level status = "blocked"; GO TO CLEANUP (preserve).

### PHASE 3: FINALIZE

1. Update `pipeline-state.json`:
   - `status`: `"completed"` (or `"completed_with_concerns"` if any phase had concerns)
   - `completed_at`: ISO-8601 timestamp
2. **Cleanup contract (C20)**:
   - On `DONE` or `DONE_WITH_CONCERNS`: write `status: completed` to `pipeline-state.json`, then delete `{ROOT}/superpipelines/temp/parity-test-a/{runId}/`.
   - On `BLOCKED` or `NEEDS_CONTEXT`: preserve the temp directory.
3. Confirm to the user:
   > Pipeline `parity-test-a` completed. Summary written to: `{ROOT}/output/parity-test-a-summary.txt`
4. Emit terminal status: `DONE` (or `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT` as applicable).

</protocol>

<invariants>
- NEVER call `Task(subagent_type=...)` directly in the skill body — use abstract `DISPATCH(mode="task", ...)` notation.
- NEVER hardcode platform paths (`.claude/`, `.superpipelines/`, etc.) — always use `{ROOT}` resolved via `sk-pipeline-paths`.
- NEVER pass file contents in dispatch context — pass file paths only.
- ALWAYS update `pipeline-state.json` after each phase completes.
- NEVER advance past a `BLOCKED` or `NEEDS_CONTEXT` status without human input.
- ALWAYS apply the C20 cleanup contract: delete temp dir on DONE/DONE_WITH_CONCERNS, preserve on BLOCKED/NEEDS_CONTEXT.
- Emit exactly one terminal status: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
</invariants>
