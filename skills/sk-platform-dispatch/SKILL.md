---
name: sk-platform-dispatch
description: Resolves the active runtime tier and provides the canonical DISPATCH contract for all pipeline step execution. Use when an orchestrator skill needs to dispatch pipeline steps — performs tier detection, loads the platform profile, and executes the Tier 2 inline loop when no subagent primitive is available.
disable-model-invocation: true
user-invocable: false
---

# Platform Dispatch — Tier Detection & Tier 2 Inline Execution

<overview>
Superpipelines runs across five runtime tiers (Tier 1 Claude Code, Tier 1b OpenCode, Tier 1c Antigravity, Tier 1d Codex, Tier 2 IDE agents). Only Tier 1 has a skill-callable `Task()` primitive. Tier 1b/1c/1d use model-driven or platform-native subagent dispatch outside the skill layer. Tier 2 has no subagent primitive — the orchestrator executes every step inline using its own toolset. This skill encapsulates that branch so orchestrator skills remain tier-agnostic.
</overview>

<glossary>
  <term name="Tier">Runtime execution capability class. Tier 1 = skill-callable parallel subagents; Tier 2 = single-agent inline.</term>
  <term name="DISPATCH">The contract for executing one topology step: input schema, execution mechanism, output schema, status return.</term>
  <term name="Inline Step">A pipeline step executed by the orchestrator itself rather than by a spawned subagent.</term>
</glossary>

## Tier Detection Protocol

<protocol>
DETECT() returns a platform profile object (not a raw tier string).

Detection heuristics run in order — first match wins. **Override:** `SUPERPIPELINES_FORCE_TIER` env var, when set to a known tier id (`tier_1 | tier_1b | tier_1c | tier_1d | tier_2`), bypasses all heuristics. Use when detection picks the wrong tier in a multi-platform workspace.

1. **Tier 1 (Claude Code):** `Task` tool present AND `subagent_type` parameter accepted. Secondary: `CLAUDE_CODE` env var set OR `.claude-plugin/plugin.json` resolvable via `${CLAUDE_PLUGIN_ROOT}`. (Runtime capability is the primary signal; the secondary check is acceptable here because DETECT() runs in the live runtime where the Task primitive can be probed directly.)
2. **Tier 1b (OpenCode):** `$OPENCODE_CONFIG_DIR` env var set OR agent files using `mode: subagent` frontmatter present under the active scope root.
3. **Tier 1c (Antigravity):** `agy` binary on PATH.
4. **Tier 1d (Codex):** `codex` binary on PATH OR `.codex-plugin/plugin.json` resolvable.
5. **Tier 2 (fallback):** None of the above. Safe default — sequential inline execution always works.

After resolving `tier_id`:

```
READ(skills/sk-platform-dispatch/profiles/{tier_id}.json) → profile object
```

Return the full profile object. Caller caches it in `pipeline-state.json` as `metadata.platform_profile` and sets `metadata.runtime_tier = profile.tier`.

### Platform-specific skill-load tool names

When calling skills from within a running-a-pipeline orchestration, use the correct tool name for the current platform:

| Tier | Skill-load tool | Note |
|---|---|---|
| Tier 1 (Claude Code) | `Skill` | `Skill(superpipelines:sk-platform-dispatch)` |
| Tier 1c (Antigravity CLI, plugin installed) | `activate_skill` | `activate_skill(sk-platform-dispatch)` |
| Tier 1b (OpenCode) | `skill` (lowercase) | OC tool naming convention |
| Tier 1d (Codex) / Tier 2 | N/A — no skill tool | Use `running-a-pipeline` INLINE-DETECT() fallback |

**Antigravity CLI (Tier 1c) — installation requirement:** The superpipelines plugin must be installed in AGY's extension registry for `activate_skill` to resolve it. If superpipelines is only installed in Claude Code, `activate_skill` will fail to resolve the skill even though `skill_tool: true` in the profile. In that case, `running-a-pipeline` Phase 0.25 INLINE-DETECT() handles the fallback automatically. This is expected behavior for cross-platform handoff scenarios where not all platforms share a unified plugin registry.

