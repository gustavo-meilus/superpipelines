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

Skim the inputs and emit a one-line triage note. Read-only.
