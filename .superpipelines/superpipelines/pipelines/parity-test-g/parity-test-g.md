# parity-test-g — Run Launcher

> Pipeline: `parity-test-g` | Scope: `local` | Source Tier: `tier_2` (Cursor/Windsurf/Cline) | Pattern: 1 (Sequential)

## Overview

This pipeline reads a markdown file, tokenizes the text and counts word frequencies (excluding common English stopwords), then produces a plain-text word frequency report listing the 20 most common words. It was scaffolded on Tier 2 (Cursor/Windsurf/Cline) and uses inline dispatch — all steps execute in the same agent session with no separate agent processes.

**This file is a documentation and discovery artifact.** It is NOT a runnable slash command. The entry skill `run-parity-test-g` is the execution entry point.

**IMPORTANT — Tier 2 architecture:** There are NO agent files (no `.md`, no `.toml`) in this pipeline. All execution is inline. The entry skill loads each step's protocol skill into context and executes it sequentially.

## Entry Skill

```
{ROOT}/skills/superpipelines/parity-test-g/run-parity-test-g/SKILL.md
```

Invoke via the host IDE's native skill invocation interface when the superpipelines extension is installed and the `.superpipelines/` scope is active.

## Topology

See `topology.json` in this directory for the full step graph.

```
tokenizer → reporter
```

- **tokenizer** (inline — no agent file): Reads the input markdown file, tokenizes text, counts word frequencies (stopwords excluded), writes `frequency-counts.json` to the temp directory.
- **reporter** (inline — no agent file): Reads `frequency-counts.json`, selects top-20 words by frequency, writes `{ROOT}/output/parity-test-g-word-freq.txt`.

## Registry Entry

```
{ROOT}/superpipelines/registry.json → pipelines[name="parity-test-g"]
```

## Last-Run State

```
{ROOT}/superpipelines/temp/parity-test-g/{runId}/pipeline-state.json
```

## Platform Notes (Tier 2 — Cursor/Windsurf/Cline)

- **NO agent files** — Tier 2 has no separate agent processes. Protocol skills are loaded and executed inline in the entry skill's session.
- `model_field_format: omit` — No per-step model is emitted anywhere. The host IDE owns model selection. All steps use `inherit`.
- `dispatch_mechanism: inline` — No `Task()` primitive. The entry skill drives sequential execution directly.
- `worktrees: false`, `parallel_subagents: false` — Pattern 1 (Sequential) is the only available pattern.
- `reviewer_isolation: convention` — No structural isolation possible. Self-skepticism preamble required in any reviewer protocol.

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
