# Superpipelines — Agent Context

> Universal context file for any AGENTS.md-aware tool (OpenCode, Codex, Cursor, Windsurf, Cline, others). Introduces the Superpipelines commands and pipeline concepts so the active agent recognizes user intent.

## What this plugin does

Superpipelines is a multi-agent pipeline orchestration framework. It lets users design, scaffold, and execute named multi-step AI workflows (specs, plans, tasks, parallel branches, iterative loops, human gates).

## Commands

| Command | Purpose |
|---------|---------|
| `/superpipelines:new-pipeline` | Design a new pipeline end-to-end (brief → spec → topology → audit → scaffold). |
| `/superpipelines:run-pipeline` | List installed pipelines and execute one. |
| `/superpipelines:audit-pipeline` | Audit an existing pipeline's spec/plan/topology. |
| `/superpipelines:new-step` | Add a step to an existing pipeline. |
| `/superpipelines:update-step` | Modify an existing step. |
| `/superpipelines:delete-step` | Remove a step. |
| `/superpipelines:change-models` | Reassign model tiers across pipeline steps. |
| `/superpipelines:init-deep` | Deep project initialization (full architecture analysis). |
| `/superpipelines:{P}` | Direct invocation of a scaffolded pipeline named `{P}`. |

## Trigger phrases

The active agent should invoke a Superpipelines command when the user requests:

- "design a workflow / pipeline for X" → `/superpipelines:new-pipeline`
- "run the {name} pipeline" / "execute X" → `/superpipelines:run-pipeline` or `/superpipelines:{P}`
- "audit pipeline X" → `/superpipelines:audit-pipeline`
- "plan multi-step feature work" → `/superpipelines:new-pipeline`

## Execution tier

Superpipelines runs on five tiers. The active platform's tier determines parallelism and reviewer-isolation strength:

| Tier | Platform | Subagents | Reviewer isolation |
|------|----------|-----------|--------------------|
| 1 | Claude Code | Skill-callable `Task()` (true parallel) | Structural |
| 1b | OpenCode | `mode: subagent` agents | Structural |
| 1c | Antigravity CLI 2.0 | Dynamic Subagents (aspirational) | TBD |
| 1d | Codex App/CLI | Model-driven, TOML agents (up to 6 concurrent) | Pending verification |
| 2 | Cursor / Windsurf / Cline | None — single-agent inline | Convention-only (advisory) |

**Tier 2 caveat:** On Cursor, Windsurf, and Cline, the orchestrator executes both writer and reviewer protocols with its own full toolset. Reviews are advisory, not structurally enforced.

## Pipeline artifacts

All pipelines produce these files under the active scope root. Roots vary per tier (resolved by `sk-pipeline-paths`):

- Tier 1 (Claude Code): `<workspace>/.claude/` → `~/.claude/`
- Tier 1b (OpenCode): `<workspace>/.opencode/` → `~/.config/opencode/`
- Tier 1c (Antigravity): `<workspace>/.agents/` → `~/.antigravity/`
- Tier 1d (Codex): `<workspace>/.codex/` → `~/.codex/`
- Tier 2 (Cursor/Windsurf/Cline): `<workspace>/.superpipelines/` (universal fallback)

The artifacts below appear under whichever root the active tier resolves:

- `superpipelines/pipelines/{P}/spec.md` — Approved specification.
- `superpipelines/pipelines/{P}/plan.md` — Implementation plan.
- `superpipelines/pipelines/{P}/tasks.md` — Task list with dependencies.
- `superpipelines/pipelines/{P}/topology.json` — Step graph.
- `superpipelines/pipelines/{P}/{P}.md` — Single-page launcher (direct-invocation entry).
- `superpipelines/temp/{P}/{runId}/pipeline-state.json` — Live run state.

## Skill primacy

Intelligence lives in `skills/*/SKILL.md`. Platform manifests (`.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/`, `gemini-extension.json`) are discovery-only — they declare where skills/agents/commands live, not what they do.

## More

- Repo: https://github.com/gustavo-meilus/superpipelines
- OpenCode sibling: https://github.com/gustavo-meilus/superpipelines-opencode
