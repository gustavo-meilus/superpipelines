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

Read the input file. Produce `doc.md` summarizing it. Use shell only for file checks. Emit a
terminal status: DONE on success.
