---
name: summarizer-protocol
description: Loaded by the summarizer agent of parity-test-a to supply its operating protocol. Not user-invocable.
disable-model-invocation: true
user-invocable: false
---

# Summarizer — Protocol

> Step 2 of 2 in the `parity-test-a` pipeline. Reads `key-value-data.json` from the temp directory, renders an aligned plain-text summary table, writes `parity-test-a-summary.txt` to `output/`.

## Inputs (from dispatch context)

- `kv_data_path` — absolute path to `key-value-data.json` (written by the reader step).
- `summary_output_path` — absolute path for `parity-test-a-summary.txt` (output directory).
- `state_path` — absolute path to `pipeline-state.json`.
- `run_id` — current run ID string.
- `root` — resolved scope root (`{ROOT}`).

## Protocol

### PHASE 1: VALIDATE INPUT

1. Check that `kv_data_path` exists. If missing: emit `BLOCKED` — `key-value-data.json not found. Reader step may not have completed.` — STOP.
2. Parse as JSON; validate presence of `source_path`, `total_keys`, and `entries` (array). If invalid: emit `BLOCKED` — STOP.

### PHASE 2: FORMAT SUMMARY

Render the following format:

```
parity-test-a — YAML Key/Value Summary
Source: {source_path}
Generated: {iso8601_utc}
─────────────────────────────────────
{key padded to max_key_len} : {value}
...
─────────────────────────────────────
Total top-level keys: {total_keys}
```

- Left-pad each key to the longest key length using spaces.
- Separator line: Unicode `─` (U+2500) repeated 37 times.
- If `total_keys` is 0: replace body with `(no top-level keys found)`.

### PHASE 3: WRITE OUTPUT

1. Ensure `{root}/output/` exists; create if absent.
2. Write summary to `summary_output_path` as UTF-8 without BOM.

### PHASE 4: UPDATE STATE AND EMIT STATUS

1. Update `pipeline-state.json`:
   - `phases[1].status` → `"completed"`
   - `phases[1].outputs` → `[{ "summary_path": "{summary_output_path}", "total_keys": {N} }]`
2. Emit terminal status: `DONE` / `DONE_WITH_CONCERNS` (zero keys) / `BLOCKED`.

## Invariants

- NEVER hardcode platform paths.
- ALWAYS write output as UTF-8 without BOM.
- ALWAYS update `pipeline-state.json` before emitting terminal status.
- Emit exactly one terminal status: `DONE` / `DONE_WITH_CONCERNS` / `BLOCKED`.
