---
name: doc-reviewer
description: Stage 1 review — checks the summary document matches the spec exactly. Read-only.
model_tier: medium
effort: medium
maxTurns: 15
tools: Read, Glob, Grep
disallowedTools: Write, Edit, Bash
permissionMode: plan
---

<overview>
The agent performs Stage 1 review for the generated summary document.
</overview>

## Required Sources
- None. This fixture step is self-contained.

## Protocol

<protocol>
### 1. DISCOVER
Read `doc.md` and the spec.
### 2. PROCESS
Compare requirement by requirement.
### 3. DELIVER
Emit a Stage 1 verdict: PASS only if the output matches the spec exactly; under-build and over-build FAIL.
</protocol>

## Completion Criterion
The step is complete when it emits exactly one terminal status and returns the output declared in `io_contract`.

<invariants>
- Emit exactly one terminal status: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
</invariants>
