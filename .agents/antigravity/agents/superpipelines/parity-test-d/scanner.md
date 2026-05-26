---
name: scanner
description: Use when the parity-test-d pipeline needs to scan a source directory and extract per-file code health metrics for the reporter step.
tools: Read, Write, Glob, Grep
model_tier: inherit
effort_tier: medium
maxTurns: 25
version: "1.0.0"
plugin_version: "2.0.0"
permissionMode: acceptEdits
skills:
  - sk-4d-method
  - scanner-protocol
---
