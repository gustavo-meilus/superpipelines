# Cross-Platform Model Resolver — Design Spec

> Target release: **v2.0.0** on branch `feat/multi-platform-impl`. Decouples agent-author intent (model tier role) from runtime model ID, enables seamless cross-platform model switching (CC ↔ OC ↔ Codex ↔ Antigravity ↔ Tier 2), and gives users 4-tier (`triage|fast|medium|deep`) control with an orthogonal effort axis. Replaces the v1.x 2-tier (`fast|deep`) profile-only system.

- **Status:** Approved design, pre-implementation
- **Author / Date:** 2026-05-24
- **Branch:** `feat/multi-platform-impl`
- **Supersedes:** `MODEL_SELECTION: DYNAMIC_DEFAULT_SONNET` invariant (CLAUDE.md), Phase 2 model-tier prompt in `creating-a-pipeline`, `model:` baked-in frontmatter in `pipeline-architect-protocol`, single-scope-root scan in `change-models`.

---

## 1. Problem Statement

### 1.1 The original gap

Superpipelines v1.x baked concrete model IDs (e.g. `model: claude-sonnet-4-6`) into agent frontmatter at scaffold time, resolved from a 2-tier (`fast|deep`) profile lookup. This fails in three ways:

1. **Cross-family resume is broken.** Scaffolding on Claude Code and resuming on Codex leaves agents declaring `model: claude-sonnet-4-6` while the runtime expects `gpt-5.4-mini`. The Cross-Tier Resume Protocol updates `metadata.platform_profile` in state but never rewrites agent frontmatter.
2. **CC ↔ OC works by coincidence only.** Identical Claude model IDs in both profiles make the seam invisible — until a user prefers different models per platform (e.g. `opencode/gpt-5.1-codex` for triage on OC).
3. **No user control.** Profile JSONs are the only source of truth. A user on a Pro Max subscription wanting Opus-everywhere, or a cost-sensitive user wanting Haiku-everywhere, has no override path short of editing plugin internals.

### 1.2 Secondary defects identified during analysis

- `pipeline-architect-references/references/agent-frontmatter-schema.md:13` declares `model: sonnet # SONNET_ONLY default` — contradicts the profile-driven invariant.
- Same file line 14 declares an `effort: low|medium|high|xhigh|max` field that is unwired and platform-incorrect (Codex uses `model_reasoning_effort`; CC has no native effort field).
- `pipeline-architect-protocol/SKILL.md:73` hardcodes `Default to model: sonnet`, bypassing profile resolution.
- `change-models` Phase 2 scans only `<workspace>/.claude/agents/superpipelines/**` — breaks on OC, Codex, Tier 2.
- Tier 2 profile declares `model_tiers: { fast: "inherit", deep: "inherit" }` but no logic consumes the `inherit` sentinel. Agents scaffolded on Tier 2 would emit literal `model: inherit` (defect) or skip the field with no documented contract.

### 1.3 Constraints discovered from official platform docs (May 2026)

| Platform | Model field | Effort field | Native inheritance | Subagent assignment |
|---|---|---|---|---|
| CC (tier_1) | `model: sonnet\|opus\|haiku\|<id>\|inherit` (default `inherit`) | None | `inherit` keyword | Per-agent file + env `CLAUDE_CODE_SUBAGENT_MODEL` |
| OC (tier_1b) | `model: provider/model-id` — three provider families: `anthropic/*` (direct API), `opencode-go/*` (Go subscription, quota-based), `opencode/*` (Zen, mix of paid + free) | Provider pass-through `reasoningEffort: high` (OpenAI-family); ignored on Anthropic-family | Subagent inherits invoking primary | Per-agent file |
| Codex (tier_1d) | TOML `model = "..."` | TOML `model_reasoning_effort = "minimal\|low\|medium\|high"` | Both inherit from parent session | Per-agent TOML |
| Antigravity 2.0 (tier_1c) | Default Gemini 3.5 Flash; dynamic subagents | Not exposed | Orchestrator-controlled | **User cannot pre-assign subagent models** |
| Tier 2 (Cursor/Windsurf/Cline) | Host-chosen | Host-controlled | All host | None — no agent files |

Sources:
- https://code.claude.com/docs/en/sub-agents
- https://opencode.ai/docs/agents/
- https://developers.openai.com/codex/subagents
- https://antigravity.google/docs/subagents (HTTP 200 but body-empty in v2.0; supplemented by https://deepwiki.com/google-antigravity/antigravity-sdk-python/8.2-subagents-and-multi-agent-patterns and https://www.marktechpost.com/2026/05/19/google-launches-antigravity-2-0-at-i-o-2026-...)

Industry pattern (LangGraph, CrewAI, OpenAI Agents SDK): model tiering reduces cost 40–60% vs single-premium-model deployments.

