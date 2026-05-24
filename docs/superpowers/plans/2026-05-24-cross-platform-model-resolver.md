# Cross-Platform Model Resolver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace v1.x hardcoded-model frontmatter with a 4-tier, user-configurable, profile-driven resolver that adapts seamlessly across CC, OC, Codex, Antigravity, and Tier 2 IDEs.

**Architecture:** Agent frontmatter declares a `model_tier` role (`triage|fast|medium|deep|inherit`) plus optional `effort_tier`. A pure-function resolver skill (`sk-model-resolver`) walks a 5-layer precedence chain (agent override → workspace prefs → user prefs → profile default → host inherit) at run time and stamps the resolved model into `pipeline-state.json`. Dispatch reads from state; profile JSONs are the single source of truth for per-platform model IDs.

**Tech Stack:** Markdown SKILL files (LLM instructions, not executable code), JSON profile/preference files, YAML agent frontmatter, TOML for Codex agents. No new build dependencies. Fixtures live alongside skills for manual verification.

**Spec:** `docs/superpipelines/specs/2026-05-24-cross-platform-model-resolver-design.md`
**Branch:** `feat/multi-platform-impl`
**Target release:** v2.0.0
**Plugin version:** stays at `2.0.0` (already bumped in `.claude-plugin/plugin.json`).

---

## Testing Strategy Note

Superpipelines skills are LLM instructions, not executable code — no test runner exists. "Tests" in this plan mean:
1. **Static fixture files** — input JSONs + expected output JSONs stored under `skills/sk-model-resolver/fixtures/`. An engineer (or LLM) reads the SKILL.md, walks the algorithm on the fixture, and verifies the output matches the expected file.
2. **Auditor runs** — invoke `pipeline-auditor` against each modified skill/agent/profile after editing; expect zero SEV-0/SEV-1 findings.
3. **Cross-tier scenario walkthroughs** — three manual end-to-end fixtures (CC→OC, CC→Codex, Antigravity) verified by inspecting `pipeline-state.json` output.

Each task includes verification commands; "expected output" means what you should observe after the edit. Where a "failing test" is written first, it means *create the fixture with the expected output you want before editing the skill* — then verify by walking the algorithm yourself.

---

## File Structure

**New files (8):**
| Path | Responsibility |
|---|---|
| `skills/sk-model-resolver/SKILL.md` | Public API + resolution algorithm + invariants |
| `skills/sk-model-resolver/references/resolution-algorithm.md` | Step-by-step pseudocode with edge-case table |
| `skills/sk-model-resolver/references/emit-formats.md` | Per-platform serialization rules |
| `skills/sk-model-resolver/fixtures/README.md` | Fixture format + how to verify |
| `skills/sk-model-resolver/fixtures/cc-deep-userprefs/` | Sample fixture: CC, deep tier, user prefs win |
| `skills/sk-model-resolver/fixtures/oc-cross-tier/` | CC→OC cross-tier resume fixture |
| `skills/sk-model-resolver/fixtures/codex-cross-family/` | CC→Codex cross-family fixture |
| `skills/sk-model-resolver/fixtures/antigravity-dynamic/` | Dynamic-subagent fixture |
| `skills/sk-model-migration/SKILL.md` | One-shot v1→v2 frontmatter migration |
| `skills/sk-model-migration/fixtures/v1-agent.md` | Pre-v2.0 agent with hardcoded `model:` |
| `skills/sk-model-migration/fixtures/v2-agent-expected.md` | Post-migration expected output |

**Modified files (15):**
| Path | Change |
|---|---|
| `skills/sk-platform-dispatch/profiles/tier_1.json` | +4-tier `model_tiers`, +effort, +capability flags, +version |
| `skills/sk-platform-dispatch/profiles/tier_1b.json` | Same + OC-specific (Go/Zen defaults, provider_families, effort_field_applies_to_providers) |
| `skills/sk-platform-dispatch/profiles/tier_1c.json` | Same + dynamic_subagents=true |
| `skills/sk-platform-dispatch/profiles/tier_1d.json` | Same + model_field_format=toml_split |
| `skills/sk-platform-dispatch/profiles/tier_2.json` | model_field_format=omit; tiers all `"inherit"` |
| `skills/sk-platform-dispatch/SKILL.md` | Document new capability fields; load sk-model-resolver |
| `skills/creating-a-pipeline/SKILL.md` | Phase 2 4-tier prompt; Phase 4 no `model:`; Phase 6 prefs bootstrap |
| `skills/running-a-pipeline/SKILL.md` | +Phase 0.4 resolution; +Phase 0.5 migration check |
| `skills/change-models/SKILL.md` | Full rewrite — 6 modes, all 5 scope roots |
| `skills/change-models/references/model-catalog.md` | Mark deprecated |
| `skills/pipeline-architect-protocol/SKILL.md` | Remove "Default to `model: sonnet`" |
| `skills/pipeline-architect-references/references/agent-frontmatter-schema.md` | Replace `model`/`effort` rows with `model_tier`/`effort_tier` |
| `skills/pipeline-auditor-protocol/SKILL.md` | +6 new audit criteria |
| `agents/pipeline-architect.md` + 6 sibling bundled agents | Migrate to `model_tier:`/`effort_tier:` |
| `CLAUDE.md` | Rewrite `MODEL_SELECTION` invariant |

---

## Task Order Rationale

A (profiles) → B (resolver core) → C (migration skill) → D (sk-platform-dispatch glue) → E (creating-a-pipeline) → F (running-a-pipeline) → G (change-models) → H (architect outputs) → I (bundled agents migration) → J (auditor) → K (CLAUDE.md) → L (end-to-end fixtures).

Profiles must land first — everything downstream reads them. Resolver before any workflow change. Migration before any workflow change that depends on v2.0 schema (otherwise existing bundled agents break). End-to-end fixtures last to verify the whole chain.

---

## Task 1: Update tier_1.json (Claude Code profile)

**Files:**
- Modify: `skills/sk-platform-dispatch/profiles/tier_1.json` (full rewrite — old version is 25 lines)

- [ ] **Step 1: Write the expected fixture**

Create `skills/sk-model-resolver/fixtures/cc-deep-userprefs/expected.json`:

```bash
mkdir -p skills/sk-model-resolver/fixtures/cc-deep-userprefs
```

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

- [ ] **Step 2: Rewrite tier_1.json**

Replace entire file content with:

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
    "effort_field_applies_to_providers": null,
    "subagent_env_override": "CLAUDE_CODE_SUBAGENT_MODEL",
    "subagent_inherit_target": "session",
    "provider_families": ["anthropic"]
  },
  "scope_root": {
    "workspace": ".claude",
    "user": "~/.claude"
  },
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

- [ ] **Step 3: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('skills/sk-platform-dispatch/profiles/tier_1.json','utf8'))"`
Expected: no output (silent success). If JSON invalid, parse error printed.

- [ ] **Step 4: Commit**

```bash
git add skills/sk-platform-dispatch/profiles/tier_1.json skills/sk-model-resolver/fixtures/cc-deep-userprefs/expected.json
git commit -m "feat(profiles): tier_1 v2.0 schema with 4-tier model_tiers"
```

---

## Task 2: Update tier_1b.json (OpenCode profile)

**Files:**
- Modify: `skills/sk-platform-dispatch/profiles/tier_1b.json`

- [ ] **Step 1: Rewrite tier_1b.json**

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
  "scope_root": {
    "workspace": ".opencode",
    "user": "~/.opencode"
  },
  "degradation_warnings": [
    "Parallel fan-out (Pattern 2) degrades to sequential on OpenCode."
  ],
  "extensions": {},
  "model_tiers": {
    "triage": { "model": "opencode/big-pickle",           "effort": "low",    "free_tier": true,  "quota_class": "free-unlimited" },
    "fast":   { "model": "opencode-go/deepseek-v4-flash", "effort": "medium", "free_tier": false, "quota_class": "go-high" },
    "medium": { "model": "opencode-go/qwen3.6-plus",      "effort": "medium", "free_tier": false, "quota_class": "go-medium" },
    "deep":   { "model": "opencode-go/kimi-k2.6",         "effort": "high",   "free_tier": false, "quota_class": "go-low" }
  }
}
```

- [ ] **Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('skills/sk-platform-dispatch/profiles/tier_1b.json','utf8'))"`
Expected: silent success.

- [ ] **Step 3: Commit**

```bash
git add skills/sk-platform-dispatch/profiles/tier_1b.json
git commit -m "feat(profiles): tier_1b OC defaults to Go subscription + Zen big-pickle"
```

---

## Task 3: Update tier_1c.json (Antigravity profile)

**Files:**
- Modify: `skills/sk-platform-dispatch/profiles/tier_1c.json`

