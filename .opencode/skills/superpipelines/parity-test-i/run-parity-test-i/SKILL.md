---
name: run-parity-test-i
description: Use when the user wants to run the parity-test-i pipeline on Tier 1b (OpenCode) to read a JSON file and produce a human-readable summary of its top-level keys and value types.
disable-model-invocation: true
user-invocable: true
plugin_version: "2.0.0"
---

# run-parity-test-i — Entry Skill

> Entry point for the `parity-test-i` pipeline. Orchestrates the sequential native-subagent dispatch of the `inspector` and `formatter` agents on Tier 1b (OpenCode v1.15.10). Each step runs as a distinct subagent process — no inline execution, no Task() calls.

<overview>
This skill initializes the pipeline run, resolves the scope root and run ID, surfaces the required Tier 1b degradation warning, dispatches the inspector subagent, dispatches the formatter subagent, and applies the cleanup contract (C20) on completion. Model is declared per-agent in frontmatter (opencode/big-pickle); the entry skill itself uses disable-model-invocation: true.
</overview>

## Platform Context

- **Tier**: `tier_1b` (OpenCode v1.15.10)
- **Dispatch mechanism**: `native_subagent` — `DISPATCH(mode="subagent", agent="{name}", context={...})`. NOT Task(). NOT inline.
- **model_field_format**: `provider_prefixed` — `model: opencode/big-pickle` declared in each agent's YAML frontmatter.
- **Reviewer isolation**: `structural` — each step runs in a distinct subagent process.
- **Degradation warnings**: 1 active (see PHASE 0 below).

## Workflow

<protocol>

### PHASE 0: PREFLIGHT — DEGRADATION WARNING AND INITIALIZATION

**Step 0.1 — Surface Tier 1b degradation warning (MANDATORY before any execution):**

Surface the following warning to the user verbatim before any other action:

> **[Tier 1b Degradation Warning 1 of 1]** Parallel fan-out (Pattern 2) degrades to sequential on OpenCode.

**Step 0.2 — Resolve runtime context:**

1. Resolve `{ROOT}` via `sk-pipeline-paths` (scope root resolved from the active tier profile at runtime — NEVER hardcode `.opencode/`, `.superpipelines/`, `.claude/`, or any platform path).
2. Resolve `{runId}` = ISO-8601 compact timestamp (e.g., `20260526T143000Z`).
3. Create temp directory: `{ROOT}/superpipelines/temp/parity-test-i/{runId}/`.
4. Create `output/` directory if absent: `{ROOT}/output/`.

**Step 0.3 — Collect inputs:**

If the user has not supplied the path to the input JSON file, ask for it now. Record as `{INPUT_PATH}`.

**Step 0.4 — Initialize pipeline-state.json:**

Write `pipeline-state.json` to `{ROOT}/superpipelines/temp/parity-test-i/{runId}/pipeline-state.json`:

```json
{
  "pipeline_id": "parity-test-i",
  "run_id": "{runId}",
  "started_at": "{iso8601}",
  "plugin_version": "2.0.0",
  "pattern": "1",
  "status": "running",
  "current_phase": 0,
  "metadata": {
    "source_tier": "tier_1b",
    "runtime_tier": "tier_1b",
    "model_field_format": "provider_prefixed",
    "resolved_models": {
      "inspector": "opencode/big-pickle",
      "formatter": "opencode/big-pickle"
    }
  },
  "phases": [
    {
      "index": 0,
      "step_id": "inspector",
      "name": "inspect",
      "status": "pending",
      "agent": "agents/superpipelines/parity-test-i/inspector.md",
      "outputs": [],
      "error": null
    },
    {
      "index": 1,
      "step_id": "formatter",
      "name": "format",
      "status": "pending",
      "agent": "agents/superpipelines/parity-test-i/formatter.md",
      "outputs": [],
      "error": null
    }
  ]
}
```

### PHASE 1: DISPATCH INSPECTOR (native subagent)

Dispatch the inspector as a native subagent:

