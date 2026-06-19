---
name: change-models
description: Reassign Superpipelines model-tier preferences across user, workspace, and pipeline scopes.
user-invocable: false
---

# Change Models — Multi-Platform Model Preference Management

<glossary>
  <term name="User-global prefs">~/.superpipelines/model-preferences.json — defaults across all workspaces.</term>
  <term name="Workspace prefs">&lt;workspace&gt;/.superpipelines/model-preferences.json — overrides per project.</term>
  <term name="Escape hatch">Adding `model: <concrete>` to an agent file bypasses tier resolution; flagged SEV-3 by auditor.</term>
  <term name="Catalog drift">Profile `model_tiers_version` advances; user's `model_tiers_version_acked` is stale.</term>
</glossary>

## Workflow

<protocol>

### PHASE 0 — Scope Detection

- Load `sk-platform-dispatch` → `DETECT()` → `platform_profile`.
- Enumerate scope roots that exist in the workspace:
  - `<workspace>/.claude/`, `<workspace>/.opencode/`, `<workspace>/.agents/`, `<workspace>/.superpipelines/`
- For each existing root, scan `<root>/superpipelines/registry.json` for pipelines.
- If no pipelines anywhere AND no preference files: only Mode E (first-run wizard) is offered.
- Present platform context: "Active platform: <profile.name> (<profile.tier>). Pipelines found in: <root list>."

### PHASE 1 — Mode Selection

Present seven modes:

| Mode | Action |
|---|---|
| **A** — User-global prefs | Edit `~/.superpipelines/model-preferences.json`; bump `model_tiers_version_acked` |
| **B** — Workspace prefs | Edit `<workspace>/.superpipelines/model-preferences.json` |
| **C** — Per-agent `model_tier:` override | Edit agent frontmatter |
| **D** — Per-agent explicit `model:` (escape hatch, advanced) | Edit agent frontmatter; surfaces SEV-3 audit warning |
| **E** — First-run wizard | Interactive 4-tier setup with subscription detection |
| **F** — Catalog refresh | Reconcile prefs with new profile `model_tiers_version` |
| **G** (Q6) — Orchestrator-tier override | Set the orchestrator-only model tier on platforms where per-step assignment is meaningless (`dynamic_subagents: true` or `model_field_format: "omit"`). Writes to user or workspace prefs at `platforms[tier].orchestrator_tier`. |

**Q6 mode availability rule:** Modes C and D (per-agent overrides) are **hidden** when the active `platform_profile` has `dynamic_subagents: true` (Tier 1c) OR `model_field_format: "omit"` (Tier 2) — per-agent overrides have no runtime effect on those platforms. The mode selection menu surfaces Mode G in their place. Mode G is hidden on per-step-capable tiers (1, 1b, 1d) where the standard A/B/C/D suffice.

`$ARGUMENTS` fast-paths bypass Mode selection:
- `/superpipelines:change-models all deep to <model>` → Mode C, target=all, tier=deep
- `/superpipelines:change-models reset tier_1` → Mode A, full re-wizard for tier_1
- `/superpipelines:change-models drift` → Mode F

**HARD-GATE**: empty `$ARGUMENTS` → present all seven modes. NEVER fabricate intent.

### PHASE 2 — Agent Selection (Modes C, D only)

- Scan all agent files under chosen scope roots:
  - `<root>/agents/superpipelines/**/*.md` (CC, OC)
  - `<root>/agents/superpipelines/**/*.toml` (Codex)
- For each agent, read frontmatter and compute `resolved = RESOLVE(agent, profile, prefs)`.
- Display table:
  ```
  #   Agent                        Tier    Resolved model               Source
  1   my-pipeline/architect        deep    <profile.model_tiers.deep>   user_prefs
  2   my-pipeline/coder            medium  <profile.model_tiers.medium> profile_default
  3   my-pipeline/formatter        fast    <profile.model_tiers.fast>   workspace_prefs
  ```
- Selection: `1,3`, `1-3`, `all`, or named agent.

### PHASE 3 — Apply

**Modes A/B**: Read existing prefs file (or initialize). For each tier, write the chosen model. Write `model_tiers_version_acked = profile.model_tiers_version`. **Stamp `platforms[profile.tier].name = profile.name`** so the JSON is self-describing (display-only sibling of `tiers`; resolver ignores it). Atomic write (temp file + rename).

**Mode C**: For each selected agent, edit frontmatter `model_tier:` field (add if absent). Preserve all other fields and ordering.

