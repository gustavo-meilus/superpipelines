---
user-invocable: true
disable-model-invocation: true
plugin_version: "2.3.0"
---

# Entry — parity-test-a (data-only orchestration body, migrated from tier_1)

Data, not a registered skill. The bundle's `running-a-pipeline` reads and runs it in Phase 3,
dispatching every step via `sk-platform-dispatch` DISPATCH (Option A materialize-at-runtime).
`<runDir>` = `DATA_ROOT/temp/parity-test-a/{runId}/`. The final summary persists to
`DATA_ROOT/output/parity-test-a-summary.txt` so it survives run-dir cleanup.

If the user has not supplied the path to the input YAML file, ask for it now and record it as
`{INPUT_PATH}`.

```
Skill("sk-platform-dispatch")

# Step 1 — reader (worker, structural acceptEdits)
r1 = DISPATCH(
  step={ id: "reader", agent: "reader",
         agent_def: "pipelines/parity-test-a/agents/reader.md",
         output_paths: [ "<runDir>/key-value-data.json" ] },
  inputs={ input_path: "{INPUT_PATH}" })
if r1.status != "DONE": handle per status protocol (BLOCKED/NEEDS_CONTEXT -> escalate, preserve temp)

# Step 2 — summarizer (worker, structural acceptEdits)
r2 = DISPATCH(
  step={ id: "summarizer", agent: "summarizer",
         agent_def: "pipelines/parity-test-a/agents/summarizer.md",
         output_paths: [ "<dataRoot>/output/parity-test-a-summary.txt" ] },
  inputs={ kv_data: "<runDir>/key-value-data.json" })
if r2.status != "DONE": handle per status protocol
```

## Cleanup contract (Phase 5.x)
- On both steps DONE: write `status: "completed"` to `DATA_ROOT/temp/parity-test-a/{runId}/pipeline-state.json` (UTF-8, no BOM); delete the run dir; call `CLEANUP_MATERIALIZED("parity-test-a", scope)`. The persistent `output/parity-test-a-summary.txt` is outside the run dir and is preserved.
- On BLOCKED/NEEDS_CONTEXT/FAILED/ESCALATED: preserve temp + materialized cache.
