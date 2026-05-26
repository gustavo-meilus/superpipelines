# parity-test-i — Run Launcher

> Pipeline: `parity-test-i` | Scope: `local` | Source Tier: `tier_1b` (OpenCode v1.15.10) | Pattern: 1 (Sequential)

## Overview

This pipeline reads a JSON file, extracts each top-level key and the type of its value (string, number, boolean, object, array, null), then formats and writes a human-readable plain-text summary to `output/parity-test-i-summary.txt`. It was scaffolded on Tier 1b (OpenCode v1.15.10) and uses native subagent dispatch — each step runs as a distinct OpenCode subagent process.

**This file is a documentation and discovery artifact.** It is NOT a runnable slash command. The entry skill `run-parity-test-i` is the execution entry point.

**Tier 1b architecture:** Agent files (`.md`) contain YAML frontmatter + full protocol body (≤150 lines). There are NO companion protocol skills — the protocol lives in the agent body. The entry skill dispatches each agent via `DISPATCH(mode="subagent", ...)`, NOT `Task()`.

## Entry Skill

```
{ROOT}/skills/superpipelines/parity-test-i/run-parity-test-i/SKILL.md
```

Invoke via OpenCode's native skill invocation interface when the superpipelines extension is installed and the `.opencode/` scope is active.

## Topology

See `topology.json` in this directory for the full step graph.

```
inspector → formatter
```

- **inspector** (native subagent — `inspector.md`): Reads the input JSON file, extracts each top-level key and its value type, writes `key-type-data.json` to the temp directory. Model: `opencode/big-pickle`.
- **formatter** (native subagent — `formatter.md`): Reads `key-type-data.json`, formats a human-readable plain-text summary with one line per key, writes `parity-test-i-summary.txt` to `output/`. Model: `opencode/big-pickle`.

## Agent Files

Each step runs as a distinct native subagent on OpenCode. Agent files are located at:

```
{ROOT}/agents/superpipelines/parity-test-i/inspector.md
{ROOT}/agents/superpipelines/parity-test-i/formatter.md
```

Both agents declare `model: opencode/big-pickle` in YAML frontmatter (provider_prefixed format, triage tier — free, no paid subscription required). The full operational protocol is in the agent body; there are no companion protocol skills.

## Registry Entry

```
{ROOT}/superpipelines/registry.json → pipelines[name="parity-test-i"]
```

## Last-Run State

```
{ROOT}/superpipelines/temp/parity-test-i/{runId}/pipeline-state.json
```

## Platform Notes (Tier 1b — OpenCode v1.15.10)

- **Native subagent dispatch** — `DISPATCH(mode="subagent", agent="{name}", context={...})`. Each step runs in a distinct process. No `Task()` primitive.
- **`model_field_format: provider_prefixed`** — `model: opencode/big-pickle` in each agent's YAML frontmatter. Not `reasoningEffort`-eligible (triage tier).
- **Agent body protocol** — Tier 1b places the full protocol in the agent `.md` body (≤150 lines). No companion protocol skills exist for this pipeline.
- **`parallel_subagents: false`** — Pattern 1 (Sequential) is the only available pattern on Tier 1b. Pattern 2 (fan-out) is unavailable.
- **`reviewer_isolation: structural`** — Each subagent runs in its own process, providing structural isolation between steps.

## Degradation Warnings (Tier 1b — Active)

The following degradation warning from the `tier_1b` platform profile is surfaced before every run:

1. **Parallel fan-out (Pattern 2) degrades to sequential on OpenCode.** This pipeline uses Pattern 1 (Sequential) and is not affected; this warning is informational.

## Running on a Different Tier

This pipeline was scaffolded on Tier 1b (OpenCode). To run it on Claude Code (Tier 1):

1. Re-scaffold agent files as zero-body CC agents (YAML frontmatter only, no body).
2. Add companion `{agent-name}-protocol/SKILL.md` files with `disable-model-invocation: true` and `user-invocable: false`.
3. Change `model: opencode/big-pickle` to `model_tier: triage` in each agent's frontmatter.
4. Replace `DISPATCH(mode="subagent", ...)` in the entry skill with `Task()` calls.
5. Update `source_tier` to `tier_1` and `model_field_format` to `yaml_frontmatter` in topology.json and registry.json.
6. Update registry `agents` paths and `skills` list to include protocol skills.
