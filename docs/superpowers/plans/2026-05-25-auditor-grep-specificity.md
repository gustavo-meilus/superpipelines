# Auditor Grep Specificity Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten PR-02 and PR-04 grep patterns in `compliance-matrix.md` so both criteria can detect the violations they were authored to enforce. Regenerate the two fixtures to match the new patterns. Ship on the same `feat/multi-platform-impl` branch as release-gating for v2.0.0.

**Architecture:** Two compliance-matrix rows updated. Two fixture files regenerated. One negative-control verification pass against pre-refactor commit `39dd0e6`. Five tasks, one commit each, all in series.

**Tech Stack:** Markdown editing only (no code), `git show` for negative-control verification, Grep tool with `-E` for regex tests.

**Branch:** `feat/multi-platform-impl` (same branch as S1–S4). Do NOT branch off.

**Companion PRD:** `docs/prd/2026-05-25-auditor-grep-specificity.md`.

---

## Background

A negative-control pass against commit `39dd0e6` (the immediate parent of S3) revealed two of the seven new resolver-consolidation auditor criteria cannot detect their target violations:

- **PR-02** uses `grep "Step [0-9]\+:"` to detect algorithm restatement in `sk-model-resolver/SKILL.md`. The pre-refactor body restated the algorithm using `1.`, `2.`, `3.` numbered list items, not `Step N:` labels. Pre-refactor returned 0 matches; post-refactor returns 0 matches. **No discriminating power for the target pattern.**

- **PR-04** uses bare `grep LOAD_PREFS` over the whole file. Pre-refactor `running-a-pipeline/SKILL.md` already mentioned `LOAD_PREFS` once at line 82 as a public-API reference, outside the broken inline block. Pre-refactor returned 1 match; post-refactor returns 6 matches. **The check passes against the broken state.**

The other five PR-* criteria (PR-01, PR-03, PR-05, PR-07) demonstrably have discriminating power and are out of scope.

Detection-pattern targets, by inspection:

- PR-02 new pattern: `^[[:space:]]*[0-9]+\.` (numbered list item — canonical pseudocode shape). Returns 10 against `39dd0e6`, 0 against post-refactor.
- PR-04 new pattern: extract Phase 0.4 *Inline Path* block (anchored between `**Inline Path` marker and the next `<HARD-GATE>` line), then require `LOAD_PREFS(` (with opening paren — invocation syntax, not bare identifier).

---

## File Structure

| File | Action | Lines affected |
|---|---|---|
| `skills/pipeline-auditor-references/references/compliance-matrix.md` | Modify two rows (PR-02, PR-04) + remediation notes | 70, 72, 79, 81 |
| `skills/pipeline-auditor-references/references/fixtures/pr-02-resolver-body-restates-steps.md` | Regenerate | Full file |
| `skills/pipeline-auditor-references/references/fixtures/pr-04-inline-skips-load-prefs.md` | Regenerate detection section | Detection block |

No other files touched. No production skill bodies change (they already comply).

---

## Task 1: Update PR-02 grep pattern in compliance-matrix.md

**Files:**
- Modify: `skills/pipeline-auditor-references/references/compliance-matrix.md` — row PR-02 (line 70) + remediation bullet (line 79).

- [ ] **Step 1: Replace PR-02 detection regex**

  Edit the `Detection` cell of the PR-02 row to:
  - Replace `grep -n "Step [0-9]\\+:" skills/sk-model-resolver/SKILL.md` with `grep -nE "^[[:space:]]*[0-9]+\\." skills/sk-model-resolver/SKILL.md`.
  - Replace the rationale sentence to read: "returns any match (numbered pseudocode block in body)". Keep the ADR-0001 citation intact.

- [ ] **Step 2: Update PR-02 remediation bullet**

  Edit the `PR-02:` line under `### Resolver remediation` (line 79) to:
  - Replace "Delete algorithm steps from..." with "Delete any numbered pseudocode blocks (lines beginning with `1.`, `2.`, ...) from `sk-model-resolver/SKILL.md`; replace with a single normative pointer line."

