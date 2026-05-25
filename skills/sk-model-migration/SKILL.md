---
name: sk-model-migration
description: Use when running-a-pipeline Phase 0.45 detects a pipeline scaffolded under pre-v2.0 schema (agents with `model:` but no `model_tier:`) â€” converts agent frontmatter to v2.0 schema with a git-backed safety checkpoint.
disable-model-invocation: true
user-invocable: false
---

# Model Migration â€” v1.x â†’ v2.0 Schema Conversion

> One-shot migration triggered by `running-a-pipeline` Phase 0.45. Detects agents with concrete `model:` fields, reverse-maps to tier, rewrites frontmatter, commits before + after.

<overview>
Pre-v2.0 pipelines baked concrete model IDs into agent frontmatter (`model: claude-sonnet-4-6`). v2.0 uses `model_tier: medium` and runtime resolution. This skill auto-migrates legacy pipelines on first run after the v2.0 upgrade, with a git commit pair so users can revert.
</overview>

## Trigger

Loaded by `running-a-pipeline` Phase 0.45 when:
```
ANY agent file under pipeline scope has `model:` AND NOT `model_tier:` AND (plugin_version absent OR plugin_version < 2.0.0)
```

The `plugin_version` clause is mandatory. It distinguishes v1 legacy frontmatter (no stamp — stamping was introduced in v2.0) from v2 intentional escape hatch (`plugin_version >= 2.0.0`). The classification happens in Phase 0.45 before this skill is invoked; this skill receives the pre-filtered candidate list. NEVER migrate agents the caller did not classify as v1 legacy.

## Protocol

```
1. DETECT scope of pipeline (`sk-pipeline-paths`); enumerate all agent files.
2. ABORT if any agent file has both `model:` and `model_tier:` (mid-migration state â€” escalate to user).
3. VERIFY git is clean OR offer to stash:
     IF dirty: prompt "Uncommitted changes detected. Stash and continue? (y/N)"
       y â†’ `git stash push -m "pre-model-migration"`
       N â†’ abort, surface to user
4. COMMIT current state: `git commit --allow-empty -m "checkpoint: pre-v2.0-model-migration"`
5. FOR each agent file in the caller-supplied v1-legacy candidate list:
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
     d. Stamp `plugin_version: <current>` into agent frontmatter (read current from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`). Required so the migrated agent is no longer re-detected as v1-legacy on future runs.
6. UPDATE `topology.json`:
     metadata.migrated_at = <iso8601_now>
     metadata.source_model_tiers_version = source_profile.model_tiers_version
7. COMMIT: `git commit -am "auto-migrate: schema â†’ model_tier resolution"`
8. EMIT migration report table:
     Step          Old model              â†’ New tier   Confidence
     architect     claude-opus-4-7        â†’ deep       exact
     coder         claude-sonnet-4-6      â†’ medium     exact
     triage        claude-3-5-haiku       â†’ triage     fuzzy
     custom        my-fine-tuned-thing    â†’ medium     ambiguous (kept model:, added TODO)
9. PROCEED to Phase 0.6 (portability validation).
```

## Invariants

<invariants>
- NEVER delete the `model:` line for ambiguous reverse-maps â€” preserve user data with a TODO comment.
- MUST create a pre-migration commit even on a clean tree, so revert is one-step.
- MUST update `topology.json` with `migrated_at` for audit trail.
- MUST surface migration report to user before Phase 0.6.
- ON ambiguous reverse-map, BOTH `model:` and `model_tier: medium` coexist; auditor flags this as SEV-3 info.
- MUST stamp `plugin_version` on every migrated agent. Without the stamp, the agent re-triggers Phase 0.45 on the next run (infinite migration loop on dirty trees).
- MUST NOT touch agents the caller did not classify as v1-legacy. Agents with `plugin_version >= 2.0.0` and explicit `model:` are intentional escape hatches — clobbering them violates user intent.
</invariants>

## Red Flags â€” STOP

- "I'll auto-migrate without a git commit since the tree is clean." â†’ **STOP**. The empty commit is the revert anchor.
- "I'll skip files with unknown model IDs." â†’ **STOP**. Unknown IDs get `model_tier: medium` + TODO; never skip.
- "I'll prompt the user per-file." â†’ **STOP**. Single advisory + single accept-all prompt. Per-file prompting is exhausting.

## Reference Files

- `fixtures/v1-agent.md` â€” Example pre-v2.0 agent.
- `fixtures/v2-agent-expected.md` â€” Expected post-migration output.
- `sk-model-resolver/SKILL.md` Â§ REVERSE_MAP â€” Reverse-mapping algorithm.
- `sk-pipeline-paths/SKILL.md` â€” Scope enumeration.
