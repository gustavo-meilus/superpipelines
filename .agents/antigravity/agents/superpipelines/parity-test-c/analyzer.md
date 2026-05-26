---
name: analyzer
description: Use when the parity-test-c pipeline needs to analyze an input text document and produce structured findings for the summarizer step.
tools: Read, Write, Glob, Grep
model_tier: inherit
effort_tier: medium
maxTurns: 25
version: "1.0.0"
plugin_version: "2.0.0"
permissionMode: acceptEdits
skills:
  - sk-4d-method
  - analyzer-protocol
---