---

## 2. Goals & Non-Goals

### 2.1 Goals

- **G1.** Every agent declares a *role* (`model_tier`), not a *model ID*. Resolution to concrete model happens at runtime.
- **G2.** User configures one 4-tier mapping per platform; preferences override profile defaults.
- **G3.** Cross-tier resume (CC → OC, CC → Codex, etc.) automatically re-resolves models with zero manual intervention.
- **G4.** Effort/reasoning is a separate orthogonal axis, emitted only on platforms whose profile declares an effort field.
- **G5.** Antigravity dynamic-subagent reality is honored: user picks orchestrator tier only; subagent assignment skipped.
- **G6.** Platform model catalog changes (new models released) surface as advisory on next run via stamped versioning.
- **G7.** Existing pre-v2.0 scaffolded pipelines auto-migrate to the new schema on first run after upgrade with a git-backed safety net.
- **G8.** Auditor enforces source-of-truth: no hardcoded model IDs outside profile JSONs.

### 2.2 Non-Goals

- Live web fetch of provider catalogs (rejected — stamped-version reconciliation chosen instead).
- Per-pipeline preference overrides (only user-global and workspace scopes in v2.0).
- Automated cross-platform parity tests (deferred per `PARITY_TESTING: MANUAL_PHASE1`).
- Multi-region model selection (Bedrock us-east vs eu-west).
- Cost tracking, budget enforcement.

---

## 3. Architecture

### 3.1 Five-layer resolution (top wins)

```
1. Agent frontmatter explicit `model:` override   (escape hatch)
2. Workspace preferences                          (<ws>/.superpipelines/model-preferences.json)
3. User-global preferences                        (~/.superpipelines/model-preferences.json)
4. Platform profile defaults                      (skills/sk-platform-dispatch/profiles/{tier}.json)
5. Native inherit                                 (omit `model:` field; host picks)
```

### 3.2 Tier taxonomy

| Tier | Purpose | Class |
|---|---|---|
| `triage` | Routers, classifiers, simple decisions | Haiku-class / GPT-mini-class |
| `fast` | Execution, utility, code generation workhorse-cheap | Haiku / Sonnet-class |
| `medium` | Standard coding workhorse | Sonnet-class / GPT-class |
| `deep` | Planning, architecture, review | Opus-class / GPT-pro-class |
| `inherit` | Host-controlled (Tier 2 default, dynamic subagents) | Whatever the host runs |

### 3.3 Effort axis (orthogonal)

`effort_tier: low | medium | high`. Emitted only when `profile.capabilities.effort_field_name != null`. Otherwise silently ignored at emit time (auditor surfaces as SEV-3 info).

---

## 4. Schemas

### 4.1 Agent frontmatter (cross-platform portable)

```yaml
---
name: my-agent
description: ...
model_tier: medium                # role; runtime-resolved
effort_tier: medium               # optional; orthogonal axis
# model: <id>                     # MAY be added manually as escape hatch — wins over tier
plugin_version: 2.0.0
---
```

**Architect output (Phase 4 of `creating-a-pipeline`):** writes `model_tier:` and optionally `effort_tier:`. **Never writes `model:`.**

### 4.2 Platform profile JSON

**tier_1 (Claude Code) example:**

```json
{
  "tier": "tier_1",
  "name": "Claude Code",
  "profile_version": "2.0.0",
  "model_tiers_version": "2026-05-19",
  "capabilities": {
    "subagents": true,
    "parallel_subagents": true,
    "task_primitive": true,
    "skill_tool": true,
    "worktrees": true,
    "reviewer_isolation": "structural",
    "dispatch_mechanism": "native_task",
    "dynamic_subagents": false,
    "model_field_format": "shorthand",
    "effort_field_name": null,
    "subagent_env_override": "CLAUDE_CODE_SUBAGENT_MODEL",
    "subagent_inherit_target": "session"
  },
  "scope_root": { "workspace": ".claude", "user": "~/.claude" },
  "degradation_warnings": [],
  "extensions": {},
  "model_tiers": {
    "triage": { "model": "claude-haiku-4-5-20251001", "effort": "low" },
    "fast":   { "model": "claude-haiku-4-5-20251001", "effort": "medium" },
    "medium": { "model": "claude-sonnet-4-6",         "effort": "medium" },
    "deep":   { "model": "claude-opus-4-7",           "effort": "high" }
  }
}
```

**tier_1b (OpenCode) example** — defaults favor OC's own provider families (Zen free for triage, Go subscription for the rest), since most OC users sign up for the Go plan ($5 first month, $10/mo) and get large per-model quotas. Users on a different setup (Anthropic API key, Bedrock, Vertex) override via preferences. Sources: https://opencode.ai/docs/go/, https://opencode.ai/docs/zen/.

