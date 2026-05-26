---
name: run-parity-test-e
description: Use when the user wants to run the parity-test-e pipeline on Tier 1d (Codex CLI) to extract changelog entries and produce a release summary.
disable-model-invocation: true
user-invocable: true
plugin_version: "2.0.0"
---

# run-parity-test-e — Entry Skill

> Entry point for the `parity-test-e` pipeline. Orchestrates the sequential dispatch of `extractor` and `formatter` agents on Tier 1d (Codex CLI) via model_driven dispatch.

<overview>
This skill initializes the pipeline run, resolves the scope root and run ID, dispatches the extractor and formatter agents in sequence via the model_driven path of `sk-platform-dispatch`, and applies the cleanup contract (C20) on completion.
</overview>

## Platform Context

- **Tier**: `tier_1d` (Codex CLI)
- **Dispatch mechanism**: `model_driven` — the host orchestrator drives subagent sequencing; no `Task()` primitive available.
- **model_field_format**: `toml_split` — agents declare `model` and `model_reasoning_effort` in their TOML files; the entry skill does NOT stamp model fields into dispatch prompts.
- **Degradation warnings**: None for Tier 1d.

## Workflow

<protocol>

### PHASE 0: PREFLIGHT

1. Resolve `{ROOT}` via `sk-pipeline-paths` (scope root resolved from the active tier profile at runtime — never hardcode `.agents/codex/` or any platform path).
2. Resolve `{runId}` = ISO-8601 compact timestamp (e.g., `20260526T143000Z`).
3. Create temp directory: `{ROOT}/superpipelines/temp/parity-test-e/{runId}/`.
4. Create `output/` directory if absent: `{ROOT}/output/`.
5. Initialize `pipeline-state.json` at `{ROOT}/superpipelines/temp/parity-test-e/{runId}/pipeline-state.json`:

```json
{
  "pipeline_id": "parity-test-e",
  "run_id": "{runId}",
  "started_at": "{iso8601}",
  "plugin_version": "2.0.0",
  "pattern": "1",
  "status": "running",
  "current_phase": 0,
  "metadata": {
    "source_tier": "tier_1d",
    "runtime_tier": "tier_1d",
    "model_field_format": "toml_split",
    "resolved_models": {
      "extractor": "gpt-5.4-mini",
      "formatter": "gpt-5.4-mini"
    }
  },
  "phases": [
    {
      "index": 0,
      "step_id": "extractor",
      "name": "extract",
      "status": "pending",
      "agent": "agents/superpipelines/parity-test-e/extractor.toml",
      "outputs": [],
      "error": null
    },
    {
      "index": 1,
      "step_id": "formatter",
      "name": "format",
      "status": "pending",
      "agent": "agents/superpipelines/parity-test-e/formatter.toml",
      "outputs": [],
      "error": null
    }
  ]
}
```

6. If the user has not supplied the path to the changelog file, ask for it now. Record as `{CHANGELOG_PATH}`.

### PHASE 1: DISPATCH EXTRACTOR (model_driven)

DISPATCH via model_driven orchestration:

```
Agent: extractor  (extractor.toml)
Protocol: {ROOT}/skills/superpipelines/parity-test-e/extractor-protocol/SKILL.md
Context to pass:
  - changelog_path: {CHANGELOG_PATH}
  - entries_output_path: {ROOT}/superpipelines/temp/parity-test-e/{runId}/changelog-entries.json
  - state_path: {ROOT}/superpipelines/temp/parity-test-e/{runId}/pipeline-state.json
  - run_id: {runId}
  - root: {ROOT}
```

Wait for terminal status from extractor:
- `DONE` → update `pipeline-state.json` phases[0].status = "completed"; advance to Phase 2.
- `DONE_WITH_CONCERNS` → update phases[0].status = "completed_with_concerns"; surface concerns to user; advance to Phase 2.
- `NEEDS_CONTEXT` → update phases[0].status = "blocked"; update top-level status = "blocked"; surface message to user; GO TO CLEANUP (preserve).
- `BLOCKED` → update phases[0].status = "blocked"; update top-level status = "blocked"; surface message to user; GO TO CLEANUP (preserve).

### PHASE 2: DISPATCH FORMATTER (model_driven)

DISPATCH via model_driven orchestration:

```
Agent: formatter  (formatter.toml)
Protocol: {ROOT}/skills/superpipelines/parity-test-e/formatter-protocol/SKILL.md
Context to pass:
  - entries_path: {ROOT}/superpipelines/temp/parity-test-e/{runId}/changelog-entries.json
  - output_path: {ROOT}/output/parity-test-e-release-summary.md
  - state_path: {ROOT}/superpipelines/temp/parity-test-e/{runId}/pipeline-state.json
  - run_id: {runId}
  - root: {ROOT}
```

Wait for terminal status from formatter:
- `DONE` → update phases[1].status = "completed"; advance to Phase 3.
- `DONE_WITH_CONCERNS` → update phases[1].status = "completed_with_concerns"; surface concerns to user; advance to Phase 3.
- `NEEDS_CONTEXT` → update phases[1].status = "blocked"; update top-level status = "blocked"; surface message to user; GO TO CLEANUP (preserve).
- `BLOCKED` → update phases[1].status = "blocked"; update top-level status = "blocked"; surface message to user; GO TO CLEANUP (preserve).

### PHASE 3: FINALIZE

1. Update `pipeline-state.json`:
   - `status`: `"completed"` (or `"completed_with_concerns"` if any phase had concerns)
   - `completed_at`: ISO-8601 timestamp
2. **Cleanup contract (C20)**:
   - On `DONE` or `DONE_WITH_CONCERNS`: write `status: completed` to `pipeline-state.json`, then delete the temp directory `{ROOT}/superpipelines/temp/parity-test-e/{runId}/`.
   - On `BLOCKED` or `NEEDS_CONTEXT`: preserve the temp directory (do NOT delete); it holds resume state for diagnosis.
3. Confirm to the user:
   > Pipeline `parity-test-e` completed. Release summary written to: `{ROOT}/output/parity-test-e-release-summary.md`
4. Emit terminal status: `DONE` (or `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT` as applicable).

</protocol>

<invariants>
- NEVER use `Task()` — Tier 1d has `task_primitive: false`. All dispatch is model_driven.
- NEVER hardcode platform paths (`.agents/codex/`, `.claude/`, etc.) — always use `{ROOT}` resolved via `sk-pipeline-paths`.
- NEVER pass file contents in dispatch prompts — pass file paths only (anti-pattern #3 Context Dumping).
- ALWAYS update `pipeline-state.json` after each phase completes.
- NEVER advance past a `BLOCKED` or `NEEDS_CONTEXT` status without human input.
- ALWAYS apply the C20 cleanup contract: delete temp dir on DONE, preserve on BLOCKED/NEEDS_CONTEXT.
- Emit exactly one terminal status at the end of this skill's own execution: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
</invariants>