### Profile capability fields

| Field | Purpose |
|---|---|
| `dynamic_subagents` | If true, user picks orchestrator tier only; per-step assignment skipped |
| `model_field_format` | `shorthand` (CC) \| `provider_prefixed` (OC) \| `toml_split` (Codex) \| `omit` (Tier 2, Antigravity) |
| `effort_field_name` | Name of the reasoning-effort key in agent files (null = platform has no effort field) |
| `effort_field_applies_to_providers` | List of provider prefixes for which effort emits (null = all) |
| `effort_emit_map` | Translation table for effort values (Codex `low → minimal`) |
| `subagent_env_override` | Env var that forces all subagents to one model (CC `CLAUDE_CODE_SUBAGENT_MODEL`) |
| `subagent_inherit_target` | What `inherit` resolves to natively (`session`, `primary`, `orchestrator`) |
| `provider_families` | Provider prefixes this platform accepts |
| `model_tiers_version` | ISO date stamp for drift detection |
| `model_tiers[*]` | 4-tier table: `triage`, `fast`, `medium`, `deep` — each with `model`, `effort`, optional `free_tier`, `quota_class` |
</protocol>

<invariant>
Tier detection is performed exactly once per orchestrator invocation. On resume: re-run DETECT() to get `runtime_tier`; compare to `metadata.source_tier`; if different, append to `metadata.tier_changes` and emit cross-tier resume advisory. Re-detection mid-run (outside resume) is forbidden.
</invariant>

## Model Resolution Hook

Before DISPATCH executes any step, callers MUST load `sk-model-resolver` and call `RESOLVE(agent, profile, prefs)` for each topology step. The resolved object is persisted to `pipeline-state.json metadata.resolved_models[step_id]` and consulted by DISPATCH (`native_task` model override; `native_subagent` payload; `toml_split` agent file rewrite; `omit` = no-op).

`running-a-pipeline` Phase 0.45 handles this for run-time execution. `creating-a-pipeline` Phase 4 uses resolution only for the preview table in Phase 5 approval; architect output writes `model_tier:` and never `model:`.

## DISPATCH Contract

<schema>
Inputs to DISPATCH(step, inputs, profile):
- `step.id`             — string, topology node id
- `step.agent`          — string, agent name (= CAD `name`; becomes the materialized `subagent_type`)
- `step.agent_def`      — string, path to the canonical agent def (CAD) RELATIVE to DATA_ROOT
                          (`pipelines/{P}/agents/{agent}.md`). Present for data-only pipelines.
                          Absent for legacy old-root pipelines → no materialization (BC3 fallback).
- `step.protocol_skill` — string, the `{agent-name}-protocol` skill name (LEGACY old-root pipelines only)
- `step.output_paths`   — array of absolute paths the step is expected to produce
- `inputs`              — object, key/value inputs resolved from upstream step outputs
- `profile`             — platform profile object from DETECT()

Returns:
- `{ status: "DONE" | "DONE_WITH_CONCERNS" | "NEEDS_CONTEXT" | "BLOCKED", outputs: [path...], concerns?: string, missing_context?: string, blocker?: string }`
</schema>

## Option A — Materialize-at-Runtime (CAD → native)

Data-only pipelines store each agent as a tool-neutral **canonical agent def (CAD)** under
`DATA_ROOT/pipelines/{P}/agents/{agent}.md` (frontmatter + inline protocol body). Before a
subagent-capable tier dispatches a step, the orchestrator MATERIALIZES that CAD into the
tool's native agent dir as an ephemeral file, dispatches natively, then treats the file as
disposable cache. The CAD is the single source of truth; the native file is regenerated every
run and **never read as source**. Schema + translation table: `pipeline-auditor-references/references/canonical-agent-def.md`.

MATERIALIZE is tier-neutral: it selects the native-agent dir and the translator from the
profile — never from a hardcoded tier string or path (per `DEPENDENCY_INVERSION: PROFILE_DRIVEN`).
Adding a new subagent-capable tier = adding its `extensions.native_agent_dir` + a `TRANSLATE_CAD_TO_*`
branch; no other MATERIALIZE edit.