```json
{
  "tier": "tier_1b",
  "name": "OpenCode",
  "profile_version": "2.0.0",
  "model_tiers_version": "2026-05-19",
  "capabilities": {
    "subagents": true,
    "parallel_subagents": false,
    "task_primitive": false,
    "skill_tool": true,
    "worktrees": false,
    "reviewer_isolation": "structural",
    "dispatch_mechanism": "native_subagent",
    "dynamic_subagents": false,
    "model_field_format": "provider_prefixed",
    "effort_field_name": "reasoningEffort",
    "effort_field_applies_to_providers": ["opencode", "opencode-go"],
    "subagent_env_override": null,
    "subagent_inherit_target": "primary",
    "provider_families": ["anthropic", "opencode-go", "opencode"]
  },
  "scope_root": { "workspace": ".opencode", "user": "~/.opencode" },
  "degradation_warnings": [
    "Parallel fan-out (Pattern 2) degrades to sequential on OpenCode."
  ],
  "extensions": {},
  "model_tiers": {
    "triage": { "model": "opencode/big-pickle",            "effort": "low",    "free_tier": true,  "quota_class": "free-unlimited" },
    "fast":   { "model": "opencode-go/deepseek-v4-flash",  "effort": "medium", "free_tier": false, "quota_class": "go-high" },
    "medium": { "model": "opencode-go/qwen3.6-plus",       "effort": "medium", "free_tier": false, "quota_class": "go-medium" },
    "deep":   { "model": "opencode-go/kimi-k2.6",          "effort": "high",   "free_tier": false, "quota_class": "go-low" }
  }
}
```

Optional per-tier metadata fields (informational, surfaced by wizard + auditor):
- `free_tier: bool` — model has no per-request cost.
- `quota_class: enum` — coarse capacity bucket (`free-unlimited`, `go-high`, `go-medium`, `go-low`, `paid-metered`). Used by wizard to warn before assigning a low-quota model to a high-frequency tier.

Per-tier `model_field_format` values:

| Value | Platform | Emit |
|---|---|---|
| `shorthand` | CC | `model: sonnet` or full ID |
| `provider_prefixed` | OC | `model: anthropic/claude-sonnet-4-6` |
| `toml_split` | Codex | `model = "gpt-5.4"` + `model_reasoning_effort = "high"` |
| `omit` | Tier 2, Antigravity dynamic subagents | field absent; host picks |

Per-profile flags new in v2.0:

- `dynamic_subagents: bool` — if true, resolver skips per-step assignment; user picks orchestrator tier only.
- `model_field_format: enum` — drives `EMIT()`.
- `effort_field_name: string | null` — emit key for effort, or `null` to skip.
- `subagent_env_override: string | null` — env var that forces all subagents to one model (CC `CLAUDE_CODE_SUBAGENT_MODEL`).
- `subagent_inherit_target: "session" | "primary" | null` — what `inherit` resolves to natively on this platform.
- `model_tiers_version: ISO date` — drift-detection stamp.

### 4.3 User-global preferences

Location: `~/.superpipelines/model-preferences.json`

```json
{
  "schema_version": "1.0",
  "platforms": {
    "tier_1": {
      "model_tiers_version_acked": "2026-05-19",
      "tiers": {
        "triage": "claude-haiku-4-5-20251001",
        "fast":   "claude-haiku-4-5-20251001",
        "medium": "claude-sonnet-4-6",
        "deep":   "claude-opus-4-7"
      },
      "effort_default": {
        "triage": "low", "fast": "medium", "medium": "medium", "deep": "high"
      }
    },
    "tier_1b": {
      "model_tiers_version_acked": "2026-05-19",
      "tiers": {
        "triage": "opencode/big-pickle",
        "fast":   "opencode-go/deepseek-v4-flash",
        "medium": "opencode-go/qwen3.6-plus",
        "deep":   "opencode-go/kimi-k2.6"
      }
    },
    "tier_1d": {
      "model_tiers_version_acked": "2026-05-19",
      "tiers": {
        "triage": "gpt-5.4-mini",
        "fast":   "gpt-5.4-mini",
        "medium": "gpt-5.4",
        "deep":   "gpt-5.5"
      },
      "effort_default": {
        "triage": "low", "fast": "low", "medium": "medium", "deep": "high"
      }
    }
  }
}
```

### 4.4 Workspace preferences

Location: `<workspace>/.superpipelines/model-preferences.json`. Identical schema; partial — declares only overrides. Resolver deep-merges workspace > user > profile.

### 4.5 State file additions (`pipeline-state.json` → `metadata`)

