---
name: reviewer-protocol
description: Loaded by the reviewer agent to supply operating protocol and invariants for findings validation in the parity-test-f pipeline. Not user-invocable.
disable-model-invocation: true
user-invocable: false
---

# Reviewer — Operational Protocol

<overview>
The reviewer agent reads the structured findings JSON produced by the analyzer, validates completeness and correctness of the findings across all three issue categories (null checks, error handling, naming), and writes a verdict JSON file to the pipeline temp directory. It is the second step of the parity-test-f Sequential pipeline (Pattern 1) on Tier 1d (Codex CLI). This agent operates under structural write-deny: `sandbox_mode = "read-only"` in `reviewer.toml` prevents any file writes except to the designated verdict output path permitted by the orchestrator context. The quality bar is: the verdict must provide a clear signal (approved / approved_with_concerns / rejected) with actionable notes for the reporter.
</overview>

## Protocol

<protocol>

### 1. DISCOVER

1. Read inputs from the orchestrator dispatch context:
   - `findings_path`: path to `findings.json` written by the analyzer.
   - `verdict_output_path`: path where `verdict.json` must be written.
   - `state_path`: path to `pipeline-state.json` for status updates.
   - `run_id`: current run identifier.
   - `root`: resolved scope root.
2. Verify `findings_path` exists and is valid JSON. If the file does not exist: emit `BLOCKED` with message: "Analyzer findings not found at `{findings_path}`. The analyzer step may have failed."
3. Parse the findings JSON. If JSON is malformed: emit `BLOCKED` with message: "Analyzer findings at `{findings_path}` are not valid JSON. Re-run the analyzer step."

### 2. PROCESS

Validate the findings for completeness and correctness:

1. **Structural validation**:
   - Verify `findings.issue_count` matches `findings.issues.length`. If not: record a reviewer note that the count is inconsistent and lower `completeness_score` by 0.1.
   - Verify each issue entry has `category`, `severity`, `location`, and `description` fields. Issues missing required fields are flagged as incomplete.

2. **Category coverage**:
   - Identify which of the three expected categories (`null_check`, `error_handling`, `naming`) have at least one finding. Record `missing_categories` as any category with zero findings.
   - A missing category is not automatically a rejection — it may be genuinely absent from the diff. However, if all three categories are missing and `issue_count > 0`, flag as suspicious and lower `completeness_score` by 0.2.

3. **Severity plausibility**:
   - `null_check` issues should generally be `high` or `medium`. A `low` severity null_check finding is unusual; record a reviewer note.
   - `error_handling` issues should generally be `medium`. A `high` severity error_handling finding without a clear justification in the description is unusual; record a reviewer note.
   - `naming` issues should generally be `low`. A `high` severity naming finding is unusual; record a reviewer note.

4. **Compute verdict**:
   - `completeness_score` starts at 1.0 and is adjusted per the rules above (minimum 0.0).
   - `verdict`:
     - `"approved"` — `completeness_score >= 0.85` and no structural validation failures.
     - `"approved_with_concerns"` — `0.6 <= completeness_score < 0.85` or minor notes present.
     - `"rejected"` — `completeness_score < 0.6` or structural validation failures (e.g., missing required fields, count mismatch).

5. Assemble the verdict object:

```json
{
  "findings_path": "{findings_path}",
  "verdict": "approved | approved_with_concerns | rejected",
  "completeness_score": 1.0,
  "missing_categories": [],
  "reviewer_notes": "{summary of any concerns or notes; empty string if none}"
}
```

### 3. DELIVER

1. Write `verdict.json` to `verdict_output_path` using the Write tool.
2. Update `pipeline-state.json`:
   - Set `phases[1].status` = `"completed"` (or `"completed_with_concerns"` if verdict is `approved_with_concerns` or `rejected`).
   - Set `phases[1].outputs` = `[verdict_output_path]`.
3. Emit terminal status:
   - `DONE` — verdict written; verdict is `"approved"`.
   - `DONE_WITH_CONCERNS` — verdict written; verdict is `"approved_with_concerns"` or `"rejected"` (surface the verdict and reviewer_notes to the orchestrator).
   - `BLOCKED` — findings file missing or malformed; verdict not written.

</protocol>

<invariants>
- THIS AGENT IS READ-ONLY. `sandbox_mode = "read-only"` in `reviewer.toml` enforces structural write-deny via the Codex host. The ONLY permitted write is `verdict.json` to `verdict_output_path` as supplied by the orchestrator.
- NEVER write any file other than `verdict.json` to `verdict_output_path`.
- NEVER write to `{ROOT}/output/` or any path outside the designated temp directory.
- NEVER pass file contents to the orchestrator in the status message — pass only the verdict file path and the verdict value.
- NEVER hardcode platform paths — use only the `root` value supplied in the dispatch context.
- ALWAYS update `pipeline-state.json` after writing the verdict.
- Emit exactly one terminal status: DONE / DONE_WITH_CONCERNS / BLOCKED.
</invariants>
