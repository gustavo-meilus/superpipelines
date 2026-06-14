# Feature: parity-test-a

## Context & motivation

This pipeline verifies that Superpipelines v2.0.0 scaffolding on Tier 1 (Claude Code) produces a structurally-correct, runnable pipeline artifact with a two-step sequential flow. The test case reads a YAML file and produces a flat key-value summary of its top-level entries, written to `output/` as a plain-text file.

Tier 1 (Claude Code) is the reference tier: it supports native Task() subagents (`dispatch_mechanism: native_task`, `task_primitive: true`), worktree isolation, parallel fan-out, and the full Skill tool primitive. Agents are zero-body YAML frontmatter files with companion protocol skills. No degradation warnings are active.

## User journeys

- As a pipeline author, I invoke the `run-parity-test-a` entry skill so that the pipeline reads a given YAML file, extracts each top-level key and its string-rendered value, then formats and writes a human-readable summary to `output/parity-test-a-summary.txt`.

## Success criteria (acceptance criteria)

- [ ] AC-1: `output/parity-test-a-summary.txt` exists and is non-empty after a successful run.
- [ ] AC-2: The summary lists each top-level key from the YAML file together with its string-rendered value, in insertion order.
- [ ] AC-3: The reader step emits `DONE` or `DONE_WITH_CONCERNS` with key-value data written to the temp directory.
- [ ] AC-4: The summarizer step emits `DONE` and writes the final text summary to `output/`.
- [ ] AC-5: `pipeline-state.json` reflects `status: completed` at run end, and the temp directory is deleted (C20 cleanup contract).
- [ ] AC-6: Each step runs as a distinct worktree-isolated subagent via `Task()` dispatch.
- [ ] AC-7: Agents use `model_tier: fast` (abstract, not concrete model ID) in frontmatter.

## Non-goals

- Deep recursive traversal of nested YAML (top-level keys only).
- Support for non-YAML input formats (JSON, TOML, CSV).
- Automated cross-platform parity gate (`PARITY_TESTING: MANUAL_PHASE1`).
- Parallel fan-out (Pattern 2) — not exercised by this pipeline (Pattern 1 only).

## Constraints

- Platform: Tier 1 (Claude Code) — native Task() dispatch; zero-body agents with companion protocol skills; worktree isolation available.
- Pattern 1 (Sequential).
- Agent files: `.claude/agents/superpipelines/parity-test-a/{agent-name}.md` (zero-body frontmatter only).
- Protocol skills: `.claude/skills/superpipelines/parity-test-a/{agent-name}-protocol/SKILL.md`.
- `model_field_format: shorthand` — `model_tier: fast` in agent frontmatter; runtime resolver maps to concrete model.
- Output path: `{ROOT}/output/parity-test-a-summary.txt` (resolved at runtime via `sk-pipeline-paths`).

## Open questions

- None at design time.
