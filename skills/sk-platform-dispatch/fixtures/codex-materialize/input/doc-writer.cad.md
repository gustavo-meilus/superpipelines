---
schema_version: "1.0"
name: doc-writer
description: Writes the summary document from the provided input file.
role: worker
review_stage: null
model_tier: medium
effort_tier: null
turn_budget: 30
capabilities:
  write_files: true
  run_shell: true
  network: false
  edit_tracked_source: true
tool_hints:
  allow: [Read, Write, Edit, Bash, Glob, Grep]
isolation_required: true
io_contract:
  inputs: []
  outputs:
    - { key: doc, path: doc.md, kind: file }
protocol_skills: []
status_protocol: standard
plugin_version: "2.2.3"
---

<overview>
The agent writes the summary document from the provided input.
</overview>

## Required Sources
- None. This fixture step is self-contained.

## Protocol

<protocol>
### 1. DISCOVER
Read the input file and verify the output path declared in `io_contract`.
### 2. PROCESS
Produce `doc.md` summarizing the input. Use shell only for file checks.
### 3. DELIVER
Return the declared document output and one terminal status.
</protocol>

## Completion Criterion
The step is complete when it emits exactly one terminal status and returns the output declared in `io_contract`.

<invariants>
- Emit exactly one terminal status: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
</invariants>
