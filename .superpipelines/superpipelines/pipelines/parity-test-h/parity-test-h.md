# parity-test-h — Run Launcher

> Pipeline: `parity-test-h` | Scope: `local` | Source Tier: `tier_2` (Cursor/Windsurf/Cline) | Pattern: 1 (Sequential)

## Overview

This pipeline reads a YAML config file, validates it against a schema (checking required fields, type mismatches, and deprecated keys), reviews the findings for false positives (convention-only isolation, C19 preamble), then produces a structured markdown validation report. It was scaffolded on Tier 2 (Cursor/Windsurf/Cline) and uses inline dispatch — all steps execute in the same agent session with no separate agent processes.

**This file is a documentation and discovery artifact.** It is NOT a runnable slash command. The entry skill `run-parity-test-h` is the execution entry point.

**IMPORTANT — Tier 2 architecture:** There are NO agent files (no `.md`, no `.toml`) in this pipeline. All execution is inline. The entry skill loads each step's protocol skill into context and executes it sequentially.

## Entry Skill

```
{ROOT}/skills/superpipelines/parity-test-h/run-parity-test-h/SKILL.md
```

Invoke via the host IDE's native skill invocation interface when the superpipelines extension is installed and the `.superpipelines/` scope is active.

## Topology

See `topology.json` in this directory for the full step graph.

```
validator → reviewer → reporter
```

- **validator** (inline — no agent file): Reads the input YAML config file, parses it, checks for required fields, type mismatches, and deprecated keys, writes `validator-findings.json` to the temp directory.
- **reviewer** (inline — no agent file, C19 convention): Reads `validator-findings.json`, applies the self-skepticism preamble, re-derives findings from raw YAML inputs, checks for false positives, writes `reviewed-findings.json` to the temp directory. **Reviewer isolation is convention-only** — no structural isolation exists on Tier 2.
- **reporter** (inline — no agent file): Reads `reviewed-findings.json`, formats a structured markdown validation report with sections per finding category and a dismissed-findings section, writes `{ROOT}/output/parity-test-h-validation-report.md`.

## Registry Entry

```
{ROOT}/superpipelines/registry.json → pipelines[name="parity-test-h"]
```

## Last-Run State

```
{ROOT}/superpipelines/temp/parity-test-h/{runId}/pipeline-state.json
```

## Platform Notes (Tier 2 — Cursor/Windsurf/Cline)

- **NO agent files** — Tier 2 has no separate agent processes. Protocol skills are loaded and executed inline in the entry skill's session.
- `model_field_format: omit` — No per-step model is emitted anywhere. The host IDE owns model selection. All steps use `inherit`.
- `dispatch_mechanism: inline` — No `Task()` primitive. The entry skill drives sequential execution directly.
- `worktrees: false`, `parallel_subagents: false` — Pattern 1 (Sequential) is the only available pattern.
- `reviewer_isolation: convention` — No structural isolation possible. C19 self-skepticism preamble required in the reviewer protocol.

## Degradation Warnings (Tier 2 — Active)

The following degradation warnings from the `tier_2` platform profile are surfaced before every run:

1. **Reviewer isolation impossible on this platform**: writer and reviewer are the same agent in the same context. Review steps execute the reviewer protocol but cannot provide assumption-blindness defense or context-bleed isolation. Treat review output as a self-check, not verification.

2. **Parallel fan-out (Pattern 2) requires worktrees** and is unavailable on this platform (`worktrees: false`).

3. **Model selection is owned by the host IDE**; per-step model assignment is not emitted.

## Running on a Different Tier

This pipeline was scaffolded on Tier 2. To run it on Claude Code (Tier 1) or Codex (Tier 1d):

1. Re-scaffold with agent files: YAML frontmatter `.md` files for Tier 1 (CC), TOML files for Tier 1d (Codex).
2. Add `model_tier: fast` (or your intended tier) to each agent's frontmatter or TOML.
3. Replace `"agent": null` in `topology.json` with actual agent file paths.
4. Remove `model_field_format: omit` from topology metadata; use `yaml_frontmatter` (CC) or `toml_split` (Codex).
5. Update `source_tier` and registry `source_tier` to the target tier.
6. On Tier 1/1d the reviewer gains structural isolation via separate agent processes — the C19 convention preamble remains advisable but is no longer the sole isolation mechanism.
