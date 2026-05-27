---
name: sk-claude-code-conventions
description: Provides canonical engineering standards for authoring agents, skills, hooks, and pipeline orchestration in Claude Code. Use when authoring or modifying agents, skills, hooks, or pipeline-orchestration artifacts — covers model-tier selection, prompt-cache discipline, frontmatter schemas, and progressive-disclosure rules.
disable-model-invocation: true
user-invocable: false
---

# Claude Code Conventions — Reference

<glossary>
  <term name="Adaptive Thinking">Model-driven reasoning scaled by the `effort` parameter.</term>
  <term name="Prompt Caching">A mechanism to persist static context (system prompts, skills) to reduce latency and cost.</term>
  <term name="Progressive Disclosure">Structuring content into layers (Body → References) to minimize context bloat.</term>
</glossary>

## Model & Reasoning Selection

<model_tier_table>
| Tier | Model ID | Application |
| :--- | :--- | :--- |
| `fast` | `claude-sonnet-4-6` | Default for pipelines, agents, and skills. |
| `deep` | `claude-opus-4-7` | High-complexity architecture or auditing tasks. |
| `triage` | `claude-haiku-4-5-20251001` | High-volume, low-latency classification. |
</model_tier_table>

<invariant>
This skill is Claude Code-scoped (Tier 1 only). Concrete model IDs above describe the Tier 1 resolution of the `MODEL_SELECTION: TIER_BASED_RUNTIME_RESOLVED` invariant — i.e., Tier 1's `platform_profile.model_tiers.fast` resolves to `claude-sonnet-4-6` and `.deep` to `claude-opus-4-7`. On other tiers the same `fast`/`deep` slots resolve to that platform's idiomatic models (see `skills/sk-platform-dispatch/profiles/{tier_id}.json`). Per `DEPENDENCY_INVERSION: PROFILE_DRIVEN`, pipeline-architect and other tier-agnostic skills MUST consult `platform_profile.model_tiers` rather than the CC literals shown here. Reasoning scales within-tier via `effort`; tier switches are warranted only when the step category genuinely differs.
</invariant>

## Caching & Context Discipline

<protocol>
### 1. CACHE STABILITY
- **Static First**: Context ordered as System Prompt → Skills → Tools → Conversation History.
- **Invariant Toolsets**: Tool and skill lists must not be mutated mid-session; mutation invalidates the entire prefix.
- **Static Headers**: Dynamic timestamps or mutable data must not appear in the static system prefix.

### 2. CACHE BREAKPOINTS
- Up to 4 `cache_control` breakpoints are supported.
- The final breakpoint belongs on the last block that remains identical across requests.
- Agentic loops use 1-hour TTL to prevent cache expiration between turns.
</protocol>

## Artifact Schemas

### Skill Frontmatter
<invariant>
`SKILL.md` bodies must not exceed 500 lines. Descriptions must use third-person voice and focus strictly on triggering conditions.
</invariant>

```yaml
name: {lowercase-hyphens}
description: {triggering-only, third person}
effort: {low | medium | high | xhigh | max}
disable-model-invocation: {boolean}
user-invocable: {boolean}
```

### Agent Frontmatter
<invariant>
Agent bodies must not exceed 150 lines. Depth belongs in companion `<agent>-references/references/*.md` files.
</invariant>

```yaml
name: {identifier}
description: {action-oriented trigger}
effort: {high for architects, medium for workers}
isolation: worktree
skills: [sk-4d-method, sk-spec-driven-development]
```

## Progressive Disclosure Checklist

<checklist>
- [ ] `SKILL.md` body ≤500 lines.
- [ ] References are exactly one level deep from `SKILL.md`.
- [ ] References >100 lines include a Table of Contents.
- [ ] Descriptions are third-person and triggering-only.
- [ ] Examples are concrete and specific to the domain.
</checklist>

<invariants>
- `memory: project` must not appear in agent frontmatter.
- All relative paths must be resolved via `${CLAUDE_PLUGIN_ROOT}` or `${CLAUDE_PLUGIN_DATA}`.
- All pipeline state must be persisted to the canonical `pipeline-state.json` location.
</invariants>

## Reference Files

- `sk-pipeline-state/SKILL.md` — State management rules.
- `sk-pipeline-paths/SKILL.md` — Scope-aware path resolution.
- `sk-4d-method/SKILL.md` — Per-invocation wrapper.
- `sk-spec-driven-development/SKILL.md` — SDD protocol.
