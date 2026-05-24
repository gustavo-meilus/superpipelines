---
name: pipeline-task-executor
description: Use when implementing exactly ONE task from a tasks.md file as part of a Pattern 5 (SDD) parallel implementation phase, or when a single bounded implementation task needs a fresh-context worker. Receives extracted task text plus spec/plan paths; performs the task; self-verifies; emits terminal status.
tools: Read, Write, Edit, Bash, Glob, Grep
model_tier: medium
effort_tier: medium
maxTurns: 30
version: "2.0"
isolation: worktree
permissionMode: acceptEdits
skills:
  - sk-4d-method
  - sk-spec-driven-development
  - sk-claude-code-conventions
  - sk-hashline-protocol
  - pipeline-task-executor-protocol
---