```
MATERIALIZE(agent_def_path, resolved, profile, P, scope) → subagent_name:
  cad = READ(RESOLVE_DATA_ROOT(scope) + "/" + agent_def_path)   // tool-neutral frontmatter + inline body
  assert cad.schema_version supported            // else BLOCKED: unsupported CAD schema
  // native agent dir is a per-tier fact, sourced from the profile:
  target = RESOLVE_SCOPE_ROOT(scope, profile.tier) + "/" + profile.extensions.native_agent_dir
           + "/" + P + "/" + cad.name + ".md"
  ensure_dir(dirname(target))
  // translator is selected by dispatch_mechanism — NOT by tier string:
  SWITCH profile.capabilities.dispatch_mechanism:
    "native_task"     → frontmatter = TRANSLATE_CAD_TO_CC(cad, resolved)
    "native_subagent" → frontmatter = TRANSLATE_CAD_TO_OC(cad, resolved, profile)
    // model_driven (Codex/Antigravity) materialization tracked separately; not reachable here yet
  // Filesystem isolation degrades on tiers without a worktree primitive (reviewer isolation is
  // unaffected — it is enforced structurally in the translated frontmatter, not by the worktree):
  IF cad.isolation_required == true AND profile.capabilities.worktrees == false
     AND profile.extensions.isolation_unavailable_warning present:
       w = profile.extensions.isolation_unavailable_warning with "{name}" → cad.name
       surface w to the user; append w to metadata.isolation_warning (atomic)
  WRITE(target, frontmatter + "\n\n" + cad.body) // native agent = native frontmatter + inline protocol
  return cad.name                                 // used as subagent_type (CC) / subagent name (OC)
```

**Runtime registration assumption (load-bearing for Option A).** `Task(subagent_type=cad.name)`
resolves the agent file MATERIALIZE just wrote under the workspace/user `.claude/agents/`
directory. Claude Code resolves agent files present on disk under the active scope root at
dispatch time, so a file written earlier in the same session is dispatchable. IF a materialized
`subagent_type` fails to resolve at `Task()` time on a given host, DISPATCH MUST return
`BLOCKED` with: *"Materialized agent '{name}' did not resolve as a subagent_type on this host —
Option A requires same-session agent-file discovery. Verify CC picks up agent files written
under `.claude/agents/superpipelines/{P}/` at dispatch time."* NEVER silently fall back to a
generic subagent (that would drop the structural isolation the CAD encodes).

`TRANSLATE_CAD_TO_CC(cad, resolved)` emits CC YAML per the canonical-agent-def §3 table:

```
name:        cad.name
model_tier:  cad.model_tier          // resolved.model is passed at the Task() call, not the file
maxTurns:    cad.turn_budget
// capability intent → CC enforcement primitive (structural):
IF cad.capabilities.write_files == false:
  tools:           (Read/Glob/Grep + cad.tool_hints.allow ∩ read-class)   // excludes Write/Edit/Bash
  disallowedTools: Write, Edit, Bash
  permissionMode:  plan
ELSE:
  tools:           Read, Write, Edit[, Bash if run_shell][, web tools if network] (+ tool_hints.allow)
  permissionMode:  acceptEdits
IF cad.capabilities.run_shell  == false AND write_files == true: omit Bash from tools
IF cad.isolation_required == true: isolation: worktree
skills:  cad.protocol_skills          // bundle skills, still tier-discovered; omit if empty
```

**Reviewer isolation stays STRUCTURAL.** `capabilities.write_files: false` is the single
canonical source for reviewer write-deny; MATERIALIZE emits real `permissionMode: plan` +
`disallowedTools: Write, Edit, Bash` (and `isolation: worktree` for writers) — enforcement is
structural on `native_task`, not convention. This preserves `WRITE_REVIEW_ISOLATION:
STRUCTURAL_ON_TIER1_1B_1D` under the data-only model.

### OpenCode (Tier 1b) materialization

