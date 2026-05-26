# Fixture PR-05 — VIOLATION: Phase 0.4 hand-crafts resolution table

**Expected finding:** SEV-2 — Phase 0.4 builds its own markdown table instead of
calling `RENDER_RESOLUTION_TABLE(resolved[])`.

---

## Simulated bad running-a-pipeline/SKILL.md Phase 0.4 output block

```markdown
### Resolution Summary

| Step | Agent | Model Tier | Resolved Model | Source |
|------|-------|------------|----------------|--------|
| 1    | spec-writer | deep | claude-opus-4-7 | profile_default |
| 2    | spec-reviewer | fast | claude-haiku-4-5-20251001 | workspace_prefs |
| 3    | task-executor | medium | claude-sonnet-4-6 | profile_default |

All agents resolved successfully.
```

**Violation**: This is a hand-crafted table in Phase 0.4. Format authority for the
resolution table belongs to `sk-model-resolver` via `RENDER_RESOLUTION_TABLE`. When
the table format evolves (column order, column names, effort column, source
formatting) it must be updated in two places: the resolver AND Phase 0.4. This drift
was the original motivation for the HARD-GATEs that `RENDER_RESOLUTION_TABLE` is
designed to replace.

---

## Compliant pattern

```markdown
### Resolution Summary

RENDER_RESOLUTION_TABLE(resolved[])
[print the returned string verbatim]
```

---

## Detection

In `running-a-pipeline/SKILL.md` Phase 0.4 block:
1. `grep -n "RENDER_RESOLUTION_TABLE" skills/running-a-pipeline/SKILL.md` must return ≥1 match.
2. `grep -n "| Step \|" skills/running-a-pipeline/SKILL.md` or similar markdown table header
   in Phase 0.4 without a preceding `RENDER_RESOLUTION_TABLE` call = violation.
