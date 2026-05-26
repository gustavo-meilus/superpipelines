# parity-test-d — Run Launcher

> Pipeline: `parity-test-d` | Scope: `local` | Source Tier: `tier_1c` (Antigravity CLI) | Pattern: 1 (Sequential)

## Overview

This pipeline scans a directory of source files, extracts per-file code health metrics (high complexity, missing docstrings, long functions), and produces a structured markdown health document. It was scaffolded on Tier 1c (Antigravity CLI) and uses model_driven dispatch. All step agents inherit model selection from the orchestrator.

**This file is a documentation and discovery artifact.** It is NOT registered as a runnable slash command in Antigravity CLI. Use the Antigravity CLI's native pipeline execution interface to run this pipeline.

## Entry Skill

```
{ROOT}/skills/superpipelines/parity-test-d/run-parity-test-d/SKILL.md
```

Invoke via: `activate_skill(run-parity-test-d)` in the Antigravity environment when the superpipelines extension is installed.

## Topology

See `topology.json` in this directory for the full step graph.

```
scanner → reporter
```

- **scanner**: Reads source files in the target directory, extracts per-file metrics for complexity, missing docstrings, and long functions.
- **reporter**: Renders a structured markdown health document to `{ROOT}/output/parity-test-d-health-report.md`.

## Registry Entry

```
{ROOT}/superpipelines/registry.json → pipelines[name="parity-test-d"]
```

## Last-Run State

```
{ROOT}/superpipelines/temp/parity-test-d/{runId}/pipeline-state.json
```

## Platform Notes

- Tier 1c (Antigravity CLI): `model_field_format: omit` — the host orchestrator owns all model selection.
- Orchestrator model tier at design time: `fast` (maps to `gemini-3.5-flash` per the tier_1c profile).
- Per-step model intent stored in `topology.json metadata.model_intent_scaffold_tier` for cross-tier portability.
- Degradation warning: *"Antigravity uses dynamic subagents — per-step model assignment is not supported. Only the orchestrator's model tier is user-configurable. Subagent model selection is owned by Antigravity's orchestrator."*

## Running on a Different Tier

This pipeline was scaffolded on Tier 1c. To run it on a per-step-capable tier (Claude Code, OpenCode, or Codex):

1. The `model_intent_scaffold_tier` values in `topology.json` record the intended model tier per step (`fast` for all steps).
2. Re-stamp each agent's `model_tier:` field from `inherit` to the recorded intent value.
3. Remove `model_field_format: omit` constraint (does not apply on Tier 1 / 1b / 1d).
