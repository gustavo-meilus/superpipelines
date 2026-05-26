---
name: reporter
description: Use when the parity-test-b pipeline needs to render the final markdown data quality report from the analyzer findings and reviewer verdict.
tools: Read, Write, Glob
model_tier: fast
effort_tier: medium
maxTurns: 15
version: "1.0.0"
plugin_version: "2.0.0"
permissionMode: acceptEdits
isolation: worktree
skills:
  - reporter-protocol
---
