# Feature: parity-test-b

## Context & motivation

This pipeline verifies that Superpipelines v2.0.0 scaffolding on Tier 1 (Claude Code) produces a structurally-correct, runnable pipeline with a three-step sequential flow including structural write/review isolation. The test case reads a JSON file, checks each top-level value for data quality issues (nulls, type inconsistencies), validates findings with a read-only reviewer, and produces a markdown report.

Tier 1 (Claude Code) enforces structural reviewer isolation via worktree + `permissionMode: plan` + `disallowedTools: Write, Edit, Bash`. The writer (analyzer) and reviewer run in separate worktrees and separate agent contexts. The reviewer cannot write files; its verdict is communicated via terminal output text.

## User journeys

- As a pipeline author, I invoke the `run-parity-test-b` entry skill so that the pipeline reads a JSON file, computes per-key quality metrics, validates the findings with a read-only reviewer, and writes a markdown data quality report to `output/parity-test-b-report.md`.

## Success criteria (acceptance criteria)

- [ ] AC-1: `output/parity-test-b-report.md` exists and is non-empty after a successful run.
- [ ] AC-2: The report lists each top-level JSON key with null status, type, and issue count.
- [ ] AC-3: The analyzer step emits `DONE` or `DONE_WITH_CONCERNS` with `findings.json` written to temp.
- [ ] AC-4: The reviewer runs with `permissionMode: plan` + `disallowedTools: Write, Edit, Bash` — it cannot write any file; verdict is read from terminal output text.
- [ ] AC-5: The reporter is NOT dispatched if the reviewer emits `BLOCKED` (rejected verdict).
- [ ] AC-6: `pipeline-state.json` reflects `status: completed` at run end and temp directory is deleted (C20).
- [ ] AC-7: Writer (analyzer, reporter) and reviewer run in separate worktrees — structural isolation confirmed.

## Non-goals

- Deep recursive analysis of nested JSON values.
- Statistical outlier detection (top-level null/type checks only).
- Automated cross-platform parity gate (`PARITY_TESTING: MANUAL_PHASE1`).

## Constraints

- Platform: Tier 1 (Claude Code) — native Task() dispatch; zero-body agents; worktree isolation per step.
- Pattern 1 (Sequential) with structural write/review isolation.
- Reviewer: `disallowedTools: Write, Edit, Bash` + `permissionMode: plan` + `isolation: worktree`.
- `model_field_format: shorthand` — `model_tier: fast` for writer/reporter; `model_tier: medium` for reviewer.
- Output: `{ROOT}/output/parity-test-b-report.md`.

## Open questions

- None at design time.