```json
{
  "resolved_models": {
    "<step_id>": {
      "tier": "deep",
      "model": "claude-opus-4-7",
      "effort": "high",
      "source": "user_prefs"
    }
  },
  "preference_files_consulted": [
    "~/.superpipelines/model-preferences.json",
    "<workspace>/.superpipelines/model-preferences.json"
  ],
  "model_tiers_version_at_run": "2026-05-19"
}
```

---

## 5. `sk-model-resolver` Skill

**Location:** `skills/sk-model-resolver/SKILL.md`
**Flags:** `disable-model-invocation: true`, `user-invocable: false`
**Loaded by:** `running-a-pipeline` Phase 0.4 (new), `creating-a-pipeline` Phase 4 (preview only), `change-models` Phase 1, `pipeline-architect-protocol` (resolution helpers only).

### 5.1 Public API

```
RESOLVE(agent_frontmatter, profile, prefs) → resolved
  resolved = {
    model: string | null,
    effort: string | null,
    effort_field_name: string | null,
    model_field_format: enum,
    source: "frontmatter_override" | "workspace_prefs" | "user_prefs"
          | "profile_default" | "host_inherit",
    warnings: [string]
  }

LOAD_PREFS(workspace_root) → { workspace, user, merged }

EMIT(resolved, target_format) → string

REVERSE_MAP(concrete_model, profile) → tier_id | null

DETECT_CATALOG_DRIFT(prefs, profile) → { drifted: bool, message: string | null }
```

### 5.2 Resolution algorithm

```
1. IF agent.model is present (explicit) → return {
       model: agent.model, source: "frontmatter_override",
       warnings: ["Explicit model override bypasses tier resolution"]
   }
2. tier   = agent.model_tier   ?? "fast"
3. effort = agent.effort_tier  ?? null
4. IF profile.capabilities.dynamic_subagents == true AND agent.role != "orchestrator":
       return { model: null, source: "host_inherit",
                warnings: ["Dynamic-subagent platform — host orchestrator picks model"] }
5. IF tier == "inherit" OR profile.capabilities.model_field_format == "omit":
       return {
         model: null, source: "host_inherit",
         warnings: [ "Model resolves to host "
                   + (profile.capabilities.subagent_inherit_target ?? "session")
                   + " — no per-step model emitted." ]
       }
6. model = workspace_prefs.platforms[profile.tier].tiers[tier]
        || user_prefs.platforms[profile.tier].tiers[tier]
        || profile.model_tiers[tier].model
   source = corresponding layer
7. IF effort is null:
       effort = (workspace || user).effort_default[tier]
             || profile.model_tiers[tier].effort
8. IF profile.capabilities.effort_field_name == null:
       effort = null
8b. ELSE IF profile.capabilities.effort_field_applies_to_providers is set:
       provider_prefix = model.split("/")[0]   // e.g. "anthropic", "opencode", "opencode-go"
       IF provider_prefix NOT in effort_field_applies_to_providers:
         effort = null   // platform-level field exists but this provider ignores it
9. return resolved
```

### 5.3 EMIT format branching

```
shorthand:          "model: <resolved.model>"
provider_prefixed:  "model: <resolved.model>"
toml_split:         "model = \"<resolved.model>\"\n"
                  + (resolved.effort ? "model_reasoning_effort = \"<effort>\"" : "")
omit:               ""
```

### 5.4 REVERSE_MAP

Match concrete model string against `profile.model_tiers[*].model`. Exact → return tier. No exact → family fuzzy (`claude-opus-*` → `deep`, `*-mini` → `fast`, `*-haiku-*` → `triage`). Ambiguous → `medium` + emit advisory.

### 5.5 DETECT_CATALOG_DRIFT

```
acked   = prefs.platforms[profile.tier].model_tiers_version_acked
current = profile.model_tiers_version
IF acked != current:
  return { drifted: true,
           message: "Platform model catalog updated since you last set preferences "
                  + "(was: " + acked + ", now: " + current + "). "
                  + "Run /superpipelines:change-models to review." }
return { drifted: false, message: null }
```

### 5.6 Invariants

- Resolver NEVER writes to disk. All preference writes go through `change-models`.
- Resolver NEVER calls platform APIs. Pure function of inputs.
- Resolver MUST return `warnings`; callers MUST surface to user-facing output.
- `frontmatter_override` path is the only escape hatch — preserved for advanced users; surfaces in audit report (SEV-3 info).

---

## 6. Workflow Integration

### 6.1 `creating-a-pipeline`

**Phase 2 (brief refinement):**
- Replace 2-tier prompt with 4-tier prompt per step.
- Recommended defaults: planning/architecture/review → `deep`; coding/execution → `medium`; utility/formatting → `fast`; routers/classifiers → `triage`.
- Optional `effort_tier` prompt per step (skip = profile default).
- Record `{step_id: {model_tier, effort_tier}}` in Phase 2 output.

