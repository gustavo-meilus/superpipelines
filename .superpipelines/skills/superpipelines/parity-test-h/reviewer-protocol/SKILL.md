---
name: reviewer-protocol
description: Loaded by the run-parity-test-h entry skill to supply operating protocol and invariants for false-positive review of validator findings in the parity-test-h pipeline. Not user-invocable.
disable-model-invocation: true
user-invocable: false
---

# Reviewer — Operational Protocol

<overview>
The reviewer step reads the validator findings produced by the validator step, applies the C19 self-skepticism convention, and independently re-derives each finding from the raw YAML input to identify false positives. It writes a reviewed-findings.json file with a `review_status` per finding (confirmed or dismissed) and an optional `review_note` for dismissed findings. It is the second step of the parity-test-h Sequential pipeline (Pattern 1) on Tier 2 (Cursor/Windsurf/Cline), executing inline in the entry skill's session. The quality bar is: reviewed-findings.json must accurately reflect independent verification, not mere agreement with the validator.
</overview>

## Protocol

<protocol>

⚠️ REVIEWER ISOLATION WARNING: This reviewer is executing in the same session as the writer. No structural isolation exists. Exercise deliberate assumption-blindness: treat all writer outputs as potentially flawed and verify each claim independently. Do NOT anchor on the writer's conclusions — re-derive them from raw inputs.

### 1. DISCOVER

1. Read inputs from the orchestrator execution context:
   - `input_path`: path to the original YAML config file (same file the validator read).
   - `findings_path`: path to `validator-findings.json` written by the validator step.
   - `reviewed_findings_output_path`: path where `reviewed-findings.json` must be written.
   - `state_path`: path to `pipeline-state.json` for status updates.
   - `run_id`: current run identifier.
   - `root`: resolved scope root.
2. Verify `findings_path` exists and is a readable file. If not: update `pipeline-state.json` phases[1].status = "blocked"; emit `BLOCKED` with message: "Validator findings not found at `{findings_path}`. The validator step may have failed."
3. Parse the findings JSON. If JSON is malformed: update `pipeline-state.json` phases[1].status = "blocked"; emit `BLOCKED` with message: "Validator findings at `{findings_path}` are not valid JSON. Re-run the validator step."
4. Read the original YAML file at `input_path` independently. This is mandatory — the reviewer MUST NOT rely solely on the validator's interpretation of the YAML content.

### 2. PROCESS

**Step 2.1 — Apply assumption-blindness:**

Before reviewing any finding, re-parse the YAML file at `input_path` independently. Do NOT treat the validator's field-presence or type conclusions as ground truth. Derive the ground truth from the raw YAML document.

**Step 2.2 — Review each finding:**

For each finding in `validator-findings.json`, independently verify the claim:

- **required_field findings**: Check whether the field is actually absent from the parsed YAML. If the field is present (possibly under an alias or nested path the validator missed), mark as `"dismissed"` with a review note explaining the false positive.
- **type_mismatch findings**: Check the actual runtime type of the field value in the parsed YAML. YAML parsers may auto-coerce values (e.g., bare `true` is a boolean, `"true"` is a string, `30` is an integer, `30s` is a string). Verify the validator's type assertion against the YAML-parsed value. If the assertion is incorrect, mark as `"dismissed"` with a note.
- **deprecated_key findings**: Verify the key is actually present in the YAML document (not merely mentioned in a string value or comment). Verify the key name matches exactly (case-sensitive). If the key is absent or was incorrectly identified, mark as `"dismissed"` with a note.

**Step 2.3 — Assign review_status:**

For each finding, set:
- `"review_status": "confirmed"` — the finding is independently verified as correct.
- `"review_status": "dismissed"` — the finding is a false positive; include a non-null `review_note` explaining why.

**Step 2.4 — Summarize:**

Count:
- `confirmed`: number of findings with `review_status` = `"confirmed"`.
- `dismissed`: number of findings with `review_status` = `"dismissed"`.
- `false_positive_ids`: array of `id` values for dismissed findings (may be empty).

**Step 2.5 — Handle zero-finding input:**

If `validator-findings.json` has `total_findings` = 0 and an empty `findings` array, produce a `reviewed-findings.json` with zero findings. Emit `DONE_WITH_CONCERNS` with message: "Validator produced zero findings. Reviewed-findings.json written with zero entries; no false-positive review was possible."

### 3. DELIVER

1. Write `reviewed-findings.json` to `reviewed_findings_output_path` using the Write tool. Structure:

```json
{
  "source_path": "{input_path}",
  "reviewed_at": "{iso8601}",
  "total_findings": 0,
  "confirmed": 0,
  "dismissed": 0,
  "false_positive_ids": [],
  "findings": []
}
```

Each finding in the `findings` array extends the original finding object with two additional fields:
- `"review_status"`: `"confirmed"` or `"dismissed"`
- `"review_note"`: string (explanation for dismissed findings) or `null` (for confirmed findings)

2. Update `pipeline-state.json`:
   - Set `phases[1].status` = `"completed"` (or `"completed_with_concerns"` if zero findings input or if all findings were dismissed).
   - Set `phases[1].outputs` = `[reviewed_findings_output_path]`.
   - Set `phases[1].outputs_summary` = `{ "total_findings": N, "confirmed": N, "dismissed": N, "false_positive_ids": [...] }`.

3. Emit terminal status:
   - `DONE` — reviewed-findings.json written successfully; at least one finding confirmed.
   - `DONE_WITH_CONCERNS` — reviewed-findings.json written but zero input findings, or all findings dismissed; surface the concern.
   - `BLOCKED` — findings file missing or malformed; output not written.

</protocol>

<invariants>
- NEVER write reviewed findings to a path outside `{ROOT}/superpipelines/temp/parity-test-h/{runId}/`.
- NEVER pass file contents back to the orchestrator in the status message — pass only the reviewed-findings file path.
- NEVER hardcode platform paths — use only the `root` value supplied in the execution context.
- NEVER accept the validator's conclusions without independently verifying against the raw YAML.
- ALWAYS re-read the source YAML at `input_path` before reviewing any finding (mandatory per C19 assumption-blindness).
- ALWAYS provide a `review_note` for every dismissed finding; `review_note` must not be null or empty for dismissed findings.
- ALWAYS update `pipeline-state.json` phases[1] after writing reviewed findings.
- ALWAYS include ALL findings in the reviewed output, whether confirmed or dismissed.
- Emit exactly one terminal status: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
</invariants>