`TRANSLATE_CAD_TO_OC(cad, resolved, profile)` emits OpenCode `mode: subagent` YAML per the
canonical-agent-def §3 table. Provider-prefixed model + provider-gated `reasoningEffort` come
from the resolved object; the effort key name and the providers it applies to are read from the
profile (never hardcoded):

```
mode:        subagent
name:        cad.name
description: cad.description
model:       resolved.model               // provider-prefixed, e.g. opencode-go/qwen3.6-plus
maxTurns:    cad.turn_budget
// effort is provider-gated — emit only for providers the profile lists:
IF resolved.effort != null
   AND provider_prefix(resolved.model) ∈ profile.capabilities.effort_field_applies_to_providers:
  {profile.capabilities.effort_field_name}: resolved.effort   // e.g. reasoningEffort: high
// capability intent → OC enforcement primitive (structural); emit only the DENY keys:
permission:                               // omit the whole block ONLY if no key denies below;
                                          // a writer (write_files:true) still emits permission
                                          // when run_shell/network deny (e.g. webfetch: deny)
  IF cad.capabilities.write_files == false: edit: deny        // reviewer write-deny (structural)
  IF cad.capabilities.run_shell   == false: bash: deny
  IF cad.capabilities.network     == false: webfetch: deny
tools:  concrete OC tool list from cad.tool_hints.allow (capability-consistent); omit if empty
// isolation_required has NO OC worktree primitive → handled by MATERIALIZE degradation guard
```

**Reviewer isolation stays STRUCTURAL on OC.** `capabilities.write_files: false` emits a real
`permission: { edit: deny }` — the writer cannot mutate tracked source. This is the
`extensions.reviewer_isolation_recipe` for tier_1b and upholds `WRITE_REVIEW_ISOLATION:
STRUCTURAL_ON_TIER1_1B_1D`. OC has no worktree primitive, so a writer's `isolation_required`
degrades to a surfaced warning (filesystem isolation only) — the write/review boundary itself
never degrades to convention on OC.

**Runtime registration assumption (load-bearing for Option A on OC).** A subagent dispatched by
`name` resolves the `mode: subagent` agent file MATERIALIZE wrote under the active scope root's
`agent/superpipelines/{P}/` dir. OpenCode discovers agent files present on disk under the active
scope root at dispatch time. IF a materialized OC subagent fails to resolve by name at dispatch,
DISPATCH MUST return `BLOCKED` with: *"Materialized OC agent '{name}' did not resolve as a
subagent on this host — Option A requires same-session agent-file discovery. Verify OpenCode
picks up agent files written under `.opencode/agent/superpipelines/{P}/` at dispatch time."*
NEVER silently fall back to a generic subagent (that would drop the structural isolation the CAD
encodes).

## Materialized-Cache Cleanup

The materialized native agent dir is disposable cache, owned by DISPATCH:

```
CLEANUP_MATERIALIZED(P, scope):     // called by orchestrator at Phase 4 on `completed`
  profile = metadata.platform_profile          // cached in pipeline-state.json by DETECT()
  // native agent dir + scope-root tier are profile-sourced — same dir MATERIALIZE wrote to:
  delete_dir(RESOLVE_SCOPE_ROOT(scope, profile.tier) + "/" + profile.extensions.native_agent_dir
             + "/" + P + "/")                 // scoped to {P} ONLY
```

