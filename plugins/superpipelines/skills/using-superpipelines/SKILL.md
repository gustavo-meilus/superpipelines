---
name: using-superpipelines
description: Loads core routing table, invariants, and red flags for the Superpipelines orchestration framework. Use when a conversation starts in any project that has the Superpipelines plugin installed, or when the orchestrator needs to determine which pipeline skill handles the current request.
---

# Using Superpipelines — Core Orchestration Reference

<SUBAGENT-STOP>
If dispatched as a subagent to execute a specific task, skip this skill. Subagents do not orchestrate; they perform a single role and exit with a terminal status (DONE, NEEDS_CONTEXT, BLOCKED).
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
If a pipeline skill applies to the user's request, invoke it. Do not rationalize past it. Pipelines fail silently when specialized skills are skipped—the orchestrator must trust the defined routing protocols.
</EXTREMELY-IMPORTANT>

## Skill Routing Protocols

<routing_table>
| User Request / Situation | Skill to Invoke | Rationale |
| :--- | :--- | :--- |
| `/new-pipeline` or "Design a workflow" | `creating-a-pipeline` | End-to-end scaffolding. |
| `/run-pipeline` or "Execute [P]" | `running-a-pipeline` | Registry-driven launcher. |
| `/new-step` or "Add capability" | `adding-a-pipeline-step` | Topology mutation. |
| `/update-step` or "Modify agent" | `updating-a-pipeline-step` | Contract-aware update. |
| `/delete-step` or "Remove step" | `deleting-a-pipeline-step` | Gap-analysis removal. |
| `/audit-steps` | `pipeline-auditor` | Security/topology review. |
| `/change-models` or "Change models" | `change-models` | Interactive model reassignment. |
| `/optimize-pipeline` or "Optimize [P]" | `optimizing-a-pipeline` | On-demand topology/cost optimization. |
| `/migrate-pipeline` or "Migrate legacy pipeline to .superpipelines/" | `migrating-a-pipeline` | Lossless legacy→data-only conversion. |
| Ambiguous / Discovery phase | `sk-4d-method` | Intent deconstruction. |
| Implementation / Task execution | `sk-spec-driven-development` | Contracted development. |
| Authoring Agents or Skills | `sk-claude-code-conventions` | Format enforcement. |
</routing_table>

## Core Pipeline Invariants

<invariants>
- **`SUB_AGENT_SPAWNING: FALSE`**: Subagents must not spawn children; orchestration is restricted to the top-level parent.
- **`WRITE_REVIEW_ISOLATION: STRUCTURAL_ON_TIER1_1B_1D; CONVENTION_ONLY_ON_TIER2`**: The agent that writes code never reviews it. Stage 1 (Compliance) gates Stage 2 (Quality). Structurally enforced on Tier 1/1b/1d; convention-only with explicit advisory surfacing on Tier 2.
- **`MODEL_SELECTION: DYNAMIC_DEFAULT_SONNET`**: Pipeline execution and utility agents default to `platform_profile.model_tiers.fast`. Planning, architecture, and review agents may opt into `platform_profile.model_tiers.deep` via per-step model preference (Phase 2 of `creating-a-pipeline`). Concrete model IDs per platform live in `skills/sk-platform-dispatch/profiles/{tier_id}.json` — never restated in skill bodies (per `DEPENDENCY_INVERSION: PROFILE_DRIVEN`).
- **`MULTI_PLATFORM: TRUE`**: superpipelines targets CC (Tier 1) + OC (Tier 1b) + Antigravity CLI 2.0 (Tier 1c, aspirational) + Codex (Tier 1d) + Cursor/Windsurf/Cline (Tier 2). Step orchestration routes through `sk-platform-dispatch`.
- **`STATE_PERSISTENCE`**: All state must reside in `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json`.
- **`ATOMIC_MUTATION`**: Topology changes must be staged in `edit-{ts}/` before promotion.
- **`PLUGIN_VERSION_STAMPING`**: Every pipeline artifact (`topology.json`, `registry.json` entries, `pipeline-state.json`, agent frontmatter) must include a `plugin_version` field set to the current superpipelines package version. This field is updated on every mutation (create, add-step, update-step, delete-step) and enables future retro-compatibility checks.
</invariants>

## Red Flags — STOP
- "I already know what to do, skip the spec." → **STOP**. The spec is the contract for parallel worker synchronization.
- "One more iteration should fix it." → **STOP**. Hard cap at 3 iterations without measurable progress; escalate per Pattern 3.
- "The reviewer and executor can be the same." → **STOP**. Write/review isolation is a non-negotiable security boundary.
- "Skip the worktree for a small change." → **STOP**. If the pattern requires isolation, the safety protocol is mandatory.
- "The brief is detailed, I'll skip git preflight and scope selection." → **STOP**. `creating-a-pipeline` Phases 0 and 1 are mandatory. Run them before the 4D analysis.

## Rationalization Table

<rationalization_table>
| Excuse | Reality |
| :--- | :--- |
| "I'll read the skill file directly." | Using `Read` instead of `Skill` tool breaks discovery, caching, and body-loading logic. |
| "The user said it's urgent, skip audit." | A 30-second audit prevents silent topology gaps that lead to catastrophic runtime failure. |
| "The state file is too complex." | Standardized state is the only path to reliable resumption and multi-step recovery. |
| "The brief is complete, skip preflight." | Git preflight and scope selection are non-negotiable. A rich brief does not substitute for environment validation or deployment scope confirmation. |
| "I'll write state to `tmp/`." | The canonical state path is `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json`. The `tmp/` path is a retired pattern. |
</rationalization_table>

## Reference Files
- `sk-pipeline-grilling/SKILL.md` — Brief-hardening interrogation run during pipeline creation (Phases 2 and 3).
- `sk-pipeline-paths/SKILL.md` — Scope and path resolution.
- `sk-pipeline-patterns/SKILL.md` — Topology selection.
- `sk-write-review-isolation/SKILL.md` — Two-stage review protocol.
- `sk-rationalization-resistance/SKILL.md` — Resistance mechanism standards.
