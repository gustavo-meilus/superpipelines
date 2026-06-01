---
name: reviewer
description: Use when the parity-test-b pipeline needs to validate the analyzer's findings for schema completeness and correctness before the reporter renders the final report. Read-only — never writes files.
tools: Read, Glob
disallowedTools: Write, Edit, Bash
model_tier: medium
effort_tier: medium
maxTurns: 15
version: "1.0.0"
plugin_version: "2.1.0"
permissionMode: plan
skills:
  - reviewer-protocol
---
