# Superpipelines Release Notes

## v1.0.2 — Scribius v1 AI-Readiness (2026-05-04)

# Superpipelines — Release Notes

> Canonical record of versioned changes, feature additions, and removals for the Superpipelines framework. This document serves as the primary reference for tracking migration paths and architectural evolution.

<overview>
Superpipelines release notes document the transition from legacy Superpowers-era infrastructure to the standalone v1.0.x architecture. Key milestones include the implementation of scope-aware deployment, multi-pipeline isolation, and the 20-criterion compliance matrix.
</overview>

## v1.0.2 — Scribius v1 AI-Readiness (2026-05-04)

This release implements the repository-wide refactoring of all core skills, agents, and commands to the Scribius v1 documentation standard. It introduces semantically anchored XML envelopes for machine-readability and master manifests for high-performance context retrieval.

<release_entry version="1.0.2" status="STABLE">

### Added
- **Scribius v1 Standardization**: All 20+ core skills migrated to semantically anchored XML envelopes (`<overview>`, `<protocol>`, `<invariants>`, `<rationalization_table>`).
- **AI-Ready Indexing**: Added `llms.txt` and `llms-full.txt` master manifests for optimized LLM context injection.
- **Integrity Verification**: Verified 100% semantic alignment between pre-refactor baselines and standardized documentation via a multi-agent audit protocol.
- **Automated Registry**: Added `generate_llms_full.py` script for periodic manifest updates.

### Improved
- **Protocol Clarity**: Refined operational gates in `systematic-debugging`, `tdd`, and `verification-before-completion` for sharper agent adherence.
- **Structural Voice**: Standardized all documentation to third-person impersonal voice to reinforce protocol objectivity.

</release_entry>

## v1.0.2 — Standardized Architecture (2026-05-04)

### Added
- **Scope-aware deployment**: Pipelines support `project`, `local`, and `user` scopes with path resolution via `sk-pipeline-paths`.
- **Multi-pipeline support**: Multiple named pipelines coexist per workspace in isolated directories.
- **Step management commands**: `/superpipelines:new-step`, `/superpipelines:update-step`, and `/superpipelines:delete-step` enable granular pipeline mutations.
- **Compliance Matrix**: A 20-criterion audit system for layout, frontmatter, topology, and runtime safety.
- **Local Memory**: Agents may utilize `memory: local` for persisting cross-run heuristics.

### Breaking changes

- **State file path moved.** Pipeline state now lives at `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json` instead of `tmp/pipeline-state.json`. There is no migration path — any in-progress pipelines from v1.0.0 must be restarted.
- **State schema extended.** `pipeline-state.json` now requires `pipeline_name`, `scope_root`, and `run_id` fields.
- **`.claudeignore` updated.** The ignore pattern changed from `tmp/pipeline-*` to `.claude/superpipelines/temp/`.
- **Agent `permissionMode` now required.** All agents declare `permissionMode` in frontmatter (`acceptEdits` for executors, `plan` for reviewers/architects). Agents without `permissionMode` will use the default behavior.

### Removed
- `docs/AI_PIPELINES_LLM.md` — Replaced by `ai-pipelines-trimmed.md` and agent-frontmatter-schema.
- `docs/ai-pipelines-improvement-plan.md` — Legacy gap analysis.
- `docs/superpowers-vs-ai-pipelines.md`, `docs/claude-plugins-complete-guide.md`, `docs/testing.md`.
- `docs/windows/`, `docs/plans/`, `docs/superpowers/`, `docs/examples/` — Legacy directories.
- `tests/` — Legacy Superpowers-era test suites.
- Visual companion server scripts from `skills/brainstorming/`.

</release_entry>

## v1.0.0 — Initial Release (2026-05-03)

<release_entry version="1.0.0" status="INITIAL">
First standalone release of Superpipelines. Established the core framework with 7 agents, 6 execution patterns, and the spec-driven development (SDD) workflow.
</release_entry>
