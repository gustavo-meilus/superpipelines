---
name: run-parity-test-j
description: Use when the user wants to run the parity-test-j pipeline on Tier 1b (OpenCode) to read a CSV file and produce a markdown data quality document listing columns with nulls, outliers, and type inconsistencies.
disable-model-invocation: true
user-invocable: true
plugin_version: "2.0.0"
---

# run-parity-test-j — Entry Skill

> Entry point for the `parity-test-j` pipeline. Orchestrates the sequential native-subagent dispatch of the `analyzer`, `reviewer`, and `reporter` agents on Tier 1b (OpenCode v1.15.10). Each step runs as a distinct subagent process — no inline execution, no Task() calls.

<overview>
This skill initializes the pipeline run, resolves the scope root and run ID, surfaces the required Tier 1b degradation warning, dispatches the analyzer subagent, dispatches the reviewer subagent (structural isolation: plan + disallowedTools), dispatches the reporter subagent (only on approved verdict), and applies the cleanup contract (C20) on completion. Model is declared per-agent in frontmatter (opencode/big-pickle); the entry skill itself uses disable-model-invocation: true.
</overview>

## Platform Context

- **Tier**: `tier_1b` (OpenCode v1.15.10)
- **Dispatch mechanism**: `native_subagent` — `DISPATCH(mode="subagent", agent="{name}", context={...})`. NOT Task(). NOT inline.
- **model_field_format**: `provider_prefixed` — `model: opencode/big-pickle` declared in each agent's YAML frontmatter.
- **Reviewer isolation**: `structural` — reviewer runs with `permissionMode: plan` + `disallowedTools: Write, Edit, Bash`.
- **Degradation warnings**: 1 active (see PHASE 0 below).

## DEGRADATION WARNINGS (Tier 1b — Active)

The following warning from the `tier_1b` platform profile MUST be surfaced before execution:

1. Parallel fan-out (Pattern 2) degrades to sequential on OpenCode.

## Workflow

<protocol>

### PHASE 0: PREFLIGHT — DEGRADATION WARNING AND INITIALIZATION

**Step 0.1 — Surface Tier 1b degradation warning (MANDATORY before any execution):**

Surface the following warning to the user verbatim before any other action:

> **[Tier 1b Degradation Warning 1 of 1]** Parallel fan-out (Pattern 2) degrades to sequential on OpenCode.

**Step 0.2 — Resolve runtime context:**

1. Resolve `{ROOT}` via `sk-pipeline-paths` (scope root resolved from the active tier profile at runtime — NEVER hardcode `.opencode/`, `.superpipelines/`, `.claude/`, or any platform path).
2. Resolve `{runId}` = ISO-8601 compact timestamp (e.g., `20260526T143000Z`).
3. Create temp directory: `{ROOT}/superpipelines/temp/parity-test-j/{runId}/`.
4. Create `output/` directory if absent: `{ROOT}/output/`.

**Step 0.3 — Collect inputs:**

If the user has not supplied the path to the input CSV file, ask for it now. Record as `{INPUT_PATH}`.

**Step 0.4 — Initialize pipeline-state.json:**

Write `pipeline-state.json` to `{ROOT}/superpipelines/temp/parity-test-j/{runId}/pipeline-state.json`:

```json
{
  "pipeline_id": "parity-test-j",
  "run_id": "{runId}",
  "started_at": "{iso8601}",
  "plugin_version": "2.0.0",
  "pattern": "1",
  "status": "running",
  "current_phase": 0,
  "metadata": {
    "source_tier": "tier_1b",
    "runtime_tier": "tier_1b",
    "model_field_format": "provider_prefixed",
    "resolved_models": {
      "analyzer": "opencode/big-pickle",
      "reviewer": "opencode/big-pickle",
      "reporter": "opencode/big-pickle"
    }
  },
  "phases": [
    {
      "index": 0,
      "step_id": "analyzer",
      "name": "analyze",
      "status": "pending",
      "agent": "agents/superpipelines/parity-test-j/analyzer.md",
      "outputs": [],
      "error": null
    },
    {
      "index": 1,
      "step_id": "reviewer",
      "name": "review",
      "status": "pending",
      "agent": "agents/superpipelines/parity-test-j/reviewer.md",
      "reviewer_isolation": "structural",
      "outputs": [],
      "error": null
    },
    {
      "index": 2,
      "step_id": "reporter",
      "name": "render",
      "status": "pending",
      "agent": "agents/superpipelines/parity-test-j/reporter.md",
      "outputs": [],
      "error": null
    }
  ]
}
```

### PHASE 1: DISPATCH ANALYZER (native subagent)

Dispatch the analyzer as a native subagent:

```
DISPATCH(
  mode="subagent",
  agent="analyzer",
  context={
    "input_path": "{INPUT_PATH}",
    "findings_output_path": "{ROOT}/superpipelines/temp/parity-test-j/{runId}/findings.json",
    "state_path": "{ROOT}/superpipelines/temp/parity-test-j/{runId}/pipeline-state.json",
    "run_id": "{runId}",
    "root": "{ROOT}"
  }
)
```

Wait for terminal status from the analyzer subagent:
- `DONE` → update `pipeline-state.json` phases[0].status = "completed"; advance to Phase 2.
- `DONE_WITH_CONCERNS` → update phases[0].status = "completed_with_concerns"; surface concerns to user; advance to Phase 2.
- `NEEDS_CONTEXT` → update phases[0].status = "blocked"; update top-level status = "blocked"; surface message to user; GO TO CLEANUP (preserve).
- `BLOCKED` → update phases[0].status = "blocked"; update top-level status = "blocked"; surface message to user; GO TO CLEANUP (preserve).

