# Fixture PR-03 — VIOLATION: adapter missing normative citation

**Expected finding:** SEV-2 — one or both resolution adapters lack a citation to
`sk-model-resolver/references/resolution-algorithm.md` in their body.

---

## Simulated bad sk-model-resolver/SKILL.md (skill adapter — no citation)

```markdown
---
name: sk-model-resolver
description: Resolves model and effort tier for a pipeline agent.
---

## Public API

- `RESOLVE(agent_frontmatter, profile, prefs) → resolved`
- `LOAD_PREFS(workspace_root) → { user, workspace }`
- `EMIT(resolved, target_format) → string`
- `RENDER_RESOLUTION_TABLE(resolved[]) → string`
- `REVERSE_MAP(concrete_model, profile) → tier | null`
- `DETECT_CATALOG_DRIFT(prefs, profile) → { drifted, message }`

## Invariants

- Pure function: never writes to disk, never calls APIs.
- `source` is always one of the five enum literals.
```

**Violation**: The body declares the API but contains no citation to
`references/resolution-algorithm.md`. Future readers cannot locate the normative
algorithm from the skill entry point.

---

## Simulated bad running-a-pipeline/SKILL.md Phase 0.4 (inline adapter — no citation)

```markdown
### Phase 0.4 — Model Resolution (inline)

INLINE-DETECT() has fired. Resolving models without the Skill tool.

For each agent:
  1. Check frontmatter for explicit `model:` override.
  2. Return profile default.
```

**Violation**: The inline adapter block contains no reference to the normative
algorithm doc. It also implements only a subset (branches 1 and 4), which is the
latent bug PR-03 is designed to surface.

---

## Detection commands

```bash
# Must return ≥1 match in skill body (not just frontmatter references: list)
grep -n "resolution-algorithm" skills/sk-model-resolver/SKILL.md

# Must return ≥1 match inside Phase 0.4 block
grep -n "resolution-algorithm" skills/running-a-pipeline/SKILL.md
```

Empty result from either = PR-03 violation.