**Mode D**: Add `model:` field after `name:` (or update if present). Emit warning: "Escape hatch — auditor will flag SEV-3."

**Mode E (first-run wizard)** — see § Mode E Wizard Detail below.

**Mode F (catalog refresh)**:
- Load `sk-model-resolver`.
- For active platform, compute diff:
  ```
  acked = prefs.user.platforms[tier].model_tiers_version_acked
  current = profile.model_tiers_version
  diff: for each tier in [triage,fast,medium,deep], compare prefs.tiers[tier] vs profile.model_tiers[tier].model
  ```
- Present diff table; prompt accept / edit / cancel.
- On accept: bump `model_tiers_version_acked = current`. No tier value rewrites unless user explicitly opts in.

### PHASE 4 — Verification

- Re-load `sk-model-resolver`.
- For each affected agent (Modes C/D) OR for a representative agent per pipeline (Modes A/B):
  - Compute `resolved = RESOLVE(...)` against the new prefs.
- Display before/after table.
- Confirm "All changes applied successfully" with file paths edited.

</protocol>

## Mode E Wizard Detail

```
══════════════════════════════════════════════════════════════
  Superpipelines Model Preference Setup — Platform: <name>
══════════════════════════════════════════════════════════════

Subscription detection (OC example):
  Read ~/.opencode/auth.json:
    Go subscription:    active ✓ / inactive ✗
    Zen access:         ✓ / ✗
    Anthropic API key:  set / not set

Adapts "Suggested alts" list based on detection:
  - Go active → Go models suggested first
  - Go inactive → Zen + direct-API suggested
  - Anthropic key set → anthropic/* alts included

For each tier in [triage, fast, medium, deep]:
  Show:
    - Profile default
    - 2-3 suggested alts with cost/quota annotations
    - Prompt for choice (enter=accept default)

Optional effort_default prompt (one per tier).

Save to:
  (1) ~/.superpipelines/model-preferences.json  [user-global]
  (2) <workspace>/.superpipelines/model-preferences.json  [workspace-only]
  (3) Both

Atomic write. Bump model_tiers_version_acked to current profile version.
```

### Subscription detection helpers (per platform)

| Platform | Detection source |
|---|---|
| OC (tier_1b) | `~/.opencode/auth.json` — keys: `opencode_go.active`, `opencode_zen.enabled`, `anthropic.key_set` |
| CC (tier_1) | `~/.claude/auth.json` or `ANTHROPIC_API_KEY` env — paid plan vs free |
| Codex (tier_1d) | `~/.codex/auth.json` — `openai.subscription_tier` |
| Antigravity (tier_1c) | `~/.antigravity/config.json` — `gemini.subscription` |
| Tier 2 | N/A — host IDE controls model; wizard skipped |

If detection file does not exist: prompt user to specify subscription state manually with multiple-choice.

<invariants>
- NEVER modify a profile JSON. Profiles are plugin-owned source of truth.
- NEVER modify an agent file without showing the user the before/after frontmatter and obtaining explicit confirmation.
- ALWAYS bump `model_tiers_version_acked` when writing prefs (Modes A/B/E/F).
- ALWAYS stamp `platforms[profile.tier].name = profile.name` when writing prefs. Canonical key stays `tier_1` / `tier_1b` / etc.; `name` is a display-only sibling.
- ALWAYS preserve frontmatter field ordering when editing agent files.
- NEVER remove or alter frontmatter fields other than the targeted field (`model_tier:`, `effort_tier:`, `model:`).
- NEVER auto-migrate v1 agents in this skill — `sk-model-migration` owns that path (called from `running-a-pipeline` Phase 0.45).
</invariants>

## Red Flags — STOP

- "I'll skip the confirmation table because the diff is small." → **STOP**. Confirm-before-write is non-negotiable.
- "I'll edit the profile JSON to add a custom model." → **STOP**. Profiles are plugin-owned. Custom models go into preference files.
- "I'll merge multiple pipelines' agents into one selection prompt without showing scope roots." → **STOP**. Multi-platform scope display is mandatory to avoid editing the wrong file.
- "Empty `$ARGUMENTS` — I'll pick Mode E by default." → **STOP**. Empty args → present all seven modes.

## Reference Files

- `references/model-catalog.md` — Deprecated in v2.0; resolver uses profile JSONs as catalog source.
- `sk-model-resolver/SKILL.md` — Resolution algorithm.
- `sk-platform-dispatch/profiles/{tier}.json` — Model catalog source of truth.
- `sk-pipeline-paths/SKILL.md` — Scope-root resolution.