- [ ] **Step 1: Read current file to preserve any aspirational notes**

Run: `cat skills/sk-platform-dispatch/profiles/tier_1c.json`
Note any existing `aspirational: true` flag or notes to carry forward.

- [ ] **Step 2: Rewrite tier_1c.json**

```json
{
  "tier": "tier_1c",
  "name": "Antigravity",
  "profile_version": "2.0.0",
  "model_tiers_version": "2026-05-19",
  "aspirational": true,
  "capabilities": {
    "subagents": true,
    "parallel_subagents": true,
    "task_primitive": false,
    "skill_tool": true,
    "worktrees": false,
    "reviewer_isolation": "convention",
    "dispatch_mechanism": "model_driven",
    "dynamic_subagents": true,
    "model_field_format": "omit",
    "effort_field_name": null,
    "effort_field_applies_to_providers": null,
    "subagent_env_override": null,
    "subagent_inherit_target": "orchestrator",
    "provider_families": ["google"]
  },
  "scope_root": {
    "workspace": ".agents",
    "user": "~/.antigravity"
  },
  "degradation_warnings": [
    "Antigravity uses dynamic subagents — per-step model assignment is not supported. Only the orchestrator's model tier is user-configurable. Subagent model selection is owned by Antigravity's orchestrator."
  ],
  "extensions": {
    "default_orchestrator_model": "gemini-3.5-flash",
    "subagent_model_control": "orchestrator-only"
  },
  "model_tiers": {
    "triage": { "model": "gemini-3.5-flash", "effort": "low" },
    "fast":   { "model": "gemini-3.5-flash", "effort": "medium" },
    "medium": { "model": "gemini-3.5-pro",   "effort": "medium" },
    "deep":   { "model": "gemini-3.5-pro",   "effort": "high" }
  }
}
```

- [ ] **Step 3: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('skills/sk-platform-dispatch/profiles/tier_1c.json','utf8'))"`
Expected: silent success.

- [ ] **Step 4: Commit**

```bash
git add skills/sk-platform-dispatch/profiles/tier_1c.json
git commit -m "feat(profiles): tier_1c Antigravity dynamic_subagents=true"
```

---

## Task 4: Update tier_1d.json (Codex profile)

**Files:**
- Modify: `skills/sk-platform-dispatch/profiles/tier_1d.json`

- [ ] **Step 1: Rewrite tier_1d.json**

```json
{
  "tier": "tier_1d",
  "name": "Codex",
  "profile_version": "2.0.0",
  "model_tiers_version": "2026-05-19",
  "capabilities": {
    "subagents": true,
    "parallel_subagents": true,
    "task_primitive": false,
    "skill_tool": true,
    "worktrees": false,
    "reviewer_isolation": "structural",
    "dispatch_mechanism": "model_driven",
    "dynamic_subagents": false,
    "model_field_format": "toml_split",
    "effort_field_name": "model_reasoning_effort",
    "effort_field_applies_to_providers": null,
    "effort_emit_map": { "low": "minimal", "medium": "medium", "high": "high" },
    "subagent_env_override": null,
    "subagent_inherit_target": "session",
    "provider_families": ["openai"]
  },
  "scope_root": {
    "workspace": ".agents",
    "user": "~/.codex"
  },
  "degradation_warnings": [],
  "extensions": {
    "max_concurrent_subagents": 6,
    "reviewer_isolation_recipe": "Set sandbox_mode = \"read-only\" in the reviewer agent TOML to achieve structural write-deny. sandbox_mode = \"workspace-write\" is the writer default.",
    "skill_tool_note": "Codex discovers SKILL.md via `.agents/skills` (cross-tool open path) and `$HOME/.agents/skills`. Skill content preloads at session start; no runtime Skill() primitive callable from another skill."
  },
  "model_tiers": {
    "triage": { "model": "gpt-5.4-mini", "effort": "low" },
    "fast":   { "model": "gpt-5.4-mini", "effort": "medium" },
    "medium": { "model": "gpt-5.4",      "effort": "medium" },
    "deep":   { "model": "gpt-5.5",      "effort": "high" }
  }
}
```

- [ ] **Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('skills/sk-platform-dispatch/profiles/tier_1d.json','utf8'))"`
Expected: silent success.

- [ ] **Step 3: Commit**

```bash
git add skills/sk-platform-dispatch/profiles/tier_1d.json
git commit -m "feat(profiles): tier_1d Codex toml_split + effort_emit_map"
```

---

## Task 5: Update tier_2.json (Cursor/Windsurf/Cline profile)

**Files:**
- Modify: `skills/sk-platform-dispatch/profiles/tier_2.json`

- [ ] **Step 1: Rewrite tier_2.json**

```json
{
  "tier": "tier_2",
  "name": "Cursor / Windsurf / Cline",
  "profile_version": "2.0.0",
  "model_tiers_version": "2026-05-19",
  "capabilities": {
    "subagents": false,
    "parallel_subagents": false,
    "task_primitive": false,
    "skill_tool": true,
    "worktrees": false,
    "reviewer_isolation": "convention",
    "dispatch_mechanism": "inline",
    "dynamic_subagents": false,
    "model_field_format": "omit",
    "effort_field_name": null,
    "effort_field_applies_to_providers": null,
    "subagent_env_override": null,
    "subagent_inherit_target": "session",
    "provider_families": []
  },
  "scope_root": {
    "workspace": ".superpipelines",
    "user": "~/.superpipelines"
  },
  "degradation_warnings": [
    "Reviewer isolation is convention-only; reviews are advisory, not structurally enforced.",
    "Parallel fan-out (Pattern 2) degrades to sequential.",
    "Iterative pattern (Pattern 3) cycle limit still enforced inline.",
    "Model selection is owned by the host IDE; per-step model assignment is not emitted."
  ],
  "extensions": {
    "skill_tool_note": "Cursor, Windsurf, and Cline load skill content via file read or prompt injection, not a native Skill() primitive. The skill_tool capability flag is treated as equivalent for routing purposes in this profile."
  },
  "model_tiers": {
    "triage": { "model": "inherit", "effort": null },
    "fast":   { "model": "inherit", "effort": null },
    "medium": { "model": "inherit", "effort": null },
    "deep":   { "model": "inherit", "effort": null }
  }
}
```

- [ ] **Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('skills/sk-platform-dispatch/profiles/tier_2.json','utf8'))"`
Expected: silent success.

- [ ] **Step 3: Commit**

```bash
git add skills/sk-platform-dispatch/profiles/tier_2.json
git commit -m "feat(profiles): tier_2 model_field_format=omit (host-controlled)"
```

---

## Task 6: Create sk-model-resolver SKILL.md

**Files:**
- Create: `skills/sk-model-resolver/SKILL.md`

- [ ] **Step 1: Create directory + SKILL.md**

```bash
mkdir -p skills/sk-model-resolver/references skills/sk-model-resolver/fixtures
```

Write `skills/sk-model-resolver/SKILL.md`:

```markdown
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
```

- [ ] **Step 2: Verify the skill loads (lint-check via Glob)**

Run: `node -e "const fs=require('fs'); const s=fs.readFileSync('skills/sk-model-resolver/SKILL.md','utf8'); if(!s.startsWith('---\n')) throw new Error('missing frontmatter'); if(!s.includes('disable-model-invocation: true')) throw new Error('missing protocol flag'); console.log('ok')"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add skills/sk-model-resolver/SKILL.md
git commit -m "feat(resolver): add sk-model-resolver skill with 5-layer algorithm"
```

---

## Task 7: Create resolution-algorithm.md reference

**Files:**
- Create: `skills/sk-model-resolver/references/resolution-algorithm.md`

- [ ] **Step 1: Write reference doc**

```markdown
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
  "effort_field_name": "reasoningEffort",
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
```

- [ ] **Step 2: Commit**

```bash
git add skills/sk-model-resolver/references/resolution-algorithm.md
git commit -m "docs(resolver): edge-case walkthroughs for resolution algorithm"
```

---

## Task 8: Create emit-formats.md reference

**Files:**
- Create: `skills/sk-model-resolver/references/emit-formats.md`

- [ ] **Step 1: Write reference doc**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add skills/sk-model-resolver/references/emit-formats.md
git commit -m "docs(resolver): per-platform EMIT format specifications"
```

---

## Task 9: Create resolver fixtures

**Files:**
- Create: `skills/sk-model-resolver/fixtures/README.md`
- Create: `skills/sk-model-resolver/fixtures/cc-deep-userprefs/{input.json,expected.json}`
- Create: `skills/sk-model-resolver/fixtures/oc-cross-tier/{input.json,expected.json}`
- Create: `skills/sk-model-resolver/fixtures/codex-cross-family/{input.json,expected.json}`
- Create: `skills/sk-model-resolver/fixtures/antigravity-dynamic/{input.json,expected.json}`

- [ ] **Step 1: Write fixtures/README.md**

```markdown
# Resolver Fixtures

