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
- The reporter is read-only (`disallowedTools: Write`) and NEVER writes the
  report file. Render the full report markdown and return it inline in the
  response.
- Hand the orchestrator an explicit instruction: the target `audit/latest.md`
  path to persist. Persistence is the orchestrator's responsibility.
</protocol>

<!--
PASS (criterion 25): primary action delegates persistence and self-cites the
read-only contract. No forbidden tool on the primary path. This is the corrected
shape, mirroring pipeline-auditor-protocol step 3.
-->
