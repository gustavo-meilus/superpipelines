# Fixture PR-02 — VIOLATION: resolver skill body restates algorithm steps

**Expected finding:** SEV-2 at `sk-model-resolver/SKILL.md` — body contains a numbered pseudocode block (canonical algorithm-restatement shape).

**Detection trigger:** Numbered list items (`1.`, `2.`, `3.`, …) at line start inside the SKILL.md body — matching the format used by `references/resolution-algorithm.md`. Any such line in the body indicates a second source of truth (ADR-0001 violation).

---

## Simulated bad sk-model-resolver/SKILL.md body (excerpt)

```markdown
## Algorithm

RESOLVE(agent_frontmatter, profile, prefs) → resolved

  1. IF agent.model is present (explicit string):
       return { model: agent.model, source: "frontmatter_override", ... }
  2. tier   = agent.model_tier   ?? "fast"
  3. effort = agent.effort_tier  ?? null
  4. IF profile.capabilities.dynamic_subagents == true AND agent.role != "orchestrator":
       return { model: null, source: "host_inherit", ... }
  5. IF tier == "inherit" OR profile.capabilities.model_field_format == "omit":
       return { model: null, source: "host_inherit", ... }
  6. model, source = workspace_prefs ?? user_prefs ?? profile_default
  7. IF effort is null: effort = prefs.effort_default[tier] ?? profile.model_tiers[tier].effort
  8. IF profile.capabilities.effort_field_name == null: effort = null
  9. IF profile.capabilities.effort_emit_map is set: effort = effort_emit_map[effort] ?? effort
  10. return { model, effort, source, warnings: [] }
```

---

## Why this is a violation

ADR-0001 designates `sk-model-resolver/references/resolution-algorithm.md` as the single
normative source for the resolution algorithm. Any restatement of the algorithm in the
SKILL.md body — including the numbered-list pseudocode shape shown above — creates a second
source of truth. The two will drift, and adapters will silently diverge.

The SKILL.md body must contain only:
- Public API list (operation signatures, no implementation)
- Invariants
- Red Flags
- A normative pointer to `references/resolution-algorithm.md`

## Detection command

```bash
grep -cE "^[[:space:]]*[0-9]+\." skills/sk-model-resolver/SKILL.md
```

Any non-zero count is a PR-02 violation.

## Discriminating-power test

This fixture is paired with snapshots under `fixtures/discriminating-power/pr-02/`:
- `pre-baseline.md` (from `39dd0e6`) → the new regex returns **10** — the criterion fires.
- `post-baseline.md` (post-S1) → the new regex returns **0** — the criterion is silent.

If a future edit to PR-02's regex breaks either assertion, the criterion has lost
discriminating power and must be rejected at review.