- Delete ONLY the `{P}` subdir — never the parent `{native_agent_dir}/` (other pipelines' caches).
- The signature stays 2-arg (`P`, `scope`): every architect-emitted `entry.md` calls it that way;
  the profile is read from cached run state, keeping native dirs portable across tiers.
- On `escalated`/`failed`/`blocked`: leave the dir for debugging; it is regenerated next run regardless.
- DISPATCH ALWAYS re-reads the CAD and re-materializes each run — the cache is never authoritative.

## Tier-Specific DISPATCH Behavior

Skills branch on `profile.capabilities` flags — NOT on `profile.tier` string. This ensures unknown future platforms with familiar capabilities route correctly without skill edits.

```
mechanism = profile.capabilities.dispatch_mechanism
SWITCH mechanism:
  "native_task"     → IF step.agent_def present:                       // data-only pipeline
                        name = MATERIALIZE(step.agent_def, resolved_models[step.id], profile, P, scope)
                        Task(subagent_type=name, model=resolved_models[step.id].model,
                             prompt=build_prompt(step, inputs))
                      ELSE:                                             // BC3: legacy old-root pipeline
                        Task(subagent_type=step.agent, model=resolved_models[step.id].model,
                             prompt=build_prompt(step, inputs))         // agent already registered; no materialize
  "native_subagent" → IF step.agent_def present:                       // data-only pipeline
                        name = MATERIALIZE(step.agent_def, resolved_models[step.id], profile, P, scope)
                        dispatch OC native subagent (mode: subagent) by `name`, passing
                          resolved_models[step.id].model + reasoningEffort (when set) in the payload,
                          prompt=build_prompt(step, inputs)
                        if it fails to resolve by name → BLOCKED per OC registration assumption
                      ELSE: OC native mode:subagent dispatch via step.agent file (legacy)
  "model_driven"    → IF step.agent_def present: BLOCKED — data-only materialization for Codex/Antigravity
                        is not yet implemented (tracked separately). Emit: "Data-only pipelines require
                        Codex TOML / Antigravity materialization from CAD, not yet available on this tier.
                        Run on Claude Code, or scaffold legacy."
                      ELSE: Emit orchestration prompt; Codex model fans out per topology.json (legacy)
  "inline"          → Tier 2 inline loop (see Tier 2 Inline Loop below)   // data-only handled: reads CAD body
  DEFAULT (unknown) → fallback to "inline" + emit:
                      "⚠️ Unknown dispatch_mechanism '{mechanism}'. Falling back to inline execution."
```

<dispatch_tiers>
| `dispatch_mechanism` | Model resolution source | Effort handling | Reviewer isolation source |
|---|---|---|---|
| `native_task` | Resolved model passed in Task() payload (overrides agent frontmatter) | Ignored (CC has no effort field) | `profile.capabilities.reviewer_isolation = structural`; agent `tools:` restricts reviewer |
| `native_subagent` | Resolved model + reasoningEffort written to dispatch payload | Only for `opencode/*` and `opencode-go/*` provider prefixes | `structural`; OC `permission: { edit: deny }` on reviewer agent |
| `model_driven` (Codex) | Resolved model + model_reasoning_effort written to TOML | `effort_emit_map` translates `low → minimal` | `structural`; per-agent `sandbox_mode = "read-only"` on reviewer TOML |
| `model_driven` (Antigravity) | Orchestrator tier only; subagents auto-managed | N/A (no per-subagent control) | `convention` |
| `inline` (Tier 2) | No emission — host IDE selects model | N/A | `convention` |
</dispatch_tiers>

## Tier 2 Inline Loop

<protocol>
The orchestrator (the model running the entry skill) executes every step using its own tools. There is no subagent boundary.

For each step in `topology.json` (dependency order):

1. **Load protocol**: data-only pipeline → `Read(RESOLVE_DATA_ROOT(scope) + "/" + step.agent_def)` and execute the CAD's inline protocol body as data (no subagent boundary on Tier 2). Legacy old-root pipeline (no `agent_def`) → `Skill(step.protocol_skill)`. Either way the agent's full protocol enters the orchestrator's context.
2. **Resolve inputs**: read upstream step outputs from disk using paths recorded in `pipeline-state.json[phases][upstream].outputs`.
3. **Execute inline**: the orchestrator performs the protocol's actions using `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep`. No `Task()` call.
4. **Persist outputs**: write all output files to the paths declared in `step.output_paths`.
5. **Self-verify**: run the protocol's stated verification steps inline. Capture pass/fail.
6. **Update state**: append phase entry to `pipeline-state.json` with `status`, `outputs`, `error` via the atomic write pattern from `sk-pipeline-state`.
7. **Status check**: emit one terminal status per the contract above.
8. **Branch on status**:
   - `DONE` → proceed to next step.
   - `DONE_WITH_CONCERNS` → read concerns; proceed if observational; address inline if correctness/scope.
   - `NEEDS_CONTEXT` → re-execute the step with added context loaded from the named files. Bounded retry: maximum 2 attempts.
   - `BLOCKED` → set `state.status = "escalated"`, preserve temp dir, surface to user with the blocker text, stop the loop.

**Parallel patterns (Pattern 2 / 2b) degrade to sequential on Tier 2.** The dispatch loop processes branch workers one at a time in declared order. A merger step receives all branch outputs only after each branch finishes sequentially.

**Iterative patterns (Pattern 3) execute inline.** The orchestrator runs tester → analyzer → fixer in the same session; cycle limit (3) and architectural-escalation gate from `dispatch-protocols.md` Pattern 3 still apply.

**Spec-Driven (Pattern 5) on Tier 2:** Tasks execute sequentially. Each task's two-stage review runs inline — the orchestrator reads `spec.md`, applies the spec-reviewer protocol, then applies the quality-reviewer protocol. **Reviewer isolation is convention-only.** The orchestrator runs both writer and reviewer protocols with its own full toolset. There is no structural barrier preventing a reviewer from writing. Document this degradation in any user-facing report and treat Tier 2 reviews as advisory, not structurally enforced.
</protocol>

## Per-Tier Scope-Root Resolution

<scope_roots_per_tier>
| Tier | Scope-root fallback chain (first writable wins) |
|------|-------------------------------------------------|
| Tier 1 (CC) | `<workspace>/.claude/` → `~/.claude/` |
| Tier 1b (OC) | `<workspace>/.opencode/` → `~/.opencode/` |
| Tier 1c (Antigravity) | `<workspace>/.agents/` → `~/.antigravity/` |
| Tier 1d (Codex) | `<workspace>/.agents/` → `~/.codex/` |
| Tier 2 (Cursor/Windsurf/Cline) | `<workspace>/.superpipelines/` (universal fallback — created on demand) |
</scope_roots_per_tier>

`sk-pipeline-paths` resolves scope-root by reading `metadata.runtime_tier` from the pipeline state and walking the chain above. For Tier 2, if a pipeline was scaffolded on CC (paths reference `.claude/`), the dispatch layer rewrites `.claude/` → `.superpipelines/` at read/write time so portable artifacts continue to resolve. This rewrite is invertible: state files stamp the original scope-root string for auditability.

<invariant>
Path resolution MUST consult `metadata.runtime_tier` for any artifact write on a non-CC tier. Hardcoded `.claude/` paths in scaffolding output break `ARTIFACT_PORTABILITY: CC_AND_CODEX_TO_TIER2; OC_NOT_PORTABLE`.
</invariant>

<invariant>
PORTABILITY_REWRITE is checked at two levels: (1) creation time — auditor criterion 22, SEV-1, blocking; (2) run time — `running-a-pipeline` Phase 0.6, scans entry skill and offers Abort/Rewrite/Proceed (user-acknowledged advisory, non-blocking). Every caller that reads or writes a CC-scaffolded path on a non-CC tier MUST route the path through `sk-pipeline-paths` (which performs the rewrite) OR call PORTABILITY_REWRITE directly. Direct string concatenation with `.claude/` on a Tier 2 run is a defect. Entry skills emitted by the current architect already comply; legacy entry skills regenerated for portability MUST be re-audited against this rule.
</invariant>

## Degradation Surfacing (Profile-Driven)

Degradation warnings are owned by the profile — not hardcoded in skills. When a profile has non-empty `degradation_warnings`:

```
warnings = profile.degradation_warnings
IF warnings is non-empty:
  1. Emit each warning at run START with "⚠️" prefix (running-a-pipeline Phase 0.25)
  2. Emit each warning at run END in entry skill completion summary
  3. Write join(warnings, "\n") to pipeline-state.json as metadata.isolation_warning
```

Adding or changing a degradation message for any platform requires editing only that tier's JSON profile. No skill edits required.

## Worktree Behavior

<worktree_rules>
| Tier | Worktree |
|------|----------|
| Tier 1 | Per-subagent via `isolation: worktree` agent frontmatter |
| Tier 1b | None (OC does not expose worktree primitive) |
| Tier 1c | Unverified |
| Tier 1d | Per-thread at app level (not per-subagent) |
| Tier 2 | None — orchestrator works in the user's active workspace |
</worktree_rules>

On Tier 2, the orchestrator MUST verify the workspace is clean (no uncommitted changes) before starting a destructive step, and MUST commit between steps to enable rollback. If the workspace is dirty, surface to user and stop.

## Cross-Tier Resume Protocol

Invoked by `running-a-pipeline` Phase 0.25 when resuming an existing run:

```
new_profile = DETECT()
new_tier    = new_profile.tier
prev_tier   = metadata.runtime_tier ?? metadata.tier  // backward compat

IF new_tier != prev_tier:
  append { from: prev_tier, to: new_tier, at: iso8601_now() }
          to metadata.tier_changes (atomic write)
  metadata.runtime_tier     = new_tier
  metadata.platform_profile = new_profile
  metadata.isolation_warning = join(new_profile.degradation_warnings)
  emit: "⚠️ Cross-tier resume: scaffolded on {metadata.source_tier},
         now running on {new_tier}.
         Dispatch adapts to {new_tier} capabilities."
  emit each new_profile.degradation_warning

ELSE:
  proceed silently (no tier change, no log entry)
```

`metadata.source_tier` is NEVER updated on resume. It records where the pipeline was originally scaffolded, permanently.

## Status Protocol Reference

| Worker status | Orchestrator action (any tier) |
|---------------|--------------------------------|
| `DONE` | Proceed to next phase. |
| `DONE_WITH_CONCERNS` | Read concerns. If correctness/scope: address before review. If observational: proceed. |
| `NEEDS_CONTEXT` | Identify missing context; re-dispatch with same model + added context. Max 2 retries on Tier 2. |
| `BLOCKED` | (1) provide more context; (2) higher effort/model (Tier 1 only); (3) decompose; (4) escalate. NEVER retry same approach. |

<invariants>
- NEVER perform tier detection more than once per run; cache result in `metadata.runtime_tier`.
- NEVER call `Task()` when `profile.capabilities.task_primitive` is false — the tool is absent and the call will fail or be ignored.
- NEVER suppress degradation warnings from `profile.degradation_warnings`; surface in every user-facing summary and write to `metadata.isolation_warning`.
- Tier 2 inline execution MUST update `pipeline-state.json` after every step, not at end of run.
</invariants>

## Red Flags — STOP

- "I'll skip tier detection since I know this is Claude Code." → **STOP**. Detection is cheap; profile caching enables resume, portability validation, and cross-tier advisory from any checkpoint.
- "I'll branch on `metadata.tier == 'tier_2'` instead of reading the profile." → **STOP**. Tier string branching breaks when new platforms arrive. Always branch on `profile.capabilities` flags.
- "I'll call `Task()` from the Tier 2 inline loop." → **STOP**. Tier 2 has no `Task()` primitive; the call fails. Use inline `Skill` + own tools.
- "Reviewer ran clean on Tier 2, so the code is verified." → **STOP**. Tier 2 reviewer isolation is convention-only. Surface the degradation to the user; do not promote advisory reviews to structural guarantees.
- "I'll re-detect tier after a tool failure to see if something changed." → **STOP**. Tier is immutable per run. A tool failure is a tool failure, not a tier change.

## Reference Files

- `pipeline-runner-references/references/dispatch-protocols.md` — Tier-specific dispatch shapes.
- `sk-pipeline-state/SKILL.md` — State schema (including `metadata.source_tier` and `metadata.runtime_tier`).
- `sk-pipeline-patterns/SKILL.md` — Pattern definitions referenced by Tier 2 inline loop.
- `running-a-pipeline/SKILL.md` — Loads this skill in Phase 0.25.
