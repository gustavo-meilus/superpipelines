# Escalation Protocol — Pipeline-Runner Reference

When and how `running-a-pipeline` escalates to a human. Two main triggers: Pattern 3 iteration cap and `BLOCKED` status that can't be resolved.

## Table of contents

1. Pattern 3 escalation triggers
2. What escalation looks like
3. `BLOCKED` status escalation
4. Worktree handling on escalation
5. Pattern 4 fallback
6. Reporting to user
7. Red Flags — STOP

---

## Pattern 3 escalation triggers

The orchestrator MUST escalate when ANY of these conditions hold:

1. **Iteration cap reached:** 3 iterations completed; tests still failing.
2. **Architectural signal:** Each fix reveals a failure in a NEW location (not the same failure improving).
3. **No measurable progress:** Failure count not decreasing for 2 consecutive iterations.

```
escalate when:
  iteration_count >= 3
  OR (iteration_count >= 2 AND new_failure_locations != prior_failure_locations)
  OR (iteration_count >= 2 AND failure_count[-1] >= failure_count[-2])
```

## What escalation looks like

```bash
# 1. Update state
TEMP_DIR="${SCOPE_ROOT}/superpipelines/temp/${PIPELINE_NAME}/${RUN_ID}"
STATE_FILE="${TEMP_DIR}/pipeline-state.json"
STATE=$(cat "$STATE_FILE" | jq \
  --arg reason "Pattern 3 iteration cap" \
  --arg last_failure "$LAST_FAILURE_SUMMARY" \
  '.status = "escalated"
   | .metadata.escalation_reason = $reason
   | .metadata.last_failure = $last_failure
   | .metadata.iterations = '"$ITERATION_COUNT"'
   | .metadata.attempted_fixes = '"$ATTEMPTED_FIXES_JSON")
echo "$STATE" > "${STATE_FILE}.tmp"
mv "${STATE_FILE}.tmp" "$STATE_FILE"

# 2. Surface to user (no auto-resume)
cat <<EOF
Pipeline ESCALATED.

Reason: ${ESCALATION_REASON}
Iterations: ${ITERATION_COUNT}
Last failure: ${LAST_FAILURE_SUMMARY}
Attempted fixes: ${ATTEMPTED_FIXES}

State preserved at ${TEMP_DIR}/pipeline-state.json.

Suggested next steps:
  - Review the diagnosis history in metadata.attempted_fixes
  - Re-architect the failing component
  - Run /superpipelines:audit-pipeline on the spec/tasks if specs were drifting
  - When ready, restart with: rm -rf ${TEMP_DIR} && /superpipelines:run-pipeline
EOF
```

## `BLOCKED` status escalation

When a worker reports `BLOCKED`, the orchestrator follows a 4-step ladder:

```
1. CONTEXT problem? → provide more context, re-dispatch with same model.
2. REASONING problem? → re-dispatch with higher effort or more capable model.
3. TASK TOO LARGE? → decompose into smaller tasks via pipeline-architect, re-dispatch each.
4. ARCHITECTURAL problem? → escalate to human. DO NOT retry same approach.
```

Track which step has been tried in `metadata.blocked_resolution_attempts`:

```json
{
  "blocked_resolution_attempts": [
    { "step": 1, "outcome": "still_blocked", "added_context": "spec.md, plan.md" },
    { "step": 2, "outcome": "still_blocked", "effort_raised_to": "high" }
  ]
}
```

After step 4 escalation, surface to user with the full attempt history.

## Worktree handling on escalation

`sk-worktree-safety` Step 4 still applies. Before any cleanup:

```bash
cd "$WORKTREE_PATH"
if ! git diff --quiet || ! git diff --cached --quiet; then
  git add -A
  git commit -m "wip: pipeline escalation checkpoint at iteration ${ITERATION_COUNT}"
fi
# Do NOT remove worktree on escalation — user may want to inspect or continue manually.
echo "Worktree preserved at $WORKTREE_PATH for human inspection."
```

## Pattern 4 fallback

If Pattern 3 escalates and the user wants to continue manually but with safety:

```
state.pattern = "4"  # switch to human-gated
state.status = "running"
re-dispatch the failing phase as Pattern 4 (gate before each modification)
```

## Reporting to user

Escalation messages must include:

- Reason (one sentence).
- Concrete evidence (test failures, error messages).
- Attempted fixes summary.
- Absolute path to preserved state and worktree.
- 2–3 concrete next-step options.

## Red Flags — STOP

- "One more iteration should do it" → STOP. The escalation triggers exist precisely to prevent this. Trust the protocol.
- "Let me silently re-dispatch with a different prompt" → NO. Re-dispatch counts as a new iteration; honor the cap.
- "I'll skip the worktree commit, the failure is the user's problem" → STOP. `WORKTREE_MERGE_REQUIRED: TRUE` applies even on escalation. Commit, then preserve.
