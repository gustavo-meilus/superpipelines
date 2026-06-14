---
schema_version: "1.0"
name: echo-checker
description: Use as the second tracer step to verify the writer's sentinel output. Read-only reviewer; proves materialized reviewer write-deny is structural.
role: reviewer
review_stage: 1
model_tier: fast
effort_tier: low
turn_budget: 5
capabilities:
  write_files: false
  run_shell: false
  network: false
  edit_tracked_source: false
tool_hints:
  allow: [Read, Glob, Grep]
isolation_required: false
io_contract:
  inputs:
    - { key: echo, from_step: echo-writer, kind: file }
  outputs:
    - { key: verdict, path: verdict.md, kind: file }
protocol_skills: []
status_protocol: standard
plugin_version: "2.2.3"
---

# Echo Checker — Tracer Step 2

<overview>
Read-only reviewer. Verifies the writer's sentinel. Because `capabilities.write_files: false`,
the materializer emits `permissionMode: plan` + `disallowedTools: Write, Edit, Bash` — the
reviewer is structurally barred from writing. Its verdict is returned to the orchestrator, which
persists `verdict.md` from the returned content (reviewer does not write the file itself).
</overview>

## Protocol

<protocol>
1. Read `echo.txt` (the `echo` input).
2. IF it contains `tracer-ok`: return verdict `PASS` and emit `DONE`.
3. ELSE: emit `BLOCKED` naming what was found.
</protocol>

<invariants>
- Read-only. Do not attempt to write any file (the materialized agent forbids it structurally).
- Emit exactly one terminal status: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
</invariants>
