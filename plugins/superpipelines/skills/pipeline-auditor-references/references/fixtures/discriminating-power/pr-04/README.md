# PR-04 Discriminating-Power Test

> Locks PR-04's regex to a known-bad baseline (`pre-baseline.md`, snapshot from `39dd0e6`) and a known-good baseline (`post-baseline.md`, snapshot from the resolver-consolidation refactor tip). PR-04 is **SEV-1**: the bug it gates silently drops user/workspace preferences on Tier 1c and Tier 2 hosts, producing wrong model selection without any error surfaced to the user. The criterion's regex must demonstrably catch this on `pre-baseline.md` or it has lost its enforcement power.

## What this test asserts

The PR-04 criterion's regex, when executed against:

- `pre-baseline.md` → returns a `LOAD_PREFS(` invocation count **= 0** inside the Phase 0.4 *Inline Path* block (the pre-refactor inline adapter either had no inline block or hardcoded empty prefs — both are SEV-1 violations).
- `post-baseline.md` → returns a `LOAD_PREFS(` invocation count **≥ 1** inside the same block (the post-refactor inline adapter calls LOAD_PREFS independently of Skill-tool availability, per ADR-0002).

If either condition fails, the criterion is broken.

## Why this criterion needs scope extraction (not whole-file grep)

A whole-file `grep LOAD_PREFS` returns ≥1 on `pre-baseline.md` because the file already mentioned `LOAD_PREFS` once at line 82 as a public-API reference, *outside* the broken inline block. A bare-name grep therefore passes against the broken state — a false negative on a SEV-1 criterion.

The correct check extracts the inline-path block by header anchors (`**Inline Path` through the next `<HARD-GATE>`) and counts only `LOAD_PREFS(` invocation syntax (with opening paren) inside that range.

## How to run

Read PR-04's `Detection` cell in `skills/pipeline-auditor-references/references/compliance-matrix.md`. Extract the regex command. Substitute the target path for each baseline below.

```bash
# Pre-baseline (expected: invocation count = 0)
sed -n '/\*\*Inline Path/,/<HARD-GATE>/p' \
  skills/pipeline-auditor-references/references/fixtures/discriminating-power/pr-04/pre-baseline.md \
  | grep -c "LOAD_PREFS("

# Post-baseline (expected: invocation count ≥ 1)
sed -n '/\*\*Inline Path/,/<HARD-GATE>/p' \
  skills/pipeline-auditor-references/references/fixtures/discriminating-power/pr-04/post-baseline.md \
  | grep -c "LOAD_PREFS("
```

## How to refresh baselines

- **Pre-baseline:** never refresh. Immutable snapshot of `39dd0e6:skills/running-a-pipeline/SKILL.md` — the specific historical SEV-1 violation this criterion was authored to detect.
- **Post-baseline:** refresh when `running-a-pipeline/SKILL.md` changes in a way that ADR-0002 deems compliant. Re-run the test after refresh to confirm the regex still returns ≥1.

## Edge case: pre-baseline has no inline-path block at all

If `sed` returns empty output because the pre-baseline did not yet contain a `**Inline Path` marker (the inline-path branch was added later in the refactor), `grep -c` correctly returns `0`. That is a valid SEV-1 outcome — a missing inline block cannot invoke LOAD_PREFS within it.

## Provenance

- `pre-baseline.md` — `git show 39dd0e6:skills/running-a-pipeline/SKILL.md`.
- `post-baseline.md` — copy of `skills/running-a-pipeline/SKILL.md` at the tip of `feat/multi-platform-impl` after slice S2.
