---
name: summarizer
description: Use when the parity-test-c pipeline needs to read analyzer findings and render a structured markdown summary with Key Themes and Structure Overview sections, written to the output directory.
tools: Read, Write
model_tier: inherit
effort_tier: medium
maxTurns: 20
version: "1.0.0"
plugin_version: "2.0.0"
permissionMode: acceptEdits
skills:
  - sk-4d-method
  - summarizer-protocol
---
