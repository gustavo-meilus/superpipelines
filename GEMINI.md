# Superpipelines — Antigravity CLI 2.0 Context

> Loaded by Antigravity CLI 2.0 (Go-based `agy`, successor to Gemini CLI) at session start. Mirrors AGENTS.md but uses Antigravity-specific terminology and skills/workflows paths.

## What this plugin does

Superpipelines designs, scaffolds, and executes named multi-step AI workflows on Antigravity CLI 2.0 using Dynamic Subagents (aspirational Tier 1c) or single-agent inline fallback (Tier 2).

## Commands

Same as universal AGENTS.md. See `AGENTS.md` in this repo or the README.

## Antigravity-specific paths

| Resource | Location |
|----------|----------|
| Workspace skills | `.agents/skills/` |
| Global skills | `~/.gemini/antigravity/skills/` |
| Workspace workflows (Scheduled Tasks) | `.agents/workflows/{NAME}.md` |
| Global workflows | `~/.gemini/antigravity/global_workflows/{NAME}.md` |
| Workspace rules | `.agents/rules/` |
| Global rules | `~/.gemini/GEMINI.md` |

## Migration from Gemini CLI

Gemini CLI is deprecated June 18, 2026. Migrate existing extensions:

```bash
agy plugin import gemini
```

This converts `gemini-extension.json` extensions to the Antigravity plugin format in place. Superpipelines ships `gemini-extension.json` for compatibility with both pre- and post-migration installs.

## Scheduled Tasks for pipelines

Each scaffolded pipeline produces a single-page launcher at `superpipelines/pipelines/{P}/{P}.md`. To run a pipeline on a schedule under Antigravity, drop a Scheduled Task file at `.agents/workflows/{P}-scheduled.md` referencing the launcher. Pipeline state preserves across runs in `superpipelines/temp/{P}/{runId}/pipeline-state.json`.

## Execution tier

Tier 1c (Dynamic Subagents) if the dispatch primitive is exposed to skills; otherwise falls back to Tier 2 (single-agent inline). The active orchestrator detects tier via `sk-platform-dispatch` at run start. See §6 of `docs/superpowers/specs/2026-05-20-multi-platform-design.md` for verification status.

## More

- Repo: https://github.com/gustavo-meilus/superpipelines
- Antigravity migration guide: https://antigravity.google/docs/migration
