# Superpipelines — Architecture and Authoring Reference

> Canonical project reference for the Superpipelines Claude Code plugin. This document defines the architectural invariants, file layout rules, and authoring constraints required to maintain system integrity and LLM readability.

<overview>
Superpipelines implements a multi-agent orchestration framework where architecture is enforced through structural isolation and strict authoring rules. This reference serves as the ground truth for developers and agents operating within the repository.
</overview>

## Architecture Invariants

<architecture_invariants>
- `SUB_AGENT_SPAWNING: FALSE` — Subagents never spawn children; orchestration resides in top-level skills or the parent session.
- `WRITE_REVIEW_ISOLATION: TRUE` — The agent generating code is structurally barred from reviewing it.
- `MODEL_SELECTION: DYNAMIC_DEFAULT_SONNET` — Pipeline execution agents default to `claude-sonnet-4-6`. Planning and utility agents may utilize category-based dynamic routing (e.g., `deep-plan`, `quick-audit`).
- `PERMISSION_MODE: PER_AGENT` — Agents declare explicit permission boundaries (e.g., `acceptEdits`, `plan`) in frontmatter.
- `STATE_MANAGEMENT: STRUCTURED_JSON` — State persists to `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json`.
- `MULTI_PIPELINE: TRUE` — Multiple named pipelines coexist in isolation per workspace.
</architecture_invariants>

## File-Layout Rules

<file_rules>
- **Manifests**: `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` are the only permitted files in the plugin directory.
- **Source Roots**: `agents/`, `skills/`, `commands/`, and `hooks/` reside at the repository root.
- **Generated Artifacts**: Artifacts live under scope-dependent roots (`project`, `local`, or `user`) as resolved by `sk-pipeline-paths`.
- **Reference Skills**: Companion reference skills (`*-references/`) omit `SKILL.md` to prevent preloading into system context.
</file_rules>

## Authoring Rules

<authoring_rules>
- **Skill Descriptions**: Use triggering conditions only; avoid workflow summaries.
- **Voice**: Enforce third-person impersonal voice throughout all documentation and skills.
- **Constraints**: Skill bodies ≤500 lines; agent bodies ≤150 lines; every skill description ≤1024 characters.
- **Reference Topology**: References >100 lines must include a Table of Contents.
- **Status Reporting**: Agents must emit exactly one terminal status: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`.
</authoring_rules>

<glossary>
  <term name="Sonnet 4.6">The canonical model ID: `claude-sonnet-4-6`.</term>
  <term name="Scope Root">The base directory for generated artifacts, variable by project configuration.</term>
</glossary>

## Metadata

- **Current Model IDs**: `claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5-20251001`.
- **Project Version**: v1.0.4
