---
description: Update an existing step in a pipeline — select pipeline, select step, apply changes, re-validate edges, audit the delta, then gate on human approval
argument-hint: "[description of changes to the step]"
---

# Update Step — Command Entry

Invoke the `updating-a-pipeline-step` skill. The skill owns the full protocol (PHASE 0 pipeline & step selection → PHASE 1 impact analysis 4D → PHASE 2 edge re-validation → PHASE 3 architected staging → PHASE 4 delta audit → PHASE 5 human approval & promotion).

<protocol>
1. Load `Skill(superpipelines:updating-a-pipeline-step)`.
2. Pass `$ARGUMENTS` verbatim (description of changes to the step).
3. Follow the skill's protocol exactly. Do NOT improvise an alternative flow, do NOT collapse phases, do NOT skip edge re-validation or the delta audit.
</protocol>

<invariants>
- The skill is the single source of truth for the workflow. This command file is a thin entry point.
- HARD-GATE: every phase 0 → 1 → 2 → 3 → 4 → 5 MUST run in that order. The command file MUST NOT embed any phase logic that would override or shortcut the skill.
- HARD-GATE: edge re-validation and impact propagation are owned by the skill. NEVER apply changes to final paths before the delta audit returns PASS.
- Atomic consistency between component code and `topology.json` is enforced by the skill's PHASE 5 promotion step.
</invariants>
