# Plan: parity-test-j

## Tech stack

- Platform: OpenCode v1.15.10 (Tier 1b)
- Dispatch mechanism: `native_subagent` — OC spawns each agent as a distinct subagent process via `DISPATCH(mode="subagent", ...)`
- Agent format: YAML frontmatter + protocol body ≤150 lines (`.md` files)
- Skill format: Superpipelines v2.0.0 SKILL.md protocol (entry skill only — no companion protocol skills on Tier 1b)
- State format: `pipeline-state.json` (structured JSON per `STATE_MANAGEMENT: STRUCTURED_JSON`)
- Output format: Markdown (.md)
- Model selection: `opencode/big-pickle` — declared in each agent's frontmatter (`model_field_format: provider_prefixed`)

## Architecture

```
User
  │
  ▼
run-parity-test-j (entry skill — SKILL.md, disable-model-invocation: true)
  │
  │  [Surface Tier 1b degradation warning before execution]
  │
  │  Sequential — Pattern 1 (native_subagent dispatch)
  │
  ├──► DISPATCH(mode="subagent", agent="analyzer", context={...})
  │      Reads the input CSV file
  │      Computes per-column quality metrics (nulls, outliers, type inconsistencies)
  │      Writes findings.json to temp directory
  │      Emits: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
  │
  ├──► DISPATCH(mode="subagent", agent="reviewer", context={...})
  │      Reads findings.json from temp directory
  │      Validates completeness and correctness of findings (structural review, read-only)
  │      Writes verdict.json to temp directory
  │      CANNOT write to output/ or run shell commands (plan + disallowedTools)
  │      Emits: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
  │
  └──► DISPATCH(mode="subagent", agent="reporter", context={...})
         Reads findings.json + verdict.json from temp directory
         Renders final markdown data quality report
         Writes parity-test-j-report.md to output/
         Emits: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
```

**Key Tier 1b constraints:**
- Each step dispatched as a native subagent via `DISPATCH(mode="subagent", agent="{name}", context={...})`.
- NOT `Task()` — Tier 1b uses `task_primitive: false`.
- Sequential only — `parallel_subagents: false` on Tier 1b.
- The protocol lives in the agent body (≤150 lines). There are NO companion protocol skills.

**Reviewer isolation (structural):**
- `permissionMode: plan` — reviewer cannot execute write or edit operations.
- `disallowedTools: Write, Edit, Bash` — OC's permission system structurally prevents file writes and shell commands.
- The reviewer reads findings from `findings.json` and writes its verdict to `verdict.json` via its permitted context only. Wait — the reviewer is plan-mode and cannot write files. The verdict is written to state only; reporter reads the state for verdict information.

> **Clarification:** Because `permissionMode: plan` + `disallowedTools: Write, Edit, Bash` prevents the reviewer from writing any file, the reviewer's verdict is communicated via the pipeline-state.json phases[1].outputs record (written by the entry skill after the reviewer emits its terminal status and surfaces the verdict text in its output). The reporter reads `findings.json` and the state file — not a separate `verdict.json` on disk.

## API contracts

### Analyzer output (written to pipeline-state.json phases[0].outputs)

```json
{
  "findings_path": "{ROOT}/superpipelines/temp/parity-test-j/{runId}/findings.json",
  "total_columns": 5,
  "columns_with_issues": 3
}
```

### findings.json schema

```json
{
  "source_path": "{path-to-input-csv-file}",
  "total_rows": 1000,
  "total_columns": 5,
  "analyzed_at": "{iso8601}",
  "columns": [
    {
      "name": "age",
      "null_count": 12,
      "outlier_count": 3,
      "type_inconsistencies": [],
      "dominant_type": "integer"
    },
    {
      "name": "email",
      "null_count": 0,
      "outlier_count": 0,
      "type_inconsistencies": ["row 42: expected string, found integer"],
      "dominant_type": "string"
    }
  ]
}
```

`columns` is ordered by original CSV column order. `dominant_type` is one of: `string`, `integer`, `float`, `boolean`, `empty`. Outlier detection uses the IQR method for numeric columns only (non-numeric columns have `outlier_count: 0`).

### Reviewer verdict (surfaced in pipeline-state.json phases[1])

