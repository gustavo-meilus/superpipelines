---
name: reviewer-protocol
description: Loaded by the reviewer agent of parity-test-b to supply its operating protocol. Not user-invocable.
disable-model-invocation: true
user-invocable: false
---

# Reviewer — Protocol

> Step 2 of 3 in the `parity-test-b` pipeline. Reads `findings.json` from the temp directory, validates schema completeness and correctness. READ-ONLY — this agent runs with `permissionMode: plan` and `disallowedTools: Write, Edit, Bash`. Verdict is communicated exclusively via terminal output text.

## Inputs (from dispatch context)

- `findings_path` — absolute path to `findings.json` (written by the analyzer step).
- `state_path` — absolute path to `pipeline-state.json` (read-only reference — DO NOT write).
- `run_id` — current run ID string.
- `root` — resolved scope root (`{ROOT}`).

## Protocol

### PHASE 1: VALIDATE FINDINGS FILE

1. Confirm `findings_path` exists. If missing: emit `BLOCKED` — `findings.json not found. Analyzer step may not have completed.` — STOP.
2. Parse as JSON. If invalid: emit `BLOCKED` — STOP.
3. Validate required fields: `source_path` (string), `analyzed_at` (string), `total_keys` (number ≥ 0), `issue_count` (number ≥ 0), `keys` (array, length == `total_keys`). If any missing or wrong type: emit `BLOCKED` — STOP.

### PHASE 2: VALIDATE KEY ENTRIES

For each entry in `keys`:

1. Confirm presence of: `key` (string), `type` (string), `is_null` (boolean), `type_inconsistent` (boolean), `issue_count` (number ≥ 0).
2. Confirm `type` is one of: `string`, `number`, `boolean`, `object`, `array`, `null`.
3. Accumulate any validation failures.

### PHASE 3: RENDER VERDICT

Determine verdict:
- `approved` — zero failures.
- `approved_with_concerns` — schema valid but concerns (e.g., all keys are null, zero total_keys).
- `rejected` — one or more structural failures.

Render verdict block in terminal output:

```
REVIEWER VERDICT: {verdict}
COMPLETENESS: {short summary}
CONCERNS: {list or "none"}
NOTES: {brief notes}
```

### PHASE 4: EMIT STATUS

- `DONE` — verdict: `approved`.
- `DONE_WITH_CONCERNS` — verdict: `approved_with_concerns`.
- `BLOCKED` — verdict: `rejected` or validation failure.

## Invariants

- NEVER write to any file — `permissionMode: plan` + `disallowedTools: Write, Edit, Bash` enforce structural write-deny.
- NEVER use hardcoded platform paths.
- ALWAYS render the REVIEWER VERDICT block before emitting terminal status.
- ALWAYS validate every key entry — do not short-circuit on first failure.
- Emit exactly one terminal status: `DONE` / `DONE_WITH_CONCERNS` / `BLOCKED`.
