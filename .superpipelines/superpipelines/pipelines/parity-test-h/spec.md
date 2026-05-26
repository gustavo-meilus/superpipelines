# Feature: parity-test-h

## Context & motivation

This pipeline verifies that Superpipelines v2.0.0 scaffolding on Tier 2 (Cursor/Windsurf/Cline) produces a structurally-correct, runnable inline pipeline artifact with a three-step sequential flow including a convention-only reviewer step. The test case reads a YAML config file and produces a validation report — checking for required fields, type mismatches, and deprecated keys — written to `output/` as a markdown file.

Tier 2 platforms have no separate agent files and no subagent dispatch of any kind. All execution is inline in the entry skill's session: the entry skill loads each step's protocol skill and executes it sequentially within the same context. Reviewer isolation is convention-only; the degradation warnings mandated by the platform profile are surfaced before execution.

## User journeys

- As a pipeline author, I invoke the `run-parity-test-h` entry skill so that the pipeline reads a given YAML config file, validates it against a schema (checking required fields, type mismatches, and deprecated keys), reviews the findings for false positives, and writes a final validation report to `output/parity-test-h-validation-report.md`.

## Success criteria (acceptance criteria)

- [ ] AC-1: `output/parity-test-h-validation-report.md` exists and is non-empty after a successful run.
- [ ] AC-2: The report contains sections for required-field violations, type mismatches, and deprecated-key warnings, each clearly labelled.
- [ ] AC-3: The reviewer step applies the self-skepticism preamble (C19 convention) and flags any false positives from the validator before the reporter formats the final output.
- [ ] AC-4: All 3 Tier 2 degradation warnings are surfaced to the user before any execution begins.
- [ ] AC-5: The validator step emits `DONE` or `DONE_WITH_CONCERNS` with findings written to the temp directory.
- [ ] AC-6: The reviewer step emits `DONE` or `DONE_WITH_CONCERNS` with a reviewed-findings file written to the temp directory.
- [ ] AC-7: The reporter step emits `DONE` and writes the final markdown report file.
- [ ] AC-8: `pipeline-state.json` reflects `status: completed` at run end, and the temp directory is deleted (C20 cleanup contract).

## Non-goals

- Full JSON Schema validation (a representative YAML schema with required fields, type rules, and deprecated keys is sufficient).
- Support for non-YAML input file formats (JSON, TOML, INI).
- Automated cross-platform parity gate (manual Phase 1 per `PARITY_TESTING: MANUAL_PHASE1`).
- Parallel fan-out (Pattern 2) — unavailable on Tier 2 (`worktrees: false`).

## Constraints

- Platform: Tier 2 (Cursor/Windsurf/Cline) — inline execution; no agent files; no `Task()` primitive; no subagent dispatch.
- Pattern 1 (Sequential) — the only pattern available on Tier 2.
- No agent files of any kind (`.md`, `.toml`) — Tier 2 uses protocol skills exclusively.
- `model_field_format: omit` — model is `inherit`; host IDE owns model selection; no per-step model is emitted.
- All 3 degradation warnings from the tier_2 profile MUST be surfaced before execution.
- Reviewer step MUST include the C19 self-skepticism preamble (convention-only isolation).
- Output path: `{ROOT}/output/parity-test-h-validation-report.md` (resolved at runtime via `sk-pipeline-paths`).

## Open questions

- None at design time.
