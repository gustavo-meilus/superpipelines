# Feature: parity-test-e

## Context & motivation

This pipeline verifies that Superpipelines v2.0.0 scaffolding on Tier 1d (Codex CLI) produces a runnable, structurally-correct pipeline artifact. The test case is intentionally focused — read a changelog markdown file and produce a concise release summary — so that correctness of the scaffold itself is the measurable signal, not domain complexity.

## User journeys

- As a pipeline author, I invoke the `run-parity-test-e` entry skill so that the pipeline reads a given changelog file, extracts release entries, and writes a formatted release summary to `output/parity-test-e-release-summary.md` highlighting breaking changes and new features.

## Success criteria (acceptance criteria)

- [ ] AC-1: `output/parity-test-e-release-summary.md` exists and is non-empty after a successful run.
- [ ] AC-2: The release summary contains a `## Breaking Changes` section and a `## New Features` section.
- [ ] AC-3: The extractor agent emits `DONE` or `DONE_WITH_CONCERNS` with structured changelog entries written to the temp directory.
- [ ] AC-4: The formatter agent emits `DONE` and writes the final markdown summary file.
- [ ] AC-5: `pipeline-state.json` reflects `status: completed` at run end.

## Non-goals

- Full semantic changelog parsing (SemVer diff, git log ingestion).
- Support for non-markdown changelog formats (YAML, JSON, plain text).
- Automated cross-platform parity gate (manual Phase 1 per `PARITY_TESTING: MANUAL_PHASE1`).

## Constraints

- Platform: Tier 1d (Codex CLI) — model_driven dispatch; TOML agent files; no `Task()` primitive.
- Pattern 1 (Sequential) — worktrees unavailable on Tier 1d (`worktrees: false`).
- Agents are TOML files (`extractor.toml`, `formatter.toml`); NO YAML frontmatter `.md` agents.
- Per-step model: `gpt-5.4-mini` (fast tier, `model_reasoning_effort: medium`).
- Output path: `{ROOT}/output/parity-test-e-release-summary.md` (resolved at runtime).

## Open questions

- None at design time.
