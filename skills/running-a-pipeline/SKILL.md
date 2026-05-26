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
- **Q16 degraded-state preflight** — IF the marker file `${CLAUDE_PLUGIN_ROOT}/.session-hook-degraded` exists, emit:
  > ⚠️ SessionStart hook degraded (Git Bash not found on the previous session start). Auto-loading of `using-superpipelines` routing context was skipped. The plugin still works, but routing decisions may be less precise. To restore: install Git for Windows (Git Bash), then restart this session. To dismiss this advisory for the current session only: `del "%CLAUDE_PLUGIN_ROOT%\.session-hook-degraded"` (Windows) or `rm "${CLAUDE_PLUGIN_ROOT}/.session-hook-degraded"` (Unix).
  
  Do not delete the marker automatically — it is cleared by the next successful SessionStart hook.
- Resolve all scope roots via `sk-pipeline-paths`.
- Read and merge `registry.json` files from `local`, `project`, and `user` scopes.
- Present available pipelines to the user and capture the selection (`{ROOT}`, `{P}`, `pattern`).

### PHASE 0.25: TIER DETECT & DISPATCH LOAD

**Step 1 — Skill-tool probe.** Identify the correct skill-loading tool. The probe distinguishes **three** observable conditions, not two (Q16): tool present and load succeeds, tool present and lookup fails, tool absent.

| Tool present | Action |
|---|---|
| `Skill` tool (Claude Code / Tier 1) | `Skill(superpipelines:sk-platform-dispatch)` → `DETECT()` |
| `activate_skill` tool (Antigravity when plugin installed) | `activate_skill(sk-platform-dispatch)` → `DETECT()` |
| Tool present, lookup fails (e.g., AGY without superpipelines installed in its registry) | Catch `SkillNotFound` / `LookupError`; emit "plugin not registered in this env" advisory; fall through to INLINE-DETECT() |
| Neither / plugin not installed in this environment | Run INLINE-DETECT() — emit advisory first |

**Step 2 — Load or inline-detect:**

- **Skill tool available**: Wrap the load call in try/catch:
  ```
  try:
    profile = Skill(superpipelines:sk-platform-dispatch).DETECT()  // or activate_skill(...)
  catch SkillNotFound | LookupError:
    emit advisory: "⚠️ Skill loader present but sk-platform-dispatch unresolved — superpipelines plugin may not be registered in this environment. Falling back to INLINE-DETECT()."
    profile = INLINE-DETECT()
  ```
  On success: cache `platform_profile` in session context. Proceed normally.
