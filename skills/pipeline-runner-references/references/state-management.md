# State Management — Pipeline-Runner Reference

How `running-a-pipeline` writes and reads pipeline state. Companion to `sk-pipeline-state` (which defines the schema).

## Table of contents

1. Read-on-startup flow
2. Initialize new state
3. Atomic write pattern
4. Phase transitions
5. Resume protocol
6. Concurrent pipeline detection
7. Metadata fields used by runner
8. Cleanup on success
9. Cleanup on failure / escalation

---

## Read-on-startup flow

```
1. Resolve scope root via sk-pipeline-paths
2. Check for existing state in <scope-root>/superpipelines/temp/{P}/
   ├── No run dirs → fresh start; proceed to "initialize new state"
   ├── Found run dir with status: "running" AND started_at < 1h ago → live; refuse to start new
   ├── Found run dir with status: "running" AND started_at > 1h ago → crashed; prompt user (resume/restart/abort)
   ├── status: "completed" → "already done"; exit
   ├── status: "escalated" or "failed" → surface to human; do NOT auto-resume
   └── parse error → escalate to human; do NOT auto-resume
```

## Initialize new state

```bash
PIPELINE_NAME="my-pipeline"
SCOPE_ROOT=$(# resolved by sk-pipeline-paths)
RUN_ID=$(uuidgen)
PIPELINE_ID=$(uuidgen)
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
TEMP_DIR="${SCOPE_ROOT}/superpipelines/temp/${PIPELINE_NAME}/${RUN_ID}"
mkdir -p "$TEMP_DIR"
cat > "${TEMP_DIR}/pipeline-state.json.tmp" <<EOF
{
  "pipeline_id": "${PIPELINE_ID}",
  "pipeline_name": "${PIPELINE_NAME}",
  "scope_root": "${SCOPE_ROOT}",
  "run_id": "${RUN_ID}",
  "started_at": "${NOW}",
  "pattern": "${PATTERN}",
  "status": "running",
  "current_phase": 0,
  "phases": [...],
  "metadata": {}
}
EOF
mv "${TEMP_DIR}/pipeline-state.json.tmp" "${TEMP_DIR}/pipeline-state.json"
```

## Atomic write pattern

EVERY state update follows the write-temp-then-rename pattern:

```bash
TEMP_DIR="${SCOPE_ROOT}/superpipelines/temp/${PIPELINE_NAME}/${RUN_ID}"
STATE_FILE="${TEMP_DIR}/pipeline-state.json"
# 1. Read current state
STATE=$(cat "$STATE_FILE")
# 2. Modify (use jq for safety)
NEW_STATE=$(echo "$STATE" | jq --arg phase "$PHASE" '.current_phase = ($phase | tonumber)')
# 3. Write atomically
echo "$NEW_STATE" > "${STATE_FILE}.tmp"
mv "${STATE_FILE}.tmp" "$STATE_FILE"
```

## Phase transitions

| Transition | State change |
|------------|--------------|
| Phase starts | `phases[i].status = "running"` |
| Phase completes successfully | `phases[i].status = "done"`, `phases[i].outputs = [...]`, `current_phase = i+1` |
| Phase fails (recoverable) | `phases[i].status = "failed"`, `phases[i].error = "..."`, retry per status protocol |
| Phase fails (non-recoverable) | `status = "failed"` (top-level), surface to user |
| Pattern 3 hits max iterations | `status = "escalated"`, write last failure summary to metadata |
| Pipeline completes | `status = "completed"` |

## Resume protocol

When user accepts "resume" prompt for crashed state:

1. Validate `pipeline_id` matches what user expected.
2. Find `phases[i]` with `status: "running"`.
3. Reset `phases[i].status = "pending"` (assume in-progress work was lost).
4. If `phases[i]` had partial outputs that survived, prefer to keep them; otherwise re-dispatch from clean.
5. Continue from `current_phase = i`.

## Concurrent pipeline detection

Each pipeline name `{P}` has its own directory under `superpipelines/temp/`. Multiple named pipelines can run concurrently. Within the same `{P}`, only one active run is allowed:

```
echo "Active pipeline detected: $EXISTING_ID started $STARTED_AT"
echo "Cannot start new run of '${PIPELINE_NAME}'. Options:"
echo "  - Wait for active pipeline to finish"
echo "  - Resume the active run (claude /superpipelines:run-pipeline --resume)"
echo "  - Abort the active run (rm -rf ${TEMP_DIR})"
exit 1
```

## Metadata fields used by runner

| Field | Type | Used for |
|-------|------|----------|
| `worktree_root` | string | Path to created worktree (for cleanup) |
| `task_count_target` | integer | Total tasks in pipeline (for progress display) |
| `task_progress` | object | `{ "T-1": "done", "T-2": "running", ... }` |
| `last_failure` | object | Pattern 3 escalation summary |
| `attempted_fixes` | array | Pattern 3 audit trail |

## Cleanup on success

```bash
TEMP_DIR="${SCOPE_ROOT}/superpipelines/temp/${PIPELINE_NAME}/${RUN_ID}"
STATE_FILE="${TEMP_DIR}/pipeline-state.json"
# Pipeline completed — mark status and delete temp dir
NEW_STATE=$(cat "$STATE_FILE" | jq '.status = "completed" | .completed_at = now | todate')
echo "$NEW_STATE" > "${STATE_FILE}.tmp"
mv "${STATE_FILE}.tmp" "$STATE_FILE"
# Temp dirs are deleted on DONE
rm -rf "$TEMP_DIR"
```

## Cleanup on failure / escalation

Do NOT delete the temp directory. Surface to user with the absolute path so they can inspect:

```
echo "Pipeline ESCALATED. State preserved at: ${TEMP_DIR}/pipeline-state.json"
echo "Next steps documented in metadata.last_failure."
```