```
DISPATCH(
  mode="subagent",
  agent="inspector",
  context={
    "input_path": "{INPUT_PATH}",
    "key_type_output_path": "{ROOT}/superpipelines/temp/parity-test-i/{runId}/key-type-data.json",
    "state_path": "{ROOT}/superpipelines/temp/parity-test-i/{runId}/pipeline-state.json",
    "run_id": "{runId}",
    "root": "{ROOT}"
  }
)
```

Wait for terminal status from the inspector subagent:
- `DONE` → update `pipeline-state.json` phases[0].status = "completed"; advance to Phase 2.
- `DONE_WITH_CONCERNS` → update phases[0].status = "completed_with_concerns"; surface concerns to user; advance to Phase 2.
- `NEEDS_CONTEXT` → update phases[0].status = "blocked"; update top-level status = "blocked"; surface message to user; GO TO CLEANUP (preserve).
- `BLOCKED` → update phases[0].status = "blocked"; update top-level status = "blocked"; surface message to user; GO TO CLEANUP (preserve).

### PHASE 2: DISPATCH FORMATTER (native subagent)

Dispatch the formatter as a native subagent:

```
DISPATCH(
  mode="subagent",
  agent="formatter",
  context={
    "key_type_data_path": "{ROOT}/superpipelines/temp/parity-test-i/{runId}/key-type-data.json",
    "summary_output_path": "{ROOT}/output/parity-test-i-summary.txt",
    "state_path": "{ROOT}/superpipelines/temp/parity-test-i/{runId}/pipeline-state.json",
    "run_id": "{runId}",
    "root": "{ROOT}"
  }
)
```

Wait for terminal status from the formatter subagent:
- `DONE` → update `pipeline-state.json` phases[1].status = "completed"; advance to Phase 3.
- `DONE_WITH_CONCERNS` → update phases[1].status = "completed_with_concerns"; surface concerns to user; advance to Phase 3.
- `NEEDS_CONTEXT` → update phases[1].status = "blocked"; update top-level status = "blocked"; surface message to user; GO TO CLEANUP (preserve).
- `BLOCKED` → update phases[1].status = "blocked"; update top-level status = "blocked"; surface message to user; GO TO CLEANUP (preserve).

### PHASE 3: FINALIZE

1. Update `pipeline-state.json`:
   - `status`: `"completed"` (or `"completed_with_concerns"` if any phase had concerns)
   - `completed_at`: ISO-8601 timestamp

2. **Cleanup contract (C20)**:
   - On `DONE` or `DONE_WITH_CONCERNS`: write `status: completed` to `pipeline-state.json`, then delete the temp directory `{ROOT}/superpipelines/temp/parity-test-i/{runId}/`.
   - On `BLOCKED` or `NEEDS_CONTEXT`: preserve the temp directory (do NOT delete); it holds resume state for diagnosis.

3. Confirm to the user:
   > Pipeline `parity-test-i` completed. Summary written to: `{ROOT}/output/parity-test-i-summary.txt`

4. Emit terminal status: `DONE` (or `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT` as applicable).

</protocol>

<invariants>
- NEVER call `Task()` — Tier 1b has `task_primitive: false`. Use `DISPATCH(mode="subagent", ...)` exclusively.
- NEVER execute steps inline — each step MUST run as a distinct native subagent process.
- NEVER hardcode platform paths (`.opencode/`, `.superpipelines/`, `.claude/`, etc.) — always use `{ROOT}` resolved via `sk-pipeline-paths`.
- NEVER pass file contents in dispatch context — pass file paths only (anti-pattern #3 Context Dumping).
- ALWAYS surface the Tier 1b degradation warning before any execution begins (Phase 0.1 is mandatory).
- ALWAYS update `pipeline-state.json` after each phase completes.
- NEVER advance past a `BLOCKED` or `NEEDS_CONTEXT` status without human input.
- ALWAYS apply the C20 cleanup contract: delete temp dir on DONE/DONE_WITH_CONCERNS, preserve on BLOCKED/NEEDS_CONTEXT.
- Emit exactly one terminal status at the end of this skill's own execution: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
</invariants>