### PHASE 2: DISPATCH REVIEWER (native subagent — structural isolation)

Dispatch the reviewer as a native subagent. The reviewer has `permissionMode: plan` and `disallowedTools: Write, Edit, Bash` — it cannot write files. Capture the REVIEWER VERDICT block from its terminal output text.

```
DISPATCH(
  mode="subagent",
  agent="reviewer",
  context={
    "findings_path": "{ROOT}/superpipelines/temp/parity-test-j/{runId}/findings.json",
    "state_path": "{ROOT}/superpipelines/temp/parity-test-j/{runId}/pipeline-state.json",
    "run_id": "{runId}",
    "root": "{ROOT}"
  }
)
```

After the reviewer subagent completes:
1. Extract the REVIEWER VERDICT block from the reviewer's terminal output text. Record as `{REVIEWER_OUTPUT}`.
2. Parse `verdict` from the block: `approved`, `approved_with_concerns`, or `rejected`.
3. Update `pipeline-state.json`:
   - `phases[1].outputs` → `[{ "verdict": "{verdict}", "reviewer_notes": "{REVIEWER_OUTPUT}" }]`

Wait for terminal status:
- `DONE` (verdict: approved) → update phases[1].status = "completed"; advance to Phase 3.
- `DONE_WITH_CONCERNS` (verdict: approved_with_concerns) → update phases[1].status = "completed_with_concerns"; surface concerns; advance to Phase 3.
- `BLOCKED` (verdict: rejected or validation failure) → update phases[1].status = "blocked"; update top-level status = "blocked"; surface rejection message; GO TO CLEANUP (preserve). DO NOT dispatch reporter.
- `NEEDS_CONTEXT` → update phases[1].status = "blocked"; update top-level status = "blocked"; GO TO CLEANUP (preserve).

### PHASE 3: DISPATCH REPORTER (native subagent)

Only dispatched if reviewer verdict is `approved` or `approved_with_concerns`.

```
DISPATCH(
  mode="subagent",
  agent="reporter",
  context={
    "findings_path": "{ROOT}/superpipelines/temp/parity-test-j/{runId}/findings.json",
    "reviewer_verdict": "{verdict}",
    "reviewer_notes": "{REVIEWER_OUTPUT}",
    "report_output_path": "{ROOT}/output/parity-test-j-report.md",
    "state_path": "{ROOT}/superpipelines/temp/parity-test-j/{runId}/pipeline-state.json",
    "run_id": "{runId}",
    "root": "{ROOT}"
  }
)
```

Wait for terminal status from the reporter subagent:
- `DONE` → update `pipeline-state.json` phases[2].status = "completed"; advance to Phase 4.
- `DONE_WITH_CONCERNS` → update phases[2].status = "completed_with_concerns"; surface concerns to user; advance to Phase 4.
- `NEEDS_CONTEXT` → update phases[2].status = "blocked"; update top-level status = "blocked"; GO TO CLEANUP (preserve).
- `BLOCKED` → update phases[2].status = "blocked"; update top-level status = "blocked"; surface message; GO TO CLEANUP (preserve).

### PHASE 4: FINALIZE

1. Update `pipeline-state.json`:
   - `status`: `"completed"` (or `"completed_with_concerns"` if any phase had concerns)
   - `completed_at`: ISO-8601 timestamp

2. **Cleanup contract (C20)**:
   - On `DONE` or `DONE_WITH_CONCERNS`: write `status: completed` to `pipeline-state.json`, then delete the temp directory `{ROOT}/superpipelines/temp/parity-test-j/{runId}/`.
   - On `BLOCKED` or `NEEDS_CONTEXT`: preserve the temp directory (do NOT delete); it holds resume state for diagnosis.

3. Confirm to the user:
   > Pipeline `parity-test-j` completed. Data quality document written to: `{ROOT}/output/parity-test-j-report.md`

4. Emit terminal status: `DONE` (or `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT` as applicable).

</protocol>

<invariants>
- NEVER call `Task()` — Tier 1b has `task_primitive: false`. Use `DISPATCH(mode="subagent", ...)` exclusively.
- NEVER execute steps inline — each step MUST run as a distinct native subagent process.
- NEVER hardcode platform paths (`.opencode/`, `.superpipelines/`, `.claude/`, etc.) — always use `{ROOT}` resolved via `sk-pipeline-paths`.
- NEVER pass file contents in dispatch context — pass file paths only (anti-pattern #3 Context Dumping).
- NEVER dispatch the reporter if the reviewer verdict is `rejected` or the reviewer emits `BLOCKED`.
- ALWAYS surface the Tier 1b degradation warning before any execution begins (Phase 0.1 is mandatory).
- ALWAYS capture the REVIEWER VERDICT block from the reviewer's terminal output before advancing.
- ALWAYS update `pipeline-state.json` after each phase completes.
- NEVER advance past a `BLOCKED` or `NEEDS_CONTEXT` status without human input.
- ALWAYS apply the C20 cleanup contract: delete temp dir on DONE/DONE_WITH_CONCERNS, preserve on BLOCKED/NEEDS_CONTEXT.
- Emit exactly one terminal status at the end of this skill's own execution: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
</invariants>
