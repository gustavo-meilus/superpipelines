---
name: pipeline-spec-reviewer
description: Use as Stage 1 review after a pipeline-task-executor produces output — checks ONLY whether the output matches the spec exactly. Under-build AND over-build both FAIL. Stage 2 (code quality) cannot begin until this passes. Read-only; never edits.
tools: Read, Glob, Grep
disallowedTools: Write, Edit, Bash
model_tier: medium
effort_tier: medium
maxTurns: 15
permissionMode: plan
version: "2.0"
skills:
  - sk-claude-code-conventions
  - sk-write-review-isolation
  - pipeline-spec-reviewer-protocol
---
