# Fixture PR-02 — VIOLATION: resolver skill body restates algorithm steps

**Expected finding:** SEV-2 at `sk-model-resolver/SKILL.md` — body contains algorithm pseudocode.
**Detection trigger:** Numbered step list ("Step 1:", "1.", etc.) in skill body outside of a `references/` file.

---

## Simulated bad sk-model-resolver/SKILL.md body (excerpt)

```markdown
## Algorithm

Step 1: If agent frontmatter contains `model:`, return that value with source: frontmatter_override.
Step 2: Load workspace preference file from `<workspace>/.superpipelines/model-preferences.json`.
Step 3: If workspace prefs contain a mapping for this agent's model_tier, return it.
Step 4: Load user preference file from `~/.superpipelines/model-preferences.json`.
Step 5: If user prefs contain a mapping, return it.
Step 6: If profile.capabilities.dynamic_subagents is true, return source: host_inherit.
Step 7: If profile.capabilities.model_field_format is "omit", return source: host_inherit.
Step 8: Return profile.model_tiers[agent.model_tier] with source: profile_default.
Step 9: Emit resolved model into the target format.
Step 10: Render the resolution table.
```

---

## Why this is a violation

ADR-0001 designates `sk-model-resolver/references/resolution-algorithm.md` as the single
normative source. Any restatement of the algorithm in the SKILL.md body creates a second
source of truth — the two will drift. The SKILL.md body must contain only:
- Public API list
- Invariants
- Red Flags
- A normative pointer to `references/resolution-algorithm.md`

## Detection command

```
grep -n "Step [0-9]\+:" skills/sk-model-resolver/SKILL.md
```

A non-empty result is a PR-02 violation.
