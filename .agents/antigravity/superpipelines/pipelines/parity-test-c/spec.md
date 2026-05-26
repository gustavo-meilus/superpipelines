# Feature: parity-test-c

## Context & motivation

This pipeline verifies that Superpipelines v2.0.0 scaffolding on Tier 1c (Antigravity CLI) produces a runnable, structurally-correct pipeline artifact. The test case is intentionally simple — analyze a text document and emit a structured markdown summary — so that correctness of the scaffold itself is the measurable signal, not the domain complexity.

## User journeys

- As a pipeline author, I invoke `/superpipelines:run-parity-test-c` so that the pipeline reads a target document, extracts key themes and structure, and writes a formatted markdown summary to `output/parity-test-c-summary.md`.

## Success criteria (acceptance criteria)

- [ ] AC-1: `output/parity-test-c-summary.md` exists and is non-empty after a successful run.
- [ ] AC-2: The summary contains a `## Key Themes` section and a `## Structure Overview` section.
- [ ] AC-3: The analyzer agent emits `DONE` or `DONE_WITH_CONCERNS` with a structured findings object passed to the summarizer.
- [ ] AC-4: The summarizer agent emits `DONE` and writes the final markdown output file.
- [ ] AC-5: `pipeline-state.json` reflects `status: completed` at run end.

## Non-goals

- Production-grade NLP or ML analysis of document content.
- Support for non-text document formats (PDF, DOCX, etc.).
- Automated cross-platform parity gate (manual Phase 1 per `PARITY_TESTING: MANUAL_PHASE1`).

## Constraints

- Platform: Tier 1c (Antigravity CLI) — model_driven dispatch; host owns subagent model selection.
- All agents MUST use `model_tier: inherit`.
- Pattern 1 (Sequential) — worktrees unavailable on Tier 1c.
- Output path: `{ROOT}/output/parity-test-c-summary.md` (resolved at runtime).

## Open questions

- None at design time.
