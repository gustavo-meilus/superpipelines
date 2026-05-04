---
name: verification-before-completion
description: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always
---

# Verification Before Completion — Success Protocol

> Requires absolute evidence before any claim of task completion, bug resolution, or system readiness. Trigger when about to conclude a task, fixed a bug, or claim a system state is passing before committing changes or creating PRs.

<overview>
Verification Before Completion is governed by the Iron Law: **NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE**. It prohibits the use of "should," "probably," or "seems to" in favor of documented command output and logs, ensuring that success is a verifiable fact rather than an assumption.
</overview>

<glossary>
  <term name="Gate Function">A mandatory five-step sequence (Identify, Run, Read, Verify, Claim) that must be completed before communicating success.</term>
  <term name="Evidence before Claim">The requirement to execute a verification command and analyze its output before stating a status.</term>
  <term name="Regression Verification">A Red-Green cycle proving that a test not only passes now but would have failed without the fix.</term>
</glossary>

## The Success Protocol

<protocol>
### THE GATE FUNCTION
1. **IDENTIFY**: Determine exactly which command or action proves the claim.
2. **RUN**: Execute the full, fresh verification command.
3. **READ**: Analyze the complete output, check exit codes, and count failures.
4. **VERIFY**: Confirm the output matches the success criteria of the original requirement.
5. **CLAIM**: State the completion status alongside the supporting evidence.

<invariant>Skip any step = failure of the verification protocol.</invariant>
</protocol>

<invariants>
- NEVER express satisfaction ("Great!", "Perfect!") before running verification.
- NEVER trust a subagent's "DONE" report without inspecting the VCS diff and running local tests.
- ALWAYS perform a Red-Green cycle for regression tests to prove the test's validity.
- Linter clean state is NOT a proxy for build success or logic correctness.
</invariants>

## Verification Patterns

<patterns>
| Quality | Goal | Required Evidence |
| :--- | :--- | :--- |
| **Tests** | All green | Command output showing `0 failures` across the entire suite. |
| **Linter** | Clean state | Command output showing `0 errors` and `0 warnings`. |
| **Build** | Successful binary | Execution log showing `exit 0` and artifact generation. |
| **Bug Fix** | Resolved symptom | Reproduction script passing + Red-Green verification. |
| **Requirements** | Spec compliance | Line-by-line checklist verification against `spec.md`. |
</patterns>

## Red Flags — STOP
- "It should work now." → **STOP**. Run the verification command.
- "I'm confident it's fixed." → **STOP**. Confidence is not evidence.
- "The agent said it was done." → **STOP**. Subagents are non-deterministic; verify independently.
- "I'll do a partial check to save time." → **STOP**. Partial verification proves nothing about system integration.

## Rationalization Table

<rationalization_table>
| Excuse | Reality |
| :--- | :--- |
| "I manually verified it." | Manual verification is non-reproducible and prone to observation bias. |
| "It's just a small fix." | Small fixes cause the majority of production regressions. |
| "I'm tired/in a hurry." | Exhaustion increases the probability of overlooking silent failures. |
| "Spirit over ritual." | The ritual of evidence is what protects the system's integrity. |
</rationalization_table>

## Reference Files
- `systematic-debugging/SKILL.md` — Root cause investigation.
- `test-driven-development/SKILL.md` — Red-Green cycle rules.
- `sk-write-review-isolation/SKILL.md` — Two-stage review protocol.
- `sk-worktree-safety/SKILL.md` — Integration verification.
