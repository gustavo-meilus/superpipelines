# Feature: parity-test-i

## Context & motivation

This pipeline verifies that Superpipelines v2.0.0 scaffolding on Tier 1b (OpenCode v1.15.10) produces a structurally-correct, runnable pipeline artifact with a two-step sequential flow. The test case reads a JSON file and produces a human-readable summary of its top-level keys and value types, written to `output/` as a text file.

Tier 1b (OpenCode) supports native subagents (`dispatch_mechanism: native_subagent`, `subagents: true`). Unlike Tier 2, each step runs in a distinct subagent process, providing structural writer–reviewer isolation. However, Tier 1b does not support parallel fan-out (`parallel_subagents: false`), so Pattern 1 (Sequential) is the only available pattern. The single degradation warning from the tier_1b profile MUST be surfaced before execution.

## User journeys

- As a pipeline author, I invoke the `run-parity-test-i` entry skill so that the pipeline reads a given JSON file, extracts each top-level key and the type of its value, then formats and writes a human-readable summary to `output/parity-test-i-summary.txt`.

## Success criteria (acceptance criteria)

- [ ] AC-1: `output/parity-test-i-summary.txt` exists and is non-empty after a successful run.
- [ ] AC-2: The summary lists each top-level key from the JSON file together with the type of its value (string, number, boolean, object, array, null).
- [ ] AC-3: The Tier 1b degradation warning is surfaced to the user before any execution begins.
- [ ] AC-4: The inspector step emits `DONE` or `DONE_WITH_CONCERNS` with key/type data written to the temp directory.
- [ ] AC-5: The formatter step emits `DONE` and writes the final text summary file to `output/`.
- [ ] AC-6: `pipeline-state.json` reflects `status: completed` at run end, and the temp directory is deleted (C20 cleanup contract).
- [ ] AC-7: Each step runs as a distinct native subagent with its own model (`opencode/big-pickle`) declared in agent frontmatter.

## Non-goals

- Deep recursive traversal of nested JSON (top-level keys only).
- Support for non-JSON input file formats (YAML, TOML, CSV).
- Automated cross-platform parity gate (manual Phase 1 per `PARITY_TESTING: MANUAL_PHASE1`).
- Parallel fan-out (Pattern 2) — unavailable on Tier 1b (`parallel_subagents: false`).

## Constraints

- Platform: Tier 1b (OpenCode v1.15.10) — native subagent dispatch; agent files with YAML frontmatter + body ≤150 lines; no `Task()` primitive.
- Pattern 1 (Sequential) — the only pattern available on Tier 1b.
- Agent files: `.opencode/agents/superpipelines/parity-test-i/{agent-name}.md` (YAML frontmatter + protocol body).
- `model_field_format: provider_prefixed` — `model: opencode/big-pickle` in each agent's frontmatter.
- No companion protocol skills — the protocol lives in the agent body on Tier 1b.
- The single Tier 1b degradation warning MUST be surfaced before execution.
- Output path: `{ROOT}/output/parity-test-i-summary.txt` (resolved at runtime via `sk-pipeline-paths`).

## Open questions

- None at design time.
