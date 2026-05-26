---
name: run-parity-test-h
description: Use when the user wants to run the parity-test-h pipeline on Tier 2 (Cursor/Windsurf/Cline) to validate a YAML config file and produce a structured markdown validation report.
disable-model-invocation: true
user-invocable: true
plugin_version: "2.0.0"
---

# run-parity-test-h — Entry Skill

> Entry point for the `parity-test-h` pipeline. Orchestrates the sequential inline execution of the `validator`, `reviewer`, and `reporter` protocol steps on Tier 2 (Cursor/Windsurf/Cline). All steps execute in this skill's session — no subagents, no Task() calls.

<overview>
This skill initializes the pipeline run, resolves the scope root and run ID, surfaces all required Tier 2 degradation warnings, executes the validator, reviewer, and reporter protocol skills inline (same session, sequential), and applies the cleanup contract (C20) on completion. Model is inherit throughout — the host IDE owns model selection.
</overview>

## Platform Context

- **Tier**: `tier_2` (Cursor/Windsurf/Cline)
- **Dispatch mechanism**: `inline` — no `Task()` primitive, no subagent processes. All three steps execute within this skill's session.
- **model_field_format**: `omit` — no `model:` field is emitted for any step. The host IDE owns model selection.
- **Reviewer isolation**: `convention` — no structural isolation. C19 self-skepticism preamble required in the reviewer protocol.
- **Degradation warnings**: 3 active (see PHASE 0 below).

## Workflow

<protocol>

### PHASE 0: PREFLIGHT — DEGRADATION WARNINGS AND INITIALIZATION

**Step 0.1 — Surface Tier 2 degradation warnings (MANDATORY before any execution):**

Surface ALL of the following warnings to the user verbatim before any other action:

> **[Tier 2 Degradation Warning 1 of 3]** Reviewer isolation impossible on this platform: writer and reviewer are the same agent in the same context. Review steps execute the reviewer protocol but cannot provide assumption-blindness defense or context-bleed isolation. Treat review output as a self-check, not verification.

> **[Tier 2 Degradation Warning 2 of 3]** Parallel fan-out (Pattern 2) requires worktrees and is unavailable on this platform (worktrees: false).

> **[Tier 2 Degradation Warning 3 of 3]** Model selection is owned by the host IDE; per-step model assignment is not emitted.

**Step 0.2 — Resolve runtime context:**

1. Resolve `{ROOT}` via `sk-pipeline-paths` (scope root resolved from the active tier profile at runtime — NEVER hardcode `.superpipelines/`, `.cursor/`, `.claude/`, or any platform path).
2. Resolve `{runId}` = ISO-8601 compact timestamp (e.g., `20260526T143000Z`).
3. Create temp directory: `{ROOT}/superpipelines/temp/parity-test-h/{runId}/`.
4. Create `output/` directory if absent: `{ROOT}/output/`.

**Step 0.3 — Collect inputs:**

If the user has not supplied the path to the input YAML config file, ask for it now. Record as `{INPUT_PATH}`.

**Step 0.4 — Initialize pipeline-state.json:**

Write `pipeline-state.json` to `{ROOT}/superpipelines/temp/parity-test-h/{runId}/pipeline-state.json`:

```json
{
  "pipeline_id": "parity-test-h",
  "run_id": "{runId}",
  "started_at": "{iso8601}",
  "plugin_version": "2.0.0",
  "pattern": "1",
  "status": "running",
  "current_phase": 0,
  "metadata": {
    "source_tier": "tier_2",
    "runtime_tier": "tier_2",
    "model_field_format": "omit",
    "resolved_models": {}
  },
  "phases": [
    {
      "index": 0,
      "step_id": "validator",
      "name": "validate",
      "status": "pending",
      "agent": null,
      "outputs": [],
      "error": null
    },
    {
      "index": 1,
      "step_id": "reviewer",
      "name": "review",
      "status": "pending",
      "agent": null,
      "outputs": [],
      "error": null
    },
    {
      "index": 2,
      "step_id": "reporter",
      "name": "report",
      "status": "pending",
      "agent": null,
      "outputs": [],
      "error": null
    }
  ]
}
```

Note: `agent` is `null` in all phases — Tier 2 has no agent files.

### PHASE 1: EXECUTE VALIDATOR (inline)

Load protocol skill into context:

```
Protocol: {ROOT}/skills/superpipelines/parity-test-h/validator-protocol/SKILL.md
```

Execute the validator protocol inline (same session) with the following context:

```
input_path: {INPUT_PATH}
findings_output_path: {ROOT}/superpipelines/temp/parity-test-h/{runId}/validator-findings.json
state_path: {ROOT}/superpipelines/temp/parity-test-h/{runId}/pipeline-state.json
run_id: {runId}
root: {ROOT}
```

