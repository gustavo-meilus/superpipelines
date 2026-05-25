---
name: running-a-pipeline
description: Use when the user asks to run a pipeline, execute a workflow, list available pipelines, or invokes /superpipelines:run-pipeline. Reads all scope registries, lets the user pick a pipeline, then invokes its entry skill.
---

# Running a Pipeline — Execution Workflow

> Registry-driven launcher for named Superpipelines. Trigger when the user asks to execute a workflow, list available pipelines, or invokes `/superpipelines:run-pipeline`.

<overview>
The Running a Pipeline workflow acts as the central orchestrator for pipeline execution. It manages the full lifecycle from discovery across multiple scopes (Local, Project, User) to state-aware resumption and terminal completion. It ensures that execution is always grounded in the current `pipeline-state.json` and that escalation states are preserved for human review.
</overview>

<glossary>
  <term name="Pipeline Registry">A central `registry.json` tracking all pipelines within a scope.</term>
  <term name="Resume Protocol">The logic used to recover a crashed or interrupted run using its persisted state.</term>
  <term name="Escalated State">A non-terminal status indicating that a pipeline reached a boundary requiring human intervention.</term>
</glossary>

## Workflow Phases

<protocol>
### PHASE 0: DISCOVERY & SELECTION
- Resolve all scope roots via `sk-pipeline-paths`.
- Read and merge `registry.json` files from `local`, `project`, and `user` scopes.
- Present available pipelines to the user and capture the selection (`{ROOT}`, `{P}`, `pattern`).

### PHASE 0.25: TIER DETECT & DISPATCH LOAD
- Load `sk-platform-dispatch` via the `Skill` tool.
- Call `DETECT()` → receive `platform_profile` object.
- <HARD-GATE>NEVER perform tier detection more than once per run outside of resume. On resume: re-run DETECT(), compare to `metadata.source_tier`, apply the Cross-Tier Resume Protocol from `sk-platform-dispatch` if tier changed.</HARD-GATE>
- **Fresh run**: Cache `platform_profile` in session context now. During Phase 2 state init, write to state file: `metadata.source_tier = platform_profile.tier`, `metadata.runtime_tier = platform_profile.tier`, `metadata.platform_profile = platform_profile`.
- **Resume run**: Apply Cross-Tier Resume Protocol (defined in `sk-platform-dispatch` § Cross-Tier Resume Protocol). If `runtime_tier` changed: update `metadata.runtime_tier`, `metadata.platform_profile`, append to `metadata.tier_changes`, emit cross-tier advisory.
- **Branch by `platform_profile.capabilities.dispatch_mechanism`** for Phase 3:
  - `native_task` → Phase 3 uses `Task()` dispatch (existing behavior).
  - `native_subagent` / `model_driven` → Phase 3 uses platform-native dispatch (see entry skill).
  - `inline` or unknown → Phase 3 uses Tier 2 Inline Loop from `sk-platform-dispatch`.
- Emit all `platform_profile.degradation_warnings` if non-empty.

### PHASE 0.4 — Model Resolution

- Load `sk-model-resolver` via the `Skill` tool.
- `LOAD_PREFS(workspace_root)` → user + workspace preference objects.
- `DETECT_CATALOG_DRIFT(prefs, platform_profile)` — IF drifted, emit advisory (non-blocking).
- FOR each agent in `topology.json` steps:
  - Read frontmatter.
  - `resolved = RESOLVE(agent, platform_profile, prefs)`.
  - Cache to `state.metadata.resolved_models[step_id]` via atomic write.
  - IF `resolved.warnings` non-empty: append each to run advisory queue.
- Emit user-facing resolution table:
  ```
  Step           Tier    Source           → Model                          Effort
  architect      deep    user_prefs       → claude-opus-4-7                (none)
  implementer    medium  profile_default  → claude-sonnet-4-6              (none)
  formatter      fast    workspace_prefs  → opencode/big-pickle            (none)
  ```
- Persist `metadata.resolved_models`, `metadata.preference_files_consulted`, `metadata.model_tiers_version_at_run` to state file.

<invariant>
Phase 0.4 runs exactly once per fresh run. On resume, IF `metadata.resolved_models` exists AND `metadata.runtime_tier` matches the new `runtime_tier` AND profile `model_tiers_version` unchanged: skip re-resolution. ELSE re-resolve and log a "models re-resolved on resume" entry to `metadata.resolution_events`.
</invariant>

### PHASE 0.45 — Model Migration Check

