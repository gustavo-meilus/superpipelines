---
name: sk-pipeline-state
description: Use when reading or writing pipeline-state.json, resuming an interrupted pipeline, or detecting a crashed run — defines the schema, recovery rules, and atomic-write pattern. Reference-only; preload via agent skills frontmatter.
disable-model-invocation: true
user-invocable: false
---

# Pipeline State — Schema and Recovery

Every running pipeline persists state to `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json`, where `{P}` is the pipeline name and `{runId}` is the UUID for the current run. The scope root is resolved by `sk-pipeline-paths`.

---

## Where state lives

- **Path:** `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json`
- **Scope root:** Resolved by `sk-pipeline-paths` — depends on deployment scope (`project` → `<workspace>/.claude/`, `local` → `<workspace>/.claude/`, `user` → `~/.claude/`).
- **Why not under `${CLAUDE_PLUGIN_ROOT}`:** plugin directories are wiped on update.
- **Why not the memory tool:** `STATE_MANAGEMENT: STRUCTURED_JSON` is mandated. State must be inspectable, atomic, and not coupled to model behavior.

Each pipeline run gets its own `{runId}/` directory. Multiple named pipelines are isolated by `{P}/`.

---

## Schema

```json
{
  "pipeline_id": "<uuid>",
  "pipeline_name": "<P>",
  "scope_root": "<resolved scope root>",
  "run_id": "<uuid>",
  "started_at": "<iso8601>",
  "pattern": "1 | 2 | 2b | 3 | 4 | 5",
  "status": "running | completed | escalated | failed",
  "current_phase": 0,
  "phases": [
    {
      "index": 0,
      "name": "<phase name>",
      "status": "pending | running | done | failed",
      "agent": "<agent name>",
      "outputs": ["<path>"],
      "error": null
    }
  ],
  "metadata": {}
}
```

### Field rules

- `pipeline_id` — UUID v4. Used to disambiguate concurrent pipelines and as cache key for state recovery.
- `pipeline_name` — Human-readable pipeline name matching the `{P}` directory.
- `scope_root` — Resolved scope root (absolute path). Stored to enable recovery without re-resolving scope.
- `run_id` — UUID v4 for this specific run. Used as the `{runId}` directory name.
- `started_at` — ISO 8601 timestamp at pipeline start.
- `pattern` — one of `1, 2, 2b, 3, 4, 5` (4D wrapper is per-invocation, not a top-level pattern).
- `status` — one of `running, completed, escalated, failed`.
- `current_phase` — index into `phases` array.
- `phases[].outputs` — list of file paths produced by the phase. Pass paths, not content.
- `phases[].error` — null when status `done`; populated when `failed`.
- `metadata` — free-form orchestrator notes (e.g., worktree paths, task IDs).

---

## Atomic write pattern

Concurrent reads of a half-written JSON file produce parse errors that look like crashes. Always:

1. Write to `<temp-dir>/pipeline-state.json.tmp`.
2. `mv <temp-dir>/pipeline-state.json.tmp <temp-dir>/pipeline-state.json` (atomic on POSIX).

Bash example:

```bash
TEMP_DIR="${SCOPE_ROOT}/superpipelines/temp/${PIPELINE_NAME}/${RUN_ID}"
mkdir -p "$TEMP_DIR"
TMP="${TEMP_DIR}/pipeline-state.json.tmp"
echo "$NEW_STATE_JSON" > "$TMP"
mv "$TMP" "${TEMP_DIR}/pipeline-state.json"
```

---

## Recovery rules

On orchestrator startup, check for existing state in `<scope-root>/superpipelines/temp/{P}/`:

| Found state | Action |
|-------------|--------|
| `status: "running"` AND `started_at < 1h ago` | Live pipeline. Refuse to start a new one. |
| `status: "running"` AND `started_at > 1h ago` | Treat as crashed. Log warning. Prompt user: resume / restart / abort. |
| `status: "completed"` | Skip pipeline; log "already done." |
| `status: "escalated"` | Surface to human. Do NOT auto-resume. |
| `status: "failed"` | Surface to human. Do NOT auto-resume. |
| Parse error (corrupt) | Do NOT auto-resume. Escalate to human. |
| No temp dir / file missing | Fresh start. Initialize new state. |

### Resume

Start from `current_phase + 1`. Skip completed phases. Preserve `pipeline_id`, `started_at`, and prior `phases[]` entries.

### Restart

Delete the entire run directory: `rm -rf <scope-root>/superpipelines/temp/{P}/{runId}/`. Re-initialize.

---

## Worked example

Initial state (Pattern 5 SDD pipeline):

```json
{
  "pipeline_id": "550e8400-e29b-41d4-a716-446655440000",
  "pipeline_name": "csv-ingestion",
  "scope_root": "/home/user/project/.claude",
  "run_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "started_at": "2026-05-02T14:22:00Z",
  "pattern": "5",
  "status": "running",
  "current_phase": 2,
  "phases": [
    { "index": 0, "name": "specify", "status": "done", "agent": "pipeline-architect", "outputs": ["spec.md"], "error": null },
    { "index": 1, "name": "plan", "status": "done", "agent": "pipeline-architect", "outputs": ["plan.md"], "error": null },
    { "index": 2, "name": "tasks", "status": "running", "agent": "pipeline-architect", "outputs": [], "error": null }
  ],
  "metadata": {
    "worktree_root": ".worktrees/feat-csv-ingestion",
    "task_count_target": 7
  }
}
```

After tasks generation:

```json
{
  "pipeline_id": "550e8400-e29b-41d4-a716-446655440000",
  "pipeline_name": "csv-ingestion",
  "scope_root": "/home/user/project/.claude",
  "run_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "started_at": "2026-05-02T14:22:00Z",
  "pattern": "5",
  "status": "running",
  "current_phase": 4,
  "phases": [
    { "index": 0, "name": "specify", "status": "done", "agent": "pipeline-architect", "outputs": ["spec.md"], "error": null },
    { "index": 1, "name": "plan", "status": "done", "agent": "pipeline-architect", "outputs": ["plan.md"], "error": null },
    { "index": 2, "name": "tasks", "status": "done", "agent": "pipeline-architect", "outputs": ["tasks.md"], "error": null },
    { "index": 3, "name": "human-gate", "status": "done", "agent": "user", "outputs": [], "error": null },
    { "index": 4, "name": "implement", "status": "running", "agent": "pipeline-task-executor", "outputs": [], "error": null }
  ],
  "metadata": {
    "worktree_root": ".worktrees/feat-csv-ingestion",
    "task_count_target": 7,
    "task_progress": { "T-1": "done", "T-2": "running", "T-3": "pending" }
  }
}
```

---

## Common mistakes

- Storing state under `${CLAUDE_PLUGIN_ROOT}` → wiped on update.
- Writing JSON directly without the `.tmp` rename → partial writes corrupt state.
- Auto-resuming an `escalated` state without human approval → repeats the failure.
- Deleting the run directory without checking status → silent loss of in-progress work.

## Cross-references

- `sk-pipeline-patterns` — pattern numbers used in `pattern` field.
- `sk-pipeline-paths` — resolves scope root and temp directory paths.
- `running-a-pipeline` — primary writer of state.
