# Plan: parity-test-f

## Tech stack

- Platform: Codex CLI (Tier 1d)
- Dispatch mechanism: model_driven (host orchestrates TOML subagents)
- Agent format: TOML (`.toml`) — NOT YAML frontmatter `.md` files
- Skill format: Superpipelines v2.0.0 SKILL.md protocol
- State format: `pipeline-state.json` (structured JSON per `STATE_MANAGEMENT: STRUCTURED_JSON`)
- Output format: Markdown

## Architecture

```
User
  │
  ▼
run-parity-test-f (entry skill, model_driven dispatch)
  │
  │  Sequential — Pattern 1
  │
  ├──► analyzer agent  (analyzer.toml)
  │      Reads the pull request diff file
  │      Identifies issues (null checks, error handling, naming)
  │      Writes findings JSON to pipeline temp directory
  │      Emits: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
  │
  ├──► reviewer agent  (reviewer.toml)  [READ-ONLY — sandbox_mode = "read-only"]
  │      Reads findings JSON from temp directory
  │      Validates completeness and correctness of findings
  │      Writes verdict JSON to pipeline temp directory
  │      Emits: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
  │
  └──► reporter agent  (reporter.toml)
         Reads findings JSON + verdict JSON from temp directory
         Renders final markdown code review report
         Writes output/parity-test-f-review-report.md
         Emits: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
```

## API contracts

### Analyzer output (written to pipeline-state.json phases[0].outputs)

```json
{
  "findings_path": "{ROOT}/superpipelines/temp/parity-test-f/{runId}/findings.json",
  "issue_count": 5,
  "null_check_count": 2,
  "error_handling_count": 2,
  "naming_count": 1
}
```

### findings.json schema

```json
{
  "diff_path": "{path-to-diff-file}",
  "issue_count": 5,
  "issues": [
    {
      "category": "null_check",
      "severity": "high",
      "location": "src/auth.js:42",
      "description": "Return value of getUserById() not checked for null before property access."
    },
    {
      "category": "error_handling",
      "severity": "medium",
      "location": "src/api.js:88",
      "description": "Promise rejection not caught; unhandled rejection may crash the process."
    },
    {
      "category": "naming",
      "severity": "low",
      "location": "src/utils.js:15",
      "description": "Variable `d` is not descriptive; rename to reflect its domain meaning."
    }
  ]
}
```

### Reviewer output (written to pipeline-state.json phases[1].outputs)

```json
{
  "verdict_path": "{ROOT}/superpipelines/temp/parity-test-f/{runId}/verdict.json",
  "verdict": "approved_with_concerns",
  "missing_categories": [],
  "completeness_score": 0.92
}
```

### verdict.json schema

```json
{
  "findings_path": "{path-to-findings-file}",
  "verdict": "approved | approved_with_concerns | rejected",
  "completeness_score": 0.92,
  "missing_categories": [],
  "reviewer_notes": "Findings are complete and actionable. One medium issue may warrant higher severity."
}
```

### Reporter output (written to pipeline-state.json phases[2].outputs)

```json
{
  "report_path": "{ROOT}/output/parity-test-f-review-report.md",
  "issue_count": 5,
  "verdict": "approved_with_concerns"
}
```

## Dependency matrix

| Component | Depends on | Owned by |
|---|---|---|
| `run-parity-test-f` (entry skill) | Platform dispatch | Orchestrator (host) |
| `analyzer` agent | `run-parity-test-f` dispatch | Codex model_driven |
| `reviewer` agent | `analyzer` findings in temp | Codex model_driven |
| `reporter` agent | `analyzer` findings + `reviewer` verdict in temp | Codex model_driven |
| `output/parity-test-f-review-report.md` | `reporter` agent | reporter |

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Diff file not found | medium | analyzer emits `NEEDS_CONTEXT` with clear path advisory |
| Diff file contains no changed lines | low | analyzer emits `DONE_WITH_CONCERNS` with zero-issue output |
| findings.json malformed | low | reviewer validates JSON before processing; emits `BLOCKED` if invalid |
| verdict.json malformed | low | reporter validates JSON before rendering; emits `BLOCKED` if invalid |
| reviewer writes files (sandbox violation) | prevented | `sandbox_mode = "read-only"` in `reviewer.toml` enforced by Codex host |

## Rollout plan

- Phase 1: Manual scaffold verification (this pipeline).
- Phase 2: Manual execution on Codex CLI to verify model_driven dispatch, TOML agent loading, and reviewer read-only enforcement.
- Rollback procedure: Delete `output/parity-test-f-review-report.md` and `superpipelines/temp/parity-test-f/`.

## Explicit design decisions

- **Pattern 1 (Sequential)**: Chosen because Tier 1d has `worktrees: false`, which excludes Patterns 2, 3, and 5. Pattern 1 is the correct tier-safe choice for Codex.
- **TOML agent files**: Required by Tier 1d (`model_field_format: toml_split`). Agents are `.toml` files — NOT YAML frontmatter `.md` files.
- **Per-step model in TOML**: Tier 1d supports per-step model assignment. `model` and `model_reasoning_effort` are set directly in each agent TOML.
- **Reviewer model elevation**: The reviewer uses `model = "gpt-5.5"` (deep tier) and `model_reasoning_effort = "high"` — the best available model — to maximise correctness validation quality.
- **sandbox_mode reviewer isolation**: `reviewer.toml` uses `sandbox_mode = "read-only"` (structural isolation per `reviewer_isolation_recipe` for Tier 1d). `analyzer.toml` and `reporter.toml` use `sandbox_mode = "workspace-write"`.
- **Findings and verdict written to temp files**: Avoids context-bloating the reporter spawn prompt (anti-pattern #3 — Context Dumping). The reporter receives file paths, not content.
- **No `model_intent_scaffold_tier`**: Not needed on Tier 1d (`dynamic_subagents: false` — per-step model works natively). Per-step model is written directly in each agent TOML.
