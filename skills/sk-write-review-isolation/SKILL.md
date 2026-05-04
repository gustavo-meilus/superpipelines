---
name: sk-write-review-isolation
description: Use when dispatching a reviewer after a pipeline worker has produced output, or when authoring a pipeline that requires two-stage review — enforces separate writer/reviewer instances and Stage 1 (spec compliance) gating Stage 2 (code quality). Reference-only; preload via agent skills frontmatter.
disable-model-invocation: true
user-invocable: false
---

# Write/Review Isolation — Two-Stage Review Protocol

> Enforces a non-negotiable separation between the agent authoring code and the agent reviewing it. Trigger when dispatching reviewers, authoring multi-stage pipelines, or implementing any task requiring formal verification against a specification.

<overview>
`WRITE_REVIEW_ISOLATION: TRUE` is a fundamental invariant of the Superpipelines architecture. By separating the writer from the reviewer and splitting the review process into Stage 1 (Spec Compliance) and Stage 2 (Code Quality), we prevent context bleed, detect over-build early, and ensure that only verified code is promoted.
</overview>

<glossary>
  <term name="Stage 1 (Spec Compliance)">A binary check answering: "Does the output match the spec exactly?"</term>
  <term name="Stage 2 (Code Quality)">A qualitative check answering: "Is the code maintainable, idiomatic, and robust?"</term>
  <term name="Over-build">Adding features or logic not explicitly requested by the specification; results in a Stage 1 FAIL.</term>
</glossary>

## The Two-Stage Protocol

<protocol>
### STAGE 1 — SPEC COMPLIANCE REVIEW
- **Agent**: `pipeline-spec-reviewer`.
- **Inputs**: `spec.md`, output files, and the executor's status report.
- **Goal**: Verify every acceptance criterion is present and verifiable. Flag any unrequested output as **Over-build**.
- **HARD-GATE**: Stage 2 cannot begin until Stage 1 returns a `PASS`.

### STAGE 2 — CODE QUALITY REVIEW
- **Agent**: `pipeline-quality-reviewer`.
- **Inputs**: Same as Stage 1, plus the Stage 1 `PASS` verdict.
- **Goal**: Evaluate maintainability, naming, separation of concerns, and edge-case handling.
- **Exit Condition**: Terminal `PASS` only when all critical and major issues are resolved.
</protocol>

<EXTREMELY-IMPORTANT>
Stage 1 spec compliance review MUST pass before Stage 2 code quality review begins. This order is not optional. Running Stage 2 on spec-noncompliant output is wasted work and risks propagating incorrect logic.
</EXTREMELY-IMPORTANT>

## The Review Loop

<loop_diagram>
1. **Executor**: Writes output for a given task.
2. **SpecReviewer**: Reviews for compliance (Stage 1).
   - **FAIL**: Executor fixes issues → Re-run Stage 1.
   - **PASS**: Proceed to Stage 2.
3. **QualityReviewer**: Reviews for quality (Stage 2).
   - **FAIL (Critical/Major)**: Executor fixes issues → **Re-run Stage 1** (to ensure the fix didn't break compliance).
   - **PASS**: Task complete; update `pipeline-state.json`.
</loop_diagram>

<invariants>
- **Instance Isolation**: The writing agent and reviewing agent must be separate model instances with fresh context.
- **Full Re-review**: Any code change triggered by Stage 2 MUST trigger a fresh Stage 1 review.
- **No Scope Creep**: Reviewers must stay within their defined stage scope (e.g., Stage 1 does not flag formatting; Stage 2 does not flag missing ACs).
</invariants>

## Red Flags — STOP
- "The output looks fine, I'll skip Stage 1." → **STOP**. Spec compliance is the primary defense against production regressions.
- "I'll mention this AC issue in the Stage 2 report." → **STOP**. Re-dispatch Stage 1 immediately.
- "I added a helper that wasn't in the spec, but it's clearly needed." → **STOP**. This is over-build. Re-architect the spec or remove the helper.

## Rationalization Table

<rationalization_table>
| Excuse | Reality |
| :--- | :--- |
| "Separate instances are pointless." | Fresh context forces new reasoning paths and prevents "assumption blindness." |
| "Stage 1 is just a sanity check." | Stage 1 catches the most expensive bugs (wrong logic/output). It is the primary gate. |
| "Re-Stage 1 is over-engineering." | Code quality fixes often break specification compliance. Re-verification is mandatory. |
| "Over-build is a bonus for the user." | Over-build invalidates the contract that parallel workers and dependent steps rely on. |
</rationalization_table>

## Reference Files
- `sk-pipeline-patterns/SKILL.md` — Pattern 5 integration.
- `pipeline-spec-reviewer.md` — Spec reviewer blueprint.
- `pipeline-quality-reviewer.md` — Quality reviewer blueprint.
- `sk-rationalization-resistance/SKILL.md` — Resistance mechanism standards.
