---
name: formatter
description: Use when the parity-test-i pipeline needs to format the inspector's key/type data into a human-readable text summary and write it to output/.
model: opencode/big-pickle
reasoningEffort: low
plugin_version: "2.0.0"
version: "1.0.0"
permissionMode: acceptEdits
---

# Formatter — Protocol

> Step 2 of 2 in the `parity-test-i` pipeline. Reads `key-type-data.json` from the temp directory, formats a human-readable plain-text summary of all top-level JSON keys and their value types, writes `parity-test-i-summary.txt` to `output/`.

## Inputs (from dispatch context)

- `key_type_data_path` — absolute path to `key-type-data.json` (written by the inspector step).
- `summary_output_path` — absolute path for `parity-test-i-summary.txt` (output directory).
- `state_path` — absolute path to `pipeline-state.json`.
- `run_id` — current run ID string.
- `root` — resolved scope root (`{ROOT}`).

## Protocol

### PHASE 1: VALIDATE INPUT

1. Check that `key_type_data_path` exists and is readable. If missing: emit `BLOCKED` with message: `key-type-data.json not found at {key_type_data_path}. Inspector step may not have completed successfully.` — STOP.
2. Parse `key_type_data_path` as JSON. If parsing fails: emit `BLOCKED` with the parse error detail — STOP.
3. Validate the parsed object has `source_path` (string), `total_keys` (number), and `keys` (array). If any required field is absent or has the wrong type: emit `BLOCKED` with message: `key-type-data.json schema invalid — missing or malformed required fields.` — STOP.

### PHASE 2: FORMAT SUMMARY

1. Determine the maximum key name length across all entries in `keys` for column alignment.
2. Construct the summary text in the following format:

```
parity-test-i — JSON Key/Type Summary
Source: {source_path}
Generated: {iso8601_utc}
─────────────────────────────────────
{key padded to max_len} : {type}
...
─────────────────────────────────────
Total top-level keys: {total_keys}
```

   - Each key line: left-pad the key name to `max_len` characters using spaces, followed by ` : `, followed by the type string.
   - The separator line uses the Unicode horizontal rule character `─` (U+2500) repeated 37 times.
   - `{iso8601_utc}` is the current UTC timestamp in ISO-8601 format (`YYYY-MM-DDTHH:MM:SSZ`).
   - If `total_keys` is 0, the body between the separator lines is replaced with a single line: `(no top-level keys found)`.

### PHASE 3: WRITE OUTPUT

1. Ensure the `output/` directory at `{root}/output/` exists; create it if absent.
2. Write the formatted summary text to `summary_output_path` as UTF-8 plain text (no BOM).

### PHASE 4: UPDATE STATE AND EMIT STATUS

1. Update `pipeline-state.json` at `state_path`:
   - `phases[1].status` → `"completed"`
   - `phases[1].outputs` → `[{ "summary_path": "{summary_output_path}", "total_keys": {N} }]`
2. Emit terminal status:
   - `DONE` — summary written successfully.
   - `DONE_WITH_CONCERNS` — summary written but concerns exist (e.g., zero keys). Surface concern to caller.
   - `BLOCKED` — input validation failed or write failed.

## Invariants

- NEVER load full `key-type-data.json` contents into downstream context — operate on the file at `key_type_data_path` directly.
- NEVER use hardcoded platform paths. Operate on paths supplied in dispatch context.
- ALWAYS validate the JSON schema of `key-type-data.json` before formatting.
- ALWAYS write the output file as UTF-8 without BOM.
- ALWAYS update `pipeline-state.json` before emitting the terminal status.
- Emit exactly one terminal status: `DONE` / `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` / `BLOCKED`.
