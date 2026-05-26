# Plan: parity-test-h

## Tech stack

- Platform: Cursor/Windsurf/Cline (Tier 2)
- Dispatch mechanism: `inline` — no Task() primitive, no subagent processes; all steps execute in the entry skill's session
- Agent format: NONE — Tier 2 has no agent files
- Skill format: Superpipelines v2.0.0 SKILL.md protocol
- State format: `pipeline-state.json` (structured JSON per `STATE_MANAGEMENT: STRUCTURED_JSON`)
- Output format: Markdown (.md)
- Model selection: `inherit` — host IDE owns model; no per-step model emitted

## Architecture

```
User
  │
  ▼
run-parity-test-h (entry skill — inline execution, same session)
  │
  │  [Surface all 3 degradation warnings before execution]
  │
  │  Sequential — Pattern 1 (inline)
  │
  ├──► LOAD validator-protocol/SKILL.md → EXECUTE inline
  │      Reads the input YAML config file
  │      Checks for required fields, type mismatches, and deprecated keys
  │      Writes validator-findings.json to temp directory
  │      Emits: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
  │
  ├──► LOAD reviewer-protocol/SKILL.md → EXECUTE inline
  │      [C19 self-skepticism preamble applied — convention-only isolation]
  │      Reads validator-findings.json from temp directory
  │      Reviews each finding for false positives
  │      Applies assumption-blindness: re-derives findings from raw YAML inputs
  │      Writes reviewed-findings.json to temp directory
  │      Emits: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
  │
  └──► LOAD reporter-protocol/SKILL.md → EXECUTE inline
         Reads reviewed-findings.json from temp directory
         Formats structured markdown validation report
         Writes parity-test-h-validation-report.md to output/
         Emits: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
```

**Key Tier 2 constraint:** The entry skill does NOT spawn subagents or call `Task()`. It loads each protocol skill's SKILL.md into context and executes the protocol directly within the same session — sequential, inline, one step at a time.

## API contracts

### Validator output (written to pipeline-state.json phases[0].outputs)

```json
{
  "findings_path": "{ROOT}/superpipelines/temp/parity-test-h/{runId}/validator-findings.json",
  "total_findings": 5,
  "required_field_violations": 2,
  "type_mismatches": 2,
  "deprecated_keys": 1
}
```

### validator-findings.json schema

```json
{
  "source_path": "{path-to-input-yaml-file}",
  "total_findings": 5,
  "findings": [
    {
      "id": "F-001",
      "category": "required_field",
      "key": "name",
      "message": "Required field 'name' is missing.",
      "severity": "error"
    },
    {
      "id": "F-002",
      "category": "type_mismatch",
      "key": "timeout",
      "expected_type": "integer",
      "actual_type": "string",
      "actual_value": "\"30s\"",
      "message": "Field 'timeout' expected integer but got string.",
      "severity": "error"
    },
    {
      "id": "F-003",
      "category": "deprecated_key",
      "key": "legacy_mode",
      "message": "Key 'legacy_mode' is deprecated. Use 'mode' instead.",
      "severity": "warning"
    }
  ]
}
```

`findings` is sorted by severity (errors first, warnings second), then alphabetically by key. All finding IDs are unique strings prefixed `F-`.

### Reviewer output (written to pipeline-state.json phases[1].outputs)

```json
{
  "reviewed_findings_path": "{ROOT}/superpipelines/temp/parity-test-h/{runId}/reviewed-findings.json",
  "total_findings": 5,
  "confirmed": 4,
  "dismissed": 1,
  "false_positive_ids": ["F-002"]
}
```

### reviewed-findings.json schema

```json
{
  "source_path": "{path-to-input-yaml-file}",
  "reviewed_at": "{iso8601}",
  "total_findings": 5,
  "confirmed": 4,
  "dismissed": 1,
  "findings": [
    {
      "id": "F-001",
      "category": "required_field",
      "key": "name",
      "message": "Required field 'name' is missing.",
      "severity": "error",
      "review_status": "confirmed",
      "review_note": null
    },
    {
      "id": "F-002",
      "category": "type_mismatch",
      "key": "timeout",
      "expected_type": "integer",
      "actual_type": "string",
      "actual_value": "\"30s\"",
      "message": "Field 'timeout' expected integer but got string.",
      "severity": "error",
      "review_status": "dismissed",
      "review_note": "YAML allows duration strings for timeout in this schema variant; false positive."
    }
  ]
}
```

### Reporter output (written to pipeline-state.json phases[2].outputs)

```json
{
  "report_path": "{ROOT}/output/parity-test-h-validation-report.md",
  "confirmed_findings": 4,
  "dismissed_findings": 1
}
```

## Dependency matrix

| Component | Depends on | Owned by |
|---|---|---|
| `run-parity-test-h` (entry skill) | Host IDE session | Orchestrator (inline) |
| validator step | `run-parity-test-h` inline load | Same session |
| reviewer step | validator `validator-findings.json` | Same session |
| reporter step | reviewer `reviewed-findings.json` | Same session |
| `output/parity-test-h-validation-report.md` | reporter step | reporter protocol |

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Input file not found | medium | validator emits `NEEDS_CONTEXT` with clear path advisory |
| Input file is not valid YAML | medium | validator emits `BLOCKED` with parse error detail |
| validator-findings.json malformed | low | reviewer validates JSON before processing; emits `BLOCKED` if invalid |
| reviewed-findings.json malformed | low | reporter validates JSON before rendering; emits `BLOCKED` if invalid |
| User expects structural reviewer isolation | medium | All 3 degradation warnings surfaced before execution; C19 self-skepticism preamble in reviewer protocol |
| Reviewer anchors on validator conclusions | medium | C19 preamble mandates assumption-blindness; reviewer must re-derive findings from raw YAML |

## Rollout plan

- Phase 1: Manual scaffold verification (this pipeline).
- Phase 2: Manual execution on Cursor/Windsurf/Cline to verify inline dispatch and protocol skill loading.
- Rollback procedure: Delete `output/parity-test-h-validation-report.md` and `superpipelines/temp/parity-test-h/`.

## Explicit design decisions

- **Pattern 1 (Sequential)**: The only tier-safe pattern for Tier 2 (`worktrees: false`, `parallel_subagents: false`, `subagents: false`).
- **No agent files**: Tier 2 architecture prohibits separate agent processes. Protocol skills are loaded and executed inline.
- **model_field_format: omit**: Tier 2 does not support per-step model selection. The host IDE owns the model. No `model:` fields are emitted anywhere.
- **Inline execution**: The entry skill loads `validator-protocol/SKILL.md`, then `reviewer-protocol/SKILL.md`, then `reporter-protocol/SKILL.md` sequentially in the same session context.
- **Findings written to temp files**: Avoids context-bloating downstream steps (anti-pattern #3 — Context Dumping). Each step receives file paths, not contents.
- **C19 self-skepticism preamble**: Required in the reviewer protocol per architectural invariant (`WRITE_REVIEW_ISOLATION: CONVENTION_ONLY_ON_TIER2`). The preamble mandates assumption-blindness — the reviewer must re-derive findings from raw YAML inputs, not anchor on the validator's conclusions.
- **Convention-only reviewer isolation**: No structural isolation possible on Tier 2. Surfaced via all 3 degradation warnings and the C19 preamble in the reviewer protocol.
- **All 3 degradation warnings surfaced**: Mandatory per `WRITE_REVIEW_ISOLATION: STRUCTURAL_ON_TIER1_1B_1D; CONVENTION_ONLY_ON_TIER2` and the profile's `degradation_warnings` array.
