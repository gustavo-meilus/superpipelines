# Read-First Dispatch Load — Design

**Date:** 2026-06-05
**Status:** Approved (design)
**Scope:** `skills/running-a-pipeline/SKILL.md` Phase 0.25 only.

## Problem

`/run-pipeline` surfaces a fatal error to the user:

```
Error: Skill superpipelines:sk-platform-dispatch cannot be used with Skill tool due to disable-model-invocation
```

`sk-platform-dispatch/SKILL.md` carries `disable-model-invocation: true` (intentional — it
blocks the model from spontaneously re-entering dispatch mid-run). Phase 0.25 Step 2 of
`running-a-pipeline` nonetheless *attempts* `Skill(superpipelines:sk-platform-dispatch).DETECT()`
first, wrapped in an instructional `try/catch DisableModelInvocation` that is supposed to pivot
to `Read()` the skill file on failure.

## Root Cause

The `Skill()` load is **100% guaranteed to fail** — the flag never changes. The documented
recovery is *instructional pseudocode*, not real control flow: it depends on the model
deliberately triggering a known failure, recognizing the harness rejection as the `catch`
branch, and self-recovering to `Read()`. Under orchestration drift / low effort the model
instead treats the tool-error as fatal and surfaces it to the user. No runtime guard forces
the pivot.

The correct precedent already exists: `sk-model-resolver` is loaded via the Skill tool and
carries **no** flag — it works. The two skill classes were wrongly merged onto one flag:

- **Protocol / entry skills** — flag correct (loaded via agent `skills:` list or are pipeline
  entries; must block spontaneous model invocation).
- **Utility skills orchestrators load mid-run** — must be loadable by the orchestrator.

`sk-platform-dispatch` keeps the flag (re-entry guard is genuinely wanted), so the fix is on
the *load mechanism*, not the flag: read the file deterministically instead of attempting a
doomed `Skill()` call.

## Decision

Read-first, dispatch-only. Remove the guaranteed-fail `Skill()` / `activate_skill()` attempt
for `sk-platform-dispatch` from Phase 0.25. Replace with a deterministic `Read()` of the skill
file followed by inline `DETECT()` execution. The flag on `sk-platform-dispatch` is unchanged —
`Read()` bypasses it legitimately.

Sibling utility skills (`sk-pipeline-paths`, `sk-pipeline-state`, `sk-pipeline-grilling`,
`sk-write-review-isolation`) carry the same flag and are loaded by orchestrators via method-call
syntax — they are latent same-bugs. **Out of scope** for this change by explicit decision;
noted for a future pass.

## New Phase 0.25 Logic

```
Step 1 — Locate dispatch skill.
  Detect whether a file-read tool (Read) is available (all tiers with plugin on disk).

Step 2 — Read-first detect:
  - File-read tool present:
      try:
        Read(skills/sk-platform-dispatch/SKILL.md)
        profile = execute_DETECT_from_skill_body()   // includes Task-tool probe → tier_1, etc.
      catch FileNotFound | unreadable:                // plugin not registered in this env
        emit advisory: "plugin not installed in this environment — INLINE-DETECT() fallback"
        profile = INLINE-DETECT()
  - No file-read tool at all:
      emit advisory; profile = INLINE-DETECT()

  On success (any path): cache platform_profile in session context. Proceed normally.
```

### Removed
- `Skill(superpipelines:sk-platform-dispatch).DETECT()` / `activate_skill(...)` load attempt.
- `catch DisableModelInvocation` branch (no longer reachable).
- Probe-table rows that route to `Skill` / `activate_skill` loads (rewritten to "Read file, run DETECT()").

### Preserved
- **Task-tool probe inside `DETECT()`** — the reason a plain `INLINE-DETECT()` fallback is
  insufficient (it lacks the probe and misidentifies tier_1 as tier_1c when `agy` is installed
  and `CLAUDE_CODE` is unset). Preserved by reading the real skill body.
- `INLINE-DETECT()` as the genuine fallback for the *plugin-not-on-disk* case only.
- `SUPERPIPELINES_FORCE_TIER` escape hatch.
- `disable-model-invocation: true` on `sk-platform-dispatch`.

## Why This Is the Root Fix

Replaces "trigger a guaranteed failure, then hope the model recovers" with a deterministic file
read. No reliance on model discipline to convert a tool-rejection into a recovery path.

## Verification

- `/run-pipeline` on Tier 1 (CC) no longer emits the `disable-model-invocation` error;
  tier resolves to `tier_1` via the Task-probe.
- Plugin-absent environment still falls to `INLINE-DETECT()` with advisory.
- No `Skill(...sk-platform-dispatch...)` or `catch DisableModelInvocation` references remain in
  `running-a-pipeline/SKILL.md`.

## Out of Scope
- Sibling flagged utility skills (latent same-bug).
- Any change to `sk-platform-dispatch` frontmatter or `DETECT()` heuristics.
