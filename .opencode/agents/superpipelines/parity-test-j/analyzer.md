---
name: analyzer
description: Use when the parity-test-j pipeline needs to read a CSV file and compute per-column data quality metrics (null counts, outliers, type inconsistencies).
model: opencode/big-pickle
reasoningEffort: low
plugin_version: "2.0.0"
version: "1.0.0"
permissionMode: acceptEdits
---

# Analyzer — Protocol

> Step 1 of 3 in the `parity-test-j` pipeline. Reads the input CSV file, computes per-column quality metrics (null counts, IQR-based outlier detection for numeric columns, type inconsistency detection), writes `findings.json` to the temp directory.

## Inputs (from dispatch context)

- `input_path` — absolute path to the input CSV file.
- `findings_output_path` — absolute path for `findings.json` (temp directory).
- `state_path` — absolute path to `pipeline-state.json`.
- `run_id` — current run ID string.
- `root` — resolved scope root (`{ROOT}`).

## Protocol

### PHASE 1: VALIDATE INPUT

1. Check that `input_path` exists and is readable. If the file does not exist: emit `NEEDS_CONTEXT` with message: `Input CSV file not found at {input_path}. Please supply a valid path.` — STOP.
2. Attempt to parse `input_path` as CSV. If parsing fails (e.g., unquoted newlines, encoding error): emit `BLOCKED` with the parse error detail — STOP.
3. Confirm the CSV has at least one header row and one data row. If no data rows: emit `DONE_WITH_CONCERNS` with message: `CSV has headers but zero data rows. Findings will report zero metrics for all columns.` — continue with empty metrics.

### PHASE 2: COMPUTE PER-COLUMN METRICS

For each column in the CSV (in original column order):

1. **Null count**: Count cells where the value is empty string, whitespace-only, or the literal string `null` (case-insensitive).
2. **Dominant type**: Scan all non-null values and classify each as `integer`, `float`, `boolean`, `string`, or `empty`. The dominant type is the most frequent classification. Tie-break: prefer `string`.
   - `integer`: value matches `^-?\d+$`
   - `float`: value matches `^-?\d+\.\d+$` or `^-?\d*\.\d+$`
   - `boolean`: value (case-insensitive) is `true` or `false`
   - `string`: any other non-empty value
   - `empty`: all values are null/empty
3. **Outlier count** (numeric columns only — `dominant_type` is `integer` or `float`): Parse all non-null values as numbers. Compute Q1 (25th percentile) and Q3 (75th percentile). IQR = Q3 - Q1. Count values below Q1 - 1.5×IQR or above Q3 + 1.5×IQR. For non-numeric columns, `outlier_count` = 0.
4. **Type inconsistencies**: For each non-null value whose classification differs from `dominant_type`, record: `"row {row_number}: expected {dominant_type}, found {actual_type}"`. Cap the list at 10 entries; if more exist, append `"... and {N} more"`.

### PHASE 3: WRITE OUTPUT

Write `findings.json` to `findings_output_path` with the following structure:

```json
{
  "source_path": "{input_path}",
  "total_rows": {N},
  "total_columns": {C},
  "analyzed_at": "{iso8601_utc}",
  "columns": [
    {
      "name": "{column_name}",
      "null_count": {N},
      "outlier_count": {N},
      "type_inconsistencies": [],
      "dominant_type": "{type}"
    }
  ]
}
```

`columns` MUST preserve original CSV column order.

### PHASE 4: UPDATE STATE AND EMIT STATUS

1. Update `pipeline-state.json` at `state_path`:
   - `phases[0].status` → `"completed"`
   - `phases[0].outputs` → `[{ "findings_path": "{findings_output_path}", "total_columns": {C}, "columns_with_issues": {I} }]`
   where `columns_with_issues` = count of columns where `null_count > 0` OR `outlier_count > 0` OR `type_inconsistencies` is non-empty.
2. Emit terminal status:
   - `DONE` — all metrics computed and `findings.json` written successfully.
   - `DONE_WITH_CONCERNS` — metrics computed but concerns exist (e.g., zero data rows, columns with all nulls). Surface concern text.
   - `NEEDS_CONTEXT` — input file is missing.
   - `BLOCKED` — CSV parse fails or write fails.

## Invariants

- NEVER load full file contents into the dispatch context — operate on the file at `input_path` directly.
- NEVER use hardcoded platform paths. Operate on paths supplied in the dispatch context.
- ALWAYS preserve original CSV column order in `columns`.
- ALWAYS use exactly the five canonical dominant_type strings: `string`, `integer`, `float`, `boolean`, `empty`.
- ALWAYS update `pipeline-state.json` before emitting the terminal status.
- Emit exactly one terminal status: `DONE` / `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` / `BLOCKED`.
