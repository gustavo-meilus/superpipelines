---
name: run-parity-test-e
description: >
  Entry orchestration body for the parity-test-e data-only pipeline (Pattern 1, Sequential).
  Reads a changelog markdown file and produces a concise release summary of breaking changes
  and new features. Data-only: discovered and run by running-a-pipeline; not a registered skill.
user-invocable: true
disable-model-invocation: true
plugin_version: "2.3.1"
---

# run-parity-test-e — Entry Orchestration (data-only)

<overview>
Sequential (Pattern 1) pipeline on the unified `.superpipelines/` data root. Every step is
dispatched through `sk-platform-dispatch` DISPATCH passing `agent_def`; the canonical agent def
is materialized into the active host's native dialect at run time (Option A). All paths resolve
against `RESOLVE_DATA_ROOT(scope)` — never a literal tool-dir name.
</overview>

## Phase 0 — Resolve

1. `Skill("sk-pipeline-paths")` → `DATA_ROOT = RESOLVE_DATA_ROOT(scope="local")`.
2. Initialize `pipeline-state.json` under `DATA_ROOT/temp/parity-test-e/{runId}/` (UTF-8, no BOM).
3. `Skill("sk-platform-dispatch")` → detect tier, load `platform_profile`, resolve per-step models.
   Surface every `platform_profile.degradation_warnings` entry to the user.

## Phase 1 — Dispatch: extractor

```
result = DISPATCH(
  step={
    id: "extractor",
    agent: "extractor",
    agent_def: "pipelines/parity-test-e/agents/extractor.md",
    output_paths: ["temp/parity-test-e/{runId}/changelog-entries.json"]
  },
  inputs={ changelog_path: <user-supplied>, state_path: <state> }
)
if result.status != "DONE" and result.status != "DONE_WITH_CONCERNS": handle per status protocol
```

## Phase 2 — Dispatch: formatter (depends_on: extractor)

```
result = DISPATCH(
  step={
    id: "formatter",
    agent: "formatter",
    agent_def: "pipelines/parity-test-e/agents/formatter.md",
    output_paths: ["output/parity-test-e-release-summary.md"]
  },
  inputs={ entries_path: "temp/parity-test-e/{runId}/changelog-entries.json", state_path: <state> }
)
if result.status != "DONE" and result.status != "DONE_WITH_CONCERNS": handle per status protocol
```

## Phase 5 — Cleanup contract

- On DONE: write `status: "completed"` to `DATA_ROOT/temp/parity-test-e/{runId}/pipeline-state.json`
  (UTF-8, no BOM); delete `DATA_ROOT/temp/parity-test-e/{runId}/`; call
  `CLEANUP_MATERIALIZED("parity-test-e", scope)` to remove the ephemeral materialized-agent cache.
- On BLOCKED / FAILED / ESCALATED: preserve the temp dir and log path; surface the blocker.