**Phase 4 (architect):**
- Writes `model_tier:` + optional `effort_tier:` to agent frontmatter. NEVER writes `model:`.
- Calls `sk-model-resolver.EMIT` for preview in Phase 5 approval table only.
- Stamps `model_tiers_version` from active profile into `topology.json`.

**Phase 6 (finalization):**
- If `~/.superpipelines/model-preferences.json` missing for active platform → trigger first-run wizard before scaffolding completes.

### 6.2 `running-a-pipeline` — new Phase 0.4

```
Phase 0.4 — Model resolution
  1. Load sk-model-resolver
  2. LOAD_PREFS(workspace_root)
  3. DETECT_CATALOG_DRIFT → emit advisory if drifted (non-blocking)
  4. FOR each agent in topology:
       a. Read frontmatter
       b. resolved = RESOLVE(agent, platform_profile, prefs)
       c. Cache to state.metadata.resolved_models[step_id]
  5. Emit user-facing resolution table
  6. Persist resolved_models to state file (atomic write)
```

**Phase 3 dispatch** reads `state.metadata.resolved_models[step_id]` rather than re-resolving.
- `native_task` (CC): pass `model` override in Task() payload (preferred) OR rewrite agent frontmatter in-memory before dispatch.
- `native_subagent` (OC): write resolved model into dispatch payload `model: provider/id` form.
- `model_driven` (Codex): emit both `model` and `model_reasoning_effort` to TOML at dispatch time.
- `inline` (Tier 2): no-op; host model wins.

### 6.3 `change-models` — full Phase rewrite

```
Phase 0 — Scope selection
  Detect platform → load profile → scan ALL scope roots that exist:
    .claude/  .opencode/  .agents/  .superpipelines/
  Present multi-platform pipeline list.

Phase 1 — Mode selection
  A. Edit user-global preferences (~/.superpipelines/model-preferences.json)
  B. Edit workspace preferences (<ws>/.superpipelines/model-preferences.json)
  C. Per-agent model_tier override (edit frontmatter)
  D. Per-agent explicit model: override (escape hatch, advanced)
  E. First-run wizard (4-tier setup for a platform)
  F. Catalog refresh (reconcile preferences with new profile version)

Phase 2 — Pick agents (only for modes C/D)
  Scan agents/superpipelines/**/*.{md,toml} under selected scope root(s).
  Display: Current tier + Current resolved model + Source.

Phase 3 — Apply
  Modes A/B: write to preferences JSON; bump model_tiers_version_acked
  Modes C/D: Edit frontmatter (model_tier: or model:)
  Mode E:    Interactive 4-tier wizard, write to chosen scope
  Mode F:    Show drift diff (old IDs → new IDs), prompt accept/edit

Phase 4 — Verify
  Re-run sk-model-resolver on each affected agent.
  Show before/after resolved-model table.
```

`$ARGUMENTS` fast-path expanded: `/superpipelines:change-models deep to opus`, `all medium to sonnet`.

### 6.4 Migration — `sk-model-migration`

One-shot skill, called by `running-a-pipeline` Phase 0.5 (between version-compat advisory and tier detect).

```
IF any agent in pipeline has `model:` but no `model_tier:`:
  emit advisory:
    "Pipeline scaffolded under pre-v2.0 schema (concrete model: fields baked in).
     Auto-migrating to model_tier: schema for cross-platform portability.
     A backup commit will be created before changes."

  1. Verify git clean OR create stash
  2. Git commit current state as "pre-migration checkpoint"
  3. FOR each agent file:
       tier = sk-model-resolver.REVERSE_MAP(agent.model, source_profile)
       Edit agent frontmatter:
         + model_tier: <tier>
         (remove `model:` line; if reverse-map ambiguous, leave it + add a
          single-line comment "# TODO: confirm tier")
  4. Update topology.json: stamp migrated_at + source_model_tiers_version
  5. Git commit "auto-migrate: schema -> model_tier resolution"
  6. Emit migration report (table of step / old model / new tier / confidence)
  7. Proceed to Phase 0.6 (portability validation)
```

User can `git revert` the migration commit.

### 6.5 `pipeline-auditor` — new criteria

| Criterion | SEV | Rule |
|---|---|---|
| Hardcoded model ID in skill body | SEV-2 | String matching `claude-*\|gpt-*\|gemini-*` outside profile JSONs is source-of-truth drift |
| Agent missing both `model_tier:` and `model:` | SEV-1 | Runtime resolver defaults to `fast` for safety, but scaffold-time auditor blocks: explicit declaration required for v2.0+ agents (auditor enforces, resolver tolerates) |
| `model:` explicit override without justification comment | SEV-3 info | Escape hatch used — surface to reviewer |
| Profile `model_tiers_version` missing | SEV-2 | Required field for drift detection |
| Preference file references model not in any profile | SEV-2 | Likely typo or stale ID |
| `effort_tier:` set but `profile.effort_field_name == null` | SEV-3 info | Effort silently ignored on this platform — inform user |