- **No skill tool available**: Emit the following advisory, then run INLINE-DETECT():

  > ⚠️ **PLATFORM ADVISORY:** No skill-load tool detected in this environment (superpipelines plugin may not be installed here). Running INLINE-DETECT() fallback. Phase 0.4 will execute the resolution algorithm inline — preference files will be consulted if readable. If detection looks wrong, set `SUPERPIPELINES_FORCE_TIER=tier_1|tier_1b|tier_1c|tier_1d|tier_2` to override.

  **INLINE-DETECT() heuristics** — first match wins. Each heuristic requires a **runtime-capability signal** (env var or binary on PATH), never a workspace filesystem artifact alone — filesystem artifacts indicate the plugin's presence, not the host's identity.

  0. `SUPERPIPELINES_FORCE_TIER` env var set to a known tier id → use that tier (escape hatch; takes precedence over all heuristics).
  1. `CLAUDE_CODE` env var set → `tier_id = tier_1`. (Q2: dropped the `.claude-plugin/plugin.json readable` fallback — filesystem presence does not imply CC runtime capability.)
  2. `OPENCODE_CONFIG_DIR` env var set → `tier_id = tier_1b`.
  3. `agy` binary on PATH → `tier_id = tier_1c`. (Q2: dropped the `.agents/skills/` workspace-shape fallback — that directory is colonized by both Tier 1c and Tier 1d.)
  4. `codex` binary on PATH OR `.codex-plugin/plugin.json` readable → `tier_id = tier_1d`. (Q2: the manifest fallback is retained here because Codex installs ship the manifest alongside the binary; redundant signal is acceptable when both point to the same platform.)
  5. None matched → `tier_id = tier_2` (safe default; sequential inline execution always works).

  Read `platform_profile` from the embedded snapshot below using `tier_id`:

  ```json
  {
    "tier_1":  {"tier":"tier_1",  "capabilities":{"dispatch_mechanism":"native_task","skill_tool":true,"task_primitive":true,"dynamic_subagents":false},"model_tiers":{"triage":{"model":"claude-haiku-4-5-20251001"},"fast":{"model":"claude-haiku-4-5-20251001"},"medium":{"model":"claude-sonnet-4-6"},"deep":{"model":"claude-opus-4-7"}},"degradation_warnings":[]},
    "tier_1b": {"tier":"tier_1b","capabilities":{"dispatch_mechanism":"native_subagent","skill_tool":true,"task_primitive":false,"dynamic_subagents":false},"model_tiers":{"triage":{"model":"opencode/big-pickle"},"fast":{"model":"opencode-go/deepseek-v4-flash"},"medium":{"model":"opencode-go/qwen3.6-plus"},"deep":{"model":"opencode-go/kimi-k2.6"}},"degradation_warnings":["Parallel fan-out (Pattern 2) degrades to sequential on OpenCode."]},
    "tier_1c": {"tier":"tier_1c","capabilities":{"dispatch_mechanism":"model_driven","skill_tool":true,"skill_tool_name":"activate_skill","task_primitive":false,"dynamic_subagents":true,"model_field_format":"omit"},"model_tiers":{"triage":{"model":"gemini-3.5-flash"},"fast":{"model":"gemini-3.5-flash"},"medium":{"model":"gemini-3.5-pro"},"deep":{"model":"gemini-3.5-pro"}},"degradation_warnings":["Antigravity uses dynamic subagents — per-step model assignment is not supported. Only the orchestrator's model tier is user-configurable. Subagent model selection is owned by Antigravity's orchestrator."]},
    "tier_1d": {"tier":"tier_1d","capabilities":{"dispatch_mechanism":"model_driven","skill_tool":true,"task_primitive":false,"dynamic_subagents":false},"model_tiers":{"triage":{"model":"gpt-5.4-mini"},"fast":{"model":"gpt-5.4-mini"},"medium":{"model":"gpt-5.4"},"deep":{"model":"gpt-5.5"}},"degradation_warnings":[]},
    "tier_2":  {"tier":"tier_2", "capabilities":{"dispatch_mechanism":"inline","skill_tool":true,"task_primitive":false,"dynamic_subagents":false},"model_tiers":{"triage":{"model":"inherit"},"fast":{"model":"inherit"},"medium":{"model":"inherit"},"deep":{"model":"inherit"}},"degradation_warnings":["Reviewer isolation is convention-only; reviews are advisory, not structurally enforced.","Parallel fan-out (Pattern 2) degrades to sequential.","Iterative pattern (Pattern 3) cycle limit still enforced inline.","Model selection is owned by the host IDE; per-step model assignment is not emitted."]}
  }
  ```

  > **Note:** Inline snapshots are maintenance copies only. When the skill tool is available, always prefer the loaded profile — it reflects the authoritative `profiles/{tier_id}.json`.

<HARD-GATE>`platform_profile` MUST be non-null after Phase 0.25. INLINE-DETECT() defaults to `tier_2` if no heuristic matches — it NEVER returns null. Emitting the advisory is mandatory when using the inline path. NEVER proceed to Phase 0.4 without a resolved platform_profile.</HARD-GATE>

