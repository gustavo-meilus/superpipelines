# parity-test-j — Run Launcher

> Pipeline: `parity-test-j` | Scope: `local` | Source Tier: `tier_1b` (OpenCode v1.15.10) | Pattern: 1 (Sequential)

## Overview

This pipeline reads a CSV file, computes per-column data quality metrics (null counts, IQR-based outlier detection for numeric columns, type inconsistency detection), validates those findings via a structural reviewer, then renders and writes a markdown data quality report to `output/parity-test-j-report.md`. It was scaffolded on Tier 1b (OpenCode v1.15.10) and uses native subagent dispatch — each step runs as a distinct OpenCode subagent process.

**This file is a documentation and discovery artifact.** It is NOT a runnable slash command. The entry skill `run-parity-test-j` is the execution entry point.

**Tier 1b architecture:** Agent files (`.md`) contain YAML frontmatter + full protocol body (≤150 lines). There are NO companion protocol skills — the protocol lives in the agent body. The entry skill dispatches each agent via `DISPATCH(mode="subagent", ...)`, NOT `Task()`.

## Entry Skill

```
{ROOT}/skills/superpipelines/parity-test-j/run-parity-test-j/SKILL.md
```

Invoke via OpenCode's native skill invocation interface when the superpipelines extension is installed and the `.opencode/` scope is active.

## Topology

See `topology.json` in this directory for the full step graph.

```
analyzer → reviewer → reporter
```

- **analyzer** (native subagent — `analyzer.md`): Reads the input CSV file, computes per-column quality metrics (null counts, IQR-based outlier detection, type inconsistency detection), writes `findings.json` to the temp directory. Model: `opencode/big-pickle`.
- **reviewer** (native subagent — `reviewer.md`): Reads `findings.json`, validates completeness and correctness of the analyzer's findings. Read-only — cannot write files or run shell commands (`permissionMode: plan` + `disallowedTools: Write, Edit, Bash`). Verdict is communicated via terminal output text, captured in `pipeline-state.json` by the entry skill. Model: `opencode/big-pickle`.
- **reporter** (native subagent — `reporter.md`): Reads `findings.json` and reviewer verdict (passed via dispatch context), renders the final markdown data quality report, writes `parity-test-j-report.md` to `output/`. Only dispatched if reviewer verdict is `approved` or `approved_with_concerns`. Model: `opencode/big-pickle`.

## Agent Files

Each step runs as a distinct native subagent on OpenCode. Agent files are located at:

```
{ROOT}/agents/superpipelines/parity-test-j/analyzer.md
{ROOT}/agents/superpipelines/parity-test-j/reviewer.md
{ROOT}/agents/superpipelines/parity-test-j/reporter.md
```

All agents declare `model: opencode/big-pickle` in YAML frontmatter (provider_prefixed format, triage tier — free, no paid subscription required). The full operational protocol is in the agent body; there are no companion protocol skills.

## Registry Entry

```
{ROOT}/superpipelines/registry.json → pipelines[name="parity-test-j"]
```

## Last-Run State

```
{ROOT}/superpipelines/temp/parity-test-j/{runId}/pipeline-state.json
```

## Platform Notes (Tier 1b — OpenCode v1.15.10)

- **Native subagent dispatch** — `DISPATCH(mode="subagent", agent="{name}", context={...})`. Each step runs in a distinct process. No `Task()` primitive.
- **`model_field_format: provider_prefixed`** — `model: opencode/big-pickle` in each agent's YAML frontmatter. Not `reasoningEffort`-eligible (triage tier).
- **Agent body protocol** — Tier 1b places the full protocol in the agent `.md` body (≤150 lines). No companion protocol skills exist for this pipeline.
- **`parallel_subagents: false`** — Pattern 1 (Sequential) is the only available pattern on Tier 1b. Pattern 2 (fan-out) is unavailable.
- **`reviewer_isolation: structural`** — The reviewer runs in its own subagent process AND is further constrained by `permissionMode: plan` + `disallowedTools: Write, Edit, Bash`. OpenCode's permission system structurally prevents the reviewer from writing files or executing shell commands.

## Degradation Warnings (Tier 1b — Active)

The following degradation warning from the `tier_1b` platform profile is surfaced before every run:

1. **Parallel fan-out (Pattern 2) degrades to sequential on OpenCode.** This pipeline uses Pattern 1 (Sequential) and is not affected; this warning is informational.

## Reviewer Structural Isolation

The `reviewer` agent uses:

- `permissionMode: plan` — prevents any write or edit operations at the OpenCode session level.
- `disallowedTools: Write, Edit, Bash` — structurally disallows the Write, Edit, and Bash tools in the reviewer's subagent process.

The reviewer reads `findings.json` and communicates its verdict exclusively via its terminal output text. The entry skill captures this verdict and records it in `pipeline-state.json phases[1].outputs` before dispatching the reporter. The reporter receives the verdict text via its dispatch context — it does NOT read a separate `verdict.json` file on disk (the reviewer cannot write one).

## Running on a Different Tier

This pipeline was scaffolded on Tier 1b (OpenCode). To run it on Claude Code (Tier 1):

1. Re-scaffold agent files as zero-body CC agents (YAML frontmatter only, no body).
2. Add companion `{agent-name}-protocol/SKILL.md` files with `disable-model-invocation: true` and `user-invocable: false`.
3. Change `model: opencode/big-pickle` to `model_tier: triage` in each agent's frontmatter.
4. Replace `DISPATCH(mode="subagent", ...)` in the entry skill with `Task()` calls.
5. Update `source_tier` to `tier_1` and `model_field_format` to `yaml_frontmatter` in topology.json and registry.json.
6. Update registry `agents` paths and `skills` list to include protocol skills.
7. For reviewer isolation on CC: use `acceptEdits: false` or a separate reviewer protocol skill that omits write tools.
