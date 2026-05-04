---
name: sk-claude-code-conventions
description: Use when authoring or modifying agents, skills, hooks, or pipeline orchestration — covers Claude 4.6 model selection, adaptive thinking, prompt-cache discipline, frontmatter schemas, and progressive disclosure rules. Reference-only; preload via agent skills frontmatter.
disable-model-invocation: true
user-invocable: false
---

# Claude Code Conventions — 2026 Reference

> Canonical engineering standards for authoring agents, skills, hooks, and pipeline orchestration. Optimizes for Claude 4.6+ model selection, adaptive thinking, prompt-cache discipline, and progressive disclosure.

<overview>
The Claude Code Conventions define the structural and behavioral invariants required for high-performance agentic systems. They prioritize cache stability, context efficiency, and deterministic routing to ensure that complex multi-agent pipelines remain reliable and scalable.
</overview>

<glossary>
  <term name="Adaptive Thinking">Model-driven reasoning scaled by the `effort` parameter.</term>
  <term name="Prompt Caching">A mechanism to persist static context (system prompts, skills) to reduce latency and cost.</term>
  <term name="Progressive Disclosure">Structuring content into layers (Body → References) to minimize context bloat.</term>
</glossary>

## Model & Reasoning Selection

<model_tier_table>
| Tier | Model ID | Application |
| :--- | :--- | :--- |
| **Workhorse** | `claude-sonnet-4-6` | Default for pipelines, agents, and skills. |
| **Deep Reasoning** | `claude-opus-4-7` | High-complexity architecture or auditing tasks. |
| **Triage/Batch** | `claude-haiku-4-5` | High-volume, low-latency classification. |
</model_tier_table>

<invariant>
Pipelines must enforce `MODEL_SELECTION: SONNET_ONLY`. Scale reasoning depth via the `effort` parameter rather than model switching.
</invariant>

## Caching & Context Discipline

<protocol>
### 1. CACHE STABILITY
- **Static First**: Order context as System Prompt → Skills → Tools → Conversation History.
- **Invariant Toolsets**: Never mutate the tool or skill list mid-session; doing so invalidates the entire prefix.
- **Static Headers**: Avoid dynamic timestamps or mutable data in the static system prefix.

### 2. CACHE BREAKPOINTS
- Utilize up to 4 `cache_control` breakpoints.
- Place the final breakpoint on the last block that remains identical across requests.
- Use 1-hour TTL for agentic loops to prevent cache expiration between turns.
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
Agent bodies must not exceed 150 lines. Depth must be moved to companion `<agent>-references/references/*.md` files.
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
- NEVER use `memory: project` in agent frontmatter.
- Resolve all relative paths via `${CLAUDE_PLUGIN_ROOT}` or `${CLAUDE_PLUGIN_DATA}`.
- All pipeline state must be persisted to the canonical `pipeline-state.json` location.
</invariants>

## Reference Files

- `sk-pipeline-state/SKILL.md` — State management rules.
- `sk-pipeline-paths/SKILL.md` — Scope-aware path resolution.
- `sk-4d-method/SKILL.md` — Per-invocation wrapper.
- `sk-spec-driven-development/SKILL.md` — SDD protocol.
