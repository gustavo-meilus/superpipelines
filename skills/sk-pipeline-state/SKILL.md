---
name: sk-pipeline-state
description: Use when reading or writing pipeline-state.json, resuming an interrupted pipeline, or detecting a crashed run — defines the schema, recovery rules, and atomic-write pattern. Reference-only; preload via agent skills frontmatter.
disable-model-invocation: true
user-invocable: false
---

# Pipeline State — Persistence & Recovery

> Defines the schema, storage layout, and recovery protocols for pipeline execution state. Trigger when reading or writing `pipeline-state.json`, resuming an interrupted run, or diagnosing a crashed orchestrator.

<overview>
Superpipelines utilize a structured JSON state to manage the lifecycle of multi-agent workflows. This state is isolated from model behavior, ensuring that runs are inspectable, resumable, and resilient to environment restarts. All state transitions must follow an atomic write pattern to prevent corruption.
</overview>

<glossary>
  <term name="Pipeline State">A structured JSON file (`pipeline-state.json`) representing the source of truth for a specific run.</term>
  <term name="Atomic Write">The process of writing to a temporary file and renaming it to ensure file integrity.</term>
  <term name="Run ID">A UUID v4 uniquely identifying a single execution instance of a pipeline.</term>
</glossary>

## State Location

<invariant>
State must be persisted to `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json`. Never store state within `${CLAUDE_PLUGIN_ROOT}`, as it is not persistent across updates.
</invariant>

## Schema Definition

<schema>
```json
{
  "pipeline_id": "<uuid>",
  "pipeline_name": "<P>",
  "scope_root": "<absolute path>",
  "run_id": "<uuid>",
  "started_at": "<iso8601>",
  "pattern": "1 | 2 | 2b | 3 | 4 | 5",
  "status": "running | completed | escalated | failed",
  "current_phase": <index>,
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
</schema>

## Atomic Write Protocol

<protocol>
To prevent JSON corruption during concurrent operations or crashes, always use the following atomic write pattern:
1. Write the new state content to `pipeline-state.json.tmp`.
2. Move (rename) the temporary file to `pipeline-state.json`.

**Bash Implementation:**
```bash
TEMP_DIR="${SCOPE_ROOT}/superpipelines/temp/${PIPELINE_NAME}/${RUN_ID}"
mkdir -p "$TEMP_DIR"
echo "$NEW_STATE_JSON" > "${TEMP_DIR}/pipeline-state.json.tmp"
mv "${TEMP_DIR}/pipeline-state.json.tmp" "${TEMP_DIR}/pipeline-state.json"
```
</protocol>

## Recovery & Resumption Rules

<recovery_rules>
| State Found | Required Action |
| :--- | :--- |
| **`status: running`** (<1h old) | Active run detected; refuse to start a new instance. |
| **`status: running`** (>1h old) | Treat as crashed. Prompt user to resume, restart, or abort. |
| **`status: completed`** | Terminal state reached. Skip or archive. |
| **`status: escalated/failed`** | Stop execution. Surface to human for manual intervention. |
| **Parse Error** | Corruption detected. Escalate to human; do NOT auto-resume. |
</recovery_rules>

<invariants>
- **No Model Coupling**: Never use the model's native memory tool for pipeline state management; use structured JSON.
- **Atomic Renaming**: Direct writes to `pipeline-state.json` are forbidden.
- **Explicit Resumption**: NEVER auto-resume from an `escalated` or `failed` state without explicit user confirmation.
</invariants>

## Reference Files

- `sk-pipeline-paths/SKILL.md` — Scope root resolution.
- `sk-pipeline-patterns/SKILL.md` — Execution pattern definitions.
- `running-a-pipeline/SKILL.md` — Primary orchestrator workflow.
