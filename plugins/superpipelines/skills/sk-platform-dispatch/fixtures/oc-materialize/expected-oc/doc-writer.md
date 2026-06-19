---
mode: subagent
name: doc-writer
description: Writes the summary document from the provided input file.
model: opencode-go/qwen3.6-plus
reasoningEffort: medium
maxTurns: 30
permission:
  webfetch: deny
tools: [read, write, edit, bash, glob, grep]
---

<overview>
The agent writes the summary document from the provided input.
</overview>

## Required Sources
- None. This fixture step is self-contained.

## Protocol

<protocol>
### 1. DISCOVER
Read the input file and verify the output path declared in `io_contract`.
### 2. PROCESS
Produce `doc.md` summarizing the input. Use shell only for file checks.
### 3. DELIVER
Return the declared document output and one terminal status.
</protocol>

## Completion Criterion
The step is complete when it emits exactly one terminal status and returns the output declared in `io_contract`.

<invariants>
- Emit exactly one terminal status: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
</invariants>
