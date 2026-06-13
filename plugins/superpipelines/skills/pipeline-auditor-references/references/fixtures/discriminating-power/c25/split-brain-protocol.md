---
name: demo-reporter-protocol
description: Supplies the demo-reporter agent with its report-rendering protocol. Not user-invocable.
disable-model-invocation: true
user-invocable: false
---

# Demo Reporter — Operational Protocol

## Workflow

<protocol>
### 1. COLLECT
- Read the analyzer findings and the reviewer verdict.

### 2. RENDER
- Write the report to `{ROOT}/superpipelines/temp/{P}/{runId}/audit/latest.md`.
- This is the agent's primary action: persist the rendered markdown to disk.
</protocol>

<!--
SPLIT-BRAIN (criterion 25, SEV-1): the agent frontmatter declares
`disallowedTools: Write` and `permissionMode: plan`, yet step 2's primary action
is an unconditional "Write the report to <path>". The primary path is dead at
runtime. This is the #34 violation the criterion must catch.
-->
