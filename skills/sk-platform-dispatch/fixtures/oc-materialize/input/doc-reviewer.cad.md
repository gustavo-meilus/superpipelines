---
schema_version: "1.0"
name: doc-reviewer
description: Stage 1 review — checks the summary document matches the spec exactly. Read-only.
role: reviewer
review_stage: 1
model_tier: medium
effort_tier: null
turn_budget: 15
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
    - { key: doc, from_step: doc-writer, kind: file }
  outputs:
    - { key: verdict, path: review/stage1-verdict.md, kind: file }
protocol_skills: []
status_protocol: standard
plugin_version: "2.2.3"
---

<overview>
The agent performs Stage 1 review for the generated summary document.
</overview>

## Required Sources
- None. This fixture step is self-contained.

## Protocol

<protocol>
### 1. DISCOVER
Read `doc.md` and the spec.
### 2. PROCESS
Compare requirement by requirement.
### 3. DELIVER
Emit a Stage 1 verdict: PASS only if the output matches the spec exactly; under-build and over-build FAIL.
</protocol>

## Completion Criterion
The step is complete when it emits exactly one terminal status and returns the output declared in `io_contract`.

<invariants>
- Emit exactly one terminal status: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
</invariants>
