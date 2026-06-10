---
name: sk-model-resolver
description: Use when an orchestrator needs the concrete model + effort string for a pipeline step on the active platform — resolves agent `model_tier:` declarations against user preferences and platform profile defaults, returns a serializable resolved object for dispatch.
disable-model-invocation: true
user-invocable: false
---

# Model Resolver — 5-Layer Cross-Platform Model Resolution

> Translates agent-author intent (`model_tier: deep`) into concrete platform-specific model strings (`claude-opus-4-7` on CC, `opencode-go/kimi-k2.6` on OC, `gpt-5.5` on Codex). Preloaded by `running-a-pipeline` Phase 0.4. Pure function — never writes to disk, never calls APIs.

<overview>
The resolver decouples agent-author intent from runtime model selection. Five resolution layers ranked top-wins: (1) explicit `model:` in agent frontmatter, (2) workspace preferences, (3) user-global preferences, (4) platform profile default, (5) native host inherit. Callers obtain a `resolved` object, persist it to `pipeline-state.json metadata.resolved_models`, and pass it to dispatch.
</overview>

<glossary>
  <term name="tier">Role category: triage | fast | medium | deep | inherit. Author-declared.</term>
  <term name="effort_tier">Orthogonal reasoning intensity: low | medium | high. Optional.</term>
  <term name="resolved">Output object: {model, effort, effort_field_name, model_field_format, source, warnings}.</term>
  <term name="source">Which layer won resolution: frontmatter_override | workspace_prefs | user_prefs | profile_default | host_inherit.</term>
</glossary>

## Public API

```
RESOLVE(agent_frontmatter, profile, prefs) → resolved
LOAD_PREFS(workspace_root) → { workspace, user, merged }
EMIT(resolved, target_format) → string
REVERSE_MAP(concrete_model, profile) → tier_id | null
DETECT_CATALOG_DRIFT(prefs, profile) → { drifted: bool, message: string | null }
```

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

## RESOLVE Algorithm

```
1. IF agent.model is present (explicit string):
     return {
       model: agent.model,
       effort: agent.effort_tier ?? null,
       effort_field_name: profile.capabilities.effort_field_name,
       model_field_format: profile.capabilities.model_field_format,
       source: "frontmatter_override",
       warnings: ["Explicit model override bypasses tier resolution"]
     }

2. tier   = agent.model_tier   ?? "fast"
3. effort = agent.effort_tier  ?? null

4. IF profile.capabilities.dynamic_subagents == true AND agent.role != "orchestrator":
     return {
       model: null,
       effort: null,
       effort_field_name: null,
       model_field_format: profile.capabilities.model_field_format,
       source: "host_inherit",
       warnings: ["Dynamic-subagent platform — host orchestrator picks model"]
     }

5. IF tier == "inherit" OR profile.capabilities.model_field_format == "omit":
     return {
       model: null,
       effort: null,
       effort_field_name: null,
       model_field_format: profile.capabilities.model_field_format,
       source: "host_inherit",
       warnings: [
         "Model resolves to host "
         + (profile.capabilities.subagent_inherit_target ?? "session")
         + " — no per-step model emitted."
       ]
     }

6. model, source =
     IF prefs.workspace.platforms[profile.tier].tiers[tier] is defined:
       (prefs.workspace.platforms[profile.tier].tiers[tier], "workspace_prefs")
     ELSE IF prefs.user.platforms[profile.tier].tiers[tier] is defined:
       (prefs.user.platforms[profile.tier].tiers[tier], "user_prefs")
     ELSE:
       (profile.model_tiers[tier].model, "profile_default")

7. IF effort is null:
     effort = (prefs.workspace.platforms[profile.tier].effort_default[tier]
            ?? prefs.user.platforms[profile.tier].effort_default[tier]
            ?? profile.model_tiers[tier].effort)

8. IF profile.capabilities.effort_field_name == null:
     effort = null

8b. ELSE IF profile.capabilities.effort_field_applies_to_providers is set:
      provider_prefix = model.split("/")[0]   // "anthropic" | "opencode" | "opencode-go" | etc.
      IF provider_prefix NOT in profile.capabilities.effort_field_applies_to_providers:
        effort = null

9. IF effort is not null AND profile.capabilities.effort_emit_map is set:
     effort = profile.capabilities.effort_emit_map[effort] ?? effort

10. return {
      model: model,
      effort: effort,
      effort_field_name: profile.capabilities.effort_field_name,
      model_field_format: profile.capabilities.model_field_format,
      source: source,
      warnings: []
    }
```

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

