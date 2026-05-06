# Superpipelines Release Notes

## v1.0.1 — v2 Redesign (2026-05-04)

This release completes the transition to the superpipelines v2 architecture. All state management, path resolution, and agent frontmatter have been standardized. Legacy Superpowers-era documentation and infrastructure have been removed.

### Breaking changes

- **State file path moved.** Pipeline state now lives at `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json` instead of `tmp/pipeline-state.json`. There is no migration path — any in-progress pipelines from v1.0.0 must be restarted.
- **State schema extended.** `pipeline-state.json` now requires `pipeline_name`, `scope_root`, and `run_id` fields.
- **`.claudeignore` updated.** The ignore pattern changed from `tmp/pipeline-*` to `.claude/superpipelines/temp/`.
- **Agent `permissionMode` now required.** All agents declare `permissionMode` in frontmatter (`acceptEdits` for executors, `plan` for reviewers/architects). Agents without `permissionMode` will use the default behavior.

### What's new

- **Scope-aware deployment.** Pipelines can target `project`, `local`, or `user` scope. Paths resolved by `sk-pipeline-paths`.
- **Multi-pipeline support.** Multiple named pipelines coexist per workspace in isolated `{P}/` directories.
- **Step management commands.** `/superpipelines:new-step`, `/superpipelines:update-step`, `/superpipelines:delete-step` for granular pipeline mutations with topology rewiring and delta audits.
- **20-criterion compliance matrix.** `audit-pipeline` now checks layout (5), frontmatter (6), topology (5), and runtime safety (4) criteria across 4 severity bands.
- **`memory: local` allowed.** Agents that need to persist cross-run heuristics may now use `memory: local`. `memory: project` remains forbidden.

### What's removed

- `docs/AI_PIPELINES_LLM.md` — replaced by `ai-pipelines-trimmed.md`, compliance matrix, and agent-frontmatter-schema.
- `docs/ai-pipelines-improvement-plan.md` — historical gap analysis, no longer relevant.
- `docs/superpowers-vs-ai-pipelines.md` — comparison of two predecessor projects.
- `docs/claude-plugins-complete-guide.md` — Superpowers plugin creation guide.
- `docs/testing.md` — Superpowers integration test documentation.
- `docs/windows/`, `docs/plans/`, `docs/superpowers/`, `docs/examples/` — legacy directories.
- `RELEASE-NOTES.md` — replaced by this file (Superpowers v3.1–v5.0.7 history removed).
- `tests/` — Superpowers-era test suites (brainstorm-server, skill-triggering, etc.).
- Visual companion server scripts from `skills/brainstorming/`.

## v1.0.0 — Initial Release (2026-05-03)

First release of superpipelines as a standalone Claude Code plugin. Established the core pipeline framework with 7 agents, 6 execution patterns, and spec-driven development workflow.
