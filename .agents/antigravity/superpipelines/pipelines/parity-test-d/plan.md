# Plan: parity-test-d

## Tech stack

- Platform: Antigravity CLI (Tier 1c)
- Dispatch mechanism: model_driven (host orchestrates subagents)
- Skill format: Superpipelines v2.0.0 SKILL.md protocol
- State format: `pipeline-state.json` (structured JSON per `STATE_MANAGEMENT: STRUCTURED_JSON`)
- Output format: Markdown

## Architecture

```
User
  │
  ▼
run-parity-test-d (entry skill, model_driven dispatch)
  │
  │  Sequential — Pattern 1
  │
  ├──► scanner agent
  │      Reads source files in the target directory
  │      Extracts per-file metrics: complexity, missing docstrings, long functions
  │      Writes metrics to pipeline-state.json + metrics temp file
  │      Emits: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
  │
  └──► reporter agent  (receives metrics path from state)
         Reads scanner metrics
         Renders structured markdown health report
         Writes output/parity-test-d-health-report.md
         Emits: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
```

## API contracts

### Scanner output (written to pipeline-state.json phases[0].outputs)

```json
{
  "metrics_path": "{ROOT}/superpipelines/temp/parity-test-d/{runId}/scanner-metrics.json",
  "file_count": 12,
  "flagged_count": 4
}
```

### scanner-metrics.json schema

```json
{
  "scanned_directory": "{path-to-source-directory}",
  "file_count": 12,
  "high_complexity": [
    {"file": "src/foo.py", "complexity_score": 18, "reason": "Deeply nested conditionals"}
  ],
  "missing_docstrings": [
    {"file": "src/bar.py", "locations": ["class Baz", "def qux"]}
  ],
  "long_functions": [
    {"file": "src/baz.py", "function": "process_all", "line_count": 95}
  ]
}
```

### Reporter output (written to pipeline-state.json phases[1].outputs)

```json
{
  "report_path": "{ROOT}/output/parity-test-d-health-report.md",
  "flagged_file_count": 4
}
```

## Dependency matrix

| Component | Depends on | Owned by |
|---|---|---|
| `run-parity-test-d` (entry skill) | Platform dispatch | Orchestrator (host) |
| `scanner` agent | `run-parity-test-d` dispatch | Antigravity model_driven |
| `reporter` agent | `scanner` metrics in state | Antigravity model_driven |
| `output/parity-test-d-health-report.md` | `reporter` agent | reporter |

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Source directory not found | medium | scanner emits `NEEDS_CONTEXT` with clear path advisory |
| scanner-metrics.json malformed | low | reporter validates JSON before rendering; emits `BLOCKED` with diff if invalid |
| Host model selection produces degraded output | low | Tier 1c degradation_warning surfaced at run start; results are best-effort |

## Rollout plan

- Phase 1: Manual scaffold verification (this pipeline).
- Phase 2: Manual execution on Antigravity CLI to verify model_driven dispatch.
- Rollback procedure: Delete `output/parity-test-d-health-report.md` and `superpipelines/temp/parity-test-d/`.

## Explicit design decisions

- **Pattern 1 (Sequential)**: Chosen because Tier 1c has `worktrees: false`, which excludes Patterns 2, 3, and 5. Pattern 1 is the correct tier-safe choice.
- **model_tier: inherit on all step agents**: Required by Tier 1c (`model_field_format: omit`). The host orchestrator owns model assignment.
- **model_intent_scaffold_tier: fast for all steps**: Records the author's per-step intent for cross-tier portability. The user specified `fast` as the orchestrator tier; per Tier 1c Q6 rule, the same intent tier is applied to all steps. On a per-step-capable tier (1, 1b, 1d), these steps would run at `fast`.
- **Metrics written to state + temp file**: Avoids context-bloating the reporter spawn prompt (anti-pattern #3 — Context Dumping). The reporter receives a file path, not content.