### 6.6 First-run wizard (`change-models` Mode E)

```
══════════════════════════════════════════════════════════════
  Superpipelines Model Preference Setup — Platform: OpenCode
══════════════════════════════════════════════════════════════

  No preferences found for tier_1b. Configure 4 tiers.

  OC supports three provider families:
    anthropic/*    — direct Anthropic API (requires ANTHROPIC_API_KEY)
    opencode-go/*  — OC Go subscription ($5 first month, $10/mo, large quotas)
    opencode/*     — OC Zen (mix of paid + FREE models like big-pickle)

  Detected subscription state: Go active ✓   Zen ✓   Anthropic key: not set

  triage  [cheapest, routers/classifiers]
    Profile default: opencode/big-pickle              (FREE, no quota)
    Suggested alts:  opencode-go/deepseek-v4-flash    (Go, ~158k req/mo)
    Your choice [enter=accept]: _

  fast    [workhorse-cheap, execution/utility]
    Profile default: opencode-go/deepseek-v4-flash    (Go, ~158k req/mo)
    Suggested alts:  opencode/gpt-5.4-mini ($0.75 in) | opencode/big-pickle (free)
    Your choice [enter=accept]: _

  medium  [workhorse, coding/standard tasks]
    Profile default: opencode-go/qwen3.6-plus         (Go, ~50k req/mo)
    Suggested alts:  opencode/claude-sonnet-4.6 ($3 in) | opencode-go/minimax-m2.7
    Your choice [enter=accept]: _

  deep    [planning/architecture/review]
    Profile default: opencode-go/kimi-k2.6            (Go, ~9k req/mo)
    Suggested alts:  opencode/claude-opus-4.7 ($5 in) | opencode-go/glm-5.1
    Your choice [enter=accept]: _

  Effort defaults? [Y/n]: _
    (triage=low, fast=medium, medium=medium, deep=high)

  Save to:
    (1) ~/.superpipelines/model-preferences.json  [user-global, recommended]
    (2) <workspace>/.superpipelines/model-preferences.json  [workspace-only]
    (3) Both — global + workspace override
  Choice: _

  Preferences written.
  Run /superpipelines:run-pipeline to use them.
```

---

## 7. End-to-End Scenarios

### 7.1 Fresh user, CC, brand-new pipeline

```
$ /superpipelines:new-pipeline "build a doc summarizer"
[Phase 0] Tier detected: tier_1 (Claude Code)
[Phase 0 wizard] No preferences found. Configure now? (Y/n) y
  → 4-tier wizard
[Phases 1–3] scope, name, pattern (unchanged)
[Phase 2] per-step model_tier prompt
[Phase 4] architect writes model_tier: + effort_tier: (no model:)
[Phase 5] preview table of resolved models
[Phase 6] scaffold complete

$ /superpipelines:run-pipeline
[Phase 0.4] resolution table
[Phase 3] dispatch with resolved models
```

### 7.2 Cross-tier resume: CC → OC

```
$ /superpipelines:run-pipeline   # OC workspace, scaffolded on CC
[Phase 0.25] cross-tier resume: source=tier_1, runtime=tier_1b
[Phase 0.4]
  Step           CC model              → OC model                          Source
  architect      claude-opus-4-7       → opencode-go/kimi-k2.6              profile_default[tier_1b]
  implementer    claude-sonnet-4-6     → opencode-go/qwen3.6-plus           profile_default[tier_1b]
  triage-router  claude-haiku-4-5      → opencode/big-pickle                profile_default[tier_1b] (free)
  formatter      claude-haiku-4-5      → opencode-go/deepseek-v4-flash      workspace_prefs[tier_1b]
[Phase 3] dispatch with resolved models. Zero manual intervention.
```

Note: OC defaults to OC's own provider families (Go subscription + Zen free). Users with `anthropic/*` preferences (Anthropic API key, Bedrock) override via wizard.

### 7.3 Cross-family resume: CC → Codex

```
[Phase 0.25] cross-tier resume: source=tier_1, runtime=tier_1d
[Phase 0.5] migration check: agents have model_tier: → no migration needed
[Phase 0.4]
  Step          model_tier   → gpt model         effort
  architect     deep         → gpt-5.5           high
  implementer   medium       → gpt-5.4           medium
  formatter     fast         → gpt-5.4-mini      low
[Phase 3] dispatch emits TOML model + model_reasoning_effort per agent
```

### 7.4 Catalog drift