The reviewer emits a verdict as part of its terminal output text, captured in `phases[1].outputs`:

```json
{
  "verdict": "approved",
  "concerns": [],
  "completeness_check": "all columns present",
  "reviewer_notes": "Findings are complete and correctly structured."
}
```

`verdict` is one of: `approved`, `approved_with_concerns`, `rejected`.

### Reporter output (written to pipeline-state.json phases[2].outputs)

```json
{
  "report_path": "{ROOT}/output/parity-test-j-report.md",
  "total_columns": 5,
  "columns_with_issues": 3
}
```

### parity-test-j-report.md format

```markdown
# Data Quality Report — parity-test-j

**Source:** {path-to-input-csv-file}
**Generated:** {iso8601}
**Reviewer verdict:** {verdict}

---

## Summary

| Metric | Value |
|---|---|
| Total rows | {total_rows} |
| Total columns | {total_columns} |
| Columns with issues | {columns_with_issues} |

---

## Column Detail

### {column_name}

- **Dominant type:** {dominant_type}
- **Null count:** {null_count}
- **Outlier count:** {outlier_count}
- **Type inconsistencies:** {list or "none"}

...

---

*Generated by parity-test-j pipeline (Superpipelines v2.0.0, Tier 1b)*
```

## Dependency matrix

| Component | Depends on | Owned by |
|---|---|---|
| `run-parity-test-j` (entry skill) | OpenCode session | Entry skill (orchestrator) |
| `analyzer` subagent | entry skill dispatch | `analyzer` native subagent |
| `reviewer` subagent | analyzer `findings.json` | `reviewer` native subagent (read-only) |
| `reporter` subagent | findings + reviewer verdict in state | `reporter` native subagent |
| `output/parity-test-j-report.md` | reporter step | reporter agent |

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Input file not found | medium | analyzer emits `NEEDS_CONTEXT` with clear path advisory |
| Input file is not valid CSV | medium | analyzer emits `BLOCKED` with parse error detail |
| findings.json malformed | low | reviewer and reporter validate JSON before processing; emit `BLOCKED` if invalid |
| Reviewer rejects findings | low | entry skill surfaces rejection; halts at BLOCKED before reporter step |
| Sequential bottleneck | low | Pattern 1 is the only option on Tier 1b; documented non-goal |

## Rollout plan

- Phase 1: Manual scaffold verification (this pipeline).
- Phase 2: Manual execution on OpenCode v1.15.10 to verify native subagent dispatch, agent body protocol execution, and reviewer structural isolation.
- Rollback procedure: Delete `output/parity-test-j-report.md` and `superpipelines/temp/parity-test-j/`.

## Explicit design decisions

- **Pattern 1 (Sequential)**: The only tier-safe pattern for Tier 1b (`parallel_subagents: false`).
- **Agent bodies instead of protocol skills**: Tier 1b places the full protocol in the agent body (≤150 lines). No companion `{agent-name}-protocol/SKILL.md` files are created.
- **`model_field_format: provider_prefixed`**: Each agent declares `model: opencode/big-pickle` in its YAML frontmatter. This is the triage tier model (free, no paid subscription required).
- **No `reasoningEffort`**: The `reasoningEffort` field applies to `opencode` and `opencode-go` providers only. `opencode/big-pickle` is the triage tier; no effort field is emitted.
- **Native subagent dispatch**: `DISPATCH(mode="subagent", agent="{name}", context={...})` — not `Task()`. Tier 1b has `task_primitive: false`.
- **Reviewer structural isolation via plan + disallowedTools**: `permissionMode: plan` + `disallowedTools: Write, Edit, Bash` prevents the reviewer from writing files or running shell commands. Verdict is communicated via the reviewer's terminal output text, captured in pipeline-state.json by the entry skill.
- **Findings written to temp files**: Avoids context-bloating downstream steps (anti-pattern #3 — Context Dumping). Each step receives file paths, not contents.
- **Single degradation warning**: Only 1 warning from the tier_1b profile must be surfaced (`parallel_subagents: false` → Pattern 2 unavailable).
- **IQR-based outlier detection**: Simple, parameter-free method appropriate for a triage-tier model operating on arbitrary CSV data.
