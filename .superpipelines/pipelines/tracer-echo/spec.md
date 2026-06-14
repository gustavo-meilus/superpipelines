# Feature: tracer-echo (data-only CC tracer)

## Context & motivation
The thinnest end-to-end proof of the data-only `.superpipelines/` architecture (issue #62): a
pipeline scaffolded entirely as DATA, dispatched via materialize-at-runtime (Option A), running
to `status: completed` on Claude Code with no generated source written to `.claude/`.

## User journeys
- As a maintainer, I run `tracer-echo` and it completes, proving the data-only scaffold →
  materialize → run path works on CC.

## Success criteria (acceptance criteria)
- [ ] AC-1: pipeline data resolves under `.superpipelines/pipelines/tracer-echo/` only.
- [ ] AC-2: agents are canonical defs (CAD) under `pipelines/tracer-echo/agents/`; no source under `.claude/`.
- [ ] AC-3: at dispatch, each CAD materializes to an ephemeral CC agent under `.claude/agents/superpipelines/tracer-echo/` (writer = `permissionMode: acceptEdits`; checker = `permissionMode: plan` + `disallowedTools: Write, Edit, Bash`).
- [ ] AC-4: the materialized cache is regenerated each run and deleted on completion.
- [ ] AC-5: the run reaches `status: completed`; `echo.txt` = `tracer-ok`; verdict = PASS; artifacts only under `.superpipelines/`.

## Non-goals
- Output-formatter node (minimal-pipeline exemption).
- `migrate-pipeline` (issue #68).
- Non-CC tier execution (this tracer targets Tier 1).

## Steps
1. `echo-writer` (worker, `write_files:true`) → writes `echo.txt` = `tracer-ok`.
2. `echo-checker` (reviewer, `write_files:false`) → reads `echo.txt`, returns PASS verdict.