- <HARD-GATE>NEVER perform tier detection more than once per run outside of resume. On resume: re-run DETECT() (or INLINE-DETECT()), compare to `metadata.source_tier`, apply the Cross-Tier Resume Protocol from `sk-platform-dispatch` if tier changed.</HARD-GATE>
- **Fresh run**: Cache `platform_profile` in session context now. During Phase 2 state init, write to state file: `metadata.source_tier = platform_profile.tier`, `metadata.runtime_tier = platform_profile.tier`, `metadata.platform_profile = platform_profile`.
- **Resume run**: Apply Cross-Tier Resume Protocol (defined in `sk-platform-dispatch` § Cross-Tier Resume Protocol). If `runtime_tier` changed: update `metadata.runtime_tier`, `metadata.platform_profile`, append to `metadata.tier_changes`, emit cross-tier advisory.
- **Branch by `platform_profile.capabilities.dispatch_mechanism`** for Phase 3:
  - `native_task` → Phase 3 uses `Task()` dispatch (existing behavior).
  - `native_subagent` / `model_driven` → Phase 3 uses platform-native dispatch (see entry skill).
  - `inline` or unknown → Phase 3 uses Tier 2 Inline Loop from `sk-platform-dispatch`.
- Emit all `platform_profile.degradation_warnings` if non-empty.

### PHASE 0.4 — Model Resolution

> Algorithm: `skills/sk-model-resolver/references/resolution-algorithm.md` (normative source — both paths below are adapters of that spec).

**Full Path (Skill tool available):**

- Load `sk-model-resolver` via the `Skill` tool.
- `LOAD_PREFS(workspace_root)` → `{ user, workspace, hashes }`. Stamp `hashes` to `metadata.preference_files_consulted` at the persist step below; resume reads it back to detect pref-file drift (see Q1 invariant after this block).
- `DETECT_CATALOG_DRIFT(prefs, platform_profile)` — IF drifted, emit advisory (non-blocking).
- `entries = []`
- FOR each agent in `topology.json` steps (no exceptions — iterate every node):
  - Read frontmatter from the agent's `agent` path in topology.
  - `resolved = RESOLVE(agent_frontmatter, platform_profile, prefs)`.
  - Cache to `state.metadata.resolved_models[step_id]` via atomic write.
  - Append `{ step_id, agent_name: agent.name, model_tier: agent.model_tier ?? "fast", resolved }` to `entries`.
  - Append every entry of `resolved.warnings` to the run advisory queue.
- Print `RENDER_RESOLUTION_TABLE(entries[])` verbatim.
- Persist `metadata.resolved_models`, `metadata.preference_files_consulted`, `metadata.model_tiers_version_at_run` to state file.

<HARD-GATE>Print `RENDER_RESOLUTION_TABLE(entries[])` verbatim. Never substitute a hand-crafted table. `RENDER_RESOLUTION_TABLE` is the format authority (ADR-0001). Do NOT reformat, rename, or paraphrase the `source` enum, model string, or warning footnotes — those are contracts with `sk-model-resolver`.</HARD-GATE>

**Inline Path (Skill tool unavailable — INLINE-DETECT() was used):**

> Executing all algorithm branches inline. `LOAD_PREFS` is independent of Skill-tool availability (ADR-0002) — attempt file read; degrade gracefully only on failure.

```
LOAD_PREFS(workspace_root):
  user_path      = expand("~/.superpipelines/model-preferences.json")
  workspace_path = {workspace_root}/.superpipelines/model-preferences.json
  Attempt read: workspace_path → workspace pref (degrade to { platforms: {} } on failure)
  Attempt read: user_path      → user pref      (degrade to { platforms: {} } on failure)
  hashes = {
    user_path:       user_path,
    user_hash:       "sha256:" + sha256_hex(read_bytes(user_path))      OR null if read failed,
    workspace_path:  workspace_path,
    workspace_hash:  "sha256:" + sha256_hex(read_bytes(workspace_path)) OR null if read failed
  }
  prefs = { workspace: <result or empty>, user: <result or empty>, hashes: hashes }
```

