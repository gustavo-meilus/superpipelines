---
name: pipeline-failure-analyzer
description: Use during a Pattern 3 iterative loop after a tester reports failures, before dispatching a fixer — diagnoses whether failures are fixable bugs or architectural problems, detects "fixes reveal new failures in new locations" pattern, and decides whether to continue or escalate per Pattern 3 protocol.
tools: Read, Glob, Grep, Bash
model: sonnet
effort: high
maxTurns: 20
permissionMode: plan
version: "2.0"
skills:
  - sk-4d-method
  - sk-pipeline-patterns
  - sk-rationalization-resistance
  - pipeline-failure-analyzer-protocol
---
