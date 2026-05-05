# Superpipelines — Release Notes

> Canonical record of versioned changes, feature additions, and removals for the Superpipelines framework. This document serves as the primary reference for tracking migration paths and architectural evolution.

<overview>
Superpipelines release notes document the transition from legacy Superpowers-era infrastructure to the standalone v1.0.x architecture. Key milestones include the implementation of scope-aware deployment, multi-pipeline isolation, and the 20-criterion compliance matrix.
</overview>

## v1.0.4 — OMOA Integration & Hierarchical Context (2026-05-05)

This release integrates three major architectural enhancements inspired by the Oh My OpenAgent ecosystem, dramatically improving edit stability, context efficiency, and cost-to-performance ratios for specific agents.

<release_entry version="1.0.4" status="STABLE">

### Added
- **Hashline Protocol**: Added `sk-hashline-protocol` skill and updated the `pipeline-task-executor` to enforce hash-anchored code modifications, preventing source code corruption from stale line edits.
- **Hierarchical Context Command**: Added the `/superpipelines:init-deep` command and `sk-hierarchical-context` skill to map repository architecture into distributed `PIPELINE-CONTEXT.md` files, ensuring agents access lean, localized context without bloating global prompts.
- **Scribius Formatting Enforcement**: Enforced strict Scribius v1 standards (H1-first, XML-anchored structured envelopes, third-person voice) on all generated `PIPELINE-CONTEXT.md` files.
- **Dynamic Intent Routing**: Added `sk-dynamic-routing` to permit intent-based LLM selection. `pipeline-architect` now defaults to `claude-opus-4-7` (`deep-plan` category) and `pipeline-quality-reviewer` routes to `claude-haiku-4-5-20251001` (`quick-audit` category), while standard implementation workers remain bound to `claude-sonnet-4-6`.

### Changed
- **Architecture Invariant Updated**: `MODEL_SELECTION: SONNET_ONLY` updated to `MODEL_SELECTION: DYNAMIC_DEFAULT_SONNET` to support category-based routing.
- **New Pipeline Preflight**: The `/superpipelines:new-pipeline` command now explicitly checks for a root context map and suggests `/superpipelines:init-deep` during the preflight phase.

</release_entry>

## v1.0.3 — Adherence Cleanup (2026-05-04)

This release ensures 100% adherence to the framework's core architectural standards. It resolves cosmetic and structural issues identified during a comprehensive audit, including stale marketplace metadata, corrupted agent definitions, and structural inconsistencies in the release history.

<release_entry version="1.0.3" status="STABLE">

### Added
- **Adherence Audit Verified**: Confirmed 100% compliance with all 16 core architectural requirements (Git preflight, multi-pipeline isolation, scope-aware pathing, temp lifecycle).

### Improved
- **Marketplace Metadata**: Synchronized marketplace description with canonical plugin capabilities, removing stale documentation references.
- **Structural Integrity**: Resolved file corruption in `skill-architect.md` and consolidated duplicate history headers in `RELEASE-NOTES.md`.

</release_entry>

## v1.0.2 — Scribius v1 & Standardized Architecture (2026-05-04)

This release implements a repository-wide refactoring to the Scribius v1 documentation standard and finalizes the v2 scope-aware architecture. It introduces semantically anchored XML envelopes for machine-readability and master manifests for high-performance context retrieval.

<release_entry version="1.0.2" status="STABLE">

### Added
- **Scribius v1 Standardization**: All 20+ core skills migrated to semantically anchored XML envelopes (`<overview>`, `<protocol>`, `<invariants>`, `<rationalization_table>`).
- **AI-Ready Indexing**: Added `llms.txt` and `llms-full.txt` master manifests for optimized LLM context injection.
- **Integrity Verification**: Verified 100% semantic alignment between pre-refactor baselines and standardized documentation via a multi-agent audit protocol.
- **Automated Registry**: Added `generate_llms_full.py` script for periodic manifest updates.
- **Scope-aware deployment**: Pipelines support `project`, `local`, and `user` scopes with path resolution via `sk-pipeline-paths`.
- **Multi-pipeline support**: Multiple named pipelines coexist per workspace in isolated directories.
- **Step management commands**: `/superpipelines:new-step`, `/superpipelines:update-step`, and `/superpipelines:delete-step` enable granular pipeline mutations.
- **Compliance Matrix**: A 20-criterion audit system for layout, frontmatter, topology, and runtime safety.
- **Local Memory**: Agents may utilize `memory: local` for persisting cross-run heuristics.

### Improved
- **Protocol Clarity**: Refined operational gates in `systematic-debugging`, `tdd`, and `verification-before-completion` for sharper agent adherence.
- **Structural Voice**: Standardized all documentation to third-person impersonal voice to reinforce protocol objectivity.

### Breaking changes
- **State file path moved**: Pipeline state now lives at `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json` instead of `tmp/pipeline-state.json`. There is no migration path — any in-progress pipelines from v1.0.0 must be restarted.
- **State schema extended**: `pipeline-state.json` now requires `pipeline_name`, `scope_root`, and `run_id` fields.
- **`.claudeignore` updated**: The ignore pattern changed from `tmp/pipeline-*` to `.claude/superpipelines/temp/`.
- **Agent `permissionMode` now required**: All agents declare `permissionMode` in frontmatter (`acceptEdits` for executors, `plan` for reviewers/architects).

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