> Input/expected pairs for verifying `sk-model-resolver` RESOLVE algorithm. There is no automated runner; an engineer or LLM reads `input.json`, runs RESOLVE mentally per `../SKILL.md`, and diffs against `expected.json`.

## Fixture format

Each fixture directory contains:
- `input.json` — `{ agent: {...}, profile: {...}, prefs: {...} }`
- `expected.json` — the `resolved` object RESOLVE should return.

## How to verify

1. Open `input.json` and `expected.json`.
2. Walk RESOLVE step-by-step per `../SKILL.md` § RESOLVE Algorithm.
3. Compare your computed output against `expected.json`. They must match key-for-key.

## Fixture list

| Fixture | Branch tested |
|---|---|
| `cc-deep-userprefs/` | Standard tier resolution, user_prefs wins, CC profile |
| `oc-cross-tier/` | CC-scaffolded agent resolved on OC profile (cross-tier) |
| `codex-cross-family/` | CC-scaffolded agent resolved on Codex (cross-family + effort_emit_map) |
| `antigravity-dynamic/` | Dynamic-subagent platform — host_inherit branch |
```

- [ ] **Step 2: Write cc-deep-userprefs fixture**

`skills/sk-model-resolver/fixtures/cc-deep-userprefs/input.json`:
```json
{
  "agent": {
    "name": "architect",
    "model_tier": "deep",
    "effort_tier": "high"
  },
  "profile": {
    "tier": "tier_1",
    "capabilities": {
      "dynamic_subagents": false,
      "model_field_format": "shorthand",
      "effort_field_name": null,
      "effort_field_applies_to_providers": null,
      "subagent_inherit_target": "session"
    },
    "model_tiers": {
      "deep": { "model": "claude-opus-4-7", "effort": "high" }
    }
  },
  "prefs": {
    "user": {
      "platforms": {
        "tier_1": {
          "tiers": { "deep": "claude-opus-4-7" }
        }
      }
    },
    "workspace": { "platforms": {} }
  }
}
```

`expected.json`:
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

- [ ] **Step 3: Write oc-cross-tier fixture**

```bash
mkdir -p skills/sk-model-resolver/fixtures/oc-cross-tier
```

`input.json`:
```json
{
  "agent": {
    "name": "implementer",
    "model_tier": "medium"
  },
  "profile": {
    "tier": "tier_1b",
    "capabilities": {
      "dynamic_subagents": false,
      "model_field_format": "provider_prefixed",
      "effort_field_name": "reasoningEffort",
      "effort_field_applies_to_providers": ["opencode", "opencode-go"],
      "subagent_inherit_target": "primary"
    },
    "model_tiers": {
      "medium": { "model": "opencode-go/qwen3.6-plus", "effort": "medium" }
    }
  },
  "prefs": { "user": { "platforms": {} }, "workspace": { "platforms": {} } }
}
```

`expected.json`:
```json
{
  "model": "opencode-go/qwen3.6-plus",
  "effort": "medium",
  "effort_field_name": "reasoningEffort",
  "model_field_format": "provider_prefixed",
  "source": "profile_default",
  "warnings": []
}
```

- [ ] **Step 4: Write codex-cross-family fixture**

```bash
mkdir -p skills/sk-model-resolver/fixtures/codex-cross-family
```

`input.json`:
```json
{
  "agent": {
    "name": "triage-router",
    "model_tier": "triage",
    "effort_tier": "low"
  },
  "profile": {
    "tier": "tier_1d",
    "capabilities": {
      "dynamic_subagents": false,
      "model_field_format": "toml_split",
      "effort_field_name": "model_reasoning_effort",
      "effort_field_applies_to_providers": null,
      "effort_emit_map": { "low": "minimal", "medium": "medium", "high": "high" },
      "subagent_inherit_target": "session"
    },
    "model_tiers": {
      "triage": { "model": "gpt-5.4-mini", "effort": "low" }
    }
  },
  "prefs": { "user": { "platforms": {} }, "workspace": { "platforms": {} } }
}
```

`expected.json`:
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

- [ ] **Step 5: Write antigravity-dynamic fixture**

```bash
mkdir -p skills/sk-model-resolver/fixtures/antigravity-dynamic
```

`input.json`:
```json
{
  "agent": {
    "name": "any-step",
    "model_tier": "deep"
  },
  "profile": {
    "tier": "tier_1c",
    "capabilities": {
      "dynamic_subagents": true,
      "model_field_format": "omit",
      "effort_field_name": null,
      "subagent_inherit_target": "orchestrator"
    },
    "model_tiers": {
      "deep": { "model": "gemini-3.5-pro", "effort": "high" }
    }
  },
  "prefs": { "user": { "platforms": {} }, "workspace": { "platforms": {} } }
}
```

`expected.json`:
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

- [ ] **Step 6: Validate all fixture JSON**

Run: `node -e "['cc-deep-userprefs','oc-cross-tier','codex-cross-family','antigravity-dynamic'].forEach(d => { ['input','expected'].forEach(f => JSON.parse(require('fs').readFileSync('skills/sk-model-resolver/fixtures/'+d+'/'+f+'.json','utf8'))); }); console.log('ok')"`
Expected: `ok`

- [ ] **Step 7: Manually walk one fixture (cc-deep-userprefs)**

Open `skills/sk-model-resolver/SKILL.md` § RESOLVE. Walk steps 1–10 with the cc-deep-userprefs input. Compare your computed `resolved` to `expected.json`. They must match.

- [ ] **Step 8: Commit**

```bash
git add skills/sk-model-resolver/fixtures/
git commit -m "test(resolver): fixtures for 4 algorithm branches (CC, OC, Codex, Antigravity)"
```

---

## Task 10: Create sk-model-migration SKILL.md

**Files:**
- Create: `skills/sk-model-migration/SKILL.md`
- Create: `skills/sk-model-migration/fixtures/v1-agent.md`
- Create: `skills/sk-model-migration/fixtures/v2-agent-expected.md`

- [ ] **Step 1: Create directory + write SKILL.md**

```bash
mkdir -p skills/sk-model-migration/fixtures
```

`skills/sk-model-migration/SKILL.md`:

```markdown
---
name: sk-model-migration
description: Use when running-a-pipeline Phase 0.5 detects a pipeline scaffolded under pre-v2.0 schema (agents with `model:` but no `model_tier:`) — converts agent frontmatter to v2.0 schema with a git-backed safety checkpoint.
disable-model-invocation: true
user-invocable: false
---

# Model Migration — v1.x → v2.0 Schema Conversion

> One-shot migration triggered by `running-a-pipeline` Phase 0.5. Detects agents with concrete `model:` fields, reverse-maps to tier, rewrites frontmatter, commits before + after.

<overview>
Pre-v2.0 pipelines baked concrete model IDs into agent frontmatter (`model: claude-sonnet-4-6`). v2.0 uses `model_tier: medium` and runtime resolution. This skill auto-migrates legacy pipelines on first run after the v2.0 upgrade, with a git commit pair so users can revert.
</overview>

## Trigger

Loaded by `running-a-pipeline` Phase 0.5 when:
```
ANY agent file under pipeline scope has `model:` AND NOT `model_tier:`
```

## Protocol

```
1. DETECT scope of pipeline (`sk-pipeline-paths`); enumerate all agent files.
2. ABORT if any agent file has both `model:` and `model_tier:` (mid-migration state — escalate to user).
3. VERIFY git is clean OR offer to stash:
     IF dirty: prompt "Uncommitted changes detected. Stash and continue? (y/N)"
       y → `git stash push -m "pre-model-migration"`
       N → abort, surface to user
4. COMMIT current state: `git commit --allow-empty -m "checkpoint: pre-v2.0-model-migration"`
5. FOR each agent file with `model:` and no `model_tier:`:
     a. Load `sk-model-resolver`; load source-tier profile from `metadata.source_tier`.
     b. tier = REVERSE_MAP(agent.model, source_profile)
     c. IF tier is null:
          Leave `model:` in place.
          Add comment line above: `# TODO: confirm tier — REVERSE_MAP ambiguous`
          Add `model_tier: medium` (safe default)
          Record in migration_report as "ambiguous".
        ELSE:
          Replace `model: <old>` with `model_tier: <tier>`.
          Record in migration_report as "exact" or "fuzzy".
6. UPDATE `topology.json`:
     metadata.migrated_at = <iso8601_now>
     metadata.source_model_tiers_version = source_profile.model_tiers_version