- `DETECT_CATALOG_DRIFT(prefs, platform_profile)` — IF drifted, emit advisory (non-blocking).
- `entries = []`
- FOR each agent in `topology.json` steps (no exceptions — iterate every node):
  - Read agent frontmatter from the agent file path recorded in topology.
  - Execute `RESOLVE(agent_frontmatter, platform_profile, prefs)` — **full algorithm, all branches** (including Step 4 dynamic_subagents gate and Step 5 model_field_format:omit gate).
  - Cache `resolved` to `state.metadata.resolved_models[step_id]` via atomic write.
  - Append `{ step_id, agent_name: agent.name, model_tier: agent.model_tier ?? "fast", resolved }` to `entries`.
  - Append every entry of `resolved.warnings` to run advisory queue.
- Print `RENDER_RESOLUTION_TABLE(entries[])` verbatim.
- IF both `prefs.workspace.platforms` and `prefs.user.platforms` are empty (both reads failed or files absent):
  - Emit: `"⚠️ [inline-resolution] Preference files not found or unreadable — resolutions fell to profile_default or host_inherit. Re-run from a platform with Skill-tool support to verify preferences."`
- Persist `metadata.resolved_models`, `metadata.preference_files_consulted` (from `prefs.hashes`), and `metadata.model_tiers_version_at_run` to state file.

<HARD-GATE>Print `RENDER_RESOLUTION_TABLE(entries[])` verbatim on both paths. NEVER skip the table or state-file persistence regardless of which path was taken. A missing table or missing `resolved_models` write is a phase-skip defect.</HARD-GATE>

<invariant>
Phase 0.4 runs exactly once per fresh run. On resume, IF `metadata.resolved_models` exists AND `metadata.runtime_tier` matches the new `runtime_tier` AND profile `model_tiers_version` unchanged: skip re-resolution. ELSE re-resolve and log a "models re-resolved on resume" entry to `metadata.resolution_events`.
</invariant>

<invariant>
**Pref-file drift advisory on resume (Q1).** Independent of the re-resolution decision above, on every resume the orchestrator MUST recompute pref-file hashes by calling `LOAD_PREFS(workspace_root)` and comparing the returned `hashes` to `metadata.preference_files_consulted`. IF `user_hash` or `workspace_hash` diverges from the stamped value: emit a non-blocking advisory:

> ⚠️ Pref files changed since run start (user / workspace / both — name the divergent one). The stamped resolved models from `metadata.resolved_models` will be used. To pick up your edits, start a fresh run.

The stamped models remain authoritative for the life of the run. NEVER re-resolve mid-run based on hash divergence — mid-run model swaps are a correctness regression (partial state contamination). The advisory is the user's signal to start a fresh run if they want the new prefs to take effect.
</invariant>

<invariant>
RESOLVE MUST be called once per agent — never per pipeline. The orchestrator MUST NOT summarize multiple agents into a single resolver call or infer one agent's `source` from another's. Inconsistent Source values across agents in the same pipeline are evidence of skipped iterations.
</invariant>

### PHASE 0.45 — Model Migration Check

- Scan all agent files under the pipeline scope.
- FOR each agent with `model:` field AND no `model_tier:` field:
  - Read `plugin_version` from agent frontmatter.
  - IF `plugin_version` absent OR semver `< 2.0.0`: classify as **v1-legacy candidate** (stale schema).
  - ELSE (`plugin_version >= 2.0.0`): classify as **v2 intentional escape hatch**. Skip migration; auditor surfaces as MT-03 SEV-3 informational only.
