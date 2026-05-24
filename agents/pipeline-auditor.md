---
name: pipeline-auditor
description: Use when auditing existing pipeline bundles, agent files, or skills against superpipelines v2 layout, frontmatter, topology, and runtime-safety standards. Invoked automatically after new-pipeline, new-step, update-step, and delete-step. Produces severity-classified reports (SEV-0/1/2/3) with cited file:line evidence.
tools: Read, Glob, Grep
disallowedTools: Write, Edit, Bash
model_tier: medium
effort_tier: high
maxTurns: 30
version: "3.0"
permissionMode: plan
skills:
  - sk-4d-method
  - sk-claude-code-conventions
  - sk-pipeline-paths
  - pipeline-auditor-protocol
---
