# Superpipelines — Project Notes

This repo is the source of the `superpipelines` Claude Code plugin. It packages skills and subagents that design and run multi-agent AI pipelines.

## Architecture invariants

- `SUB_AGENT_SPAWNING: FALSE` — Subagents never spawn children. Orchestration lives in top-level skills (`creating-a-pipeline`, `running-a-pipeline`, step-management skills) or the parent session.
- `WRITE_REVIEW_ISOLATION: TRUE` — The agent that writes code never reviews it. Stage 1 (spec compliance) gates Stage 2 (code quality).
- `MODEL_SELECTION: SONNET_ONLY` — Every pipeline agent defaults to `model: sonnet`. Non-sonnet models require explicit user opt-in at scope-selection time; document the opt-in in the Architect's Brief.
- `PERMISSION_MODE: PER_AGENT` — Each generated pipeline agent may declare `permissionMode: default | acceptEdits | plan | bypassPermissions`. Never use `bypassPermissions` without explicit user justification documented in the agent body. Plugin-internal orchestration agents omit `permissionMode`.
- `STATE_MANAGEMENT: STRUCTURED_JSON` — Pipeline state in `<scope-root>/superpipelines/temp/{pipelineName}/{runId}/pipeline-state.json`. `memory: local` is allowed for agent learned heuristics; `memory: project` is forbidden.
- `MULTI_PIPELINE: TRUE` — Multiple named pipelines may coexist per workspace. Each is an isolated bundle with its own spec, agents, skills, and temp directory.
- Agent body ≤150 lines. Depth lives in companion `<agent>-references/references/*.md`.
- `skills:` frontmatter on agents preloads ONLY shared `sk-*` method skills. Never workflow skills, never companion refs.

## File-layout rules

- **Plugin manifest** is at `.claude-plugin/plugin.json`. The marketplace listing (`.claude-plugin/marketplace.json`) lives alongside it. No other files belong in `.claude-plugin/`.
- Plugin source dirs (`agents/`, `skills/`, `commands/`, `hooks/`) sit at the repo root.
- **Generated pipeline artifacts** live under a scope-dependent root resolved by `sk-pipeline-paths`:
  - `project` scope: `<workspace>/.claude/` (committed to git)
  - `local` scope: `<workspace>/.claude/` (gitignored — user's responsibility to add .gitignore entry)
  - `user` scope: `~/.claude/` (global, per machine)
  - Under the scope root: `skills/superpipelines/{P}/`, `agents/superpipelines/{P}/`, `superpipelines/pipelines/{P}/`, `superpipelines/temp/{P}/{runId}/`
- Companion reference skills (`*-references/`) have NO `SKILL.md` — only `references/` subdirs read on demand. This keeps them out of the system context (per `<skill_suppression>`).
- Use `${CLAUDE_PLUGIN_ROOT}` for plugin-relative paths in hook commands and agent bodies. Never `~/.claude/...` or absolute paths in plugin source.

## Authoring rules

- Skill `description:` field is **triggering conditions only** — never a workflow summary. Workflow summaries cause Claude to skip the body.
- Third-person voice everywhere. No "I" / "you" in skill bodies.
- Every skill description ≤1024 chars; every skill body ≤500 lines; every agent body ≤150 lines.
- Reference files >100 lines must include a Table of Contents at the top.
- Cross-references use explicit markers (`**REQUIRED SUB-SKILL:**`, `**REQUIRED BACKGROUND:**`). Never `@path/to/file` — that force-loads.
- Every agent emits exactly one terminal status: `DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED`.
- Discipline-enforcing skills must include a "Red Flags — STOP" section and a Rationalization Table.

## Cache stability

- SessionStart hook output must be byte-identical across runs. Verify with `diff <(./hooks/session-start) <(./hooks/session-start)`.
- No timestamps, no env-specific data, no session IDs in static prompts.
- Don't mutate the skills list mid-session.

## Today's date

2026-05-04 — v1.0.1 — current model IDs: `claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5-20251001`.