- [ ] **Step 3: Verify regex discriminates pre vs post**

  Run:
  ```bash
  echo "=== pre-refactor (must return > 0) ==="
  git show 39dd0e6:skills/sk-model-resolver/SKILL.md | grep -cE "^[[:space:]]*[0-9]+\."
  echo "=== post-refactor (must return 0) ==="
  grep -cE "^[[:space:]]*[0-9]+\." skills/sk-model-resolver/SKILL.md
  ```
  Expected: pre-refactor `10`; post-refactor `0`. If either differs, the regex is wrong — STOP and re-derive.

- [ ] **Step 4: Commit**

  ```
  fix(auditor): PR-02 detects numbered pseudocode (not "Step N:" labels)

  PR-02's previous grep targeted "Step N:" labels but the actual violation
  pattern is numbered list items inside pseudocode blocks. Negative-control
  pass against 39dd0e6 confirmed the old grep returned 0 matches against the
  broken pre-refactor body. New grep ^[[:space:]]*[0-9]+\\. returns 10 against
  39dd0e6 and 0 against HEAD.
  ```

---

## Task 2: Update PR-04 grep pattern in compliance-matrix.md

**Files:**
- Modify: `skills/pipeline-auditor-references/references/compliance-matrix.md` — row PR-04 (line 72) + remediation bullet (line 81).

- [ ] **Step 1: Replace PR-04 detection regex**

  Edit the `Detection` cell of the PR-04 row to:
  - Replace whole-file `LOAD_PREFS` scan with a scoped extraction:
    1. Extract the Phase 0.4 *Inline Path* block — lines starting at `**Inline Path` marker through the next `<HARD-GATE>` line.
    2. Within that block, require `LOAD_PREFS(` (with opening paren — invocation syntax, not the bare identifier).
  - Example command (sed-style range extraction via Bash tool):
    ```bash
    sed -n '/\*\*Inline Path/,/<HARD-GATE>/p' \
      skills/running-a-pipeline/SKILL.md | grep -c "LOAD_PREFS("
    ```
  - Result `0` = SEV-1 finding (inline adapter does not invoke LOAD_PREFS).
  - Keep the ADR-0002 citation and SEV-1 designation intact.

- [ ] **Step 2: Update PR-04 remediation bullet**

  Edit the `PR-04:` line under `### Resolver remediation` (line 81) to read:
  - "Add a `LOAD_PREFS(workspace_root)` invocation (with parens) inside the Phase 0.4 *Inline Path* block. Graceful degradation to empty prefs only on file-read failure. Do not gate on Skill-tool availability. Bare-name mentions outside the inline block do not satisfy this criterion."

- [ ] **Step 3: Verify regex discriminates pre vs post**

  Run:
  ```bash
  echo "=== pre-refactor: count LOAD_PREFS( inside Phase 0.4 inline block ==="
  git show 39dd0e6:skills/running-a-pipeline/SKILL.md \
    | sed -n '/\*\*Inline Path/,/<HARD-GATE>/p' | grep -c "LOAD_PREFS("
  echo "=== post-refactor: same scope ==="
  sed -n '/\*\*Inline Path/,/<HARD-GATE>/p' \
    skills/running-a-pipeline/SKILL.md | grep -c "LOAD_PREFS("
  ```
  Expected: pre-refactor `0`; post-refactor `≥1`. If pre-refactor `> 0` or post-refactor `0`, the anchor pattern is wrong — STOP and inspect the block boundaries before proceeding.

  Edge case: if `39dd0e6`'s `running-a-pipeline/SKILL.md` does not contain a `**Inline Path` marker (because the inline path was added later), `sed` will return empty — that counts as `0` and is still a valid violation outcome (no inline block = no LOAD_PREFS invocation in it). Document this in the regex-rationale cell.

- [ ] **Step 4: Commit**

  ```
  fix(auditor): PR-04 scopes LOAD_PREFS check to Phase 0.4 inline block

  PR-04's previous grep matched any LOAD_PREFS mention in the whole file,
  including unrelated public-API references. Pre-refactor 39dd0e6 had one
  such mention outside the broken inline block, so the criterion passed
  against the broken state. New detection extracts the inline-path block
  by header anchors and requires LOAD_PREFS( invocation syntax inside.
  Returns 0 against 39dd0e6 (SEV-1 finding), ≥1 against HEAD.
  ```

---

## Task 3: Regenerate PR-02 fixture

**Files:**
- Modify (full rewrite): `skills/pipeline-auditor-references/references/fixtures/pr-02-resolver-body-restates-steps.md`.

