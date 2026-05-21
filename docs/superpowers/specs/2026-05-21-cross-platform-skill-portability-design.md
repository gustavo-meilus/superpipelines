# Cross-Platform Skill Portability — Design Spec

**Date:** 2026-05-21  
**Status:** Draft  
**Scope:** v2.0.0

---

## Overview

This spec defines the architecture for making all Superpipelines skills and pipelines fully portable across the five execution tiers (Tier 1 Claude Code, Tier 1b OpenCode, Tier 1c Antigravity, Tier 1d Codex, Tier 2 Cursor/Windsurf/Cline). It addresses five portability scenarios that must all be true with no gaps or ambiguity:

1. Skills execute seamlessly regardless of platform or model.
2. Pipelines can be created on any platform.
3. A pipeline scaffolded on one platform can be ported and run on another.
4. A pipeline altered on one platform works on another.
5. A running pipeline can be stopped mid-run and resumed on a different platform.

---

## Problem Statement

As of v2.0.0 (pre-this-spec), the following gaps exist:

| Gap | Description |
|---|---|
| G1 — Creation | `creating-a-pipeline` dispatches architect and auditor via `Task()` — CC-only. No inline fallback for Tier 2. |
| G2 — Portability enforcement | `PORTABILITY_REWRITE` is convention-only. No auditor rule, no runtime validator. Hardcoded `.claude/` paths silently break on non-CC tiers. |
| G3 — Cross-tier resume | `metadata.tier` is immutable per run. Resume on a different tier re-uses the cached source tier and dispatches with the wrong mechanism. |
| G4 — Hardcoded degradation strings | Degradation warnings are embedded in skill text. Platform capability changes require skill edits. |
| G5 — Platform extensibility | New or changed platforms require hunting conditional branches across multiple skills. No single source of truth for "what can this platform do?" |

---

## Chosen Approach: Platform Profile System (Approach 3)

A JSON capability profile per tier lives under `skills/sk-platform-dispatch/profiles/`. Skills read capabilities from the loaded profile rather than branching on tier enum strings. This decouples "what a platform can do" (the profile — changes monthly) from "how skills respond" (skill logic — changes rarely).

**Rationale over Approach 1 (targeted fixes):** Platforms change capabilities on unpredictable schedules. Scattered tier conditionals become a maintenance liability within 2–3 platform updates. A new platform capability requires a single JSON edit, not a skill hunt.

**Schema flexibility guarantee:** The profile schema uses string enums (not booleans) for multi-valued capabilities, and an open `extensions: {}` object for unknown future capabilities. Skills read only what they understand; unrecognized keys are ignored. This ensures new platforms — including ones not yet conceived — can be added without breaking existing skill logic.

---

## Section 1: Platform Profile Schema

### Location

```
skills/sk-platform-dispatch/profiles/
  tier_1.json      # Claude Code
  tier_1b.json     # OpenCode
  tier_1c.json     # Antigravity
  tier_1d.json     # Codex
  tier_2.json      # Cursor / Windsurf / Cline
```

### Schema

```json
{
  "tier": "<tier_id>",
  "name": "<human-readable platform name>",
  "profile_version": "1.0.0",
  "capabilities": {
    "subagents": <boolean>,
    "parallel_subagents": <boolean>,
    "task_primitive": <boolean>,
    "skill_tool": <boolean>,
    "worktrees": <boolean>,
    "reviewer_isolation": "<structural|convention|unverified|none>",
    "dispatch_mechanism": "<native_task|native_subagent|model_driven|inline>"
  },
  "scope_root": {
    "workspace": "<directory name, e.g. .claude>",
    "user": "<absolute user-scoped path, e.g. ~/.claude>"
  },
  "degradation_warnings": [
    "<warning string displayed to user when this platform is active>"
  ],
  "extensions": {}
}
```

### Field Semantics

| Field | Type | Notes |
|---|---|---|
| `tier` | string | Matches detection output: `tier_1`, `tier_1b`, `tier_1c`, `tier_1d`, `tier_2` |
| `profile_version` | semver | Schema version. Enables migration without breaking installs. |
| `capabilities.subagents` | boolean | Can platform spawn subagents at all? |
| `capabilities.parallel_subagents` | boolean | Can subagents run concurrently? |
| `capabilities.task_primitive` | boolean | Is a `Task()` / skill-callable subagent primitive available? |
| `capabilities.skill_tool` | boolean | Is a `Skill()` tool available to the orchestrator? |
| `capabilities.worktrees` | boolean | Does the platform support per-agent git worktrees? |
| `capabilities.reviewer_isolation` | enum | `structural` = enforced by toolset; `convention` = honour system; `unverified` = unknown; `none` = impossible |
| `capabilities.dispatch_mechanism` | enum | How steps are dispatched. `unknown` values fall back to `inline`. |
| `scope_root.workspace` | string | Directory name (no leading slash). Used by `PORTABILITY_REWRITE`. |
| `scope_root.user` | string | Absolute path. Expand `~` before use. |
| `degradation_warnings` | string[] | Emitted at run start and run end. Written to `metadata.isolation_warning`. |
| `extensions` | object | Open map. Skills ignore unknown keys. Never remove this field. |

