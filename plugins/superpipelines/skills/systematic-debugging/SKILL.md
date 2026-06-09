---
name: systematic-debugging
description: Enforces root-cause investigation before any fix is proposed or implemented. Use when encountering a bug, test failure, or unexpected behavior, before proposing or implementing a fix.
---

# Systematic Debugging — Root Cause Protocol

> Establishes a rigorous methodology for identifying, isolating, and resolving technical issues before any fix is proposed.

<overview>
Systematic Debugging is based on the Iron Law: **NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST**. It replaces guess-and-check thrashing with a scientific method—Read, Reproduce, Hypothesize, and Test—ensuring that fixes address the underlying problem rather than masking symptoms.
</overview>

<glossary>
  <term name="Root Cause">The original source of a failure; fixing it prevents the symptom from recurring.</term>
  <term name="Symptom Fix">A patch that hides a failure without addressing the cause; leads to technical debt and regression.</term>
  <term name="Iron Law">The non-negotiable rule prohibiting any fix proposal until Phase 1 is complete.</term>
</glossary>

## The Debugging Protocol

<protocol>
### PHASE 1: ROOT CAUSE INVESTIGATION
- **Read**: Complete error messages, stack traces, and logs are read in full — no skimming.
- **Reproduce**: A consistent, reliable trigger for the failure is established before proceeding.
- **Gather Evidence**: Component boundaries are instrumented to log data ingress/egress. Example: adding `console.log` at each function boundary to observe where a value becomes `undefined`.
- **Trace**: Data flow is mapped backward from the failure point to the origin of the bad state.
- <HARD-GATE>Phase 1 is complete only when the agent can explain exactly WHAT failed and WHY.</HARD-GATE>

### PHASE 2: PATTERN ANALYSIS
- Working examples of similar logic in the codebase are located and examined.
- The broken implementation is compared against reference standards or successful instances.
- All differences are identified, however minor; no detail is assumed to be irrelevant.

### PHASE 3: HYPOTHESIS & MINIMAL TESTING
- A single, specific hypothesis is formed: "X is the root cause because Y."
- The **smallest possible change** is made to test the hypothesis. Example: a one-line guard clause rather than a multi-function refactor.
- The result is verified before adding more logic. If it fails, the change is reverted and a new hypothesis is formed.

### PHASE 4: IMPLEMENTATION & VERIFICATION
- A minimal failing test case is created (using the `test-driven-development` skill).
- A single fix addressing the root cause is implemented.
- The fix is verified against the test case and checked for regressions.
</protocol>

<invariants>
- **No Fix Bundling**: Only the root cause is addressed; "while I'm here" refactors are deferred.
- **The 3-Fix Limit**: If three separate fix attempts have failed, **STOP**. This indicates an architectural flaw, not a simple bug. The fundamental pattern is questioned with the human partner before continuing.
- **Data Flow Truth**: Fixes are based on observed data state at component boundaries, not on intuition.
</invariants>

## Red Flags — STOP
- "Quick fix for now, investigate later." → **STOP**. Symptom fixes are failure.
- "Just try changing X and see if it works." → **STOP**. This is guessing, not debugging.
- "I'll skip the test; I manually verified it." → **STOP**. Untested fixes are guaranteed regressions.
- "Each fix reveals a new problem in a different place." → **STOP**. This is a signal of an architectural failure (The 3-Fix Limit).

## Rationalization Table

<rationalization_table>
| Excuse | Reality |
| :--- | :--- |
| "The issue is too simple for process." | Simple issues have root causes. Process is faster than guessing even for minor bugs. |
| "Emergency, no time for investigation." | Systematic debugging is 5x faster than guess-and-check thrashing during crises. |
| "I see the problem, let me fix it." | Seeing a symptom is not the same as understanding the trigger. |
| "Multiple fixes at once save time." | Bundled fixes make it impossible to isolate the true resolution. |
</rationalization_table>

## Reference Files
- `test-driven-development/SKILL.md` — Creating failing tests.
- `verification-before-completion/SKILL.md` — Final verification protocol.
- `sk-pipeline-state/SKILL.md` — Debugging state corruption.
- `root-cause-tracing.md` — Backward tracing techniques.