- IF any v1-legacy candidates found:
  - **If skill tool available**:
    <HARD-GATE>MUST load `sk-model-migration` via the Skill tool and execute the migration protocol. NEVER classify migration as "optional", "deferred", "informational", or "user discretion". The presence of a v1-legacy candidate is unambiguous evidence of schema drift that breaks dispatch metadata, audit reporting, and tier resolution provenance. The only legitimate skip path is the `plugin_version >= 2.0.0` classifier above.</HARD-GATE>
    - Pass the candidate list to `sk-model-migration`.
    - The migration protocol (creates git checkpoint + rewrites frontmatter + commits + stamps `plugin_version` to current) is non-interactive past the dirty-tree confirmation; do not insert additional prompts.
    - Re-run Phase 0.4 (resolution) against the migrated agents.
  - **ELSE — INLINE-DETECT() was used (skill tool unavailable)**:
    <HARD-GATE>MUST emit the following and STOP — do NOT proceed to Phase 0.5 or any later phase:
    `"❌ MIGRATION REQUIRED — CANNOT PROCEED: {N} v1-legacy agent(s) found in pipeline '{P}'. Migration requires sk-model-migration (Skill tool not available in this environment). Re-run /superpipelines:run-pipeline from Claude Code to complete migration before executing this pipeline on this platform."`
    Do NOT rationalize continuing with un-migrated agents. The resolver source, warnings, and state-file resolved_models[step_id] cannot be trusted while v1 schema is present.</HARD-GATE>
- ELSE: skip silently; proceed to next phase.

<invariant>
The classifier MUST use `plugin_version` to distinguish v1 legacy from v2 intentional escape hatch. NEVER migrate agents that explicitly stamp `plugin_version >= 2.0.0` — those are user-authored escape hatches and migration would clobber intent. Conversely, NEVER skip agents missing `plugin_version` — stamping was introduced in v2.0, so absence is unambiguous v1 evidence.
</invariant>

<invariant>
Once v1-legacy candidates are identified, migration is mandatory before dispatch. The orchestrator MUST NOT proceed to Phase 0.5 with un-migrated v1-legacy agents in scope. Rationalizing the migration as "optional" because agents "still function" is a known failure mode — the resolver's `source`, `warnings`, and state-file `resolved_models[step_id]` cannot be trusted while v1 schema is present.
</invariant>

### PHASE 0.5: VERSION COMPATIBILITY ADVISORY

> **Scope clarifier:** Phase 0.5 inspects the **pipeline-level** `plugin_version` (stamped on `registry.json` or `topology.json` at scaffold time). It does NOT inspect agent-level `plugin_version` — that is owned by Phase 0.45. Phase 0.5 output MUST NOT reference agent migration state; Phase 0.45 output MUST NOT reference pipeline-version state. Mixing the two scopes in a single advisory line is a known failure mode.

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
- **Valid run directory criteria**: name matches `{P}-{YYYYMMDD-HHMMSS}` AND contains `pipeline-state.json`.
  - Directories whose names begin with `edit-` are atomic-staging artifacts from `adding-a-pipeline-step` / `deleting-a-pipeline-step` mutations — **EXCLUDE** them from the resume list.
  - Directories without `pipeline-state.json` are incomplete or foreign — **EXCLUDE** them.
- **Logic**: If valid runs exist, prompt the user to start new or resume.
- <HARD-GATE>NEVER auto-resume an `escalated` or `failed` run. Surface the state path and require explicit user review first.</HARD-GATE>

