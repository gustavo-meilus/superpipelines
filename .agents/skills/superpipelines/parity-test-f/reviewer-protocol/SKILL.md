---
name: reviewer-protocol
description: Loaded by the reviewer agent to supply operating protocol and invariants for findings validation in the parity-test-f pipeline. Not user-invocable.
disable-model-invocation: true
user-invocable: false
---

# Reviewer — Operational Protocol

<overview>
The reviewer agent reads the structured findings JSON produced by the analyzer, validates completeness and correctness of the findings across all three issue categories (null checks, error handling, naming), and emits a verdict via terminal output text (no file write). It is the second step of the parity-test-f Sequential pipeline (Pattern 1) on Tier 1d (Codex CLI). This agent operates under structural write-deny: `sandbox_mode = "read-only"` in `reviewer.toml` prevents ALL file writes via the Codex host; the verdict is communicated exclusively through the terminal-output REVIEWER VERDICT block, which the orchestrator parses. The quality bar is: the verdict must provide a clear signal (approved / approved_with_concerns / rejected) with actionable notes for the reporter.
</overview>

## Protocol

<protocol>

### 1. DISCOVER

1. Read inputs from the orchestrator dispatch context:
   - `findings_path`: path to `findings.json` written by the analyzer.
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

### 3. RENDER VERDICT

1. Render the verdict as a terminal-output block (NO file write — this agent is read-only). The orchestrator parses this block:

```
REVIEWER VERDICT: {verdict}
COMPLETENESS_SCORE: {completeness_score}
MISSING_CATEGORIES: {comma-separated categories, or "none"}
REVIEWER_NOTES: {summary of any concerns or notes, or "none"}
```

2. Emit terminal status:
   - `DONE` — verdict is `"approved"`.
   - `DONE_WITH_CONCERNS` — verdict is `"approved_with_concerns"` or `"rejected"` (the orchestrator surfaces the verdict and reviewer_notes).
   - `BLOCKED` — findings file missing or malformed; no verdict rendered.

</protocol>

<invariants>
- THIS AGENT IS READ-ONLY. `sandbox_mode = "read-only"` in `reviewer.toml` enforces structural write-deny via the Codex host. This agent writes NO files; the verdict is communicated exclusively via the terminal-output REVIEWER VERDICT block.
- NEVER attempt to write `verdict.json`, `pipeline-state.json`, or any other file — the read-only sandbox denies it and the step would fail. State persistence is the orchestrator's responsibility.
- NEVER pass file contents to the orchestrator — render the REVIEWER VERDICT block and emit a terminal status.
- NEVER hardcode platform paths — use only the `root` value supplied in the dispatch context.
- ALWAYS render the REVIEWER VERDICT block before emitting terminal status.
- Emit exactly one terminal status: DONE / DONE_WITH_CONCERNS / BLOCKED.
</invariants>
