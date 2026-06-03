---
name: pipeline-optimizer
description: Use when surveying an existing pipeline bundle for optimization opportunities — topology merge/split/parallelize/reorder, model-tier right-sizing, past-run pain signals, and protocol-quality advisories. Dispatched read-only by optimizing-a-pipeline; renders an opportunity report for the orchestrator to persist. Never mutates.
tools: Read, Glob, Grep
disallowedTools: Write, Edit, Bash
model_tier: deep
effort_tier: high
maxTurns: 30
version: "1.0"
plugin_version: "2.2.0"
permissionMode: plan
skills:
  - sk-4d-method
  - sk-pipeline-paths
  - pipeline-optimizer-protocol
---
