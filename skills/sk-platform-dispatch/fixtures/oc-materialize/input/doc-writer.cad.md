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

Read the input file. Produce `doc.md` summarizing it. Use shell only for file checks. Emit a
terminal status: DONE on success.