7. COMMIT: `git commit -am "auto-migrate: schema → model_tier resolution"`
8. EMIT migration report table:
     Step          Old model              → New tier   Confidence
     architect     claude-opus-4-7        → deep       exact
     coder         claude-sonnet-4-6      → medium     exact
     triage        claude-3-5-haiku       → triage     fuzzy
     custom        my-fine-tuned-thing    → medium     ambiguous (kept model:, added TODO)
9. PROCEED to Phase 0.6 (portability validation).
```

<invariants>
- NEVER delete the `model:` line for ambiguous reverse-maps — preserve user data with a TODO comment.
- MUST create a pre-migration commit even on a clean tree, so revert is one-step.
- MUST update `topology.json` with `migrated_at` for audit trail.
- MUST surface migration report to user before Phase 0.6.
- ON ambiguous reverse-map, BOTH `model:` and `model_tier: medium` coexist; auditor flags this as SEV-3 info.
</invariants>

## Red Flags — STOP

- "I'll auto-migrate without a git commit since the tree is clean." → **STOP**. The empty commit is the revert anchor.
- "I'll skip files with unknown model IDs." → **STOP**. Unknown IDs get `model_tier: medium` + TODO; never skip.
- "I'll prompt the user per-file." → **STOP**. Single advisory + single accept-all prompt. Per-file prompting is exhausting.

## Reference Files

- `fixtures/v1-agent.md` — Example pre-v2.0 agent.
- `fixtures/v2-agent-expected.md` — Expected post-migration output.
- `sk-model-resolver/SKILL.md` § REVERSE_MAP — Reverse-mapping algorithm.
- `sk-pipeline-paths/SKILL.md` — Scope enumeration.
```

- [ ] **Step 2: Write v1 fixture**

`skills/sk-model-migration/fixtures/v1-agent.md`:
```markdown
---
name: example-coder
description: Implements features.
model: claude-sonnet-4-6
effort: medium
maxTurns: 30
version: "1.0"
---
```

- [ ] **Step 3: Write v2 expected fixture**

`skills/sk-model-migration/fixtures/v2-agent-expected.md`:
```markdown
---
name: example-coder
description: Implements features.
model_tier: medium
effort_tier: medium
maxTurns: 30
version: "1.0"
---
```

- [ ] **Step 4: Manually verify the fixture conversion**

Walk the protocol step 5: `REVERSE_MAP("claude-sonnet-4-6", tier_1_profile)` → exact match on `medium`. Replace `model:` with `model_tier:`, `effort:` with `effort_tier:`. Verify output matches `v2-agent-expected.md`.

- [ ] **Step 5: Commit**

```bash
git add skills/sk-model-migration/
git commit -m "feat(migration): sk-model-migration skill for v1→v2 frontmatter conversion"
```

---

## Task 11: Update sk-platform-dispatch SKILL.md

**Files:**
- Modify: `skills/sk-platform-dispatch/SKILL.md`

- [ ] **Step 1: Add new capability fields to documentation**

Open `skills/sk-platform-dispatch/SKILL.md`. Find the `<protocol>` block under "Tier Detection Protocol". After the `READ(skills/sk-platform-dispatch/profiles/{tier_id}.json) → profile object` line, append:

```markdown

### Profile capability fields (v2.0 additions)

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
```

- [ ] **Step 2: Add model-resolution loading hook**

Find the "## DISPATCH Contract" section. Immediately before it, insert:

```markdown
## Model Resolution Hook

Before DISPATCH executes any step, callers MUST load `sk-model-resolver` and call `RESOLVE(agent, profile, prefs)` for each topology step. The resolved object is persisted to `pipeline-state.json metadata.resolved_models[step_id]` and consulted by DISPATCH (`native_task` model override; `native_subagent` payload; `toml_split` agent file rewrite; `omit` = no-op).

`running-a-pipeline` Phase 0.4 handles this for run-time execution. `creating-a-pipeline` Phase 4 uses resolution only for the preview table in Phase 5 approval; architect output writes `model_tier:` and never `model:`.

```

- [ ] **Step 3: Update the dispatch_tiers table**

Find the `<dispatch_tiers>` block. Replace it with:

