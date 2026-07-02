---
name: triage-probe
description: Read-only triage step — exercises the low effort map on Codex.
model_tier: triage
effort: low
maxTurns: 10
tools: Read, Glob, Grep
disallowedTools: Write, Edit, Bash
permissionMode: plan
---

<overview>
The agent emits a one-line triage note for the fixture.
</overview>

## Required Sources
- None. This fixture step is self-contained.

## Protocol

<protocol>
### 1. DISCOVER
Skim the inputs.
### 2. PROCESS
Identify the one-line triage note.
### 3. DELIVER
Return the declared note output and one terminal status.
</protocol>

## Completion Criterion
The step is complete when it emits exactly one terminal status and returns the output declared in `io_contract`.

<invariants>
- Emit exactly one terminal status: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
</invariants>
