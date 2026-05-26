# PR-02 Discriminating-Power Test

> Locks PR-02's regex to a known-bad baseline (`pre-baseline.md`, snapshot from `39dd0e6`) and a known-good baseline (`post-baseline.md`, snapshot from the resolver-consolidation refactor tip). Any future edit to PR-02's regex in `compliance-matrix.md` must continue to discriminate between these two snapshots, or the criterion has lost its enforcement power.

## What this test asserts

The PR-02 criterion's regex, when executed against:

- `pre-baseline.md` → returns a violation count **≥ 1** (the pre-refactor `sk-model-resolver/SKILL.md` restated the algorithm in its body, and PR-02 must catch it).
- `post-baseline.md` → returns a violation count **= 0** (the post-refactor body holds only public API + invariants + Red Flags + a normative pointer; PR-02 must NOT trip).

If either condition fails, the criterion's regex is broken (false positive, false negative, or both).

## How to run

Read PR-02's `Detection` cell in `skills/pipeline-auditor-references/references/compliance-matrix.md`. Extract the regex command. Substitute the target path for each baseline below.

```bash
# Pre-baseline (expected: violation count ≥ 1)
<PR-02 regex> skills/pipeline-auditor-references/references/fixtures/discriminating-power/pr-02/pre-baseline.md

# Post-baseline (expected: violation count = 0)
<PR-02 regex> skills/pipeline-auditor-references/references/fixtures/discriminating-power/pr-02/post-baseline.md
```

## How to refresh baselines

- **Pre-baseline:** never refresh. It is an immutable snapshot of `39dd0e6:skills/sk-model-resolver/SKILL.md` — the specific historical violation this criterion was authored to detect.
- **Post-baseline:** refresh when `sk-model-resolver/SKILL.md` changes in a way that ADR-0001 deems compliant. Re-run the test after refresh to confirm the regex still returns 0.

## Provenance

- `pre-baseline.md` — `git show 39dd0e6:skills/sk-model-resolver/SKILL.md` (259 lines, contains restated algorithm).
- `post-baseline.md` — copy of `skills/sk-model-resolver/SKILL.md` at the tip of `feat/multi-platform-impl` after slice S1 (112 lines, normative-pointer only).
