---
title: Auditor grep specificity — PR-02 and PR-04 cannot detect their target violations
date: 2026-05-25
status: ready-for-agent
related_adrs:
  - 0001-resolution-algorithm-one-spec-two-adapters
  - 0002-platform-capabilities-are-independent
related_prds:
  - 2026-05-25-resolver-consolidation-and-profile-schema
---

## Problem Statement

A QA negative-control pass against commit `39dd0e6` (the parent of slice S3, immediately pre-refactor) revealed that two of the seven new resolver-consolidation auditor criteria added in slice S4 — PR-02 and PR-04 — cannot detect the violations they were written to enforce.

- **PR-02** is meant to enforce ADR-0001 by detecting when `sk-model-resolver/SKILL.md` restates the resolution algorithm in its body (instead of pointing to the normative `references/resolution-algorithm.md`). Its grep targets the literal pattern `Step [0-9]+:`. But the pre-refactor SKILL.md body restated the full algorithm using `1.`, `2.`, `3.` numbered list items inside a pseudocode block — *not* using `Step N:` labels. The grep returns `0` matches against both the pre-refactor body (which violated ADR-0001) and the post-refactor body (which complies). The check has zero discriminating power for its own target pattern.

- **PR-04** is meant to enforce ADR-0002 by detecting when the inline adapter in `running-a-pipeline` Phase 0.4 skips `LOAD_PREFS` (treating preference-file reads as gated on Skill-tool availability). Its grep requires `≥1 LOAD_PREFS match` in the SKILL.md file. But the pre-refactor file already mentioned `LOAD_PREFS` once as a public-API reference outside the inline block — so the check passes against the broken pre-refactor state as well as the fixed post-refactor state. PR-04 is a SEV-1 criterion (silent wrong-output bug), making the false-negative especially dangerous.

The user-facing consequence: future regressions of the exact patterns these criteria were designed to catch would slip through `/audit-pipeline` undetected. The audit report would falsely certify resolver consolidation as healthy.

## Solution

Tighten PR-02 and PR-04's grep patterns so that running the audit against a pre-refactor codebase produces a FAIL, while running against the post-refactor codebase continues to produce a PASS. Both grep patterns must be *differential* — capable of distinguishing the violation from the fix on the same file path.

For PR-02: detect numbered-pseudocode-block patterns rather than the absent `Step N:` label.

For PR-04: scope the `LOAD_PREFS` search to the Phase 0.4 inline-path block and require invocation syntax (`LOAD_PREFS(...)`) rather than the bare token (which matches API-list mentions and Red Flags prose).

Regenerate the auditor fixtures (`pr-02-*.md`, `pr-04-*.md`) so they violate the *new* patterns (proving the fixtures and the criteria are aligned).

## User Stories

1. As a pipeline auditor, I want PR-02 to detect numbered-list pseudocode blocks in `sk-model-resolver/SKILL.md`, so that ADR-0001 violations cannot ship without an audit finding.
2. As a pipeline auditor, I want PR-04 to detect inline adapters that omit a `LOAD_PREFS(...)` invocation inside the Phase 0.4 inline block, so that ADR-0002 capability-coupling regressions cannot ship without a SEV-1 finding.
3. As a release engineer, I want every auditor criterion in the resolver-consolidation set to demonstrably fail against the immediate pre-refactor parent commit, so that I have evidence the audit gate has discriminating power before tagging v2.0.0.
4. As an agent maintainer, I want each PR-* criterion in `compliance-matrix.md` to cite the regex it executes and a fixture that violates that regex, so that loose grep patterns are caught at review time, not at audit-execution time.
5. As an auditor user, I want PR-04's evidence trail to include the line range scanned (Phase 0.4 inline-path block), so that I can verify the scope was correct, not whole-file.
6. As an architect, I want a negative-control protocol documented for future PR-* additions, so that new audit criteria must demonstrate they fail on a known-bad commit before being merged.
7. As a contributor, I want the existing PR-02 and PR-04 fixtures to be updated alongside the regex change, so that the fixture–regex relationship is enforced by the audit-fixture self-test loop.
8. As a reviewer, I want the change-models drift-detection gap (Check 9 finding) recorded as a follow-up so it is not lost, but explicitly out of scope for this PRD so the audit-grep fix can ship independently.
9. As a release engineer, I want the regression-baseline check (running the audit against the pre-refactor parent) wired into the release checklist for any future audit-criterion additions, so that the same defect cannot recur.

## Implementation Decisions

### Modules modified

- **`pipeline-auditor-references/references/compliance-matrix.md`** — the normative source for audit criteria, including their regex evidence. PR-02 and PR-04 rows updated.
- **`pipeline-auditor-references/references/fixtures/pr-02-resolver-body-restates-steps.md`** — regenerated to violate the new PR-02 pattern (numbered-list pseudocode), not the old "Step N:" label.
- **`pipeline-auditor-references/references/fixtures/pr-04-inline-skips-load-prefs.md`** — regenerated to violate the new PR-04 pattern (no `LOAD_PREFS(` invocation inside the Phase 0.4 inline-path block).

### Modules untouched (and why)

- **`pipeline-auditor-protocol/SKILL.md`** — protocol body references criterion IDs only, not regex. No change needed; the criterion semantics stay the same, only the regex tightens.
- **`sk-model-resolver/SKILL.md`** and **`running-a-pipeline/SKILL.md`** — these already comply with the *intent* of PR-02 and PR-04. They will continue to pass under the tightened grep. No body changes required.

