# parity-test-e — Run Launcher

> Pipeline: `parity-test-e` | Scope: `local` | Source Tier: `tier_1d` (Codex CLI) | Pattern: 1 (Sequential)

## Overview

This pipeline reads a changelog markdown file, extracts per-version breaking changes and new features, and produces a concise markdown release summary. It was scaffolded on Tier 1d (Codex CLI) and uses model_driven dispatch with TOML agent files. Per-step model (`gpt-5.4-mini`) and effort (`medium`) are declared directly in each agent TOML.

**This file is a documentation and discovery artifact.** It is NOT a runnable slash command. Codex CLI discovers and runs this pipeline via the `.agents/codex` scope root and the registered entry skill.

## Entry Skill

```
{ROOT}/skills/superpipelines/parity-test-e/run-parity-test-e/SKILL.md
```

Invoke via the Codex CLI's native skill invocation interface when the superpipelines extension is installed and the `.agents/codex` scope is active.

## Topology

See `topology.json` in this directory for the full step graph.

```
extractor → formatter
```

- **extractor** (`extractor.toml`): Reads the changelog file, extracts breaking changes and new features per version, writes `changelog-entries.json` to the temp directory.
- **formatter** (`formatter.toml`): Reads the entries file, renders a concise markdown release summary with `## Breaking Changes` and `## New Features` sections, writes `{ROOT}/output/parity-test-e-release-summary.md`.

## Registry Entry

```
{ROOT}/superpipelines/registry.json → pipelines[name="parity-test-e"]
```

## Last-Run State

```
{ROOT}/superpipelines/temp/parity-test-e/{runId}/pipeline-state.json
```

## Platform Notes (Tier 1d — Codex CLI)

- Agents are **TOML files** (`.toml`) — NOT YAML frontmatter `.md` files. This is mandatory for Codex.
- `model_field_format: toml_split` — `model` and `model_reasoning_effort` are declared in each agent TOML directly.
- Per-step model: `gpt-5.4-mini` (fast tier); `model_reasoning_effort: medium` (effort_emit_map: medium → "medium").
- `sandbox_mode = "workspace-write"` on writer agents; `"read-only"` on reviewer agents (structural isolation per reviewer_isolation_recipe).
- `dispatch_mechanism: model_driven` — no `Task()` primitive. The Codex host orchestrates subagent sequencing.
- `max_concurrent_subagents: 6` — Pattern 1 is sequential; only one agent active at a time.
- No degradation warnings for Tier 1d.

## Running on a Different Tier

This pipeline was scaffolded on Tier 1d. To run it on Claude Code (Tier 1) or OpenCode (Tier 1b):

1. Re-scaffold the agents as YAML frontmatter `.md` files (CC/OC format).
2. Replace `model = "gpt-5.4-mini"` with `model_tier: fast` in agent frontmatter (CC/OC resolve model from the tier profile at runtime).
3. Remove `model_reasoning_effort` field (CC/OC use `effort_tier:` instead).
4. The `model_tier: fast` and `effort_tier: medium` intent is already expressed in `topology.json` steps for cross-tier portability.
