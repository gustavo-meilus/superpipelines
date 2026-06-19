---
name: using-superpipelines
description: Route Superpipelines requests to the right command workflow, reusable method skill, or direct codebase answer.
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
| User Request / Situation | Route | Rationale |
| :--- | :--- | :--- |
| `/superpipelines:new-pipeline`, "design a pipeline", "build a workflow", "plan multi-step feature work" | `creating-a-pipeline` | End-to-end new pipeline scaffolding. |
| `/superpipelines:run-pipeline`, `/superpipelines:{P}`, "run/execute/resume pipeline" | `running-a-pipeline` | Registry-driven launcher and resume flow. |
| `/superpipelines:new-step`, "add/insert a step/capability" | `adding-a-pipeline-step` | Existing topology mutation. |
| `/superpipelines:update-step`, "update/change a pipeline step" | `updating-a-pipeline-step` | Contract-aware step modification. |
| `/superpipelines:delete-step`, "remove/delete a pipeline step" | `deleting-a-pipeline-step` | Safe topology removal and gap analysis. |
| `/superpipelines:audit-steps`, "audit/review pipeline X" | dispatch `pipeline-auditor` | Pipeline bundle compliance review. |
| `/superpipelines:change-models`, "change/reassign pipeline model tiers" | `change-models` | Model preference and tier reassignment. |
| `/superpipelines:optimize-pipeline`, "optimize pipeline X" | `optimizing-a-pipeline` | Cost, latency, and topology optimization. |
| `/superpipelines:migrate-pipeline`, "migrate legacy pipeline" | `migrating-a-pipeline` | Legacy old-root to data-only conversion. |
| Ambiguous Superpipelines request | Ask one clarifying question or use `sk-4d-method` | Avoid loading heavy workflows prematurely. |
| Read-only Q&A about the repo or plugin | Answer directly with file reads/searches | Do not invoke a workflow for explanation-only requests. |
</routing_table>

The router owns global command selection. Workflow skills should only describe their local workflow and may point back here for global routing. Do not duplicate this full table in workflow bodies.

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
