# Feature: parity-test-g

## Context & motivation

This pipeline verifies that Superpipelines v2.0.0 scaffolding on Tier 2 (Cursor/Windsurf/Cline) produces a structurally-correct, runnable inline pipeline artifact. The test case is intentionally focused — read a markdown file and produce a word frequency report — so that correctness of the scaffold itself is the measurable signal, not domain complexity.

Tier 2 platforms have no separate agent files and no subagent dispatch of any kind. All execution is inline in the entry skill's session: the entry skill loads each step's protocol skill and executes it sequentially within the same context. Reviewer isolation is convention-only; the degradation warnings mandated by the platform profile are surfaced before execution.

## User journeys

- As a pipeline author, I invoke the `run-parity-test-g` entry skill so that the pipeline reads a given markdown file, tokenizes and counts word frequencies, and writes a top-20 word frequency report (stopwords excluded) to `output/parity-test-g-word-freq.txt`.

## Success criteria (acceptance criteria)

- [ ] AC-1: `output/parity-test-g-word-freq.txt` exists and is non-empty after a successful run.
- [ ] AC-2: The report lists at most 20 words with their counts, one per line, in descending frequency order.
- [ ] AC-3: Common stopwords (e.g., "the", "a", "and", "of", "in", "is", "to", "it", "that", "was") are absent from the report.
- [ ] AC-4: All 3 Tier 2 degradation warnings are surfaced to the user before any execution begins.
- [ ] AC-5: The tokenizer step emits `DONE` or `DONE_WITH_CONCERNS` with frequency data written to the temp directory.
- [ ] AC-6: The reporter step emits `DONE` and writes the final text report file.
- [ ] AC-7: `pipeline-state.json` reflects `status: completed` at run end, and the temp directory is deleted (C20 cleanup contract).

## Non-goals

- Full NLP stopword list (a reasonable common set of English stopwords is sufficient).
- Support for non-markdown input file formats (PDF, DOCX, plain text).
- Automated cross-platform parity gate (manual Phase 1 per `PARITY_TESTING: MANUAL_PHASE1`).
- Parallel fan-out (Pattern 2) — unavailable on Tier 2 (`worktrees: false`).

## Constraints

- Platform: Tier 2 (Cursor/Windsurf/Cline) — inline execution; no agent files; no `Task()` primitive; no subagent dispatch.
- Pattern 1 (Sequential) — the only pattern available on Tier 2.
- No agent files of any kind (`.md`, `.toml`) — Tier 2 uses protocol skills exclusively.
- `model_field_format: omit` — model is `inherit`; host IDE owns model selection; no per-step model is emitted.
- All 3 degradation warnings from the tier_2 profile MUST be surfaced before execution.
- Output path: `{ROOT}/output/parity-test-g-word-freq.txt` (resolved at runtime via `sk-pipeline-paths`).

## Open questions

- None at design time.