- Scan all agent files under the pipeline scope.
- FOR each agent with `model:` field AND no `model_tier:` field:
  - Read `plugin_version` from agent frontmatter.
  - IF `plugin_version` absent OR semver `< 2.0.0`: classify as **v1-legacy candidate** (stale schema).
  - ELSE (`plugin_version >= 2.0.0`): classify as **v2 intentional escape hatch**. Skip migration; auditor surfaces as MT-03 SEV-3 informational only.
- IF any v1-legacy candidates found:
  - Load `sk-model-migration` via `Skill` tool. Pass the candidate list.
  - Execute the migration protocol (creates git checkpoint + rewrites frontmatter + commits + stamps `plugin_version` to current).
  - Re-run Phase 0.4 (resolution) against the migrated agents.
- ELSE: skip; proceed to next phase.

<invariant>
The classifier MUST use `plugin_version` to distinguish v1 legacy from v2 intentional escape hatch. NEVER migrate agents that explicitly stamp `plugin_version >= 2.0.0` — those are user-authored escape hatches and migration would clobber intent. Conversely, NEVER skip agents missing `plugin_version` — stamping was introduced in v2.0, so absence is unambiguous v1 evidence.
</invariant>

### PHASE 0.5: VERSION COMPATIBILITY ADVISORY
- Read the pipeline's stamped `plugin_version` from its `registry.json` entry (or from `topology.json` if the registry entry predates version stamping).
- Read the currently installed plugin version from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`.
- **Compare major versions** (semver `MAJOR.minor.patch`):
  - Match → proceed silently.
  - Pipeline major < installed major → emit advisory: `"⚠️ Pipeline '{P}' was scaffolded under plugin v{pipeline_version}; installed plugin is v{installed_version}. Schema or topology conventions may have changed. Review the migration notes before resuming."` and ask the user to confirm continuation.
  - Pipeline major > installed major → emit advisory: `"⚠️ Pipeline '{P}' targets a newer plugin (v{pipeline_version}) than is installed (v{installed_version}). Upgrade recommended; running anyway may fail on unsupported features."` and ask the user to confirm continuation.
  - Missing `plugin_version` on the pipeline (pre-stamping era) → emit informational note only; do not block.
- **Advisory only — never blocks execution.** The user's confirmation is required only on a major mismatch.

### PHASE 0.6: PORTABILITY VALIDATION
- IF `metadata.runtime_tier == metadata.source_tier`: skip silently.
- ELSE:
  - **OC frontmatter check**: IF `metadata.source_tier == "tier_1b"` AND `metadata.runtime_tier != "tier_1b"`:
    - Emit: `"⚠️ Cross-tier incompatibility: pipeline was scaffolded on OpenCode (tier_1b). OC agent files use 'mode: subagent' frontmatter that is not recognized by other tiers. This is a frontmatter incompatibility, not a path problem — the Auto-rewrite below cannot fix it. Re-scaffolding on the current platform is required. Abort recommended."`
    - Offer: `[Abort] [Proceed as advisory (expect dispatch failures)]`
    - **Abort**: Stop. User must re-scaffold on current platform.
    - **Proceed as advisory**: Continue with a note in `metadata.isolation_warning`. Dispatch failures are expected.
  - `source_root` = READ(`skills/sk-platform-dispatch/profiles/{metadata.source_tier}.json`).scope_root.workspace
  - `target_root` = `platform_profile.scope_root.workspace`
  - Scan entry skill content for occurrences of `source_root + "/"` string.
  - IF found:
    - Emit: `"⚠️ Portability defect: entry skill contains '{source_root}/' path(s) that will not resolve on {runtime_tier} ({target_root}/). Options: [Abort] [Auto-rewrite in memory] [Proceed as advisory]"`
    - **Auto-rewrite**: Replace `source_root + "/"` with `target_root + "/"` in entry skill content in-memory only. Do NOT write to disk unless user explicitly requests. Preserves original file for audit.
    - **Abort**: Stop. User must regenerate entry skill with v2.0.0 architect.
    - **Proceed as advisory**: Continue with a note in `metadata.isolation_warning`.
  - IF not found: proceed silently.

### PHASE 1: RESUME CHECK
- Check for existing run directories in `{ROOT}/superpipelines/temp/{P}/`.
- **Logic**: If runs exist, prompt the user to start new or resume.
- <HARD-GATE>NEVER auto-resume an `escalated` or `failed` run. Surface the state path and require explicit user review first.</HARD-GATE>

### PHASE 2: STATE INITIALIZATION
- Generate a new `runId` (format: `{P}-{YYYYMMDD-HHMMSS}`).
- Initialize `pipeline-state.json` using the atomic write protocol (write to `.tmp` then rename).
- **Invariants**: Must include `pipeline_id`, `started_at`, `plugin_version` (read from `.claude-plugin/plugin.json` at init), the selected execution `pattern`, and the platform fields cached in Phase 0.25: `metadata.source_tier`, `metadata.runtime_tier`, `metadata.platform_profile`.

### PHASE 3: ENTRY SKILL DISPATCH
- Invoke the pipeline's entry skill (`run-{P}`).
- **Context Handoff**: Pass absolute paths to the scope root, state file, topology, AND `metadata.runtime_tier` from Phase 0.25. All paths handed to subagents on a non-CC tier MUST be resolved through `sk-pipeline-paths` first; raw `.claude/`-prefixed strings are a portability defect (see PORTABILITY_REWRITE invariant in `sk-platform-dispatch`).
- **Tier branch**: Entry skill MUST call `sk-platform-dispatch` DISPATCH for each step rather than hardcoding `Task()`. Entry skills generated under Tier 1 may keep direct `Task()` calls for backward compatibility, but new entry skills SHOULD route through DISPATCH for tier portability.
- **Responsibility**: The entry skill owns step dispatch, two-stage review (Stage 1 gates Stage 2), and cleanup.

**Model field at dispatch:** Every dispatch path MUST read `state.metadata.resolved_models[step_id]` rather than re-resolving:

- `native_task`: pass `model: resolved.model` as a Task() argument (overrides agent frontmatter).
- `native_subagent`: write `model: resolved.model` (and `reasoningEffort: resolved.effort` if non-null) into the dispatch payload.
- `model_driven` (Codex): rewrite the spawned agent's TOML file with `model = "..."` and `model_reasoning_effort = "..."` lines before dispatching.
- `model_driven` (Antigravity): set orchestrator model only; subagent model selection is owned by Antigravity.
- `inline` (Tier 2): no-op — host IDE controls the model.

### PHASE 4: COMPLETION & CLEANUP
- Read final state from `pipeline-state.json`.
- **Status: `completed`**: Delete the temporary run directory and summarize outputs.
- **Status: `escalated/failed`**: **PRESERVE** the temporary directory and state path for debugging and recovery.
</protocol>

<invariants>
- ALWAYS read from the registry before execution to ensure pipeline validity.
- ALWAYS preserve the temp directory on any status other than `completed`.
- NEVER pass full file content to the entry skill; use absolute paths.
- All state updates must utilize the atomic write pattern.
- ALWAYS perform Phase 0.5 version-compatibility advisory before resume or fresh run; advisory is non-blocking but requires user confirmation on major-version mismatch.
- ALWAYS perform Phase 0.25 tier detection exactly once per fresh run; on resume, re-detect and apply Cross-Tier Resume Protocol if tier changed.
- ALWAYS perform Phase 0.6 portability validation when `runtime_tier != source_tier`; never silently proceed with unvalidated cross-tier paths.
- `metadata.source_tier` is immutable after Phase 2 init. Never overwrite it, even on cross-tier resume.
</invariants>

## Red Flags — STOP
- "The previous run was escalated, but I'll restart it anyway." → **STOP**. Read the state first to avoid repeating the failure.
- "There is no registry, I'll search for artifacts manually." → **STOP**. Direct the user to create a managed pipeline.
- "I'll delete the temp directory to keep the workspace clean." → **STOP**. Deletion on non-completion destroys all recovery findings.

## Rationalization Table

<rationalization_table>
| Excuse | Reality |
| :--- | :--- |
| "I'll resume the escalated run." | Escalation signals a boundary the model cannot cross. Resuming without review wastes tokens. |
| "Registry-only lookup is slow." | Searching without a registry is non-deterministic and risks path leakage. |
| "The entry skill is just a wrapper." | The entry skill is the source of truth for step ordering and review gating. |
</rationalization_table>

## Reference Files
- `sk-pipeline-paths/SKILL.md` — Scope root resolution.
- `sk-pipeline-state/SKILL.md` — State schema and recovery rules.
- `sk-platform-dispatch/SKILL.md` — Tier detection and Tier 2 inline dispatch.
- `sk-write-review-isolation/SKILL.md` — Two-stage review protocol.
- `creating-a-pipeline/SKILL.md` — Pipeline scaffolding.
