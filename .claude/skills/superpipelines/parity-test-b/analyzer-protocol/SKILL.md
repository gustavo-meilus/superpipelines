---
name: analyzer-protocol
description: Loaded by the analyzer agent of parity-test-b to supply its operating protocol. Not user-invocable.
disable-model-invocation: true
user-invocable: false
---

# Analyzer — Protocol

> Step 1 of 3 in the `parity-test-b` pipeline. Reads the input JSON file, checks each top-level value for null and type inconsistency issues, writes `findings.json` to the temp directory.

## Inputs (from dispatch context)

- `input_path` — absolute path to the input JSON file.
- `findings_output_path` — absolute path for `findings.json` (temp directory).
- `state_path` — absolute path to `pipeline-state.json`.
- `run_id` — current run ID string.
- `root` — resolved scope root (`{ROOT}`).

## Protocol

### PHASE 1: VALIDATE INPUT

1. Check `input_path` exists. If missing: emit `NEEDS_CONTEXT` — STOP.
2. Parse as JSON. If invalid: emit `BLOCKED` with parse error — STOP.
3. Confirm root is a JSON object. If not: emit `BLOCKED` — STOP.

### PHASE 2: ANALYZE KEYS

For each top-level key:

1. Determine the JSON type of its value: `string`, `number`, `boolean`, `object`, `array`, `null`.
2. Record `is_null: true` if value is JSON null.
3. For arrays: check whether all elements share the same JSON type. Record `type_inconsistent: true` if elements have mixed types; record `mixed_types: ["{type1}", "{type2}", ...]`.
4. Accumulate entry: `{ "key": "...", "type": "...", "is_null": bool, "type_inconsistent": bool, "issue_count": N }`.

### PHASE 3: WRITE FINDINGS

Write `findings.json` to `findings_output_path`:

```json
{
  "source_path": "{input_path}",
  "analyzed_at": "{iso8601_utc}",
  "total_keys": {N},
  "issue_count": {total_issues},
  "keys": [
    {
      "key": "{key}",
      "type": "{json_type}",
      "is_null": false,
      "type_inconsistent": false,
      "issue_count": 0
    }
  ]
}
```

### PHASE 4: UPDATE STATE AND EMIT STATUS

1. Update `pipeline-state.json`:
   - `phases[0].status` → `"completed"`
   - `phases[0].outputs` → `[{ "findings_path": "{findings_output_path}", "issue_count": {N} }]`
2. Emit: `DONE` / `DONE_WITH_CONCERNS` (issues found) / `NEEDS_CONTEXT` / `BLOCKED`.

## Invariants

- NEVER hardcode platform paths.
- ALWAYS update `pipeline-state.json` before emitting terminal status.
- Emit exactly one terminal status: `DONE` / `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` / `BLOCKED`.