### Regex contract changes

PR-02 — detect numbered pseudocode in resolver body:
- **Old:** `grep -n "Step [0-9]\+:" skills/sk-model-resolver/SKILL.md`
- **New:** `grep -nE "^[[:space:]]*[0-9]+\." skills/sk-model-resolver/SKILL.md` (any line beginning with optional whitespace + integer + period + space — the canonical pseudocode-numbering shape)
- **Discriminating evidence:** returns `10` against `39dd0e6`, `0` against post-refactor.

PR-04 — detect inline adapter that omits LOAD_PREFS invocation:
- **Old:** any `LOAD_PREFS` mention anywhere in `skills/running-a-pipeline/SKILL.md`.
- **New:** extract the Phase 0.4 *inline-path* block by header anchors, then require `LOAD_PREFS(` (with an opening paren — invocation syntax, not bare identifier). Failure mode: `0` invocations inside the block = SEV-1 finding.
- **Discriminating evidence:** the same regex returns `0` invocations against the pre-refactor inline block, `≥1` against post-refactor.

### Auditor-criterion authoring rule (new)

Every PR-* criterion added to `compliance-matrix.md` must, at authoring time, demonstrate:

1. The criterion's regex returns a violation count `> 0` against a documented pre-refactor or known-broken commit.
2. The criterion's regex returns a violation count `= 0` against the compliant target state.
3. The fixture file under `pipeline-auditor-references/references/fixtures/` violates the regex by the same count, so a future "audit-the-audit" pass can verify regex-fixture alignment automatically.

This rule is informational for this PRD and will be encoded as a permanent authoring constraint in a follow-up audit pass.

### Scope decision: regex specificity vs structural parsing

Considered: replacing grep with a structural markdown parser that knows headings and code-block boundaries.
Rejected for this PRD: scope creep. Grep patterns with header-anchored ranges are sufficient to fix both PR-02 and PR-04 with zero new dependencies. A structural-parser upgrade is filed as v2.1+ further work.

## Testing Decisions

### What makes a good test

A good test here verifies *audit behaviour against canonical inputs* — not the implementation of grep. Two complementary tests per criterion:

- **Positive fixture** — a minimal SKILL.md body that violates the criterion. The audit must report the finding with correct SEV.
- **Negative control** — the current healthy SKILL.md. The audit must report zero findings for this criterion.

Both tests exercise the criterion through its public surface (the audit report), not through the regex internals. Renaming the regex variable or refactoring the auditor scan loop must not break the tests.

### Modules tested

- **PR-02 fixture + the post-refactor `sk-model-resolver/SKILL.md`** — fixture should FAIL the criterion; live file should PASS.
- **PR-04 fixture + the post-refactor `running-a-pipeline/SKILL.md`** — fixture should FAIL with SEV-1; live file should PASS.

### Negative-control regression baseline

In addition to fixture-based tests, the QA plan for this PRD includes one regression baseline:

- Run `/audit-pipeline` against `39dd0e6` (or simulate via `git show`) and confirm both PR-02 and PR-04 now report findings. This is the proof that the tightened criteria have discriminating power. Without this step, the fix is unverifiable.

### Prior art

The closest prior art in the codebase is the resolver-fixture pattern under `skills/sk-model-resolver/fixtures/` — input + expected-output JSON pairs that exercise algorithm branches. The auditor fixtures already follow a similar pattern (one fixture per PR-* criterion). This PRD only updates two existing fixtures; no new test infrastructure is introduced.

## Out of Scope

- **Re-auditing PR-01, PR-03, PR-05, PR-07** — the negative-control pass confirmed these three already have discriminating power. They are not in scope.
- **`change-models` Mode F inline drift duplication** — Check 9 of the QA pass noted that `change-models` duplicates `DETECT_CATALOG_DRIFT` logic inline rather than calling the resolver's published op. This is a pre-existing ADR-0001 gap (not introduced by S1–S4) and is filed for a separate v2.0.x follow-up PRD.
- **Replacing grep with a structural markdown parser** — deferred to v2.1+.
- **Adding PR-06** — explicitly dropped during the initial grilling session that produced the parent PRD; not revisited here.
- **Automated cross-platform parity tests** — already deferred to v2.1 per the project's `PARITY_TESTING: MANUAL_PHASE1` invariant.
- **Editing `sk-model-resolver/SKILL.md` or `running-a-pipeline/SKILL.md`** — these files already comply; touching them would be a no-op risk.

## Further Notes

This PRD exists because the QA grilling pass exposed an asymmetry: the *implementation* of the resolver-consolidation refactor was correctly executed by slices S1–S4, but the *auditor criteria* added by S4 were too loose to enforce the same invariants going forward. Shipping v2.0.0 with hollow audit criteria would make the next regression — whenever it happens — silent.

The lesson encoded in user story 6 (and the new authoring rule under Implementation Decisions) is that *every* new audit criterion must be paired, at authoring time, with a negative-control commit that demonstrably fails the criterion. Without that pairing, criteria can be written that "feel right" syntactically but cannot fire on real-world violations.

Release-gating posture: this fix should land before v2.0.0 tag. Estimated effort is small — two compliance-matrix rows updated and two fixture files regenerated. The cost of deferring is that v2.0.0 ships with an audit gate that is quietly hollow on two of its seven new resolver criteria, and any regression of ADR-0001 or ADR-0002 between v2.0.0 and v2.1 will be undetectable by the very criteria added to detect them.
