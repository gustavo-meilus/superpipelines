---
name: sk-write-review-isolation
description: Use when dispatching a reviewer after a pipeline worker has produced output, or when authoring a pipeline that requires two-stage review — enforces separate writer/reviewer instances and Stage 1 (spec compliance) gating Stage 2 (code quality). Reference-only; preload via agent skills frontmatter.
disable-model-invocation: true
user-invocable: false
---

# Write/Review Isolation — Two-Stage Review

`WRITE_REVIEW_ISOLATION: TRUE` is a non-negotiable invariant. The agent that writes code never reviews it. Stage 1 gates Stage 2.

This skill defines how the rule is enforced in pipelines and what each stage must check.

---

## The rule

- Writing agent ≠ reviewing agent (always separate instances).
- `REVIEW_STAGES: TWO` — spec compliance first, code quality second.
- `REVIEW_LOOP`: reviewer finds issues → implementer fixes → reviewer re-reviews. Terminate only when reviewer approves, not after one pass.
- `OVER_BUILD_IS_SPEC_FAILURE`: adding unrequested features fails Stage 1, NOT Stage 2.

<EXTREMELY-IMPORTANT>
Stage 1 spec compliance review MUST pass before Stage 2 code quality review begins.
This order is not optional. Running Stage 2 on spec-noncompliant output is wasted work.
</EXTREMELY-IMPORTANT>

---

## Stage 1 — Spec Compliance Review

**Reviewer:** `pipeline-spec-reviewer` agent.

**Question answered:** Does the output match the spec exactly? Under-build AND over-build both fail.

**Inputs:**

- `spec.md` (or task description from `tasks.md`)
- The executor's output files
- The executor's status report

**Checks:**

- Every acceptance criterion in the spec/task: present in output? Verifiable?
- Any output not requested by the spec? → **FAIL (over-build).**
- Any required output missing? → **FAIL (under-build).**
- Are file names, paths, schemas, signatures aligned with the spec?

**Output schema:**

```json
{
  "stage": 1,
  "verdict": "PASS | FAIL",
  "under_build": ["AC-3 missing", "..."],
  "over_build": ["unrequested helper module added", "..."],
  "notes": "<text>"
}
```

**Gate token:** Stage 2 dispatch is conditional on `verdict: "PASS"`.

---

## Stage 2 — Code Quality Review

**Reviewer:** `pipeline-quality-reviewer` agent.

**Question answered:** Is the output well-written, maintainable, idiomatic?

**Inputs:** same files Stage 1 reviewed, plus Stage 1 verdict (must be PASS).

**Checks:**

- Idiomatic for the language / framework / project conventions?
- Naming, structure, separation of concerns?
- Edge cases handled per the spec? (NB: not "edge cases I think of" — those would be over-build flagged in Stage 1.)
- Tests present and meaningful?
- No dead code, no commented-out experiments, no TODO without ticket reference?

**Output schema:**

```json
{
  "stage": 2,
  "verdict": "PASS | FAIL",
  "issues": [
    { "severity": "critical | major | minor", "file": "...", "line": 42, "fix": "..." }
  ]
}
```

---

## Review loop

```
Executor.write(task)
  ↓
SpecReviewer.review() → Stage 1 verdict
  ├── FAIL → Executor.fix(verdict.issues) → re-Stage 1
  └── PASS
      ↓
QualityReviewer.review() → Stage 2 verdict
  ├── FAIL critical/major → Executor.fix(issues) → re-Stage 1 (full re-review, not just Stage 2)
  ├── FAIL minor only → orchestrator decides: ship vs fix (configurable)
  └── PASS → mark task done in pipeline-state.json
```

**Why re-Stage 1 after Stage 2 fix:** the fix may introduce over-build or break a previously-met AC. Always re-run from Stage 1 after any code change.

---

## Common mistakes

- Sending the executor and the spec-reviewer in the same Task call → context bleed; isolation broken.
- Treating "the executor said it was done" as Stage 1 PASS → executors do NOT review themselves.
- Stage 1 reviewer flagging code quality issues → out of scope. Write them in `notes` for Stage 2 to consider.
- Stage 2 reviewer flagging missing acceptance criteria → out of scope. Re-dispatch Stage 1.
- One-pass reviews → review LOOP is mandatory until PASS.

## Red Flags — STOP

- "The executor agent's output looks fine, I'll skip Stage 1" → NO. Spec compliance is the most-skipped check and the leading cause of "looks correct, fails in production."
- "Stage 1 passed, but I noticed a small AC issue, I'll mention it in Stage 2" → re-Stage 1. Do not let AC issues leak into Stage 2.
- "I added a helper that wasn't in the spec, but it's clearly needed" → **over-build**, Stage 1 FAIL. Either update the spec (re-architect) or remove the helper.

## Rationalization Table

| Excuse | Reality |
|--------|---------|
| "The reviewer is the same model — separate instances are pointless" | Same model, fresh context = different reasoning. Isolation is about context, not architecture. |
| "Stage 1 is just a quick sanity check" | Stage 1 catches the most expensive class of bugs (wrong output). Treat it as the primary gate. |
| "Re-Stage 1 after Stage 2 fix is over-engineering" | Stage 2 fixes can break ACs. Skipping re-Stage 1 has caused production regressions in real pipelines. |
| "Over-build is fine, the user will appreciate the extra feature" | Over-build invalidates the spec contract that parallel workers depend on. Always Stage 1 FAIL. |

## Cross-references

- `sk-pipeline-patterns` `references/ai-pipelines-trimmed.md` — full conventions reference.
- `pipeline-spec-reviewer`, `pipeline-quality-reviewer` — agent definitions.
- `running-a-pipeline` — invokes the loop.
- `sk-rationalization-resistance` — tag formats and Red Flags conventions.