## LOAD_PREFS Algorithm

```
LOAD_PREFS(workspace_root):
  user_path      = expand("~/.superpipelines/model-preferences.json")
  workspace_path = workspace_root + "/.superpipelines/model-preferences.json"

  user      = file_exists(user_path)      ? read_json(user_path)      : { platforms: {} }
  workspace = file_exists(workspace_path) ? read_json(workspace_path) : { platforms: {} }

  return { user: user, workspace: workspace }
```

No merge step — RESOLVE consults workspace first, falls through to user.

## EMIT Algorithm

```
EMIT(resolved, target_format):
  format = target_format ?? resolved.model_field_format

  IF resolved.model is null OR format == "omit":
    return ""

  SWITCH format:
    "shorthand":
      return "model: " + resolved.model
    "provider_prefixed":
      return "model: " + resolved.model
    "toml_split":
      out = "model = \"" + resolved.model + "\""
      IF resolved.effort is not null AND resolved.effort_field_name is not null:
        out += "\n" + resolved.effort_field_name + " = \"" + resolved.effort + "\""
      return out
    DEFAULT:
      return "model: " + resolved.model
```

## REVERSE_MAP Algorithm (for migration)

```
REVERSE_MAP(concrete_model, profile):
  // exact match against profile.model_tiers[*].model
  FOR tier IN ["triage","fast","medium","deep"]:
    IF profile.model_tiers[tier].model == concrete_model:
      return tier

  // family fuzzy
  m = lowercase(concrete_model)
  IF m matches /opus|gpt-5\.5|kimi-k2\.6|glm-5\.1|gemini-3\.5-pro/:
    return "deep"
  IF m matches /sonnet|gpt-5\.4(?!-mini|-nano)|qwen3\.6|minimax-m2\.7/:
    return "medium"
  IF m matches /haiku|gpt-5\.4-mini|gpt-5\.4-nano|deepseek-v4-flash|gemini-3\.5-flash/:
    return "fast"
  IF m matches /-nano|big-pickle|free|haiku-3/:
    return "triage"

  return null   // ambiguous — caller emits "# TODO: confirm tier" comment
```

## DETECT_CATALOG_DRIFT Algorithm

```
DETECT_CATALOG_DRIFT(prefs, profile):
  IF prefs.user.platforms[profile.tier] is undefined:
    return { drifted: false, message: null }   // no prefs yet — wizard handles

  acked   = prefs.user.platforms[profile.tier].model_tiers_version_acked
  current = profile.model_tiers_version

  IF acked != current:
    return {
      drifted: true,
      message: "Platform model catalog updated since you last set preferences "
             + "(was: " + acked + ", now: " + current + "). "
             + "Run /superpipelines:change-models to review."
    }
  return { drifted: false, message: null }
```

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
- "I'll re-resolve at dispatch time per step." → **STOP**. Phase 0.4 resolves once upfront and writes to state. Phase 3 reads state. Re-resolution at dispatch causes mid-run inconsistency if prefs change.
- "I'll merge workspace and user prefs into one object." → **STOP**. Consult-in-order preserves provenance (which layer won); merging loses the `source` field.
- "I'll call platform APIs to validate the resolved model exists." → **STOP**. Resolver is pure. Validation belongs in `change-models` Phase 4.

## Reference Files

- `references/resolution-algorithm.md` — Edge-case table + worked examples.
- `references/emit-formats.md` — Per-platform serialization specs with byte-for-byte examples.
- `fixtures/` — Input/expected fixture pairs for each branch of the algorithm.
- `sk-platform-dispatch/profiles/{tier}.json` — Profile defaults, single source of truth.
- `sk-pipeline-state/SKILL.md` — State file schema (`metadata.resolved_models`).
