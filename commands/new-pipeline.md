---
description: Design and scaffold a new named multi-agent pipeline with git preflight, scope selection, pre-gate audit, and entry-skill generation
argument-hint: [brief description of the pipeline]
---

# /superpipelines:new-pipeline

Invoke the `creating-a-pipeline` skill to design and scaffold a new named pipeline.

Brief: $ARGUMENTS

If the brief is empty, ask the user 1–2 targeted questions to elicit the goal, then proceed.

The skill will:

1. **Git preflight** — check workspace for `.git`. If absent: ask `Proceed without git (worktree-isolated patterns disabled) | Run git init | Cancel`. Block if cancelled.
2. **Scope selection** — ask: `local | project | user`. Resolve all output paths via `sk-pipeline-paths`.
3. **Name + uniqueness check** — ask for a pipeline name (lowercase-hyphen, ≤48 chars); verify no collision in `registry.json` of the chosen scope.
4. **4D + pattern selection** — run the 4D Method on the brief; select execution pattern (1–5).
5. **Architect dispatch** — `pipeline-architect` (PIPELINE mode) produces `spec.md`, `plan.md`, `tasks.md`, `topology.json`, step agents under `agents/superpipelines/{P}/`, and internal step skills under `skills/superpipelines/{P}/`.
6. **Pre-gate audit** — `pipeline-auditor` in DELTA mode checks the generated bundle. SEV-0 and SEV-1 findings must be resolved before the human gate.
7. **Human gate** — present spec + tasks to user; wait for `APPROVE | REVISE`. On REVISE: return to step 4.
8. **Entry-skill generation** — write `skills/superpipelines/{P}/run-{P}/SKILL.md` with `disable-model-invocation: true` and `user-invocable: true`.
9. **Registry write** — append the pipeline record to `<scope-root>/superpipelines/registry.json`.

Do NOT skip git preflight, scope selection, pre-gate audit, or the human gate.
