# Emit Formats — Per-Platform Serialization

> Companion to `sk-model-resolver/SKILL.md`. Byte-for-byte serialization examples per `model_field_format` value.

## Table of Contents

- [`shorthand` (Claude Code)](#shorthand-claude-code)
- [`provider_prefixed` (OpenCode)](#provider_prefixed-opencode)
- [`toml_split` (Codex)](#toml_split-codex)
- [`omit` (Tier 2, Antigravity dynamic)](#omit-tier-2-antigravity-dynamic)

## `shorthand` (Claude Code)

Single YAML line. Effort field absent (CC has no native effort).

**Resolved:**
```json
{ "model": "claude-opus-4-7", "effort": null, "model_field_format": "shorthand" }
```

**EMIT output:**
```
model: claude-opus-4-7
```

**Where emitted:** agent frontmatter, OR Task() prompt override:
```javascript
Task({
  subagent_type: "my-agent",
  model: "claude-opus-4-7",
  prompt: "..."
})
```

## `provider_prefixed` (OpenCode)

Single YAML line with `provider/` prefix.

**Resolved:**
```json
{ "model": "opencode-go/kimi-k2.6", "effort": "high",
  "effort_field_name": "reasoningEffort", "model_field_format": "provider_prefixed" }
```

**EMIT output (model only):**
```
model: opencode-go/kimi-k2.6
```

**Note on effort on OC:** `reasoningEffort` is provider-pass-through; it is set as a sibling key in agent frontmatter (not emitted by `EMIT` in v2.0). Dispatch payload sets it separately when `resolved.effort` is non-null. Example agent frontmatter:

```yaml
---
name: deep-thinker
model: opencode-go/kimi-k2.6
reasoningEffort: high
---
```

## `toml_split` (Codex)

TOML — two separate keys. Effort emitted only when non-null.

**Resolved:**
```json
{ "model": "gpt-5.5", "effort": "high",
  "effort_field_name": "model_reasoning_effort", "model_field_format": "toml_split" }
```

**EMIT output:**
```
model = "gpt-5.5"
model_reasoning_effort = "high"
```

When effort is null:
```
model = "gpt-5.5"
```

## `omit` (Tier 2, Antigravity dynamic)

Empty string. `EMIT` returns `""`. The field is not written to agent files or dispatch payloads.

**Resolved:**
```json
{ "model": null, "model_field_format": "omit" }
```

**EMIT output:** (empty)

**Where this matters:** scaffolding on Tier 2 produces agent files without a `model:` line. The host IDE's selected model handles the work. Antigravity dynamic subagents likewise omit per-subagent model assignment.
