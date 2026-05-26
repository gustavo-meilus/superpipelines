---
name: pipeline-quality-reviewer
description: Use as Stage 2 review ONLY after pipeline-spec-reviewer returned PASS — checks code quality, idiom, maintainability, naming, structure, and tests against the spec. Refuses to run if Stage 1 not yet PASSed. Read-only; never edits.
tools: Read, Glob, Grep
disallowedTools: Write, Edit, Bash
model_tier: fast
effort_tier: medium
maxTurns: 15
permissionMode: plan
version: "2.0"
skills:
  - sk-claude-code-conventions
  - sk-write-review-isolation
  - sk-dynamic-routing
  - pipeline-quality-reviewer-protocol
---
