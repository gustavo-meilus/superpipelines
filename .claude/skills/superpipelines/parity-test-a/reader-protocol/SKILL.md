---
name: reader-protocol
description: Loaded by the reader agent of parity-test-a to supply its operating protocol. Not user-invocable.
disable-model-invocation: true
user-invocable: false
---

# Reader — Protocol

> Step 1 of 2 in the `parity-test-a` pipeline. Reads the input YAML file, extracts each top-level key and its string-rendered value, writes `key-value-data.json` to the temp directory.

## Inputs (from dispatch context)

- `input_path` — absolute path to the input YAML file.
- `kv_output_path` — absolute path for `key-value-data.json` (temp directory).
- `state_path` — absolute path to `pipeline-state.json`.
- `run_id` — current run ID string.
- `root` — resolved scope root (`{ROOT}`).

## Protocol

### PHASE 1: VALIDATE INPUT

1. Check that `input_path` exists and is readable. If missing: emit `NEEDS_CONTEXT` with message: `Input YAML file not found at {input_path}.` — STOP.
2. Attempt to parse `input_path` as YAML. If parsing fails: emit `BLOCKED` with the parse error detail — STOP.
3. Confirm the parsed value is a YAML mapping (not a sequence or scalar at the root). If not a mapping: emit `BLOCKED` with message: `Input YAML root is not a mapping. Only top-level key extraction is supported.` — STOP.

### PHASE 2: EXTRACT KEY/VALUE DATA

1. Iterate over top-level keys in order of appearance.
2. For each key, render its value as a string using these rules:
   - Scalar (string, number, boolean, null) → its string representation.
   - Sequence → `[{N} items]` where N is the item count.
   - Mapping → `{N} keys` where N is the key count.
3. Accumulate entries: `{ "key": "{key}", "value": "{rendered_value}", "raw_type": "{yaml_type}" }`.

### PHASE 3: WRITE OUTPUT

Write `key-value-data.json` to `kv_output_path`:

```json
{
  "source_path": "{input_path}",
  "total_keys": {N},
  "entries": [
    { "key": "{key1}", "value": "{value1}", "raw_type": "{type1}" }
  ]
}
```

### PHASE 4: UPDATE STATE AND EMIT STATUS

1. Update `pipeline-state.json`:
   - `phases[0].status` → `"completed"`
   - `phases[0].outputs` → `[{ "kv_data_path": "{kv_output_path}", "total_keys": {N} }]`
2. Emit terminal status: `DONE` / `DONE_WITH_CONCERNS` (zero keys) / `NEEDS_CONTEXT` / `BLOCKED`.

## Invariants

- NEVER hardcode platform paths — operate on paths from dispatch context.
- ALWAYS preserve top-level key insertion order.
- ALWAYS update `pipeline-state.json` before emitting terminal status.
- Emit exactly one terminal status: `DONE` / `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` / `BLOCKED`.
