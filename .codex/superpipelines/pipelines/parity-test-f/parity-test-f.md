# parity-test-f — Run Launcher

> Pipeline: `parity-test-f` | Scope: `local` | Source Tier: `tier_1d` (Codex CLI) | Pattern: 1 (Sequential)

## Overview

This pipeline reads a pull request diff file, identifies code issues (null checks, error handling, naming) via the analyzer step, validates those findings through a read-only reviewer step (structural isolation via `sandbox_mode = "read-only"`), and produces a final markdown code review report. It was scaffolded on Tier 1d (Codex CLI) and uses model_driven dispatch with TOML agent files. Per-step model and effort are declared directly in each agent TOML.

**This file is a documentation and discovery artifact.** It is NOT a runnable slash command. Codex CLI discovers and runs this pipeline via the `.codex` scope root and the registered entry skill.

## Entry Skill

```
{ROOT}/../.agents/skills/superpipelines/parity-test-f/run-parity-test-f/SKILL.md
```

Invoke via the Codex CLI's native skill invocation interface when the superpipelines extension is installed and the `.codex` scope is active.

## Topology

See `topology.json` in this directory for the full step graph.

```
analyzer → reviewer (read-only) → reporter
```

- **analyzer** (`analyzer.toml`): Reads the pull request diff file, identifies null check, error handling, and naming issues, writes `findings.json` to the temp directory. Model: `gpt-5.4-mini` / effort: `medium`.
- **reviewer** (`reviewer.toml`): Reads `findings.json`, validates completeness and correctness, emits the verdict via terminal output text (no file write). Model: `gpt-5.5` / effort: `high`. **READ-ONLY**: `sandbox_mode = "read-only"` enforces structural write-deny via the Codex host; the orchestrator parses the REVIEWER VERDICT block.
- **reporter** (`reporter.toml`): Reads `findings.json` and the reviewer verdict from dispatch context, renders the final markdown code review report, writes `{ROOT}/output/parity-test-f-review-report.md`. Model: `gpt-5.4-mini` / effort: `medium`.

## Registry Entry

```
{ROOT}/superpipelines/registry.json → pipelines[name="parity-test-f"]
```

## Last-Run State

```
{ROOT}/superpipelines/temp/parity-test-f/{runId}/pipeline-state.json
```

## Platform Notes (Tier 1d — Codex CLI)

- Agents are **TOML files** (`.toml`) — NOT YAML frontmatter `.md` files. This is mandatory for Codex.
- `model_field_format: toml_split` — `model` and `model_reasoning_effort` are declared in each agent TOML directly.
- Analyzer / reporter: `gpt-5.4-mini` (fast tier); `model_reasoning_effort: medium` (effort_emit_map: medium → "medium").
- Reviewer: `gpt-5.5` (deep tier); `model_reasoning_effort: high` (effort_emit_map: high → "high").
- `sandbox_mode = "workspace-write"` on writer agents (analyzer, reporter); `sandbox_mode = "read-only"` on the reviewer agent (structural isolation per `reviewer_isolation_recipe` for Tier 1d).
- `dispatch_mechanism: model_driven` — no `Task()` primitive. The Codex host orchestrates subagent sequencing.
- `max_concurrent_subagents: 6` — Pattern 1 is sequential; only one agent active at a time.
- No degradation warnings for Tier 1d.

## Running on a Different Tier

This pipeline was scaffolded on Tier 1d. To run it on Claude Code (Tier 1) or OpenCode (Tier 1b):

1. Re-scaffold the agents as YAML frontmatter `.md` files (CC/OC format).
2. Replace `model = "gpt-5.4-mini"` with `model_tier: fast` and `model = "gpt-5.5"` with `model_tier: deep` in agent frontmatter (CC/OC resolve model from the tier profile at runtime).
3. Remove `model_reasoning_effort` field; use `effort_tier: medium` or `effort_tier: high` instead.
4. Replace `sandbox_mode = "read-only"` with the CC/OC reviewer isolation mechanism per the Tier 1 / Tier 1b profile `reviewer_isolation_recipe`.
5. The `model_tier` and `effort_tier` intent is already expressed in `topology.json` steps for cross-tier portability.