The current fixture's pseudocode uses `Step 1:` `Step 2:` labels — under the new PR-02 grep `^[[:space:]]*[0-9]+\.`, this fixture would NOT trigger. Fixture and criterion must agree.

- [ ] **Step 1: Rewrite fixture pseudocode block**

  Replace the `Step N:` lines in the simulated-bad block with the canonical pseudocode shape — numbered list items `1.`, `2.`, `3.`, ... — matching the format used in `sk-model-resolver/references/resolution-algorithm.md`. Use enough lines (at least 8) so the violation is unambiguous.

- [ ] **Step 2: Update the Detection block**

  Replace the old detection command with the new one:
  ```
  grep -nE "^[[:space:]]*[0-9]+\." skills/sk-model-resolver/SKILL.md
  ```
  Update the descriptive line above it to say "Numbered list items (`1.`, `2.`, …) at line start" instead of "Numbered step list (\"Step 1:\", \"1.\", etc.)".

- [ ] **Step 3: Self-test the fixture**

  Run the new detection command against the fixture file itself:
  ```bash
  grep -cE "^[[:space:]]*[0-9]+\." skills/pipeline-auditor-references/references/fixtures/pr-02-resolver-body-restates-steps.md
  ```
  Expected: `≥ 8`. If `0`, the fixture body still uses the old shape — re-edit.

- [ ] **Step 4: Commit**

  ```
  test(auditor): regenerate PR-02 fixture to match new grep pattern

  Fixture now uses canonical numbered pseudocode (1., 2., 3., ...) so it
  triggers the tightened PR-02 regex. Self-test confirms ≥8 matches.
  ```

---

## Task 4: Regenerate PR-04 fixture detection section

**Files:**
- Modify: `skills/pipeline-auditor-references/references/fixtures/pr-04-inline-skips-load-prefs.md` — detection section only.

The fixture's simulated-bad inline block is still correct (no LOAD_PREFS invocation). Only the detection block needs updating to match the new scoped grep.

- [ ] **Step 1: Rewrite the Detection block**

  Replace lines 58-62 (the "Detection" section) with:
  ```
  ## Detection

  Extract the Phase 0.4 *Inline Path* block and count LOAD_PREFS invocations:

  ```bash
  sed -n '/\*\*Inline Path/,/<HARD-GATE>/p' \
    skills/running-a-pipeline/SKILL.md | grep -c "LOAD_PREFS("
  ```

  Result `0` = SEV-1 PR-04 violation: the inline adapter never invokes LOAD_PREFS,
  silently dropping user/workspace preferences on Tier 1c and Tier 2 hosts.

  Note: bare `LOAD_PREFS` mentions elsewhere in the file (public API summaries,
  Red Flag prose) do NOT satisfy this criterion. Invocation syntax with an
  opening paren is required, inside the inline-path block.
  ```

- [ ] **Step 2: Self-test by running the new detection against the fixture's simulated-bad block**

  The fixture's simulated bad block (lines 14–26 of the existing fixture) has no LOAD_PREFS at all, so the new regex correctly returns 0. Confirm by extracting the fixture's bad block manually and running `grep -c "LOAD_PREFS("` — expect 0.

- [ ] **Step 3: Commit**

  ```
  test(auditor): regenerate PR-04 fixture detection to match scoped grep

  Detection block now extracts the Phase 0.4 inline-path range and counts
  LOAD_PREFS( invocations within. Fixture's simulated bad block still
  contains zero invocations, so it correctly triggers SEV-1.
  ```

---

## Task 5: Negative-control verification pass

**Goal:** Prove the two tightened criteria, taken as a pair, demonstrably fail against `39dd0e6` and pass against `HEAD`. This is the load-bearing evidence that the QA gate now has discriminating power.

**Files:** None modified. Verification only.

- [ ] **Step 1: Run PR-02 against pre-refactor**

  ```bash
  git show 39dd0e6:skills/sk-model-resolver/SKILL.md \
    | grep -cE "^[[:space:]]*[0-9]+\."
  ```
  Expected: `10` (or any value `≥ 1`). Record actual count.

- [ ] **Step 2: Run PR-02 against post-refactor**

  ```bash
  grep -cE "^[[:space:]]*[0-9]+\." skills/sk-model-resolver/SKILL.md
  ```
  Expected: `0`. Any value `> 0` means the post-refactor body still contains numbered pseudocode — STOP and inspect.

