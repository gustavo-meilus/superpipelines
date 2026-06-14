# Entry — tracer-echo (data-only orchestration body)

This is **data**, not a registered skill. The bundle's `running-a-pipeline` reads and executes
it in Phase 3. It dispatches every step via `sk-platform-dispatch` DISPATCH, passing `agent_def`
so each canonical def is materialized to a native agent at run time (Option A).

## 1. Dispatch (topology order)

```
Skill("sk-platform-dispatch")

# Step 1 — echo-writer (writer, structural acceptEdits)
r1 = DISPATCH(
  step={ id: "echo-writer", agent: "echo-writer",
         agent_def: "pipelines/tracer-echo/agents/echo-writer.md",
         output_paths: [ "<runDir>/echo.txt" ] },
  inputs={})
if r1.status != "DONE": handle per status protocol (BLOCKED -> escalate, preserve temp)

# Step 2 — echo-checker (reviewer, structural plan / write-denied)
r2 = DISPATCH(
  step={ id: "echo-checker", agent: "echo-checker",
         agent_def: "pipelines/tracer-echo/agents/echo-checker.md",
         output_paths: [ "<runDir>/verdict.md" ] },
  inputs={ echo: "<runDir>/echo.txt" })
if r2.status != "DONE": handle per status protocol
# echo-checker is write-denied; persist its returned verdict to <runDir>/verdict.md here (orchestrator write).
```

## 2. Cleanup contract (Phase 5.x)

- On both steps `DONE`: write `status: "completed"` to `DATA_ROOT/temp/tracer-echo/{runId}/pipeline-state.json` (UTF-8, no BOM).
- Delete `DATA_ROOT/temp/tracer-echo/{runId}/` on DONE.
- Call `CLEANUP_MATERIALIZED("tracer-echo", scope)` on DONE to remove the ephemeral materialized-agent cache.
- On BLOCKED/FAILED/ESCALATED: preserve temp dir + materialized cache for debugging.

## 3. Completion summary

Report: both steps DONE, `echo.txt` = `tracer-ok`, verdict PASS, artifacts only under `.superpipelines/`.
