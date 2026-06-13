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
- Primary action: render the report markdown and return it inline in the
  response. Hand the orchestrator the target `audit/latest.md` path; the
  orchestrator persists it.
- Tier fallback: on a host where the orchestrator cannot persist (no Skill-tool
  relay), and only if `Write` is available on that tier, write the report
  directly. On the default tier `Write` is forbidden and this branch never runs.
</protocol>

<!--
PASS (criterion 25): the primary action delegates persistence; the `Write`
mention is a documented tier-conditional fallback ("only if Write is available
on that tier"). A criterion that flags this over-fires.
-->
