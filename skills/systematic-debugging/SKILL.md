---
name: systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes
---

# Systematic Debugging — Root Cause Protocol

> Establishes a rigorous methodology for identifying, isolating, and resolving technical issues. Trigger when encountering any bug, test failure, or unexpected behavior before proposing or implementing a fix.

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
- **Read**: Complete error messages, stack traces, and logs. Do not skim.
- **Reproduce**: Establish a consistent, reliable trigger for the failure.
- **Gather Evidence**: Instrument component boundaries to log data ingress/egress.
- **Trace**: Map data flow backward from the failure point to the origin of the bad state.
- <HARD-GATE>Phase 1 is complete only when you can explain exactly WHAT failed and WHY.</HARD-GATE>

### PHASE 2: PATTERN ANALYSIS
- Find working examples of similar logic in the codebase.
- Compare the broken implementation against reference standards or successful instances.
- Identify all differences, however minor; do not assume any detail "doesn't matter."

### PHASE 3: HYPOTHESIS & MINIMAL TESTING
- Form a single, specific hypothesis: "I think X is the root cause because Y."
- Make the **smallest possible change** to test the hypothesis.
- Verify the result before adding more logic. If it fails, revert the change and form a new hypothesis.

### PHASE 4: IMPLEMENTATION & VERIFICATION
- Create a minimal failing test case (using the `test-driven-development` skill).
- Implement the single fix addressing the root cause.
- Verify the fix against the test case and ensure no regressions exist.
</protocol>

<invariants>
- **No Fix Bundling**: Address only the root cause; do not include "while I'm here" refactors.
- **The 3-Fix Limit**: If three separate fix attempts have failed, **STOP**. This indicates an architectural flaw, not a simple bug. Question the fundamental pattern with the human partner.
- **Data Flow Truth**: Base fixes on observed data state at component boundaries, not on intuition.
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
