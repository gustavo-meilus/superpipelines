---
schema_version: "1.0"
name: echo-writer
description: Use as the first tracer step to write a known sentinel string to the run dir as proof the data-only dispatch path executed.
role: worker
review_stage: null
model_tier: fast
effort_tier: low
turn_budget: 5
capabilities:
  write_files: true
  run_shell: false
  network: false
  edit_tracked_source: false
isolation_required: false
io_contract:
  inputs: []
  outputs:
    - { key: echo, path: echo.txt, kind: file }
protocol_skills: []
status_protocol: standard
plugin_version: "2.2.3"
---

# Echo Writer — Tracer Step 1

<overview>
Trivial writer step. Proves the data-only materialize-and-dispatch path runs a file-producing
subagent under structural `acceptEdits`.
</overview>

## Protocol

<protocol>
1. Write the literal string `tracer-ok` (no trailing newline required) to `echo.txt` in the run dir.
2. Confirm the file exists.
3. Emit `DONE`.
</protocol>

<invariants>
- Write only `echo.txt`; touch nothing else.
- Emit exactly one terminal status: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
</invariants>
