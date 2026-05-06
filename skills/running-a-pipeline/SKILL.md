---
name: running-a-pipeline
description: Use when the user asks to run a pipeline, execute a workflow, list available pipelines, or invokes /superpipelines:run-pipeline. Reads all scope registries, lets the user pick a pipeline, then invokes its entry skill.
---

# Running a Pipeline

Registry-driven launcher for named superpipelines. Reads all scope registries, presents available pipelines, and invokes the chosen pipeline's entry skill.

## When this fires

- `/superpipelines:run-pipeline` invoked.
- "Run the pipeline" / "Execute [pipeline name]" / "Which pipelines are available?"
- User asks to resume a previously started pipeline run.

When NOT to use:

- No pipeline exists yet → `creating-a-pipeline`.
- User wants to add / update / delete a step → step-management skills.
- `pipeline-state.json` shows `status: escalated` or `status: failed` → surface to human; do NOT auto-resume.

## Workflow

### Phase 0 — Discover available pipelines

Resolve scope roots via `sk-pipeline-paths`. Read `registry.json` from each:

```bash
{WORKSPACE}/.claude/superpipelines/registry.json   # project and local scope
$HOME/.claude/superpipelines/registry.json          # user scope
```

Merge lists, deduplicating by `(scope, name)`. If a name appears in multiple scopes, show all entries with scope labels.

If no pipelines found in any scope: tell the user "No pipelines found. Use /superpipelines:new-pipeline to create one." Emit `BLOCKED`.

### Phase 1 — Pipeline selection

Present the list via `AskUserQuestion`:

```
Available pipelines:
  1. release-notes-builder  (project) — pattern 5
  2. test-fixer             (local)   — pattern 3
  3. deploy-validator       (user)    — pattern 2

Which pipeline would you like to run? (enter number or name)
```

Record the selected pipeline's `{ROOT}`, `{P}`, and `pattern`.

### Phase 2 — Resume check

If `--resume` was passed OR if temp dirs exist under `{ROOT}/superpipelines/temp/{P}/`:

1. List available `runId`s from the temp directory.
2. Ask: `Start a new run | Resume run {runId}`.
3. For resume: read `pipeline-state.json`. Apply recovery rules from `sk-pipeline-state`:
   - `status: running` and `started_at < 1h ago` → may be live; warn user before resuming.
   - `status: running` and `started_at > 1h ago` → likely crashed; resume from `current_phase + 1`.
   - `status: completed` → tell user "already done"; show outputs.
   - `status: escalated` or `failed` → surface to human. Do NOT auto-resume.

<HARD-GATE>
Never auto-resume an escalated or failed run. The escalation state exists for a reason. Surface the preserved state path and ask the user to review it first.
</HARD-GATE>

### Phase 3 — State initialization (new run only)

Generate `runId`: format `{P}-{YYYYMMDD-HHMMSS}`.

Initialize `{ROOT}/superpipelines/temp/{P}/{runId}/pipeline-state.json`:

```json
{
  "pipeline_id": "{runId}",
  "pipeline_name": "{P}",
  "scope_root": "{ROOT}",
  "started_at": "<ISO 8601>",
  "pattern": "<N>",
  "status": "running",
  "current_phase": 0,
  "phases": []
}
```

Write atomically: write to `pipeline-state.json.tmp`, then rename to `pipeline-state.json`.

### Phase 4 — Entry skill invocation

Invoke the pipeline's entry skill `run-{P}`.

Pass as context:
- `scope_root`: absolute path to `{ROOT}`.
- `run_id`: the `runId` from Phase 3.
- `pipeline_name`: `{P}`.
- `state_path`: absolute path to `pipeline-state.json`.
- `topology_path`: absolute path to `topology.json`.

The entry skill owns the full per-step dispatch, two-stage review (Stage 1 spec compliance gates Stage 2 quality), worktree management, escalation handling, and final status write.

### Phase 5 — Completion handling

After entry skill exits, read `pipeline-state.json`.

| Final status | Action |
|--------------|--------|
| `completed` | Delete `{ROOT}/superpipelines/temp/{P}/{runId}/`. Print success summary and outputs. |
| `escalated` | Preserve temp dir. Print: `State preserved at {state_path}`. Surface escalation reason. |
| `failed` | Preserve temp dir. Print path and error. |
| `blocked` | Preserve temp dir. Print path and what was missing. |

## Common mistakes

- Reading temp dir state before entry skill exits → incomplete state.
- Deleting temp dir before checking status → destroys recovery data on escalated runs.
- Passing file content (not paths) to the entry skill → bloats skill context; path convention violated.

## Red Flags — STOP

- "The previous run was escalated, but let me restart it" → Read the state file first. Understand WHY it escalated. Do not restart blindly.
- "There's no registry, I'll look for tasks.md instead" → A missing registry means no managed pipelines. Direct the user to create one.
- "I'll delete the temp after escalation to clean up" → Temp preservation is the only recovery mechanism. Never delete on non-completed status.