### Five Shipping Profiles

**`tier_1.json` — Claude Code**
```json
{
  "tier": "tier_1",
  "name": "Claude Code",
  "profile_version": "1.0.0",
  "capabilities": {
    "subagents": true,
    "parallel_subagents": true,
    "task_primitive": true,
    "skill_tool": true,
    "worktrees": true,
    "reviewer_isolation": "structural",
    "dispatch_mechanism": "native_task"
  },
  "scope_root": { "workspace": ".claude", "user": "~/.claude" },
  "degradation_warnings": [],
  "extensions": {}
}
```

**`tier_1b.json` — OpenCode**
```json
{
  "tier": "tier_1b",
  "name": "OpenCode",
  "profile_version": "1.0.0",
  "capabilities": {
    "subagents": true,
    "parallel_subagents": false,
    "task_primitive": false,
    "skill_tool": true,
    "worktrees": false,
    "reviewer_isolation": "structural",
    "dispatch_mechanism": "native_subagent"
  },
  "scope_root": { "workspace": ".opencode", "user": "~/.opencode" },
  "degradation_warnings": [
    "Parallel fan-out (Pattern 2) degrades to sequential on OpenCode."
  ],
  "extensions": {}
}
```

**`tier_1c.json` — Antigravity**
```json
{
  "tier": "tier_1c",
  "name": "Antigravity",
  "profile_version": "1.0.0",
  "capabilities": {
    "subagents": true,
    "parallel_subagents": false,
    "task_primitive": false,
    "skill_tool": true,
    "worktrees": false,
    "reviewer_isolation": "unverified",
    "dispatch_mechanism": "inline"
  },
  "scope_root": { "workspace": ".agents", "user": "~/.gemini/antigravity" },
  "degradation_warnings": [
    "Antigravity Dynamic Subagent dispatch primitive unverified. Falling back to Tier 2 inline execution.",
    "Reviewer isolation is unverified. Treat reviews as advisory until confirmed structural."
  ],
  "extensions": {
    "aspirational": true,
    "verification_pending": ["dispatch_primitive", "reviewer_isolation"]
  }
}
```

**`tier_1d.json` — Codex**
```json
{
  "tier": "tier_1d",
  "name": "Codex",
  "profile_version": "1.0.0",
  "capabilities": {
    "subagents": true,
    "parallel_subagents": true,
    "task_primitive": false,
    "skill_tool": false,
    "worktrees": false,
    "reviewer_isolation": "unverified",
    "dispatch_mechanism": "model_driven"
  },
  "scope_root": { "workspace": ".codex", "user": "~/.codex" },
  "degradation_warnings": [
    "Codex sandbox_mode per-agent tool restriction unverified. Reviewer isolation treated as advisory until confirmed."
  ],
  "extensions": {
    "max_concurrent_subagents": 6
  }
}
```

**`tier_2.json` — Cursor / Windsurf / Cline**
```json
{
  "tier": "tier_2",
  "name": "Cursor / Windsurf / Cline",
  "profile_version": "1.0.0",
  "capabilities": {
    "subagents": false,
    "parallel_subagents": false,
    "task_primitive": false,
    "skill_tool": true,
    "worktrees": false,
    "reviewer_isolation": "convention",
    "dispatch_mechanism": "inline"
  },
  "scope_root": { "workspace": ".superpipelines", "user": "~/.superpipelines" },
  "degradation_warnings": [
    "Reviewer isolation is convention-only; reviews are advisory, not structurally enforced.",
    "Parallel fan-out (Pattern 2) degrades to sequential.",
    "Iterative pattern (Pattern 3) cycle limit still enforced inline."
  ],
  "extensions": {}
}
```

---

## Section 2: State Schema Changes

### New Fields in `pipeline-state.json`

```json
{
  "pipeline_id": "<uuid>",
  "pipeline_name": "<P>",
  "plugin_version": "<semver>",
  "scope_root": "<absolute path>",
  "run_id": "<uuid>",
  "started_at": "<iso8601>",
  "pattern": "1 | 2 | 2b | 3 | 4 | 5",
  "status": "running | completed | escalated | failed",
  "current_phase": 0,
  "phases": [],
  "metadata": {
    "source_tier": "<tier_id>",
    "runtime_tier": "<tier_id>",
    "platform_profile": { "<full profile object — snapshot at run start or last resume>" },
    "tier_changes": [
      { "from": "<tier_id>", "to": "<tier_id>", "at": "<iso8601>" }
    ],
    "source_scope_root": "<original workspace scope root string, e.g. .claude>",
    "isolation_warning": "<joined degradation_warnings, null if none>"
  }
}
```

