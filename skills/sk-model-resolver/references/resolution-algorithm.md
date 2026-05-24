# Resolution Algorithm — Edge Cases & Worked Examples

> Companion to `sk-model-resolver/SKILL.md`. Walks each algorithm branch with concrete inputs and expected outputs.

## Table of Contents

- [Branch 1: Explicit `model:` Override](#branch-1-explicit-model-override)
- [Branch 2: Standard tier resolution](#branch-2-standard-tier-resolution)
- [Branch 3: Dynamic-subagent platform](#branch-3-dynamic-subagent-platform)
- [Branch 4: Tier 2 inherit](#branch-4-tier-2-inherit)
- [Branch 5: Effort filtering by provider family](#branch-5-effort-filtering-by-provider-family)
- [Branch 6: Effort emit map (Codex `minimal`)](#branch-6-effort-emit-map-codex-minimal)
- [Branch 7: Missing user prefs, falls to profile default](#branch-7-missing-user-prefs-falls-to-profile-default)
- [Branch 8: Workspace overrides user](#branch-8-workspace-overrides-user)

## Branch 1: Explicit `model:` Override

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

## Branch 2: Standard tier resolution

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

## Branch 3: Dynamic-subagent platform

**Input agent frontmatter:**
```yaml
name: implementer
model_tier: medium
```

**Profile:** tier_1c (Antigravity, dynamic_subagents=true).

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

`EMIT` returns empty string. Dispatch payload omits `model:` field.

## Branch 4: Tier 2 inherit

**Input agent frontmatter:**
```yaml
name: any-agent
model_tier: deep
```

**Profile:** tier_2.

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

## Branch 5: Effort filtering by provider family

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

## Branch 6: Effort emit map (Codex `minimal`)

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

## Branch 7: Missing user prefs, falls to profile default

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

## Branch 8: Workspace overrides user

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

## Defaults Table

| Missing agent field | Defaulted value |
|---|---|
| `model_tier` | `"fast"` |
| `effort_tier` | `null` (then filled from prefs.effort_default or profile.model_tiers[tier].effort) |
| `role` | `null` (only `"orchestrator"` is recognized for dynamic-subagent gating) |
