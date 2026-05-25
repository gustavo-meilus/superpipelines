# Resolution Algorithm — Normative Specification

> **This file is the single normative source for the resolution algorithm.**
> `sk-model-resolver/SKILL.md` and `running-a-pipeline` Phase 0.4 are both adapters of this spec.
> Changing the algorithm means editing this file. Both adapters must then be verified against it.

## Table of Contents

- [RESOLVE](#resolve)
- [LOAD_PREFS](#load_prefs)
- [EMIT](#emit)
- [RENDER_RESOLUTION_TABLE](#render_resolution_table)
- [REVERSE_MAP](#reverse_map)
- [DETECT_CATALOG_DRIFT](#detect_catalog_drift)
- [Worked Examples](#worked-examples)

---

## RESOLVE

```
RESOLVE(agent_frontmatter, profile, prefs) → resolved

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
      provider_prefix = model.split("/")[0]
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

**Invariants:**
- Steps 4 and 5 gate on independent capability flags (`dynamic_subagents`, `model_field_format`, `tier`). Neither implies the other. Both must always be evaluated — never short-circuit one by inferring from the other.
- `prefs` must be a valid `{ user, workspace }` object. When file-read fails, callers pass `{ platforms: {} }` for the failed source. Passing null is an error.
- `source` is always one of the five enum literals: `frontmatter_override | workspace_prefs | user_prefs | profile_default | host_inherit`.

---

## LOAD_PREFS

```
LOAD_PREFS(workspace_root) → { user, workspace }

  user_path      = expand("~/.superpipelines/model-preferences.json")
  workspace_path = workspace_root + "/.superpipelines/model-preferences.json"

  user      = file_exists(user_path)      ? read_json(user_path)      : { platforms: {} }
  workspace = file_exists(workspace_path) ? read_json(workspace_path) : { platforms: {} }

  return { user: user, workspace: workspace }
```

**Invariant:** No merge step. RESOLVE consults workspace first, falls through to user, preserving per-source provenance for the `source` field.

---

## EMIT

```
EMIT(resolved, target_format) → string

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

---

## RENDER_RESOLUTION_TABLE

Renders a human-facing markdown table from a batch of resolved step entries. This is the authoritative format — callers print the return value verbatim.

```
RENDER_RESOLUTION_TABLE(entries[]) → string

  entries[] = array of {
    step_id:    string,
    agent_name: string,
    model_tier: string,
    resolved:   { model, effort, effort_field_name, model_field_format, source, warnings }
  }

  header = "| Step | Agent | Tier | Model | Source |"
  sep    = "|------|-------|------|-------|--------|"
  rows   = []
  notes  = []

  FOR each entry IN entries:
    model_cell = entry.resolved.model ?? "(host)"
    rows.append(
      "| " + entry.step_id
      + " | " + entry.agent_name
      + " | " + entry.model_tier
      + " | " + model_cell
      + " | " + entry.resolved.source
      + " |"
    )
    FOR each w IN entry.resolved.warnings:
      notes.append("> ⚠ Step " + entry.step_id + ": " + w)

  table = join([header, sep] + rows, "\n")
  IF notes is not empty:
    table += "\n\n" + join(notes, "\n")

  return table
```

**Fixture:** `sk-model-resolver/fixtures/render-table/` — 3-entry input with one `host_inherit` step; expected output has the `(host)` cell and the `⚠` note line.

---

## REVERSE_MAP

```
REVERSE_MAP(concrete_model, profile) → tier_id | null

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

---

## DETECT_CATALOG_DRIFT

```
DETECT_CATALOG_DRIFT(prefs, profile) → { drifted: bool, message: string | null }

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

---

## Worked Examples

> Worked examples use the profiles in `skills/sk-platform-dispatch/profiles/{tier}.json`.
> All expected outputs are also captured in `skills/sk-model-resolver/fixtures/`.

### Branch 1: Explicit `model:` Override

**Input agent frontmatter:**
```yaml
name: weird-experiment
model: opencode-go/glm-5.1
model_tier: medium
```

**Profile:** tier_1b (OC). **Prefs:** any.

**Output:**
```json
{
  "model": "opencode-go/glm-5.1",
  "effort": null,
  "effort_field_name": null,
  "model_field_format": "provider_prefixed",
  "source": "frontmatter_override",
  "warnings": ["Explicit model override bypasses tier resolution"]
}
```

The `model_tier:` is ignored. Explicit wins.

### Branch 2: Standard tier resolution

**Input agent frontmatter:**
```yaml
name: architect
model_tier: deep
effort_tier: high
```

**Profile:** tier_1 (CC) — see `profiles/tier_1.json`.
**User prefs:** `{ tier_1: { tiers: { deep: "claude-opus-4-7" } } }`.

**Output:**
```json
{
  "model": "claude-opus-4-7",
  "effort": null,
  "effort_field_name": null,
  "model_field_format": "shorthand",
  "source": "user_prefs",
  "warnings": []
}
```

Effort dropped to null because `profile.capabilities.effort_field_name == null` (CC has no native effort field).

### Branch 3: Dynamic-subagent platform (Step 4 gate)

**Input agent frontmatter:**
```yaml
name: implementer
model_tier: medium
```

**Profile:** tier_1c (Antigravity, `dynamic_subagents: true`, `model_field_format: "omit"`).

**Output:**
```json
{
  "model": null,
  "effort": null,
  "effort_field_name": null,
  "model_field_format": "omit",
  "source": "host_inherit",
  "warnings": ["Dynamic-subagent platform — host orchestrator picks model"]
}
```

Step 4 fires before step 5. `EMIT` returns empty string.

**Regression note:** Prior to ADR-0001, the inline adapter skipped step 4 and emitted a literal model string instead of `null`. This fixture (`fixtures/antigravity-dynamic/`) is the regression guard — both adapters must produce this output.

### Branch 4: Tier 2 inherit (Step 5 gate — `model_field_format: "omit"`)

**Input agent frontmatter:**
```yaml
name: any-agent
model_tier: deep
```

**Profile:** tier_2 (`model_field_format: "omit"`, `dynamic_subagents: false`).

**Output:**
```json
{
  "model": null,
  "effort": null,
  "effort_field_name": null,
  "model_field_format": "omit",
  "source": "host_inherit",
  "warnings": ["Model resolves to host session — no per-step model emitted."]
}
```

Step 5 fires (`model_field_format == "omit"`). Step 4 did not fire (`dynamic_subagents: false`).

**Regression note:** Prior to ADR-0001, the inline adapter skipped step 5 and returned `source: profile_default` with a literal model string. Both adapters must produce this output.

### Branch 5: Effort filtering by provider family

**Input:**
```yaml
name: any-agent
model_tier: medium
effort_tier: high
```

**Profile:** tier_1b, with `effort_field_applies_to_providers: ["opencode","opencode-go"]`.
**User prefs:** `{ tier_1b: { tiers: { medium: "anthropic/claude-sonnet-4-6" } } }`.

Resolved model has prefix `anthropic`, not in the applies-to list.

**Output:**
```json
{
  "model": "anthropic/claude-sonnet-4-6",
  "effort": null,
  "effort_field_name": "reasoningEffort",
  "model_field_format": "provider_prefixed",
  "source": "user_prefs",
  "warnings": []
}
```

Effort dropped because Anthropic-family models on OC ignore `reasoningEffort`.

### Branch 6: Effort emit map (Codex `minimal`)

**Input:**
```yaml
name: triage-router
model_tier: triage
effort_tier: low
```

**Profile:** tier_1d, with `effort_emit_map: { low: "minimal", medium: "medium", high: "high" }`.

**Output:**
```json
{
  "model": "gpt-5.4-mini",
  "effort": "minimal",
  "effort_field_name": "model_reasoning_effort",
  "model_field_format": "toml_split",
  "source": "profile_default",
  "warnings": []
}
```

`EMIT` produces:
```
model = "gpt-5.4-mini"
model_reasoning_effort = "minimal"
```

### Branch 7: Missing user prefs, falls to profile default

**Input:**
```yaml
name: formatter
model_tier: fast
```

**Profile:** tier_1.
**Prefs:** empty for tier_1.

**Output:**
```json
{
  "model": "claude-haiku-4-5-20251001",
  "effort": null,
  "effort_field_name": null,
  "model_field_format": "shorthand",
  "source": "profile_default",
  "warnings": []
}
```

### Branch 8: Workspace overrides user

**Input:**
```yaml
name: formatter
model_tier: fast
```

**Profile:** tier_1b.
**User prefs:** `{ tier_1b: { tiers: { fast: "opencode-go/deepseek-v4-flash" } } }`.
**Workspace prefs:** `{ tier_1b: { tiers: { fast: "opencode/big-pickle" } } }`.

**Output:**
```json
{
  "model": "opencode/big-pickle",
  "effort": null,
  "effort_field_name": "reasoningEffort",
  "model_field_format": "provider_prefixed",
  "source": "workspace_prefs",
  "warnings": []
}
```

Workspace wins.

### Defaults Table

| Missing agent field | Defaulted value |
|---|---|
| `model_tier` | `"fast"` |
| `effort_tier` | `null` (then filled from prefs.effort_default or profile.model_tiers[tier].effort) |
| `role` | `null` (only `"orchestrator"` is recognized for dynamic-subagent gating) |
