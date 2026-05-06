---
description: Update an existing step in a pipeline — select pipeline, select step, apply changes, re-validate edges, audit the delta, then gate on human approval
argument-hint: [description of changes to the step]
---

# /superpipelines:update-step

Invoke the `updating-a-pipeline-step` skill.

Brief: $ARGUMENTS

The skill will:

1. Read all registries; present pipeline list. `AskUserQuestion` — which pipeline?
2. Parse `topology.json`; display current steps. `AskUserQuestion` — which step to update?
3. Show the user a summary of the chosen step (agent file, declared inputs/outputs, current effort/model/tools).
4. Run the 4D Method on the change brief; explicitly identify whether the change affects the step's input schema, output schema, or internal behavior only.
5. **Edge re-validation planning** — if input/output schema changes: identify affected predecessor and successor steps; present an impact analysis and ask user to confirm propagation before proceeding.
6. Dispatch `pipeline-architect` in UPDATE mode to apply changes and propagate edge updates. All edits staged to `temp/{P}/edit-{ts}/`.
7. **Mandatory delta audit** — `pipeline-auditor` DELTA mode on updated step + neighbors + entry skill. SEV-0/1 must clear before promotion.
8. **Human gate** — diff summary of all changed files; wait for `APPROVE | REVISE`.
9. **Atomic promotion** — move staged files to final paths; update `registry.json`.

Do NOT apply changes to final paths before the delta audit passes. Do NOT skip edge re-validation.
