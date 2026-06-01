---
name: analyzer
description: Use when the parity-test-b pipeline needs to read a JSON file and compute per-key data quality metrics (null presence, type inconsistencies).
tools: Read, Write, Glob
model_tier: fast
effort_tier: medium
maxTurns: 15
version: "1.0.0"
plugin_version: "2.1.0"
permissionMode: acceptEdits
skills:
  - analyzer-protocol
---
