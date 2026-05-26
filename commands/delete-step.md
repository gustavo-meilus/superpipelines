---
description: Delete a step from an existing pipeline — select pipeline, select step, perform gap analysis, optionally rewire, audit the delta, then gate on human approval before any deletion
argument-hint: "[optional: step name]"
---

# Delete Step — Command Entry

Invoke the `deleting-a-pipeline-step` skill. The skill owns the full protocol (PHASE 0 pipeline & step selection → PHASE 1 gap analysis → PHASE 2 mutation design / rewire → PHASE 3 delta audit → PHASE 4 human approval → PHASE 5 atomic promotion).

<protocol>
1. Load `Skill(superpipelines:deleting-a-pipeline-step)`.
2. Pass `$ARGUMENTS` verbatim (optional step name).
3. Follow the skill's protocol exactly. Do NOT improvise an alternative flow, do NOT collapse phases, do NOT skip gap analysis or the human approval gate.
</protocol>

<invariants>
- The skill is the single source of truth for the workflow. This command file is a thin entry point.
- HARD-GATE: every phase 0 → 1 → 2 → 3 → 4 → 5 MUST run in that order. The command file MUST NOT embed any phase logic that would override or shortcut the skill.
- HARD-GATE: gap analysis MUST classify the gap (none | through-gap | blocking-gap) before any deletion is staged. NEVER delete a step that creates an unresolvable gap without a verified rewire plan and explicit human confirmation.
- Atomic promotion is owned by the skill's PHASE 5. NEVER write deletions to final paths from this command file.
</invariants>
