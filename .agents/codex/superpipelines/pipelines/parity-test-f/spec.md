# Feature: parity-test-f

## Context & motivation

This pipeline verifies that Superpipelines v2.0.0 scaffolding on Tier 1d (Codex CLI) correctly implements a three-step sequential pipeline with structural reviewer isolation. The test case is intentionally focused — read a pull request diff file and produce a code review report — so that correctness of the scaffold, including the read-only reviewer step, is the measurable signal.

## User journeys

- As a pipeline author, I invoke the `run-parity-test-f` entry skill so that the pipeline reads a given pull request diff file, identifies issues (null checks, error handling, naming), validates the findings through a read-only reviewer step, and writes a final markdown code review report to `output/parity-test-f-review-report.md`.

## Success criteria (acceptance criteria)

- [ ] AC-1: `output/parity-test-f-review-report.md` exists and is non-empty after a successful run.
- [ ] AC-2: The report contains a `## Issues Found` section and a `## Review Verdict` section.
- [ ] AC-3: The analyzer agent emits `DONE` or `DONE_WITH_CONCERNS` with structured findings JSON written to the temp directory.
- [ ] AC-4: The reviewer agent emits `DONE` or `DONE_WITH_CONCERNS` with a verdict JSON written to the temp directory. The reviewer agent MUST use `sandbox_mode = "read-only"` (structural isolation).
- [ ] AC-5: The reporter agent emits `DONE` and writes the final markdown report file.
- [ ] AC-6: `pipeline-state.json` reflects `status: completed` at run end.
- [ ] AC-7: `reviewer.toml` has `sandbox_mode = "read-only"` — confirmed by structural inspection.

## Non-goals

- Full static analysis or AST-level code inspection.
- Support for non-diff input formats (e.g., raw source files, GitHub API payloads).
- Automated cross-platform parity gate (manual Phase 1 per `PARITY_TESTING: MANUAL_PHASE1`).

## Constraints

- Platform: Tier 1d (Codex CLI) — model_driven dispatch; TOML agent files; no `Task()` primitive.
- Pattern 1 (Sequential) — worktrees unavailable on Tier 1d (`worktrees: false`).
- Agents are TOML files (`analyzer.toml`, `reviewer.toml`, `reporter.toml`); NO YAML frontmatter `.md` agents.
- Reviewer step: `model = "gpt-5.5"` (deep tier, `model_reasoning_effort: high`); `sandbox_mode = "read-only"` (structural reviewer isolation).
- Writer steps: `model = "gpt-5.4-mini"` (fast tier, `model_reasoning_effort: medium`).
- Output path: `{ROOT}/output/parity-test-f-review-report.md` (resolved at runtime).

## Open questions

- None at design time.
