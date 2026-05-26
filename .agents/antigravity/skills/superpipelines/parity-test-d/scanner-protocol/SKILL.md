---
name: scanner-protocol
description: Loaded by the scanner agent to supply operating protocol and invariants for source file metric extraction in the parity-test-d pipeline. Not user-invocable.
disable-model-invocation: true
user-invocable: false
---

# Scanner — Operational Protocol

<overview>
The scanner agent reads all source files in a target directory, extracts per-file code health metrics (high complexity, missing docstrings, long functions), and writes a structured JSON metrics file to the pipeline temp directory. It is the first step of the parity-test-d Sequential pipeline (Pattern 1) on Tier 1c (Antigravity CLI). The quality bar is: metrics must be machine-readable JSON that the reporter can consume without ambiguity.
</overview>

## Protocol

<protocol>

### 1. DISCOVER

1. Read inputs from the orchestrator dispatch context:
   - `source_directory`: path to the directory containing source files to scan.
   - `metrics_output_path`: path where `scanner-metrics.json` must be written.
   - `state_path`: path to `pipeline-state.json` for status updates.
   - `run_id`: current run identifier.
   - `root`: resolved scope root.
2. Verify `source_directory` exists and is a readable directory. If not: emit `NEEDS_CONTEXT` with message: "Source directory not found at `{source_directory}`. Provide a valid path and re-run."
3. Enumerate all source files in `source_directory` (recursively, using `Glob`). Common source extensions: `.py`, `.js`, `.ts`, `.go`, `.java`, `.rb`, `.rs`, `.cs`. If no matching files found: emit `DONE_WITH_CONCERNS` with message: "No source files found in `{source_directory}`. Metrics file written with zero entries."

### 2. PROCESS

For each source file discovered:

1. **High complexity**: flag a file if it contains deeply nested conditionals (4+ levels), or if a single function/method appears to span more than 50 lines AND contains multiple branching paths. Record:
   ```json
   {"file": "{relative_path}", "complexity_score": <integer>, "reason": "<brief reason>"}
   ```

2. **Missing docstrings**: flag a file if top-level functions, methods, or classes lack a docstring or leading comment block. Record:
   ```json
   {"file": "{relative_path}", "locations": ["<class or function signature>"]}
   ```

3. **Long functions**: flag any function or method with a line count exceeding 60 lines. Record:
   ```json
   {"file": "{relative_path}", "function": "<function name>", "line_count": <integer>}
   ```

Assemble the metrics object:

```json
{
  "scanned_directory": "{source_directory}",
  "file_count": 0,
  "high_complexity": [],
  "missing_docstrings": [],
  "long_functions": []
}
```

### 3. DELIVER

1. Write `scanner-metrics.json` to `metrics_output_path` using the `Write` tool.
2. Update `pipeline-state.json`:
   - Set `phases[0].status` = `"completed"` (or `"completed_with_concerns"` if any files were unreadable or no source files found).
   - Set `phases[0].outputs` = `[metrics_output_path]`.
3. Emit terminal status:
   - `DONE` — metrics written successfully, all files scanned without errors.
   - `DONE_WITH_CONCERNS` — metrics written but one or more files were unreadable, or no source files found (note which and why).
   - `NEEDS_CONTEXT` — source directory not found or not accessible.
   - `BLOCKED` — metrics file could not be written (e.g., disk write failure).

</protocol>

<invariants>
- NEVER write metrics to a path outside `{ROOT}/superpipelines/temp/parity-test-d/{runId}/`.
- NEVER pass file contents to the orchestrator in the status message — pass only the metrics file path.
- ALWAYS validate that `metrics_output_path` is writable before attempting write.
- ALWAYS update `pipeline-state.json` after writing metrics.
- Emit exactly one terminal status: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
</invariants>
