# Feature: parity-test-j

## Context & motivation

This pipeline verifies that Superpipelines v2.0.0 scaffolding on Tier 1b (OpenCode v1.15.10) produces a structurally-correct, runnable pipeline artifact with a three-step sequential flow including a structural reviewer step. The test case reads a CSV file and produces a data quality report — listing columns with nulls, outliers, and type inconsistencies — written to `output/` as a markdown file.

Tier 1b (OpenCode) supports native subagents (`dispatch_mechanism: native_subagent`, `subagents: true`). Unlike Tier 2, each step runs in a distinct subagent process, providing structural writer–reviewer isolation. Tier 1b does not support parallel fan-out (`parallel_subagents: false`), so Pattern 1 (Sequential) is the only available pattern. The single degradation warning from the tier_1b profile MUST be surfaced before execution.

This pipeline also exercises the Tier 1b structural reviewer isolation mechanism: `permissionMode: plan` + `disallowedTools: Write, Edit, Bash` on the reviewer agent, enforced by OpenCode's permission system. The reviewer cannot write files or execute shell commands.

## User journeys

- As a pipeline author, I invoke the `run-parity-test-j` entry skill so that the pipeline reads a given CSV file, computes per-column quality metrics (nulls, outliers, type inconsistencies), validates those findings via a structural reviewer, then renders and writes a data quality report to `output/parity-test-j-report.md`.

## Success criteria (acceptance criteria)

- [ ] AC-1: `output/parity-test-j-report.md` exists and is non-empty after a successful run.
- [ ] AC-2: The report lists each column from the CSV file together with null count, outlier count, and any detected type inconsistencies.
- [ ] AC-3: The Tier 1b degradation warning is surfaced to the user before any execution begins.
- [ ] AC-4: The analyzer step emits `DONE` or `DONE_WITH_CONCERNS` with findings JSON written to the temp directory.
- [ ] AC-5: The reviewer step emits `DONE` or `DONE_WITH_CONCERNS` with verdict JSON written to the temp directory. The reviewer MUST NOT write to `output/` or execute shell commands.
- [ ] AC-6: The reporter step emits `DONE` and writes the final markdown report to `output/`.
- [ ] AC-7: `pipeline-state.json` reflects `status: completed` at run end, and the temp directory is deleted (C20 cleanup contract).
- [ ] AC-8: Each step runs as a distinct native subagent with its own model (`opencode/big-pickle`) declared in agent frontmatter.
- [ ] AC-9: Reviewer structural isolation is enforced: `permissionMode: plan` + `disallowedTools: Write, Edit, Bash` in the reviewer agent frontmatter.

## Non-goals

- Deep statistical analysis beyond null counts, simple outlier detection (IQR-based), and type consistency checking.
- Support for non-CSV input file formats (JSON, YAML, Parquet).
- Automated cross-platform parity gate (manual Phase 1 per `PARITY_TESTING: MANUAL_PHASE1`).
- Parallel fan-out (Pattern 2) — unavailable on Tier 1b (`parallel_subagents: false`).
- Remediation or auto-correction of data quality issues (report only).

## Constraints

- Platform: Tier 1b (OpenCode v1.15.10) — native subagent dispatch; agent files with YAML frontmatter + body ≤150 lines; no `Task()` primitive.
- Pattern 1 (Sequential) — the only pattern available on Tier 1b.
- Agent files: `.opencode/agents/superpipelines/parity-test-j/{agent-name}.md` (YAML frontmatter + protocol body).
- `model_field_format: provider_prefixed` — `model: opencode/big-pickle` in each agent's frontmatter.
- No companion protocol skills — the protocol lives in the agent body on Tier 1b.
- Reviewer structural isolation: `permissionMode: plan` + `disallowedTools: Write, Edit, Bash`.
- The single Tier 1b degradation warning MUST be surfaced before execution.
- Output path: `{ROOT}/output/parity-test-j-report.md` (resolved at runtime via `sk-pipeline-paths`).

## Open questions

- None at design time.