```markdown
<dispatch_tiers>
| `dispatch_mechanism` | Model resolution source | Effort handling | Reviewer isolation source |
|---|---|---|---|
| `native_task` | Resolved model passed in Task() payload (overrides agent frontmatter) | Ignored (CC has no effort field) | `profile.capabilities.reviewer_isolation = structural`; agent `tools:` restricts reviewer |
| `native_subagent` | Resolved model + reasoningEffort written to dispatch payload | Only for `opencode/*` and `opencode-go/*` provider prefixes | `structural`; OC `permission: { edit: deny }` on reviewer agent |
| `model_driven` (Codex) | Resolved model + model_reasoning_effort written to TOML | `effort_emit_map` translates `low → minimal` | `structural`; per-agent `sandbox_mode = "read-only"` on reviewer TOML |
| `model_driven` (Antigravity) | Orchestrator tier only; subagents auto-managed | N/A (no per-subagent control) | `convention` |
| `inline` (Tier 2) | No emission — host IDE selects model | N/A | `convention` |
</dispatch_tiers>
```

- [ ] **Step 4: Verify file**

Run: `grep -c "model_resolution" skills/sk-platform-dispatch/SKILL.md`
Expected: ≥1

Run: `grep -c "model_field_format" skills/sk-platform-dispatch/SKILL.md`
Expected: ≥1

- [ ] **Step 5: Commit**

```bash
git add skills/sk-platform-dispatch/SKILL.md
git commit -m "docs(dispatch): document v2.0 profile capability fields + model resolution hook"
```

---

## Task 12: Update creating-a-pipeline Phase 2 (4-tier prompt)

**Files:**
- Modify: `skills/creating-a-pipeline/SKILL.md`

- [ ] **Step 1: Locate Phase 2 in the file**

Run: `grep -n "PHASE 2: BRIEF REFINEMENT" skills/creating-a-pipeline/SKILL.md`
Note the line number.

- [ ] **Step 2: Replace the Phase 2 model-preference paragraph**

Find the paragraph starting with `**Model preference per step**` (currently around line 38). Replace the entire bullet block (from `**Model preference per step**` through the illustrative profile-path table) with:

```markdown
- **Model preference per step (4-tier)**: For each topology step the architect will generate in Phase 4, ask the user to choose a model tier:

  | Tier | Use cases |
  |---|---|
  | `triage` | Routers, classifiers, simple decisions (cheapest model) |
  | `fast` | Execution, utility, code generation workhorse-cheap |
  | `medium` | Standard coding workhorse |
  | `deep` | Planning, architecture, review (most capable model) |

  Recommended defaults: planning/architecture/review → `deep`; coding/execution → `medium`; utility/formatting → `fast`; routers/classifiers → `triage`.

  Optionally ask per-step `effort_tier` (`low | medium | high`). Skip = use the tier's default effort from the active profile.

  Record `{step_id: {model_tier, effort_tier}}` in Phase 2 output. The architect MUST write `model_tier:` (and optional `effort_tier:`) to each generated agent's frontmatter in Phase 4. The architect MUST NOT write `model:` — that field is resolved at runtime by `sk-model-resolver`.

  Per `DEPENDENCY_INVERSION: PROFILE_DRIVEN`, concrete per-tier model IDs live exclusively in `skills/sk-platform-dispatch/profiles/{tier_id}.json` and user/workspace preference files. NEVER hardcode model IDs in this skill body or in generated agents.

  If the user declines per-step choice, default every step to `fast`.
```

- [ ] **Step 3: Verify replacement**

Run: `grep -c "model_tier:" skills/creating-a-pipeline/SKILL.md`
Expected: ≥3

Run: `grep -c "MODEL_SELECTION: DYNAMIC_DEFAULT_SONNET" skills/creating-a-pipeline/SKILL.md`
Expected: 0 (old invariant text purged)

- [ ] **Step 4: Commit**

```bash
git add skills/creating-a-pipeline/SKILL.md
git commit -m "feat(creating): Phase 2 4-tier model_tier prompt (triage/fast/medium/deep)"
```

---

## Task 13: Update creating-a-pipeline Phase 4 + Phase 6

**Files:**
- Modify: `skills/creating-a-pipeline/SKILL.md`

- [ ] **Step 1: Find Phase 4 architect dispatch section**

Run: `grep -n "PHASE 4: DESIGN" skills/creating-a-pipeline/SKILL.md`

- [ ] **Step 2: Add a bullet to Phase 4 about model_tier emission**

After the "**Dispatch Architect** (profile-driven from Phase 0):" table, insert:

```markdown
- **Architect output rule for agent frontmatter**: every generated agent file MUST declare `model_tier:` (one of `triage | fast | medium | deep | inherit`) and MAY declare `effort_tier:` (`low | medium | high`). The architect MUST NOT write a concrete `model:` field — that resolves at runtime via `sk-model-resolver`. For preview-only display in Phase 5, the architect MAY call `sk-model-resolver.RESOLVE` and `EMIT` against the active profile, but the resolved string is for the approval table only, never written to agent files.
```

- [ ] **Step 3: Update Phase 6 to bootstrap preferences**

Find the line `<HARD-GATE>Write ALL of the following to disk before ending the session.` Inside that block, after the bullet for the registry (item 8), add a new step:

```markdown
  9. **Preference bootstrap check**: IF `~/.superpipelines/model-preferences.json` does NOT contain an entry for `platform_profile.tier`, emit advisory: "No model preferences configured for `<platform_profile.name>`. Run `/superpipelines:change-models` Mode E to set them, or accept profile defaults at first run." This is non-blocking — scaffolding completes either way.
```

Renumber none; this is item 9 appended.

- [ ] **Step 4: Verify**

Run: `grep -c "Preference bootstrap" skills/creating-a-pipeline/SKILL.md`
Expected: 1

- [ ] **Step 5: Commit**

```bash
git add skills/creating-a-pipeline/SKILL.md
git commit -m "feat(creating): Phase 4 model_tier-only output + Phase 6 prefs bootstrap"
```

---

## Task 14: Add Phase 0.4 (resolution) to running-a-pipeline

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md`

- [ ] **Step 1: Locate the right insertion point**

Run: `grep -n "Phase 0.25\|Phase 0.5\|Phase 1\|Phase 3" skills/running-a-pipeline/SKILL.md | head`

Phase 0.4 inserts between 0.25 (tier detect / cross-tier resume) and 0.5 (version-compat advisory, OR migration if that's first — verify order).

- [ ] **Step 2: Insert Phase 0.4 block**

After the Phase 0.25 block ends and before the next phase begins, insert:

```markdown

### PHASE 0.4 — Model Resolution

- Load `sk-model-resolver` via the `Skill` tool.
- `LOAD_PREFS(workspace_root)` → user + workspace preference objects.
- `DETECT_CATALOG_DRIFT(prefs, platform_profile)` — IF drifted, emit advisory (non-blocking).
- FOR each agent in `topology.json` steps:
  - Read frontmatter.
  - `resolved = RESOLVE(agent, platform_profile, prefs)`.
  - Cache to `state.metadata.resolved_models[step_id]` via atomic write.
  - IF `resolved.warnings` non-empty: append each to run advisory queue.
- Emit user-facing resolution table:
  ```
  Step           Tier    Source           → Model                          Effort
  architect      deep    user_prefs       → claude-opus-4-7                (none)
  implementer    medium  profile_default  → claude-sonnet-4-6              (none)
  formatter      fast    workspace_prefs  → opencode/big-pickle            (none)
  ```
- Persist `metadata.resolved_models`, `metadata.preference_files_consulted`, `metadata.model_tiers_version_at_run` to state file.

<invariant>
Phase 0.4 runs exactly once per fresh run. On resume, IF `metadata.resolved_models` exists AND `metadata.runtime_tier` matches the new `runtime_tier` AND profile `model_tiers_version` unchanged: skip re-resolution. ELSE re-resolve and log a "models re-resolved on resume" entry to `metadata.resolution_events`.
</invariant>
```

- [ ] **Step 3: Insert Phase 0.5 migration check block**

Immediately after Phase 0.4, insert:

```markdown

### PHASE 0.5 — Model Migration Check

- Scan all agent files under the pipeline scope.
- IF any agent has `model:` field AND no `model_tier:` field:
  - Load `sk-model-migration` via `Skill` tool.
  - Execute the migration protocol (creates git checkpoint + rewrites frontmatter + commits).
  - Re-run Phase 0.4 (resolution) against the migrated agents.
- ELSE: skip; proceed to next phase.
```

- [ ] **Step 4: Update Phase 3 dispatch to read from state**

Find the Phase 3 dispatch section. After the dispatch_mechanism switch, append:

```markdown

**Model field at dispatch:** Every dispatch path MUST read `state.metadata.resolved_models[step_id]` rather than re-resolving:

- `native_task`: pass `model: resolved.model` as a Task() argument (overrides agent frontmatter).
- `native_subagent`: write `model: resolved.model` (and `reasoningEffort: resolved.effort` if non-null) into the dispatch payload.
- `model_driven` (Codex): rewrite the spawned agent's TOML file with `model = "..."` and `model_reasoning_effort = "..."` lines before dispatching.
- `model_driven` (Antigravity): set orchestrator model only; subagent model selection is owned by Antigravity.
- `inline` (Tier 2): no-op — host IDE controls the model.
```

- [ ] **Step 5: Verify**

Run: `grep -c "PHASE 0.4\|PHASE 0.5" skills/running-a-pipeline/SKILL.md`
Expected: 2

- [ ] **Step 6: Commit**

```bash
git add skills/running-a-pipeline/SKILL.md
git commit -m "feat(running): Phase 0.4 model resolution + Phase 0.5 migration check"
```

---

## Task 15: Full rewrite of change-models SKILL.md

**Files:**
- Modify: `skills/change-models/SKILL.md` (full rewrite)

- [ ] **Step 1: Replace entire file content**

```markdown
---
name: change-models
description: Use when the user wants to set, change, or audit model preferences for pipeline agents — interactive 6-mode workflow covering global/workspace preferences, per-agent overrides, first-run setup, and catalog refresh. Invoke via /superpipelines:change-models.
user-invocable: true
---

# Change Models — Interactive Multi-Platform Model Preference Management

> Provides six modes (A–F) for managing the resolver's preference layers, per-agent overrides, and platform-catalog drift reconciliation. Scans all five scope roots (`.claude/`, `.opencode/`, `.agents/`, `.superpipelines/`). Confirm-before-write everywhere.

<overview>
v2.0 change-models edits user/workspace preference files and per-agent frontmatter (`model_tier:` or escape-hatch `model:`). It never edits profile JSONs (those are the source of truth, plugin-owned). The first-run wizard (Mode E) configures all four tiers for a platform with subscription-state detection. Mode F reconciles preferences with an updated profile catalog.
</overview>

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

Present six modes:

| Mode | Action |
|---|---|
| **A** — User-global prefs | Edit `~/.superpipelines/model-preferences.json`; bump `model_tiers_version_acked` |
| **B** — Workspace prefs | Edit `<workspace>/.superpipelines/model-preferences.json` |
| **C** — Per-agent `model_tier:` override | Edit agent frontmatter |
| **D** — Per-agent explicit `model:` (escape hatch, advanced) | Edit agent frontmatter; surfaces SEV-3 audit warning |
| **E** — First-run wizard | Interactive 4-tier setup with subscription detection |
| **F** — Catalog refresh | Reconcile prefs with new profile `model_tiers_version` |

`$ARGUMENTS` fast-paths bypass Mode selection:
- `/superpipelines:change-models all deep to opus` → Mode C, target=all, tier=deep, model=opus
- `/superpipelines:change-models reset tier_1` → Mode A, full re-wizard for tier_1
- `/superpipelines:change-models drift` → Mode F

**HARD-GATE**: empty `$ARGUMENTS` → present all six modes. NEVER fabricate intent.

### PHASE 2 — Agent Selection (Modes C, D only)

- Scan all agent files under chosen scope roots:
  - `<root>/agents/superpipelines/**/*.md` (CC, OC)
  - `<root>/agents/superpipelines/**/*.toml` (Codex)
- For each agent, read frontmatter and compute `resolved = RESOLVE(agent, profile, prefs)`.
- Display table:
  ```
  #   Agent                        Tier    Resolved model              Source
  1   my-pipeline/architect        deep    claude-opus-4-7             user_prefs
  2   my-pipeline/coder            medium  claude-sonnet-4-6           profile_default
  3   my-pipeline/formatter        fast    claude-haiku-4-5            workspace_prefs
  ```
- Selection: `1,3`, `1-3`, `all`, or named agent.

### PHASE 3 — Apply

**Modes A/B**: Read existing prefs file (or initialize). For each tier, write the chosen model. Write `model_tiers_version_acked = profile.model_tiers_version`. Atomic write (temp file + rename).

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
- ALWAYS preserve frontmatter field ordering when editing agent files.
- NEVER remove or alter frontmatter fields other than the targeted field (`model_tier:`, `effort_tier:`, `model:`).
- NEVER auto-migrate v1 agents in this skill — `sk-model-migration` owns that path (called from `running-a-pipeline` Phase 0.5).
</invariants>

## Red Flags — STOP

- "I'll skip the confirmation table because the diff is small." → **STOP**. Confirm-before-write is non-negotiable.
- "I'll edit the profile JSON to add a custom model." → **STOP**. Profiles are plugin-owned. Custom models go into preference files.
- "I'll merge multiple pipelines' agents into one selection prompt without showing scope roots." → **STOP**. Multi-platform scope display is mandatory to avoid editing the wrong file.
- "Empty `$ARGUMENTS` — I'll pick Mode E by default." → **STOP**. Empty args → present all six modes.

## Reference Files

- `references/model-catalog.md` — Deprecated in v2.0; resolver uses profile JSONs as catalog source.
- `sk-model-resolver/SKILL.md` — Resolution algorithm.
- `sk-platform-dispatch/profiles/{tier}.json` — Model catalog source of truth.
- `sk-pipeline-paths/SKILL.md` — Scope-root resolution.
```

