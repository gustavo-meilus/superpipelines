---
name: inspector
description: Use when the parity-test-i pipeline needs to read a JSON file and extract the name and value type of each top-level key.
model: opencode/big-pickle
reasoningEffort: low
plugin_version: "2.0.0"
version: "1.0.0"
permissionMode: acceptEdits
---

# Inspector — Protocol

> Step 1 of 2 in the `parity-test-i` pipeline. Reads the input JSON file, extracts each top-level key and its value type, writes `key-type-data.json` to the temp directory.

## Inputs (from dispatch context)

- `input_path` — absolute path to the input JSON file.
- `key_type_output_path` — absolute path for `key-type-data.json` (temp directory).
- `state_path` — absolute path to `pipeline-state.json`.
- `run_id` — current run ID string.
- `root` — resolved scope root (`{ROOT}`).

## Protocol

### PHASE 1: VALIDATE INPUT

1. Check that `input_path` exists and is readable. If the file does not exist: emit `NEEDS_CONTEXT` with message: `Input JSON file not found at {input_path}. Please supply a valid path.` — STOP.
2. Attempt to parse `input_path` as JSON. If parsing fails: emit `BLOCKED` with the parse error detail — STOP.
3. Confirm the parsed value is a JSON object (not array, string, number, or null at the root). If not an object: emit `BLOCKED` with message: `Input JSON root is not an object. Only top-level key extraction is supported.` — STOP.

### PHASE 2: EXTRACT KEY/TYPE DATA

1. Iterate over the top-level keys of the parsed JSON object in insertion order.
2. For each key, determine the value type using the following mapping (strict JSON types — do not infer sub-types):
   - JSON string → `"string"`
   - JSON number (integer or float) → `"number"`
   - JSON boolean (`true` / `false`) → `"boolean"`
   - JSON object (`{}`) → `"object"`
   - JSON array (`[]`) → `"array"`
   - JSON null → `"null"`
3. Accumulate entries: `{ "key": "{key}", "type": "{type}" }`.

### PHASE 3: WRITE OUTPUT

Write `key-type-data.json` to `key_type_output_path` with the following structure:

```json
{
  "source_path": "{input_path}",
  "total_keys": {N},
  "keys": [
    { "key": "{key1}", "type": "{type1}" },
    { "key": "{key2}", "type": "{type2}" }
  ]
}
```

`keys` MUST preserve the original JSON top-level key insertion order.

### PHASE 4: UPDATE STATE AND EMIT STATUS

1. Update `pipeline-state.json` at `state_path`:
   - `phases[0].status` → `"completed"`
   - `phases[0].outputs` → `[{ "key_type_data_path": "{key_type_output_path}", "total_keys": {N} }]`
2. Emit terminal status:
   - `DONE` — if all keys were extracted and `key-type-data.json` was written successfully.
   - `DONE_WITH_CONCERNS` — if extraction succeeded but concerns exist (e.g., zero top-level keys in an empty object). Surface concern text to caller.
   - `NEEDS_CONTEXT` — if input file is missing.
   - `BLOCKED` — if JSON parse fails or root is not an object.

## Invariants

- NEVER load full file contents into the dispatch context — operate on the file at `input_path` directly.
- NEVER use hardcoded platform paths. Operate on the paths supplied in the dispatch context.
- ALWAYS preserve top-level key insertion order in `keys`.
- ALWAYS use exactly the six canonical type strings: `string`, `number`, `boolean`, `object`, `array`, `null`.
- ALWAYS update `pipeline-state.json` before emitting the terminal status.
- Emit exactly one terminal status: `DONE` / `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` / `BLOCKED`.
