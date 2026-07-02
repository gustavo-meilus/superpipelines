---
schema_version: "1.0"
name: triage-probe
description: Read-only triage step — exercises the low→minimal effort map on Codex.
role: reviewer
review_stage: null
model_tier: triage
effort_tier: null
turn_budget: 10
capabilities:
  write_files: false
  run_shell: false
  network: false
  edit_tracked_source: false
tool_hints:
  allow: [Read, Glob, Grep]
isolation_required: false
io_contract:
  inputs: []
  outputs:
    - { key: note, path: triage.md, kind: file }
protocol_skills: []
status_protocol: standard
plugin_version: "2.2.3"
---

<overview>
The agent emits a one-line triage note for the fixture.
</overview>

## Required Sources
- None. This fixture step is self-contained.

## Protocol

<protocol>
### 1. DISCOVER
Skim the inputs.
### 2. PROCESS
Identify the one-line triage note.
### 3. DELIVER
Return the declared note output and one terminal status.
</protocol>

## Completion Criterion
The step is complete when it emits exactly one terminal status and returns the output declared in `io_contract`.

<invariants>
- Emit exactly one terminal status: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
</invariants>