- [ ] **Step 2: Verify**

Run: `grep -c "Mode E\|Mode F\|model_tier" skills/change-models/SKILL.md`
Expected: ≥3

Run: `grep -c "claude-sonnet-4-6\|claude-opus-4-7" skills/change-models/SKILL.md`
Expected: 0 (no hardcoded model IDs in the skill body itself; examples are in tables/wizard which reference profile defaults)

- [ ] **Step 3: Commit**

```bash
git add skills/change-models/SKILL.md
git commit -m "feat(change-models): rewrite for 6 modes + 5 scope roots + subscription detection"
```

---

## Task 16: Mark model-catalog.md as deprecated

**Files:**
- Modify: `skills/change-models/references/model-catalog.md`

- [ ] **Step 1: Prepend deprecation banner**

Open `skills/change-models/references/model-catalog.md`. Replace the first line (the H1 header) with:

```markdown
# Model Catalog — DEPRECATED (v2.0)

> **Deprecated as of v2.0.** Model catalog is now sourced from `skills/sk-platform-dispatch/profiles/{tier}.json` (`model_tiers` blocks) as the single source of truth. This file remains as a fallback for legacy alias lookups during the v1→v2 migration window and will be removed in v2.1.

# Model Catalog — Static Fallback (legacy)
```

- [ ] **Step 2: Verify**

Run: `grep -c "DEPRECATED" skills/change-models/references/model-catalog.md`
Expected: 1

- [ ] **Step 3: Commit**

```bash
git add skills/change-models/references/model-catalog.md
git commit -m "docs(change-models): mark model-catalog.md deprecated (profiles are source of truth)"
```

---

## Task 17: Update pipeline-architect-protocol — remove hardcoded sonnet

**Files:**
- Modify: `skills/pipeline-architect-protocol/SKILL.md`

- [ ] **Step 1: Locate the offending line**

Run: `grep -n "Default to.*model.*sonnet\|model: sonnet" skills/pipeline-architect-protocol/SKILL.md`

- [ ] **Step 2: Replace the frontmatter rules paragraph**

Find the section "**Frontmatter rules:**". Replace the bullet `- Default to model: sonnet.` with:

```markdown
- Write `model_tier:` (one of `triage | fast | medium | deep | inherit`) and optional `effort_tier:` (`low | medium | high`). NEVER write a concrete `model:` field — that is resolved at runtime by `sk-model-resolver`. Defaults: planning/architecture/review steps → `deep`; coding/execution → `medium`; utility/formatting → `fast`; routers/classifiers → `triage`.
```

- [ ] **Step 3: Verify**

Run: `grep -c "model: sonnet" skills/pipeline-architect-protocol/SKILL.md`
Expected: 0

Run: `grep -c "model_tier:" skills/pipeline-architect-protocol/SKILL.md`
Expected: ≥1

- [ ] **Step 4: Commit**

```bash
git add skills/pipeline-architect-protocol/SKILL.md
git commit -m "fix(architect): replace 'model: sonnet' default with model_tier resolution"
```

---

## Task 18: Update agent-frontmatter-schema reference

**Files:**
- Modify: `skills/pipeline-architect-references/references/agent-frontmatter-schema.md`

- [ ] **Step 1: Find the schema table**

Run: `grep -n "model\|effort" skills/pipeline-architect-references/references/agent-frontmatter-schema.md | head`

- [ ] **Step 2: Replace the example frontmatter block**

Find the code block containing `model: sonnet                                 # SONNET_ONLY default; non-sonnet requires user opt-in`. Replace the entire block with:

```yaml
tools: Read, Write, Edit, Bash, Glob, Grep   # explicit allowlist
disallowedTools: Write, Edit                 # explicit denylist (read-only agents)
model_tier: medium                            # triage | fast | medium | deep | inherit (runtime-resolved via sk-model-resolver)
effort_tier: medium                           # low | medium | high (optional; orthogonal to model_tier)
maxTurns: 25                                  # bounds execution
version: "1.0"                                # bump on breaking change
```

- [ ] **Step 3: Replace the schema table rows for `model` and `effort`**

Find the rows starting `| `model` |` and `| `effort` |`. Replace them with:

```markdown
| `model_tier` | yes | One of `triage | fast | medium | deep | inherit`. Runtime-resolved via `sk-model-resolver`. Architect MUST emit this; MUST NOT emit `model:`. |
| `effort_tier` | optional | One of `low | medium | high`. Orthogonal to `model_tier`. Emitted only on platforms with `effort_field_name` set. |
| `model` | DISCOURAGED | Escape hatch. Explicit concrete model bypasses tier resolution. Auditor surfaces as SEV-3 info. Use only for advanced cases (e.g., custom fine-tuned model). |
```

- [ ] **Step 4: Verify**

Run: `grep -c "model_tier" skills/pipeline-architect-references/references/agent-frontmatter-schema.md`
Expected: ≥2

Run: `grep -c "SONNET_ONLY" skills/pipeline-architect-references/references/agent-frontmatter-schema.md`
Expected: 0

- [ ] **Step 5: Commit**

```bash
git add skills/pipeline-architect-references/references/agent-frontmatter-schema.md
git commit -m "docs(architect): replace model/effort schema with model_tier/effort_tier"
```

---

## Task 19: Migrate bundled agent files to v2.0 schema

**Files:**
- Modify: `agents/pipeline-architect.md`
- Modify: `agents/pipeline-auditor.md`
- Modify: `agents/pipeline-failure-analyzer.md`
- Modify: `agents/pipeline-quality-reviewer.md`
- Modify: `agents/pipeline-spec-reviewer.md`
- Modify: `agents/pipeline-task-executor.md`
- Modify: `agents/skill-architect.md`

- [ ] **Step 1: Map each agent to its tier**

Reverse-map per `sk-model-resolver.REVERSE_MAP`:

| Agent | Current `model:` | Current `effort:` | New `model_tier:` | New `effort_tier:` |
|---|---|---|---|---|
| pipeline-architect | opus | medium | deep | medium |
| pipeline-auditor | sonnet | high | medium | high |
| pipeline-failure-analyzer | sonnet | high | medium | high |
| pipeline-quality-reviewer | sonnet | high | medium | high |
| pipeline-spec-reviewer | sonnet | medium | medium | medium |
| pipeline-task-executor | sonnet | medium | medium | medium |
| skill-architect | sonnet | medium | medium | medium |

Confirm actual values first:

Run: `grep -H "^model:\|^effort:" agents/pipeline-*.md agents/skill-architect.md`
Compare to table above; adjust the mapping if any agent has different current values.

- [ ] **Step 2: Edit pipeline-architect.md**

Open `agents/pipeline-architect.md`. Replace the line `model: opus` with `model_tier: deep` and the line `effort: medium` with `effort_tier: medium`.

- [ ] **Step 3: Edit pipeline-auditor.md**

Replace `model: sonnet` → `model_tier: medium`; `effort: high` → `effort_tier: high`.

- [ ] **Step 4: Edit pipeline-failure-analyzer.md, pipeline-quality-reviewer.md**

Same as auditor.

- [ ] **Step 5: Edit pipeline-spec-reviewer.md, pipeline-task-executor.md, skill-architect.md**

Replace `model: sonnet` → `model_tier: medium`; `effort: medium` → `effort_tier: medium`.

- [ ] **Step 6: Verify zero hardcoded model strings remain in bundled agents**

Run: `grep -E "^model: (sonnet|opus|haiku|claude-|gpt-|gemini-)" agents/pipeline-*.md agents/skill-architect.md`
Expected: no output (empty result set)

Run: `grep -c "model_tier:" agents/pipeline-*.md agents/skill-architect.md`
Expected: each file ≥1

- [ ] **Step 7: Commit**

```bash
git add agents/pipeline-*.md agents/skill-architect.md
git commit -m "feat(agents): migrate 7 bundled agents to model_tier/effort_tier schema"
```

---