```
[Phase 0.4] Catalog drift detected for tier_1:
            Profile updated 2026-06-12 (was 2026-05-19).
            New tier mapping: medium=claude-sonnet-5-0 (was claude-sonnet-4-6)
            Continue with old (acked) preferences? (y/N/review) review
              → opens Mode F diff view in change-models
```

### 7.5 Antigravity orchestrator-only

```
[Phase 0.4] Antigravity detected (dynamic_subagents=true).
            Per-step model assignment skipped.
            Orchestrator model: gemini-3.5-pro (deep tier, user_prefs)
            Subagents will be managed by Antigravity orchestrator.
```

---

## 8. Testing Strategy

| Layer | Test | Mechanism |
|---|---|---|
| `RESOLVE()` unit | All 5 layer paths × all 5 profiles × all 5 tiers | Pure function — fixture JSON inputs, assert output |
| `EMIT()` | Each `model_field_format` value produces correct serialization | Snapshot tests |
| `REVERSE_MAP()` | Known IDs map exact; unknown family-fuzzy; junk → null | Table-driven |
| `DETECT_CATALOG_DRIFT()` | Acked == current → no drift; mismatch → drift advisory | Pair fixtures |
| Cross-tier scenarios | Scaffold-on-CC → run-on-{OC, Codex, Tier 2} | Integration, manual (per `PARITY_TESTING: MANUAL_PHASE1`) |
| Migration | Pre-v2.0 agent fixture → Phase 0.5 → assert commits + frontmatter | Integration |
| Auditor criteria | Each new SEV rule has positive + negative fixture | Existing auditor harness |
| First-run wizard | Empty prefs → wizard → file written; re-run → no wizard | Mock prompt I/O |

---

## 9. File-Touch List

### 9.1 New files

```
skills/sk-model-resolver/SKILL.md
skills/sk-model-resolver/references/resolution-algorithm.md
skills/sk-model-resolver/references/emit-formats.md
skills/sk-model-migration/SKILL.md
docs/superpipelines/specs/2026-05-24-cross-platform-model-resolver-design.md  (this file)
```

### 9.2 Modified files

```
skills/sk-platform-dispatch/profiles/tier_1.json          # +triage/medium tiers, +effort entries, +model_tiers_version, +new capability flags
skills/sk-platform-dispatch/profiles/tier_1b.json         # same + model_field_format=provider_prefixed
skills/sk-platform-dispatch/profiles/tier_1c.json         # same + dynamic_subagents=true
skills/sk-platform-dispatch/profiles/tier_1d.json         # same + model_field_format=toml_split, effort_field_name="model_reasoning_effort"
skills/sk-platform-dispatch/profiles/tier_2.json          # model_field_format=omit; tiers all "inherit"
skills/sk-platform-dispatch/SKILL.md                      # §Model resolution hook; update DISPATCH contract
skills/creating-a-pipeline/SKILL.md                       # Phase 2: 4-tier prompt; Phase 4: tier-only frontmatter; Phase 6: prefs bootstrap
skills/running-a-pipeline/SKILL.md                        # +Phase 0.4 resolution; +Phase 0.5 migration check
skills/change-models/SKILL.md                             # full rewrite per §6.3
skills/change-models/references/model-catalog.md          # mark deprecated; resolver uses profile JSONs
skills/pipeline-architect-protocol/SKILL.md               # remove "Default to model: sonnet" hardcode
skills/pipeline-architect-references/references/agent-frontmatter-schema.md   # replace model/effort fields with model_tier/effort_tier
skills/pipeline-auditor/SKILL.md                          # +6 new criteria from §6.5
CLAUDE.md                                                 # rewrite MODEL_SELECTION invariant; document model_tiers_version
```

### 9.3 Removed / cleaned

