# Fixture CAD-00 — VALID: conformant canonical agent-def

**Expected finding:** none. This def passes CAD-01..CAD-05. Used as the positive baseline:
any auditor change that flags this file has lost precision.

This is a `spec-reviewer` canonical def as stored under
`.superpipelines/pipelines/{P}/agents/spec-reviewer.md`.

```yaml
---
schema_version: "1.0"
name: spec-reviewer
description: >
  Stage 1 review: checks output matches spec exactly. Read-only.
role: reviewer
review_stage: 1
model_tier: medium
effort_tier: medium
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
    - { key: task_output, from_step: executor, kind: file }
  outputs:
    - { key: verdict, path: review/stage1-verdict.md, kind: file }
protocol_skills: [sk-write-review-isolation]
status_protocol: standard
plugin_version: "2.2.3"
---

Read the executor output and the spec. Compare requirement by requirement. Emit a Stage 1
verdict: PASS only if the output matches the spec exactly — under-build AND over-build FAIL.
```

## Why it passes

- **CAD-01** — `tool_hints.allow: [Read, Glob, Grep]` contains no write/shell/network tool;
  consistent with all four capabilities `false`.
- **CAD-02** — `isolation_required: false`; coherent (no worktree requested by a non-writer).
- **CAD-03** — the only `io_contract` path, `review/stage1-verdict.md`, is relative: no leading
  `/`, no scope-root prefix, no `..`.
- **CAD-04** — both `schema_version: "1.0"` and `plugin_version: "2.2.3"` present.
- **CAD-05** — `role: reviewer` with `capabilities.write_files: false`. Reviewer cannot write.
