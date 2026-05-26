---
description: Design and scaffold a new named multi-agent pipeline with git preflight, scope selection, pre-gate audit, and entry-skill generation
argument-hint: "[brief description of the pipeline]"
---

# New Pipeline — Command Entry

Invoke the `creating-a-pipeline` skill. The skill owns the full protocol (PHASE 0 tier detect → PHASE 0b git preflight → PHASE 1 scope & identity → PHASE 2 brief refinement 4D → PHASE 3 pattern selection → PHASE 4 design & audit loop → PHASE 5 human approval → PHASE 6 finalization).

<protocol>
1. Load `Skill(superpipelines:creating-a-pipeline)`.
2. Pass `$ARGUMENTS` verbatim (brief description of the pipeline).
3. Follow the skill's protocol exactly. Do NOT improvise an alternative flow, do NOT collapse phases, do NOT skip git preflight or the pre-gate audit.
</protocol>

<invariants>
- The skill is the single source of truth for the workflow. This command file is a thin entry point.
- HARD-GATE: every phase 0 → 0b → 1 → 2 → 3 → 4 → 5 → 6 MUST run in that order. The command file MUST NOT embed any phase logic that would override or shortcut the skill.
- HARD-GATE: scope selection, git preflight, and pre-gate audit are owned by the skill. NEVER skip them from this command file.
- NEVER proceed to scaffold generation without explicit human approval in PHASE 5 (enforced by the skill).
</invariants>