### Field Semantics

| Field | Immutable? | Set by | Notes |
|---|---|---|---|
| `metadata.source_tier` | Yes | `running-a-pipeline` Phase 2 init | Tier where pipeline was scaffolded. Never updated. |
| `metadata.runtime_tier` | No | Phase 0.25 on every run/resume | Current execution tier. Updated on cross-tier resume. |
| `metadata.platform_profile` | No | Phase 0.25 | Full profile snapshot. Updated when `runtime_tier` changes. |
| `metadata.tier_changes` | Append-only | Phase 0.25 on cross-tier resume | Audit log. Never overwritten. |
| `metadata.source_scope_root` | Yes | Phase 2 init | Original scope root string. Used by `PORTABILITY_REWRITE`. |
| `metadata.isolation_warning` | No | Phase 0.25 | Joined `degradation_warnings` from active profile. Null if empty. |

### Backward Compatibility

Pre-v2.0.0 state files have `metadata.tier` (single field). On resume of an old state:
- Treat `metadata.tier` as `source_tier` if `metadata.source_tier` is absent.
- Set `runtime_tier` = re-detected current tier.
- Do not write `metadata.tier` in new state files; it is a read-only deprecated alias.

---

## Section 3: `creating-a-pipeline` Tier-Aware Routing

### New Phase 0: Tier Detect (inserted before git preflight)

```
PHASE 0: TIER DETECT
  Load sk-platform-dispatch → DETECT() → returns platform_profile
  Cache profile in session context (state file not yet initialized)
  IF profile.degradation_warnings is non-empty:
    emit each warning with "⚠️" prefix
  THEN proceed to existing git preflight (now Phase 0b)
```

### Phase 4: Profile-Driven Architect & Auditor Dispatch

| `dispatch_mechanism` | Architect dispatch | Auditor dispatch |
|---|---|---|
| `native_task` | `Task(pipeline-architect, ...)` | `Task(pipeline-auditor, ...)` |
| `native_subagent` | OC native `mode: subagent` | OC native `mode: subagent` |
| `model_driven` | Model-driven fan-out prompt | Model-driven |
| `inline` (or unknown) | `Skill(pipeline-architect-protocol)` → inline | `Skill(pipeline-auditor-protocol)` → inline |

On inline execution: orchestrator follows the protocol skill step-by-step using own tools (`Read`, `Write`, `Edit`, `Bash`). SEV-0/1 gate still enforced — creation blocks regardless of tier.

### Phase 6: source_tier Stamp

After writing all artifacts, stamp `source_tier` from the detected profile into:
- `topology.json` (alongside existing `plugin_version`)
- `registry.json` entry for this pipeline

---

## Section 4: PORTABILITY_REWRITE Enforcement

### 4a — Auditor SEV-1 Rule

Added to `pipeline-auditor-protocol`:

```
PORTABILITY CHECK — SEV-1:
  Target files: entry skill, all step agent files, all protocol skills, topology.json
  Pattern: any hardcoded occurrence of a known scope-root directory name:
    ".claude/"  |  ".opencode/"  |  ".codex/"  |  ".agents/"  |  ".superpipelines/"
  Exceptions: strings inside comments that document PORTABILITY_REWRITE itself.
  Fix: "Replace with {ROOT} template variable resolved via sk-pipeline-paths at runtime."
  Triggered by: creating-a-pipeline Phase 4, adding-a-pipeline-step audit delta,
                updating-a-pipeline-step audit delta.
```

### 4b — Runtime Validator (Phase 0.6 in `running-a-pipeline`)

Inserted between Phase 0.5 (version advisory) and Phase 1 (resume check):

```
PHASE 0.6: PORTABILITY VALIDATION
  IF runtime_tier == source_tier: skip silently.

  ELSE:
    source_root = profile[source_tier].scope_root.workspace
    target_root = profile[runtime_tier].scope_root.workspace
    Scan entry skill content for occurrences of source_root string.

    IF found:
      emit: "⚠️ Portability defect: entry skill contains '{source_root}/' path(s)
             that will not resolve on {runtime_tier} ({target_root}/).
             Options: [Abort] [Auto-rewrite in memory] [Proceed as advisory]"

      Auto-rewrite: applies PORTABILITY_REWRITE in-memory only.
                    Does NOT write to disk unless user explicitly requests.
                    Preserves original file for audit.

    IF not found: proceed silently.
```

---

## Section 5: `sk-platform-dispatch` Updates

### DETECT() — Returns Profile Object