Wait for terminal status from the validator protocol:
- `DONE` → update `pipeline-state.json` phases[0].status = "completed"; advance to Phase 2.
- `DONE_WITH_CONCERNS` → update phases[0].status = "completed_with_concerns"; surface concerns to user; advance to Phase 2.
- `NEEDS_CONTEXT` → update phases[0].status = "blocked"; update top-level status = "blocked"; surface message to user; GO TO CLEANUP (preserve).
- `BLOCKED` → update phases[0].status = "blocked"; update top-level status = "blocked"; surface message to user; GO TO CLEANUP (preserve).

### PHASE 2: EXECUTE REVIEWER (inline)

Load protocol skill into context:

```
Protocol: {ROOT}/skills/superpipelines/parity-test-h/reviewer-protocol/SKILL.md
```

Execute the reviewer protocol inline (same session) with the following context:

```
input_path: {INPUT_PATH}
findings_path: {ROOT}/superpipelines/temp/parity-test-h/{runId}/validator-findings.json
reviewed_findings_output_path: {ROOT}/superpipelines/temp/parity-test-h/{runId}/reviewed-findings.json
state_path: {ROOT}/superpipelines/temp/parity-test-h/{runId}/pipeline-state.json
run_id: {runId}
root: {ROOT}
```

Note: `input_path` is passed to the reviewer so it can independently re-read the source YAML per the C19 assumption-blindness requirement. The reviewer MUST re-derive findings from the raw YAML, not from the validator's summary.

Wait for terminal status from the reviewer protocol:
- `DONE` → update `pipeline-state.json` phases[1].status = "completed"; advance to Phase 3.
- `DONE_WITH_CONCERNS` → update phases[1].status = "completed_with_concerns"; surface concerns to user; advance to Phase 3.
- `NEEDS_CONTEXT` → update phases[1].status = "blocked"; update top-level status = "blocked"; surface message to user; GO TO CLEANUP (preserve).
- `BLOCKED` → update phases[1].status = "blocked"; update top-level status = "blocked"; surface message to user; GO TO CLEANUP (preserve).

### PHASE 3: EXECUTE REPORTER (inline)

Load protocol skill into context:

```
Protocol: {ROOT}/skills/superpipelines/parity-test-h/reporter-protocol/SKILL.md
```

Execute the reporter protocol inline (same session) with the following context:

```
reviewed_findings_path: {ROOT}/superpipelines/temp/parity-test-h/{runId}/reviewed-findings.json
output_path: {ROOT}/output/parity-test-h-validation-report.md
state_path: {ROOT}/superpipelines/temp/parity-test-h/{runId}/pipeline-state.json
run_id: {runId}
root: {ROOT}
```

Wait for terminal status from the reporter protocol:
- `DONE` → update phases[2].status = "completed"; advance to Phase 4.
- `DONE_WITH_CONCERNS` → update phases[2].status = "completed_with_concerns"; surface concerns to user; advance to Phase 4.
- `NEEDS_CONTEXT` → update phases[2].status = "blocked"; update top-level status = "blocked"; surface message to user; GO TO CLEANUP (preserve).
- `BLOCKED` → update phases[2].status = "blocked"; update top-level status = "blocked"; surface message to user; GO TO CLEANUP (preserve).

### PHASE 4: FINALIZE

1. Update `pipeline-state.json`:
   - `status`: `"completed"` (or `"completed_with_concerns"` if any phase had concerns)
   - `completed_at`: ISO-8601 timestamp

2. **Cleanup contract (C20)**:
   - On `DONE` or `DONE_WITH_CONCERNS`: write `status: completed` to `pipeline-state.json`, then delete the temp directory `{ROOT}/superpipelines/temp/parity-test-h/{runId}/`.
   - On `BLOCKED` or `NEEDS_CONTEXT`: preserve the temp directory (do NOT delete); it holds resume state for diagnosis.

3. Confirm to the user:
   > Pipeline `parity-test-h` completed. Validation report written to: `{ROOT}/output/parity-test-h-validation-report.md`

4. Emit terminal status: `DONE` (or `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT` as applicable).

</protocol>

<invariants>
- NEVER call `Task()` — Tier 2 has `task_primitive: false` and `subagents: false`. All execution is inline.
- NEVER emit a `model:` field for any step — `model_field_format: omit`; host IDE owns model selection.
- NEVER hardcode platform paths (`.superpipelines/`, `.cursor/`, `.claude/`, etc.) — always use `{ROOT}` resolved via `sk-pipeline-paths`.
- NEVER pass file contents in execution context — pass file paths only (anti-pattern #3 Context Dumping).
- ALWAYS surface all 3 Tier 2 degradation warnings before any execution begins (Phase 0.1 is mandatory).
- ALWAYS pass `input_path` to the reviewer so it can independently re-read the source YAML (C19 assumption-blindness).
- ALWAYS update `pipeline-state.json` after each phase completes.
- NEVER advance past a `BLOCKED` or `NEEDS_CONTEXT` status without human input.
- ALWAYS apply the C20 cleanup contract: delete temp dir on DONE/DONE_WITH_CONCERNS, preserve on BLOCKED/NEEDS_CONTEXT.
- Emit exactly one terminal status at the end of this skill's own execution: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
</invariants>