```
Any `model: sonnet` default or hardcoded model ID outside profile JSONs (grep-and-purge).
Tier 2 profile `model_tiers: { fast: "inherit", deep: "inherit" }` → replaced by model_field_format=omit + tier values as "inherit" sentinel.
```

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Resolver becomes hot path on dispatch | Pure function; profile + prefs cached in session; sub-ms cost |
| User edits preferences mid-run, mismatched with state | Phase 0.4 stamps `resolved_models` once; Phase 3 reads from state, not re-resolves. Edits apply next run |
| Migration mis-maps a custom/exotic model ID | Reverse-map flags ambiguous as `medium` + leaves comment + emits report; user can override via Mode C |
| Tier 2 host model ≠ user expectation | Phase 0.4 resolution table includes `source: host_inherit` row; degradation_warnings already surface this |
| OC `inherit` semantics differ (subagent inherits primary, not host session) | Profile flag `subagent_inherit_target: "primary"` — resolver behavior branches accordingly |
| Antigravity introduces per-subagent model API later | Resolver branches on `dynamic_subagents` flag — flip to `false` in profile when API ships; no skill edits |
| Catalog drift advisory becomes noise | `model_tiers_version_acked` stamp suppresses; only shows once per drift event per user |
| `model:` escape hatch enables drift back to hardcoded IDs | Auditor SEV-3 info surfaces every use; reviewer sees it |
| Codex `model_reasoning_effort` accepts `minimal` but `effort_tier` taxonomy is `low|medium|high` | Profile `effort_emit_map: { low: "minimal", medium: "medium", high: "high" }` translates at EMIT |
| OC user without Go subscription gets default `opencode-go/*` models that 401 | Wizard runs subscription-state detection (read `~/.opencode/auth.json` or equivalent) and adapts suggested alts; on first run after detected loss-of-subscription, emit advisory to swap to `opencode/*` Zen or `anthropic/*` |
| `opencode/big-pickle` (free) gets rate-limited under heavy pipeline use | `quota_class: free-unlimited` warning surfaced when free model assigned to `fast` or `medium` tier (high-frequency); wizard suggests Go alternative |
| `effort_field_name` on OC only applies to OpenAI-family models (not Anthropic-family on OC) | New profile field `effort_field_applies_to_providers: ["opencode", "opencode-go"]` — resolver checks resolved-model's provider prefix; if not in list, skip effort emit even when field name is set |

---

## 11. Open Questions

None at time of approval (all four design questions answered by user 2026-05-24). Recorded answers:

1. Tier taxonomy: **4 tiers (triage / fast / medium / deep)**
2. Approach: **A — Full layered resolver**
3. Effort axis: **Yes — separate axis**
4. Preference storage: **Both — workspace overrides user-global**
5. Antigravity: **User picks orchestrator tier only; subagents auto-managed**
6. Migration: **Auto-migrate on first run after upgrade**
7. Catalog refresh: **Stamped profile version + on-run advisory**
8. Release target: **v2.0.0 on `feat/multi-platform-impl` (no v2.1 phasing)**

---

## 12. Acceptance Criteria

- [ ] `sk-model-resolver` SKILL.md exists and exposes the public API in §5.1.
- [ ] All five profile JSONs carry the new capability flags, 4-tier `model_tiers` blocks with `effort`, and `model_tiers_version`.
- [ ] `creating-a-pipeline` Phase 4 emits agents with `model_tier:` and zero `model:` lines.
- [ ] `running-a-pipeline` Phase 0.4 produces and persists `resolved_models` for every dispatched step.
- [ ] CC → OC → Codex cross-tier resume verified manually: same pipeline, three platforms, three different model sets, zero user edits between runs.
- [ ] `change-models` scans all five scope roots; six modes (A–F) functional.
- [ ] Auto-migration converts a v1.x pipeline fixture into v2.0 schema with a git commit pair.
- [ ] `pipeline-auditor` blocks (SEV-1) on missing `model_tier:`; warns (SEV-2) on hardcoded model strings outside profiles.
- [ ] First-run wizard fires exactly once per platform per user.
- [ ] CLAUDE.md `MODEL_SELECTION` invariant updated to reflect 4-tier + user-preference layering.
- [ ] tier_1b (OC) profile defaults use OC's own provider families (Go subscription + Zen free), not `anthropic/*`.
- [ ] OC first-run wizard detects subscription state (Go / Zen / Anthropic key) and suggests alts accordingly.
- [ ] `quota_class` warnings surface in wizard when a free-tier model is assigned to `fast` or `medium`.
- [ ] `effort_field_applies_to_providers` filter prevents `reasoningEffort` emit on `anthropic/*` models routed through OC.

---

## 13. References

- Official platform docs (May 2026):
  - https://code.claude.com/docs/en/sub-agents
  - https://opencode.ai/docs/agents/
  - https://developers.openai.com/codex/subagents
  - https://antigravity.google/docs/subagents (sparse) + https://deepwiki.com/google-antigravity/antigravity-sdk-python/8.2-subagents-and-multi-agent-patterns
  - https://www.marktechpost.com/2026/05/19/google-launches-antigravity-2-0-at-i-o-2026-...
- Industry context:
  - https://opencode.ai/docs/go/
  - https://opencode.ai/docs/zen/
  - https://www.tembo.io/blog/claude-code-subagents
  - https://gurusup.com/blog/best-multi-agent-frameworks-2026
  - https://turion.ai/blog/ai-agent-platform-updates-may-2026/
- Internal prior art:
  - `CLAUDE.md` `MODEL_SELECTION: DYNAMIC_DEFAULT_SONNET` invariant (to be rewritten)
  - `skills/sk-platform-dispatch/SKILL.md` § Cross-Tier Resume Protocol
  - `skills/change-models/SKILL.md` (v1.x, to be rewritten)