```
DETECT() → platform_profile:
  1. Run existing heuristics → tier_id string (unchanged logic)
  2. READ(skills/sk-platform-dispatch/profiles/{tier_id}.json)
  3. Return parsed profile object
  Caller: cache result in pipeline-state.json metadata.platform_profile
```

### DISPATCH() — Profile-Driven Branching

```
DISPATCH(step, inputs, profile):
  mechanism = profile.capabilities.dispatch_mechanism
  SWITCH mechanism:
    "native_task"     → Task(subagent_type=step.agent, prompt=build_prompt(step, inputs))
    "native_subagent" → OC mode:subagent dispatch
    "model_driven"    → Codex model-driven fan-out orchestration prompt
    "inline"          → Tier 2 inline loop (existing protocol, unchanged)
    DEFAULT (unknown) → fallback to "inline" + emit:
                        "⚠️ Unknown dispatch_mechanism '{mechanism}'. Falling back to inline."
```

Skills that previously branched on `metadata.tier` string now branch on profile capability flags:

```
// Before
if metadata.tier == "tier_2": use inline loop

// After
if not profile.capabilities.task_primitive: use inline loop
```

### Degradation Surfacing — Profile-Driven

Replace hardcoded warning strings in skills with:

```
warnings = profile.degradation_warnings
IF warnings is non-empty:
  emit each warning at run start AND run end
  write join(warnings) to pipeline-state.json metadata.isolation_warning
```

### Cross-Tier Resume (Phase 0.25 update)

```
IF resuming AND metadata.source_tier exists:
  new_tier = DETECT() → new_profile
  IF new_tier != metadata.runtime_tier:
    append { from: metadata.runtime_tier, to: new_tier, at: now() }
            to metadata.tier_changes
    update metadata.runtime_tier = new_tier
    update metadata.platform_profile = new_profile
    update metadata.isolation_warning = join(new_profile.degradation_warnings)
    emit: "⚠️ Cross-tier resume: scaffolded on {source_tier}, now running on {new_tier}.
           Dispatch adapts to {new_tier} capabilities.
           {new_profile.degradation_warnings joined}"
  ELSE: proceed silently
```

---

## File Change Surface

| File | Change |
|---|---|
| `skills/sk-platform-dispatch/SKILL.md` | DETECT() returns profile; DISPATCH() profile-driven; degradation surfacing profile-driven; cross-tier resume protocol |
| `skills/sk-platform-dispatch/profiles/tier_1.json` | **New file** |
| `skills/sk-platform-dispatch/profiles/tier_1b.json` | **New file** |
| `skills/sk-platform-dispatch/profiles/tier_1c.json` | **New file** |
| `skills/sk-platform-dispatch/profiles/tier_1d.json` | **New file** |
| `skills/sk-platform-dispatch/profiles/tier_2.json` | **New file** |
| `skills/sk-pipeline-state/SKILL.md` | Schema: source_tier, runtime_tier, tier_changes[], platform_profile, backward compat rule |
| `skills/running-a-pipeline/SKILL.md` | Phase 0.25 cross-tier resume logic; new Phase 0.6 portability validator |
| `skills/creating-a-pipeline/SKILL.md` | New Phase 0 tier detect; Phase 4 profile-driven dispatch; Phase 6 source_tier stamp |
| `skills/pipeline-auditor-protocol/SKILL.md` | New PORTABILITY SEV-1 check |

**Total:** 6 existing files modified + 5 new JSON profile files. Mutation skills untouched.

---

## Acceptance Criteria

| Scenario | Criterion |
|---|---|
| Skills on any platform | `DETECT()` returns a valid profile for all 5 tiers. Skills branch on capability flags, not tier strings. Unknown platforms fall back to inline safely. |
| Pipeline creation on any platform | `creating-a-pipeline` completes Phase 6 on all tiers. Inline path produces identical output artifacts as subagent path. |
| CC-scaffolded pipeline runs on Tier 2 | Phase 0.6 detects or auto-rewrites scope-root paths. Pipeline executes to completion on Tier 2 using inline loop. |
| Pipeline altered on one platform, runs on another | Mutation skills emit portability audit delta. SEV-1 flag on hardcoded paths. Altered pipeline passes Phase 0.6 on target tier. |
| Cross-tier resume | Resume on a different tier: `runtime_tier` updated, `tier_changes` appended, dispatch uses new profile. Pipeline resumes from correct `current_phase`. |
| No new platform requires skill edits | Adding a 6th tier = adding one JSON profile file. No existing skill file changes required for routing, degradation, or dispatch. |

---

## Out of Scope (v2.1+)

- Automated cross-platform parity tests
- Antigravity dispatch primitive verification (depends on platform release)
- Codex `sandbox_mode` per-agent verification (depends on platform release)
- `extensions` field schema validation tooling
