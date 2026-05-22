# Superpipelines — Architecture and Authoring Reference

> Canonical project reference for the Superpipelines Claude Code plugin. This document defines the architectural invariants, file layout rules, and authoring constraints required to maintain system integrity and LLM readability.

<overview>
Superpipelines implements a multi-agent orchestration framework where architecture is enforced through structural isolation and strict authoring rules. This reference serves as the ground truth for developers and agents operating within the repository.
</overview>

## Architecture Invariants

<architecture_invariants>
- `SUB_AGENT_SPAWNING: FALSE` — Subagents never spawn children; orchestration resides in top-level skills or the parent session.
- `WRITE_REVIEW_ISOLATION: STRUCTURAL_ON_TIER1_1B_1D; CONVENTION_ONLY_ON_TIER2` — Each tier's structural-isolation source is encoded in its profile under `capabilities.reviewer_isolation` + `extensions.reviewer_isolation_recipe`. On Tier 2 the orchestrator runs both writer and reviewer protocols with its own full toolset — isolation is convention-only. Implementations MUST surface every entry of `platform_profile.degradation_warnings` in user-facing reports. Per `DEPENDENCY_INVERSION: PROFILE_DRIVEN`, concrete per-tier recipes belong in profile JSON, not in this invariant text.
- `MODEL_SELECTION: DYNAMIC_DEFAULT_SONNET` — The `creating-a-pipeline` Phase 2 prompt records the user's per-step tier choice (`deep` for planning/architecture/review steps; `fast` for execution/utility steps). The architect resolves the chosen tier via `platform_profile.model_tiers[tier]` and embeds the resolved string in each generated agent's `model:` frontmatter field during Phase 4. Decline default = `platform_profile.model_tiers.fast` (named `DYNAMIC_DEFAULT_SONNET` historically because the Tier 1 (CC) fast slot resolves to `claude-sonnet-4-6`; on non-CC tiers the same `.fast` slot resolves to that tier's idiomatic fast model — see profile JSONs). Per `DEPENDENCY_INVERSION: PROFILE_DRIVEN`, concrete per-tier model IDs live in the profile JSONs (single source of truth), never in this invariant text or in skill bodies.
- `PERMISSION_MODE: PER_AGENT` — Agents declare explicit permission boundaries (e.g., `acceptEdits`, `plan`) in frontmatter.
- `STATE_MANAGEMENT: STRUCTURED_JSON` — State persists to `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json`. State carries `plugin_version`, `metadata.source_tier`, and `metadata.runtime_tier` from the run start.
- `MULTI_PIPELINE: TRUE` — Multiple named pipelines coexist in isolation per workspace.
- `LEAN_AGENTS_CC_ONLY` — Zero-body + protocol-skill pattern is Claude Code specific. OpenCode uses agent bodies ≤150 lines. Codex uses TOML agent files. Tier 2 platforms use protocol skills inline with no agent files.
- `MULTI_PLATFORM: TRUE` — superpipelines targets CC (Tier 1) + Codex (Tier 1d) + Cursor/Windsurf/Cline (Tier 2) + Antigravity CLI 2.0 (Tier 1c aspirational). superpipelines-opencode targets OC (Tier 1b). Gemini CLI is retired June 18, 2026.
- `TIER_MODEL: 5-TIER` — Tier 1 (CC: skill-callable `Task()`); Tier 1b (OC: `mode: subagent`); Tier 1c (Antigravity: Dynamic Subagents, aspirational); Tier 1d (Codex: native parallel subagents, model-driven, TOML agents, up to 6 concurrent); Tier 2 (Cursor/Windsurf/Cline: single-agent inline).
- `SKILL_PRIMACY: TRUE` — Intelligence lives in `SKILL.md`. Platform manifests (`.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/`, `gemini-extension.json`) are discovery-only.
- `ARTIFACT_PORTABILITY: CC_AND_CODEX_TO_TIER2; OC_NOT_PORTABLE` — Pipelines scaffolded on CC or Codex run on Tier 2 platforms without modification. OC pipelines use OC-specific agent frontmatter and are not portable without re-scaffolding.
- `OC_FIRST_CLASS: TRUE` — `superpipelines-opencode` is a permanent sibling repo; not deprecated.
- `SYNC_DISCIPLINE: REQUIRED` — Shared skills are kept in sync between this repo and `superpipelines-opencode` via `docs/SYNC.md`.
- `PARITY_TESTING: MANUAL_PHASE1` — No automated cross-platform parity gate in v2.0.0. `docs/SYNC.md` tracks per-skill validation. Automated parity tests are a v2.1 objective.
- `DEPENDENCY_INVERSION: PROFILE_DRIVEN` — Per-platform facts (dispatch mechanism, reviewer-isolation recipe, scope roots, model_tiers, degradation warnings) live exclusively in `skills/sk-platform-dispatch/profiles/{tier_id}.json`. Skill bodies depend on the abstract shape (`platform_profile.<field>`), never on concrete platform names or values. Adding a new platform = adding a new profile JSON + detection heuristic; no skill-body edits required. Concrete per-tier values duplicated in any skill body are a defect (auditor SEV-2: source-of-truth drift).
</architecture_invariants>

## File-Layout Rules

<file_rules>
- **Manifests**: `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` are the only permitted files in the plugin directory.
- **Source Roots**: `agents/`, `skills/`, `commands/`, and `hooks/` reside at the repository root.
- **Generated Artifacts**: Artifacts live under scope-dependent roots (`project`, `local`, or `user`) as resolved by `sk-pipeline-paths`.
- **Reference Skills**: Companion reference skills (`*-references/`) omit `SKILL.md` to prevent preloading into system context.
- **Protocol Skills**: Each agent has a companion `{agent-name}-protocol/SKILL.md` that holds its full operational protocol. Protocol skills use `disable-model-invocation: true` and `user-invocable: false`; they are loaded only via the agent's `skills:` list.
</file_rules>

## Authoring Rules

<authoring_rules>
- **Skill Descriptions**: Use triggering conditions only; avoid workflow summaries.
- **Voice**: Enforce third-person impersonal voice throughout all documentation and skills.
- **Constraints**: Skill bodies ≤500 lines; agent bodies are empty (frontmatter only); every skill description ≤1536 characters (combined with `when_to_use` if present).
- **Reference Topology**: References >100 lines must include a Table of Contents.
- **Status Reporting**: Agents must emit exactly one terminal status: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`.
</authoring_rules>

<glossary>
  <term name="Sonnet 4.6">The canonical model ID: `claude-sonnet-4-6`.</term>
  <term name="Scope Root">The base directory for generated artifacts, variable by project configuration.</term>
</glossary>

## Metadata

- **Current Model IDs**: `claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5-20251001`.
- **Project Version**: v2.0.0
