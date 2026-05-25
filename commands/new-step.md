---
description: Add a new step to an existing pipeline — select pipeline, choose insertion point, design component, audit the delta, then gate on human approval
argument-hint: "[description of the new step]"
---

# New Step — Command Entry

Invoke the `adding-a-pipeline-step` skill. The skill owns the full protocol (PHASE 0 pipeline selection & inspection → PHASE 1 insertion design → PHASE 2 architected staging → PHASE 3 topology validation → PHASE 4 delta audit → PHASE 5 promotion & registration).

<protocol>
1. Load `Skill(superpipelines:adding-a-pipeline-step)`.
2. Pass `$ARGUMENTS` verbatim (description of the new step).
3. Follow the skill's protocol exactly. Do NOT improvise an alternative flow, do NOT collapse phases, do NOT skip the delta audit or human gate.
</protocol>

<invariants>
- The skill is the single source of truth for the workflow. This command file is a thin entry point.
- HARD-GATE: every phase 0 → 1 → 2 → 3 → 4 → 5 MUST run in that order. The command file MUST NOT embed any phase logic that would override or shortcut the skill.
- HARD-GATE: all mutations MUST stage to `temp/{P}/edit-{ts}/` first. NEVER write to final paths from this command file.
- NEVER promote without an explicit human approval gate (enforced by the skill's PHASE 5).
</invariants>