### PHASE 2: STATE INITIALIZATION
- Generate a new `runId` (format: `{P}-{YYYYMMDD-HHMMSS}`).
- Initialize `pipeline-state.json` using the atomic write protocol (write to `.tmp` then rename).
- **Invariants**: Must include `pipeline_id`, `started_at`, `plugin_version` (read from `<workspace>/{platform_profile.extensions.version_manifest_path}` at init — Q12 per-tier manifest, not hardcoded to CC's path), `scope_root_dir` (the directory NAME from `platform_profile.scope_root.workspace`, not an absolute path — Q12 portability), the selected execution `pattern`, and the platform fields cached in Phase 0.25: `metadata.source_tier`, `metadata.runtime_tier`, `metadata.platform_profile`.

### PHASE 3: ENTRY SKILL DISPATCH

<HARD-GATE>Entry-skill inputs (e.g., `$TOPIC`, `$LANGUAGE`, free-form prompts that the entry skill declares in its body) MUST NOT be collected before Phase 3. The orchestrator MUST complete Phases 0, 0.25, 0.4, 0.45, 0.5, 0.6, 1, and 2 in that order before reading any entry-skill `## 1. Initialization`-style requirements. Premature input collection (e.g., asking for a topic between 0.25 and 0.4) is a phase-ordering violation — it commits the user to inputs on un-migrated, un-resolved, or portability-defective state. The only inputs collected pre-Phase-3 are (a) pipeline selection (Phase 0) and (b) confirmations explicitly required by Phases 0.5/0.6 advisories.</HARD-GATE>

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
- Phase ordering is total: 0 → 0.25 → 0.4 → 0.45 → 0.5 → 0.6 → 1 → 2 → 3 → 4. Entry-skill payload assembly (including user-input prompts declared in the entry skill body) happens exclusively inside Phase 3. Pre-collecting Phase 3 inputs during Phase 0 selection is a known rationalization ("the user is already here, batch the prompts") that violates the ordering contract.
</invariants>

## Red Flags — STOP
- "The previous run was escalated, but I'll restart it anyway." → **STOP**. Read the state first to avoid repeating the failure.
- "There is no registry, I'll search for artifacts manually." → **STOP**. Direct the user to create a managed pipeline.
- "I'll delete the temp directory to keep the workspace clean." → **STOP**. Deletion on non-completion destroys all recovery findings.
- "v1-legacy agents still work, so migration is optional." → **STOP**. Phase 0.45 HARD-GATE: migration is mandatory once v1 candidates are classified. The only valid skip is `plugin_version >= 2.0.0`.
- "I'll hand-craft the resolution table instead of calling RENDER_RESOLUTION_TABLE." → **STOP**. Phase 0.4 HARD-GATE: `RENDER_RESOLUTION_TABLE` is the format authority. Hand-crafted tables drift from the resolver contract.
- "The inline path skips LOAD_PREFS because the Skill tool is absent." → **STOP**. ADR-0002: pref-file read is independent of Skill-tool availability. Always attempt LOAD_PREFS; degrade only on file-read failure.
- "The user already typed `Run X`, I'll batch the topic prompt now." → **STOP**. Phase 3 HARD-GATE: entry-skill inputs are collected during Phase 3, not before. Pre-collection commits the user to inputs on un-validated state.

## Rationalization Table

<rationalization_table>
| Excuse | Reality |
| :--- | :--- |
| "I'll resume the escalated run." | Escalation signals a boundary the model cannot cross. Resuming without review wastes tokens. |
| "Registry-only lookup is slow." | Searching without a registry is non-deterministic and risks path leakage. |
| "The entry skill is just a wrapper." | The entry skill is the source of truth for step ordering and review gating. |
| "Agents still function with model: sonnet, migration is non-urgent." | Phase 0.45's existence is the urgency signal. v1 schema breaks resolver provenance for the rest of the run. |
| "I'll format the table myself — RENDER_RESOLUTION_TABLE is just a suggestion." | `RENDER_RESOLUTION_TABLE` is the format authority. Hand-crafted tables drift from the resolver contract and trigger auditor PR-05. |
| "The inline path can't check prefs — the Skill tool is absent." | Pref-file read is independent of Skill-tool availability (ADR-0002). Always attempt LOAD_PREFS; skip only on file-read failure. |
| "Collecting topic up-front shortens the perceived wait." | Phase ordering exists to prevent input commitment on un-migrated / un-validated state. UX optimization is the wrong axis. |
</rationalization_table>

## Reference Files
- `sk-pipeline-paths/SKILL.md` — Scope root resolution.
- `sk-pipeline-state/SKILL.md` — State schema and recovery rules.
- `sk-platform-dispatch/SKILL.md` — Tier detection and Tier 2 inline dispatch.
- `sk-write-review-isolation/SKILL.md` — Two-stage review protocol.
- `creating-a-pipeline/SKILL.md` — Pipeline scaffolding.
