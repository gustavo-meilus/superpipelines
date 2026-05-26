---
name: reporter-protocol
description: Loaded by the reporter agent of parity-test-b to supply its operating protocol. Not user-invocable.
disable-model-invocation: true
user-invocable: false
---

# Reporter — Protocol

> Step 3 of 3 in the `parity-test-b` pipeline. Reads `findings.json` and the reviewer verdict from dispatch context, renders the final markdown data quality report, writes `parity-test-b-report.md` to `output/`.

## Inputs (from dispatch context)

- `findings_path` — absolute path to `findings.json`.
- `reviewer_verdict` — verdict string from reviewer: `approved` or `approved_with_concerns`.
- `reviewer_notes` — full REVIEWER VERDICT block text from the reviewer's terminal output.
- `report_output_path` — absolute path for `parity-test-b-report.md` (output directory).
- `state_path` — absolute path to `pipeline-state.json`.
- `run_id` — current run ID string.
- `root` — resolved scope root (`{ROOT}`).

## Protocol

### PHASE 1: VALIDATE INPUTS

1. Check `findings_path` exists. If missing: emit `BLOCKED` — STOP.
2. Parse `findings.json`. If invalid: emit `BLOCKED` — STOP.
3. Confirm `reviewer_verdict` is `approved` or `approved_with_concerns`. If neither: emit `BLOCKED` — STOP.

### PHASE 2: RENDER REPORT

Render a markdown report with the following sections:

```markdown
# parity-test-b — Data Quality Report

**Source:** {source_path}
**Analyzed:** {analyzed_at}
**Total keys:** {total_keys}
**Issues found:** {issue_count}
**Reviewer verdict:** {reviewer_verdict}

## Key Analysis

| Key | Type | Null | Type Inconsistent | Issues |
|-----|------|------|-------------------|--------|
| {key} | {type} | {yes/no} | {yes/no} | {issue_count} |

## Reviewer Notes

{reviewer_notes}

## Summary

{one-paragraph summary of the data quality findings}
```

### PHASE 3: WRITE OUTPUT

1. Ensure `{root}/output/` exists; create if absent.
2. Write report to `report_output_path` as UTF-8 without BOM.

### PHASE 4: UPDATE STATE AND EMIT STATUS

1. Update `pipeline-state.json`:
   - `phases[2].status` → `"completed"`
   - `phases[2].outputs` → `[{ "report_path": "{report_output_path}" }]`
2. Emit: `DONE` / `DONE_WITH_CONCERNS` / `BLOCKED`.

## Invariants

- NEVER hardcode platform paths.
- ALWAYS write output as UTF-8 without BOM.
- ALWAYS update `pipeline-state.json` before emitting terminal status.
- Emit exactly one terminal status: `DONE` / `DONE_WITH_CONCERNS` / `BLOCKED`.
