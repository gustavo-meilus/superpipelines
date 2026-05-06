---
description: List all pipelines in the current workspace (all scopes) and run the entry skill of the user-selected one
argument-hint: [optional: --resume]
---

# /superpipelines:run-pipeline

Invoke the `running-a-pipeline` skill.

Args: $ARGUMENTS

The skill will:

1. Read `registry.json` from all three scopes (`local`, `project`, `user`). Present a deduplicated list with scope labels.
2. `AskUserQuestion` — which pipeline to run?
3. If `--resume`: present available `runId`s from `temp/{P}/` for the chosen pipeline; ask which run to resume.
4. Initialize run state in `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json`.
5. Invoke the chosen pipeline's entry skill (`run-{P}`), which orchestrates full execution.
6. On terminal `DONE`: delete `<scope-root>/superpipelines/temp/{P}/{runId}/`.
7. On `ESCALATED | FAILED | BLOCKED`: preserve the temp directory and print its absolute path.

Do NOT auto-resume an `escalated` or `failed` state without explicit user confirmation.
