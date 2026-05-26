---
name: validator-protocol
description: Loaded by the run-parity-test-h entry skill to supply operating protocol and invariants for YAML config validation in the parity-test-h pipeline. Not user-invocable.
disable-model-invocation: true
user-invocable: false
---

# Validator — Operational Protocol

<overview>
The validator step reads an input YAML config file, parses it, and checks it against a schema: required fields must be present, field values must match expected types, and deprecated keys must be flagged. It writes a structured JSON findings file to the pipeline temp directory. It is the first step of the parity-test-h Sequential pipeline (Pattern 1) on Tier 2 (Cursor/Windsurf/Cline), executing inline in the entry skill's session. The quality bar is: validator-findings.json must be machine-readable JSON that the reviewer can consume without ambiguity.
</overview>

## Protocol

<protocol>

### 1. DISCOVER

1. Read inputs from the orchestrator execution context:
   - `input_path`: path to the input YAML config file to read.
   - `findings_output_path`: path where `validator-findings.json` must be written.
   - `state_path`: path to `pipeline-state.json` for status updates.
   - `run_id`: current run identifier.
   - `root`: resolved scope root.
2. Verify `input_path` exists and is a readable file. If not: update `pipeline-state.json` phases[0].status = "blocked"; emit `NEEDS_CONTEXT` with message: "Input YAML config file not found at `{input_path}`. Provide a valid path and re-run."
3. Read the file content and parse it as YAML. If the file is empty: write a zero-findings `validator-findings.json` and emit `DONE_WITH_CONCERNS` with message: "Input file at `{input_path}` is empty. Findings file written with zero entries."
4. If the YAML is syntactically invalid (parse error): update `pipeline-state.json` phases[0].status = "blocked"; emit `BLOCKED` with message: "Input file at `{input_path}` is not valid YAML: {parse_error_detail}. Fix the syntax and re-run."

### 2. PROCESS

**Step 2.1 — Check required fields:**

Verify each of the following fields is present at the top level of the parsed YAML document:

```
name, version, environment, timeout, resources
```

For each missing field, create a finding:
```json
{
  "id": "F-{NNN}",
  "category": "required_field",
  "key": "{field_name}",
  "message": "Required field '{field_name}' is missing.",
  "severity": "error"
}
```

**Step 2.2 — Check type constraints:**

For fields that are present, validate their types against the following rules:

| Field | Expected type | Notes |
|---|---|---|
| `name` | string | Non-empty |
| `version` | string | Semantic version pattern `\d+\.\d+\.\d+` preferred but not enforced |
| `timeout` | integer | Positive integer (seconds); string values like `"30s"` are a type mismatch |
| `environment` | string | One of: `development`, `staging`, `production` |
| `resources` | mapping (object) | Must be a YAML mapping, not a scalar or list |
| `replicas` | integer | If present, must be a positive integer |
| `enabled` | boolean | If present, must be a boolean (true/false); string "true" is a type mismatch |
| `tags` | list | If present, must be a YAML sequence |

For each type mismatch, create a finding:
```json
{
  "id": "F-{NNN}",
  "category": "type_mismatch",
  "key": "{field_name}",
  "expected_type": "{expected}",
  "actual_type": "{actual}",
  "actual_value": "{value_as_string_truncated_to_50_chars}",
  "message": "Field '{field_name}' expected {expected} but got {actual}.",
  "severity": "error"
}
```

**Step 2.3 — Check deprecated keys:**

Flag any of the following keys if present at any level in the YAML document:

```
legacy_mode, old_timeout, deprecated_env, use_legacy_auth, v1_compat
```

For each deprecated key found, create a finding:
```json
{
  "id": "F-{NNN}",
  "category": "deprecated_key",
  "key": "{key_name}",
  "message": "Key '{key_name}' is deprecated. {replacement_hint}",
  "severity": "warning"
}
```

Replacement hints:
- `legacy_mode` → "Use `mode` instead."
- `old_timeout` → "Use `timeout` instead."
- `deprecated_env` → "Use `environment` instead."
- `use_legacy_auth` → "Use `auth.method` instead."
- `v1_compat` → "Remove this key; v1 compatibility layer is no longer supported."

**Step 2.4 — Assign sequential finding IDs:**

Assign IDs in the order findings were discovered: `F-001`, `F-002`, `F-003`, … (zero-padded to 3 digits).

**Step 2.5 — Sort findings:**

Sort the findings list: errors first (sorted alphabetically by key), then warnings (sorted alphabetically by key).

**Step 2.6 — Handle zero-finding case:**

If no findings were produced (the YAML is fully valid), `findings` is an empty array and `total_findings` is 0. Emit `DONE_WITH_CONCERNS` with message: "No findings produced. The YAML config appears fully valid against the schema." — this is a concern because zero findings on a parity-test run may indicate the schema check did not execute as expected.

### 3. DELIVER

1. Write `validator-findings.json` to `findings_output_path` using the Write tool. Structure:

```json
{
  "source_path": "{input_path}",
  "total_findings": 0,
  "findings": []
}
```

Fields:
- `source_path`: path of the input YAML file (verbatim from execution context).
- `total_findings`: total count of all findings (errors + warnings).
- `findings`: array of finding objects as defined in Steps 2.1–2.5.

2. Update `pipeline-state.json`:
   - Set `phases[0].status` = `"completed"` (or `"completed_with_concerns"` if zero findings).
   - Set `phases[0].outputs` = `[findings_output_path]`.
   - Set `phases[0].outputs_summary` = `{ "total_findings": N, "required_field_violations": N, "type_mismatches": N, "deprecated_keys": N }`.

3. Emit terminal status:
   - `DONE` — validator-findings.json written successfully with at least one finding.
   - `DONE_WITH_CONCERNS` — file written but zero findings (may indicate schema check did not run as expected), or input was empty.
   - `NEEDS_CONTEXT` — input file not found or not accessible.
   - `BLOCKED` — input YAML is syntactically invalid; or findings file could not be written.

</protocol>

<invariants>
- NEVER write findings to a path outside `{ROOT}/superpipelines/temp/parity-test-h/{runId}/`.
- NEVER pass file contents back to the orchestrator in the status message — pass only the findings file path.
- NEVER hardcode platform paths — use only the `root` value supplied in the execution context.
- ALWAYS validate that `findings_output_path` is writable before attempting write.
- ALWAYS update `pipeline-state.json` phases[0] after writing findings.
- ALWAYS include ALL findings in the output (do not suppress or truncate — the reviewer decides which to dismiss).
- ALWAYS re-read the source YAML from disk; do not rely on cached or context-bleed content.
- Emit exactly one terminal status: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
</invariants>