- [ ] **Step 3: Run PR-04 against pre-refactor**

  ```bash
  git show 39dd0e6:skills/running-a-pipeline/SKILL.md \
    | sed -n '/\*\*Inline Path/,/<HARD-GATE>/p' | grep -c "LOAD_PREFS("
  ```
  Expected: `0`. Record actual count.

- [ ] **Step 4: Run PR-04 against post-refactor**

  ```bash
  sed -n '/\*\*Inline Path/,/<HARD-GATE>/p' \
    skills/running-a-pipeline/SKILL.md | grep -c "LOAD_PREFS("
  ```
  Expected: `≥ 1`. Any value `0` means the inline block boundaries shifted — STOP and inspect.

- [ ] **Step 5: Record results to execution log**

  Create or append: `docs/superpowers/plans/2026-05-25-auditor-grep-specificity.execution.log`

  Format:
  ```
  2026-05-25 — Negative-control pass

  PR-02 pre  (39dd0e6): <count> matches  [PASS if ≥1]
  PR-02 post (HEAD):    <count> matches  [PASS if =0]
  PR-04 pre  (39dd0e6): <count> matches  [PASS if =0]
  PR-04 post (HEAD):    <count> matches  [PASS if ≥1]

  Conclusion: PR-02 and PR-04 both demonstrate discriminating power. Both
  tightened criteria now fail against the immediate pre-refactor parent and
  pass against the current branch tip. QA gate is no longer hollow on these
  two criteria. Release-gating verdict: OK to tag v2.0.0 once normal smoke
  tests complete.
  ```

- [ ] **Step 6: Commit the execution log**

  ```
  test(auditor): record negative-control pass for tightened PR-02 / PR-04

  Both criteria now fail against 39dd0e6 (pre-refactor) and pass against
  HEAD. QA gate confirmed discriminating.
  ```

---

## Post-implementation: push and tag readiness

After all five tasks land, `feat/multi-platform-impl` will carry the four S1–S4 commits plus four to five new commits from this plan. Push with `git push` (no force). Branch remains release-gating for v2.0.0.

**Do NOT tag v2.0.0 from this plan.** Tagging is a separate user-authorized step that comes after a full `/audit-pipeline` pass and any final smoke tests the user wants to run. This plan only seals the audit-criteria gap; it does not authorize the release.

---

## Out of Scope (re-stated for plan workers)

- Replacing grep with a structural markdown parser. Filed as v2.1+ further work.
- Fixing the `change-models` Mode F inline drift duplication (Check 9 finding). Pre-existing; separate PRD.
- Editing `sk-model-resolver/SKILL.md` or `running-a-pipeline/SKILL.md`. Both already comply with the *intent* of PR-02 and PR-04. Touching them is no-op risk and a likely scope violation.
- Adding new PR-* criteria (e.g., a missing PR-06). Explicitly dropped during the original grilling session.
- Encoding the "negative-control authoring rule" (PRD user story 6) as a permanent constraint in the auditor protocol. Filed for the follow-up audit pass.

---

## Failure modes & escalation

- **A new grep is wrong (false PASS on pre-refactor):** the regex matched something it shouldn't. STOP — do not commit the row update. Re-derive the pattern by reading the actual pre-refactor file content with `git show 39dd0e6:<path>`.
- **A new grep is wrong (false FAIL on post-refactor):** the post-refactor body contains an unexpected pattern (e.g., the resolver SKILL.md gained numbered pseudocode that's *not* algorithm restatement — a numbered "Red Flags" or "Reference Files" list, for example). Inspect, then either tighten the pattern further (e.g., constrain to fenced-code-block regions) or remove the offending lines if they're a defect.
- **Inline-path block boundaries don't match anchors on `39dd0e6`:** the inline path block was introduced after `39dd0e6`. This is acceptable for PR-04 — a missing block returns 0 invocations, which is correctly a violation (the broken pre-refactor adapter didn't have an inline path at all, so it certainly didn't call LOAD_PREFS there). Document this rationale in the compliance-matrix cell.
- **A task takes longer than ~15 minutes:** STOP. This plan is intentionally small. Sustained difficulty signals a scope expansion that should be debated, not pushed through.
