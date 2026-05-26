---
name: sk-model-resolver
description: Use when an orchestrator needs the concrete model + effort string for a pipeline step on the active platform — resolves agent `model_tier:` declarations against user preferences and platform profile defaults, returns a serializable resolved object for dispatch.
disable-model-invocation: true
user-invocable: false
---

# Model Resolver — 5-Layer Cross-Platform Model Resolution

> Translates agent-author intent (`model_tier: deep`) into concrete platform-specific model strings (`claude-opus-4-7` on CC, `opencode-go/kimi-k2.6` on OC, `gpt-5.5` on Codex). Preloaded by `running-a-pipeline` Phase 0.45. Pure function — never writes to disk, never calls APIs.

<overview>
The resolver decouples agent-author intent from runtime model selection. Five resolution layers ranked top-wins: (1) explicit `model:` in agent frontmatter, (2) workspace preferences, (3) user-global preferences, (4) platform profile default, (5) native host inherit. Callers obtain a `resolved` object, persist it to `pipeline-state.json metadata.resolved_models`, and pass it to dispatch.
</overview>

<glossary>
  <term name="tier">Role category: triage | fast | medium | deep | inherit. Author-declared.</term>
  <term name="effort_tier">Orthogonal reasoning intensity: low | medium | high. Optional.</term>
  <term name="resolved">Output object: {model, effort, effort_field_name, model_field_format, source, warnings}.</term>
  <term name="source">Which layer won resolution: frontmatter_override | workspace_prefs | user_prefs | profile_default | host_inherit | blocked. The `blocked` enum (Q4) signals v1-legacy schema detected — callers MUST migrate via Phase 0.4 before dispatch.</term>
</glossary>

## Public API

```
RESOLVE(agent_frontmatter, profile, prefs) → resolved
LOAD_PREFS(workspace_root) → { workspace, user }
EMIT(resolved, target_format) → string
RENDER_RESOLUTION_TABLE(entries[]) → string
REVERSE_MAP(concrete_model, profile) → tier_id | null
DETECT_CATALOG_DRIFT(prefs, profile) → { drifted: bool, message: string | null }
```

Where each `entries[]` element is `{ step_id, agent_name, model_tier, resolved }`.

### resolved object schema

```json
{
  "model": "claude-opus-4-7",
  "effort": "high",
  "effort_field_name": null,
  "model_field_format": "shorthand",
  "source": "user_prefs",
  "warnings": []
}
```

`model: null` means "omit the field; let the host pick" (Tier 2, dynamic-subagent platforms, or `inherit` tier).

## Algorithm

Normative source: **`references/resolution-algorithm.md`** — all six operations (RESOLVE, LOAD_PREFS, EMIT, RENDER_RESOLUTION_TABLE, REVERSE_MAP, DETECT_CATALOG_DRIFT) are specified there. Both the skill adapter (this file) and the inline adapter (`running-a-pipeline` Phase 0.45) execute the same algorithm. Do not restate steps here.

## Preference File Schema

```json
{
  "platforms": {
    "tier_1": {
      "name": "Claude Code",
      "model_tiers_version_acked": "2026-05-19",
      "tiers": {
        "triage": "claude-haiku-4-5-20251001",
        "fast":   "claude-haiku-4-5-20251001",
        "medium": "claude-sonnet-4-6",
        "deep":   "claude-sonnet-4-6"
      },
      "effort_default": {
        "deep": "high"
      }
    },
    "tier_1b": {
      "name": "OpenCode",
      "model_tiers_version_acked": "2026-05-19",
      "tiers": { "fast": "opencode-go/deepseek-v4-flash" }
    }
  }
}
```

**Key rules:**
- `tier_1`, `tier_1b`, `tier_1c`, `tier_1d`, `tier_2` are the **canonical keys** — never localize them. They map directly to `platform_profile.tier`.
- `name` is a **display-only** sibling field. Writers (wizard/change-models) MUST stamp it from `platform_profile.name` so future readers (and users browsing the JSON) can identify the platform without consulting profile JSONs. Readers (resolver) MUST NOT branch on `name` — it has no effect on resolution.
- `tiers` holds the four-tier model overrides (`triage | fast | medium | deep`). Partial maps allowed; missing keys fall through to profile default.
- `model_tiers_version_acked` mirrors `profile.model_tiers_version` at write-time; drift detector compares to current.
- `effort_default` is optional; per-tier effort override.


<invariants>
- Resolver NEVER writes to disk. All preference writes flow through `change-models`.
- Resolver NEVER calls platform APIs. Pure function of inputs.
- Resolver MUST return a `warnings` array (possibly empty); callers MUST surface to user-facing output.
- `frontmatter_override` is the only escape hatch — preserved for advanced users; surfaced in audit reports as SEV-3 info.
- Resolver MUST NOT mutate inputs. Outputs are fresh objects.
- DETECT_CATALOG_DRIFT MUST NOT emit advisory when prefs are empty for the tier — the wizard handles first-run setup separately.
</invariants>

## Red Flags — STOP

- "I'll cache the resolved model across runs." → **STOP**. State file caches per run; mid-run pref edits must take effect on the next run, not be stale-cached.
- "I'll re-resolve at dispatch time per step." → **STOP**. Phase 0.45 resolves once upfront and writes to state. Phase 3 reads state. Re-resolution at dispatch causes mid-run inconsistency if prefs change.
- "I'll merge workspace and user prefs into one object." → **STOP**. Consult-in-order preserves provenance (which layer won); merging loses the `source` field.
- "I'll call platform APIs to validate the resolved model exists." → **STOP**. Resolver is pure. Validation belongs in `change-models` Phase 4.

## Reference Files

- `references/resolution-algorithm.md` — **Normative algorithm spec** (RESOLVE, LOAD_PREFS, EMIT, RENDER_RESOLUTION_TABLE, REVERSE_MAP, DETECT_CATALOG_DRIFT) + worked examples.
- `references/emit-formats.md` — Per-platform serialization specs with byte-for-byte examples.
- `fixtures/` — Input/expected fixture pairs for each branch of the algorithm.
- `sk-platform-dispatch/profiles/{tier}.json` — Profile defaults, single source of truth.
- `sk-pipeline-state/SKILL.md` — State file schema (`metadata.resolved_models`).
