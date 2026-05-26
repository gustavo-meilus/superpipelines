# parity-test-c — Run Launcher

> Pipeline: `parity-test-c` | Scope: `local` | Source Tier: `tier_1c` (Antigravity CLI) | Pattern: 1 (Sequential)

## Overview

This pipeline analyzes a text document and produces a structured markdown summary. It was scaffolded on Tier 1c (Antigravity CLI) and uses model_driven dispatch. All step agents inherit model selection from the orchestrator.

**This file is a documentation and discovery artifact.** It is NOT registered as a runnable slash command in Antigravity CLI. Use the Antigravity CLI's native pipeline execution interface to run this pipeline.

## Entry Skill

```
{ROOT}/skills/superpipelines/parity-test-c/run-parity-test-c/SKILL.md
```

Invoke via: `activate_skill(run-parity-test-c)` in the Antigravity environment when the superpipelines extension is installed.

## Topology

See `topology.json` in this directory for the full step graph.

```
analyzer → summarizer
```

- **analyzer**: Reads input document, extracts themes + structure metadata.
- **summarizer**: Renders structured markdown summary to `{ROOT}/output/parity-test-c-summary.md`.

## Registry Entry

```
{ROOT}/superpipelines/registry.json → pipelines[name="parity-test-c"]
```

## Last-Run State

```
{ROOT}/superpipelines/temp/parity-test-c/{runId}/pipeline-state.json
```

## Platform Notes

- Tier 1c (Antigravity CLI): `model_field_format: omit` — the host orchestrator owns all model selection.
- Orchestrator model tier at design time: `medium` (maps to `gemini-3.5-pro` per the tier_1c profile).
- Per-step model intent stored in `topology.json metadata.model_intent_scaffold_tier` for cross-tier portability.
- Degradation warning: *"Antigravity uses dynamic subagents — per-step model assignment is not supported. Only the orchestrator's model tier is user-configurable. Subagent model selection is owned by Antigravity's orchestrator."*

## Running on a Different Tier

This pipeline was scaffolded on Tier 1c. To run it on a per-step-capable tier (Claude Code, OpenCode, or Codex):

1. The `model_intent_scaffold_tier` values in `topology.json` record the intended model tier per step (`medium` for all steps).
2. Re-stamp each agent's `model_tier:` field from `inherit` to the recorded intent value.
3. Remove `model_field_format: omit` constraint (does not apply on Tier 1 / 1b / 1d).
