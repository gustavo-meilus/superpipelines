# Feature: parity-test-d

## Context & motivation

This pipeline verifies that Superpipelines v2.0.0 scaffolding on Tier 1c (Antigravity CLI) produces a runnable, structurally-correct pipeline artifact. The test case is intentionally focused — scan a directory of source files and produce a code health report — so that correctness of the scaffold itself is the measurable signal, not domain complexity.

## User journeys

- As a pipeline author, I invoke `/superpipelines:run-parity-test-d` so that the pipeline scans a target source directory, extracts per-file metrics (complexity, missing docstrings, long functions), and writes a formatted markdown health report to `output/parity-test-d-health-report.md`.

## Success criteria (acceptance criteria)

- [ ] AC-1: `output/parity-test-d-health-report.md` exists and is non-empty after a successful run.
- [ ] AC-2: The health report contains a `## High-Complexity Files` section, a `## Missing Docstrings` section, and a `## Long Functions` section.
- [ ] AC-3: The scanner agent emits `DONE` or `DONE_WITH_CONCERNS` with a structured metrics object passed to the reporter.
- [ ] AC-4: The reporter agent emits `DONE` and writes the final markdown output file.
- [ ] AC-5: `pipeline-state.json` reflects `status: completed` at run end.

## Non-goals

- Production-grade static-analysis tooling (AST parsing, linting integrations).
- Support for compiled binary artifacts or non-text source formats.
- Automated cross-platform parity gate (manual Phase 1 per `PARITY_TESTING: MANUAL_PHASE1`).

## Constraints

- Platform: Tier 1c (Antigravity CLI) — model_driven dispatch; host owns subagent model selection.
- All agents MUST use `model_tier: inherit`.
- Pattern 1 (Sequential) — worktrees unavailable on Tier 1c.
- Output path: `{ROOT}/output/parity-test-d-health-report.md` (resolved at runtime).

## Open questions

- None at design time.
