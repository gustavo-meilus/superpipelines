---
user-invocable: true
disable-model-invocation: true
plugin_version: "2.2.3"
---

# Entry — doc-legacy (data-only orchestration body, migrated from tier_1)

Data, not a registered skill. The bundle's `running-a-pipeline` reads and runs it in Phase 3,
dispatching every step via `sk-platform-dispatch` DISPATCH (Option A materialize-at-runtime).
`<runDir>` = `DATA_ROOT/temp/doc-legacy/{runId}/`.

```
Skill("sk-platform-dispatch")

# Step 1 — doc-writer (writer, structural acceptEdits + worktree)
r1 = DISPATCH(
  step={ id: "doc-writer", agent: "doc-writer",
         agent_def: "pipelines/doc-legacy/agents/doc-writer.md",
         output_paths: [ "<runDir>/doc.md" ] },
  inputs={})
if r1.status != "DONE": handle per status protocol (BLOCKED -> escalate, preserve temp)

# Step 2 — doc-reviewer (reviewer, structural plan / write-denied)
r2 = DISPATCH(
  step={ id: "doc-reviewer", agent: "doc-reviewer",
         agent_def: "pipelines/doc-legacy/agents/doc-reviewer.md",
         output_paths: [ "<runDir>/review/stage1-verdict.md" ] },
  inputs={ doc: "<runDir>/doc.md" })
if r2.status != "DONE": handle per status protocol
```

## Cleanup contract (Phase 5.x)
- On both steps DONE: write `status: "completed"` to `DATA_ROOT/temp/doc-legacy/{runId}/pipeline-state.json` (UTF-8, no BOM); delete the run dir; call `CLEANUP_MATERIALIZED("doc-legacy", scope)`.
- On BLOCKED/FAILED/ESCALATED: preserve temp + materialized cache.