## Task 20: Add new audit criteria to pipeline-auditor-protocol

**Files:**
- Modify: `skills/pipeline-auditor-protocol/SKILL.md`

- [ ] **Step 1: Find the audit criteria section**

Run: `grep -n "## Audit Criteria\|SEV-0\|SEV-1\|SEV-2" skills/pipeline-auditor-protocol/SKILL.md | head -20`

- [ ] **Step 2: Append 6 new criteria**

Find the end of the existing criteria table (or section). Insert a new subsection:

```markdown

### Model-Tier Resolution Criteria (v2.0)

| ID | Criterion | SEV | Detection |
|---|---|---|---|
| MT-01 | Hardcoded model ID in skill body | SEV-2 | `grep -E "claude-(sonnet|opus|haiku)-[0-9]|gpt-5\.[0-9]|gemini-3\." skills/**/SKILL.md skills/**/references/*.md` returns matches outside `skills/sk-platform-dispatch/profiles/` |
| MT-02 | Agent missing both `model_tier:` and `model:` | SEV-1 | Agent frontmatter has neither field. Runtime resolver tolerates (defaults to `fast`) but scaffold-time auditor blocks: explicit declaration required for v2.0+ agents. |
| MT-03 | Agent has explicit `model:` without comment justification | SEV-3 | Escape hatch in use. Surface to reviewer; do not block. |
| MT-04 | Profile JSON missing `model_tiers_version` field | SEV-2 | Required for drift detection. |
| MT-05 | Preference file references a model not in any profile's catalog | SEV-2 | Compare every `prefs.platforms[*].tiers[*]` value against the union of all profiles' `model_tiers[*].model`. Mismatch likely typo or stale ID. |
| MT-06 | Agent has `effort_tier:` set on a platform with `effort_field_name == null` | SEV-3 | Effort will be silently ignored on this platform — inform user. Detection requires knowing the source/runtime tier. |

### Resolution

- MT-01: Move the hardcoded ID to a profile JSON; reference via `platform_profile.model_tiers[tier]`.
- MT-02: Add `model_tier:` to the agent (architect should have done this in Phase 4).
- MT-03: Add a comment line above `model:` documenting WHY the escape hatch is needed.
- MT-04: Add `"model_tiers_version": "YYYY-MM-DD"` to the profile.
- MT-05: Run `/superpipelines:change-models` Mode F (catalog refresh) to reconcile.
- MT-06: Either drop `effort_tier:` or accept that it's a no-op on this platform.
```

- [ ] **Step 3: Verify**

Run: `grep -c "MT-01\|MT-02\|MT-03\|MT-04\|MT-05\|MT-06" skills/pipeline-auditor-protocol/SKILL.md`
Expected: 6

- [ ] **Step 4: Commit**

```bash
git add skills/pipeline-auditor-protocol/SKILL.md
git commit -m "feat(auditor): add 6 model-tier resolution audit criteria (MT-01..MT-06)"
```

---

## Task 21: Update CLAUDE.md MODEL_SELECTION invariant

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Locate the MODEL_SELECTION line**

Run: `grep -n "MODEL_SELECTION\|DYNAMIC_DEFAULT_SONNET" CLAUDE.md`

- [ ] **Step 2: Replace the invariant line**

Find the bullet beginning `- \`MODEL_SELECTION: DYNAMIC_DEFAULT_SONNET\``. Replace the entire bullet (the full multi-line paragraph that follows) with:

```markdown
- `MODEL_SELECTION: TIER_BASED_RUNTIME_RESOLVED` — Agent frontmatter declares `model_tier:` (one of `triage | fast | medium | deep | inherit`) and optional `effort_tier:` (`low | medium | high`). The architect (Phase 4 of `creating-a-pipeline`) writes `model_tier:` and MUST NOT write `model:`. Runtime resolution happens in `running-a-pipeline` Phase 0.4 via `sk-model-resolver`, which walks a 5-layer precedence chain: (1) explicit `model:` frontmatter override → (2) workspace prefs (`<workspace>/.superpipelines/model-preferences.json`) → (3) user-global prefs (`~/.superpipelines/model-preferences.json`) → (4) profile default (`skills/sk-platform-dispatch/profiles/{tier_id}.json`) → (5) native host inherit. Resolved model + effort stamp into `pipeline-state.json metadata.resolved_models[step_id]` once per fresh run; Phase 3 dispatch reads from state. Per `DEPENDENCY_INVERSION: PROFILE_DRIVEN`, concrete per-tier model IDs live exclusively in profile JSONs and preference files — never in skill bodies. Profile `model_tiers_version` enables drift detection: when the catalog advances, `running-a-pipeline` Phase 0.4 emits an advisory and offers `/superpipelines:change-models` Mode F.
```

- [ ] **Step 3: Verify**

Run: `grep -c "TIER_BASED_RUNTIME_RESOLVED" CLAUDE.md`
Expected: 1

Run: `grep -c "DYNAMIC_DEFAULT_SONNET" CLAUDE.md`
Expected: 0

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude.md): rewrite MODEL_SELECTION invariant for v2.0 tier+resolver"
```

---

## Task 22: End-to-end fixture — CC scaffold, OC resume

**Files:**
- Create: `skills/sk-model-resolver/fixtures/e2e-cc-to-oc/{pipeline-state-input.json, pipeline-state-expected.json, README.md}`

- [ ] **Step 1: Create fixture dir + README**

```bash
mkdir -p skills/sk-model-resolver/fixtures/e2e-cc-to-oc
```

`README.md`:
```markdown
# E2E: CC scaffold → OC resume

Simulates a pipeline scaffolded on Claude Code being resumed on OpenCode. Verifies Phase 0.4 re-resolves every step to OC-appropriate models without touching agent files.

## Steps to verify

1. Read `pipeline-state-input.json` — represents the state file just after Phase 0.25 cross-tier detection (tier flipped to tier_1b).
2. Walk the topology: three agents — `architect (deep)`, `coder (medium)`, `formatter (fast)`.
3. For each, run `RESOLVE(agent, tier_1b_profile, prefs={})` per `../../SKILL.md`.
4. Verify the resulting `resolved_models` block matches `pipeline-state-expected.json`.
```

- [ ] **Step 2: Write input**

`pipeline-state-input.json`:
```json
{
  "metadata": {
    "source_tier": "tier_1",
    "runtime_tier": "tier_1b",
    "tier_changes": [
      { "from": "tier_1", "to": "tier_1b", "at": "2026-05-24T10:00:00Z" }
    ]
  },
  "topology": {
    "steps": [
      { "id": "architect",  "agent_frontmatter": { "name": "architect",  "model_tier": "deep" } },
      { "id": "coder",      "agent_frontmatter": { "name": "coder",      "model_tier": "medium" } },
      { "id": "formatter",  "agent_frontmatter": { "name": "formatter",  "model_tier": "fast" } }
    ]
  }
}
```

- [ ] **Step 3: Write expected output**

`pipeline-state-expected.json`:
```json
{
  "metadata": {
    "source_tier": "tier_1",
    "runtime_tier": "tier_1b",
    "tier_changes": [
      { "from": "tier_1", "to": "tier_1b", "at": "2026-05-24T10:00:00Z" }
    ],
    "resolved_models": {
      "architect": {
        "model": "opencode-go/kimi-k2.6",
        "effort": "high",
        "effort_field_name": "reasoningEffort",
        "model_field_format": "provider_prefixed",
        "source": "profile_default",
        "warnings": []
      },
      "coder": {
        "model": "opencode-go/qwen3.6-plus",
        "effort": "medium",
        "effort_field_name": "reasoningEffort",
        "model_field_format": "provider_prefixed",
        "source": "profile_default",
        "warnings": []
      },
      "formatter": {
        "model": "opencode-go/deepseek-v4-flash",
        "effort": "medium",
        "effort_field_name": "reasoningEffort",
        "model_field_format": "provider_prefixed",
        "source": "profile_default",
        "warnings": []
      }
    }
  }
}
```

- [ ] **Step 4: Walk through fixture manually**

Read tier_1b profile. For each of the 3 agents, run RESOLVE. Compare. They must match.

- [ ] **Step 5: Validate JSON**

Run: `node -e "['pipeline-state-input.json','pipeline-state-expected.json'].forEach(f => JSON.parse(require('fs').readFileSync('skills/sk-model-resolver/fixtures/e2e-cc-to-oc/'+f,'utf8'))); console.log('ok')"`
Expected: `ok`

- [ ] **Step 6: Commit**

```bash
git add skills/sk-model-resolver/fixtures/e2e-cc-to-oc/
git commit -m "test(resolver): e2e fixture for CC→OC cross-tier resume"
```

---

## Task 23: End-to-end fixture — CC scaffold, Codex resume

**Files:**
- Create: `skills/sk-model-resolver/fixtures/e2e-cc-to-codex/{pipeline-state-input.json, pipeline-state-expected.json, README.md}`

- [ ] **Step 1: Create dir + README**

```bash
mkdir -p skills/sk-model-resolver/fixtures/e2e-cc-to-codex
```

`README.md`:
```markdown
# E2E: CC scaffold → Codex resume

Cross-family resume. Tests `toml_split` format + `effort_emit_map` translation (`low → minimal`).
```

- [ ] **Step 2: Write input**

`pipeline-state-input.json`:
```json
{
  "metadata": {
    "source_tier": "tier_1",
    "runtime_tier": "tier_1d"
  },
  "topology": {
    "steps": [
      { "id": "triage",     "agent_frontmatter": { "name": "triage",     "model_tier": "triage", "effort_tier": "low" } },
      { "id": "architect",  "agent_frontmatter": { "name": "architect",  "model_tier": "deep" } }
    ]
  }
}
```

- [ ] **Step 3: Write expected**

`pipeline-state-expected.json`:
```json
{
  "metadata": {
    "source_tier": "tier_1",
    "runtime_tier": "tier_1d",
    "resolved_models": {
      "triage": {
        "model": "gpt-5.4-mini",
        "effort": "minimal",
        "effort_field_name": "model_reasoning_effort",
        "model_field_format": "toml_split",
        "source": "profile_default",
        "warnings": []
      },
      "architect": {
        "model": "gpt-5.5",
        "effort": "high",
        "effort_field_name": "model_reasoning_effort",
        "model_field_format": "toml_split",
        "source": "profile_default",
        "warnings": []
      }
    }
  }
}
```

- [ ] **Step 4: Walk manually, validate JSON, commit**

```bash
node -e "['pipeline-state-input.json','pipeline-state-expected.json'].forEach(f => JSON.parse(require('fs').readFileSync('skills/sk-model-resolver/fixtures/e2e-cc-to-codex/'+f,'utf8'))); console.log('ok')"
git add skills/sk-model-resolver/fixtures/e2e-cc-to-codex/
git commit -m "test(resolver): e2e fixture for CC→Codex cross-family (toml_split + effort_emit_map)"
```

---

## Task 24: Run auditor against the full diff

**Files:**
- Read-only — runs the auditor against the workspace.

- [ ] **Step 1: Invoke the auditor**

In Claude Code, run:
```
/superpipelines:audit-pipeline
```

If interactive, choose "audit all".

- [ ] **Step 2: Inspect the report**

Expected: zero SEV-0, zero SEV-1 findings. SEV-2 may show MT-05 if your test prefs reference a custom model. SEV-3 may show MT-03 if any agent uses the escape hatch.

If any SEV-0 or SEV-1 found, fix inline and re-run.

- [ ] **Step 3: Commit any auditor-driven fixes**

If fixes were needed:
```bash
git add -p   # review each change
git commit -m "fix(auditor): address SEV findings from full-workspace audit"
```

If no fixes needed: skip.

- [ ] **Step 4: Record the audit pass**

Append to the plan execution log:
```bash
echo "Auditor pass: $(date -Iseconds) — 0 SEV-0, 0 SEV-1" >> docs/superpowers/plans/2026-05-24-cross-platform-model-resolver.execution.log
git add docs/superpowers/plans/2026-05-24-cross-platform-model-resolver.execution.log
git commit -m "chore: record auditor pass for model-resolver implementation"
```

---

## Task 25: Manual smoke test — first-run wizard on a clean prefs state

**Files:**
- Read-only on plugin; writes to `~/.superpipelines/model-preferences.json` if user opts to save.

- [ ] **Step 1: Back up any existing prefs**

```bash
if [ -f ~/.superpipelines/model-preferences.json ]; then mv ~/.superpipelines/model-preferences.json ~/.superpipelines/model-preferences.json.bak; fi
```

- [ ] **Step 2: Invoke the wizard**

In Claude Code:
```
/superpipelines:change-models
```

When mode selector appears, choose **E (first-run wizard)**.

- [ ] **Step 3: Verify wizard behavior**

Confirm:
- Wizard shows platform context (tier_1, Claude Code).
- Wizard presents all 4 tiers (triage, fast, medium, deep) with profile defaults.
- Hitting Enter accepts each default.
- "Save to" prompt offers 3 options.
- After save, `~/.superpipelines/model-preferences.json` exists with all 4 tiers.

- [ ] **Step 4: Verify file content**

Run: `cat ~/.superpipelines/model-preferences.json`
Expected: JSON with `platforms.tier_1.tiers.{triage,fast,medium,deep}` and `model_tiers_version_acked` matching the profile's `model_tiers_version`.

- [ ] **Step 5: Restore original prefs if any**

```bash
if [ -f ~/.superpipelines/model-preferences.json.bak ]; then mv ~/.superpipelines/model-preferences.json.bak ~/.superpipelines/model-preferences.json; fi
```

- [ ] **Step 6: Record success**

Append to execution log:
```bash
echo "First-run wizard smoke test: $(date -Iseconds) — PASS" >> docs/superpowers/plans/2026-05-24-cross-platform-model-resolver.execution.log
git add docs/superpowers/plans/2026-05-24-cross-platform-model-resolver.execution.log
git commit -m "chore: record first-run wizard smoke test pass"
```

---

## Self-Review (Plan Author Checklist)

Run this list against the spec before declaring the plan complete.

### Spec coverage

| Spec section | Covered by task(s) |
|---|---|
| §3.1 Five-layer resolution | Task 6 (algorithm) |
| §3.2 Tier taxonomy | Task 6 (algorithm), Task 12 (architect prompt) |
| §3.3 Effort axis | Task 6 (algorithm step 8/8b/9) |
| §4.1 Agent frontmatter | Tasks 13, 17, 18, 19 |
| §4.2 Profile JSON | Tasks 1–5 |
| §4.3 User-global prefs | Task 15 (Mode A, Mode E) |
| §4.4 Workspace prefs | Task 15 (Mode B) |
| §4.5 State file additions | Task 14 (Phase 0.4 persistence) |
| §5 sk-model-resolver | Tasks 6, 7, 8, 9 |
| §6.1 creating-a-pipeline | Tasks 12, 13 |
| §6.2 running-a-pipeline | Task 14 |
| §6.3 change-models | Task 15 |
| §6.4 sk-model-migration | Task 10 |
| §6.5 auditor criteria | Task 20 |
| §6.6 First-run wizard | Task 15 (Mode E detail), Task 25 (smoke test) |
| §7 E2E scenarios | Tasks 22, 23 |
| §8 Testing strategy | All "Step: walk fixture" steps; Task 24 |
| §9 File-touch list | All tasks |
| §10 Risks | Mitigated in resolver invariants (Task 6) + auditor criteria (Task 20) |
| §11 Open questions | None |
| §12 Acceptance criteria | All 14 items covered by Tasks 1–25 |

### Placeholder scan

Reviewed every task. No TBD, no "implement later", no "similar to Task N" without repeated code. All file paths absolute under repo root. All commit messages present. All `node -e` validation commands have expected output stated.

### Type consistency

- `resolved` object schema: `{model, effort, effort_field_name, model_field_format, source, warnings}` — consistent across Tasks 6, 7, 8, 9, 22, 23.
- Profile capability fields: `dynamic_subagents`, `model_field_format`, `effort_field_name`, `effort_field_applies_to_providers`, `effort_emit_map`, `subagent_env_override`, `subagent_inherit_target`, `provider_families` — consistent across Tasks 1–5 and Task 11.
- Tier names: `triage | fast | medium | deep | inherit` — consistent everywhere.
- `source` enum values: `frontmatter_override | workspace_prefs | user_prefs | profile_default | host_inherit` — consistent.
- `model_field_format` enum: `shorthand | provider_prefixed | toml_split | omit` — consistent.

No drift found.

---

## Execution Notes

- Total tasks: **25**.
- Commits: one per task, ~25 commits total. Atomic; revertable.
- Estimated time: 4–6 hours focused work, including manual fixture walks.
- Branch: `feat/multi-platform-impl` (already active).
- No new dependencies; no `package.json`/`requirements.txt` changes.
- Plugin version stays at `2.0.0` (already bumped); no `plugin.json` edits required.
- Tasks 1–5 (profiles) are independent and can be parallelized by separate workers if using subagent-driven execution.
- Tasks 6–11 (resolver core + dispatch glue) are sequential — each depends on the prior.
- Tasks 12–21 (workflow + agent edits) can mostly run in parallel after Task 11; only Task 19 depends on the migration skill (Task 10) being defined.
- Tasks 22–25 (verification) are sequential and run last.
