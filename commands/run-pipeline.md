---
description: List all pipelines in the current workspace (all scopes) and run the entry skill of the user-selected one
argument-hint: "[optional: --resume]"
---

# Run Pipeline — Command Entry

Invoke the `running-a-pipeline` skill. The skill owns the full protocol (PHASE 0 discovery → PHASE 0.25 tier detect → PHASE 0.4 model resolution → PHASE 0.45 v1→v2 migration check → PHASE 0.5 version compat → PHASE 0.6 portability validation → PHASE 1 resume check → PHASE 2 state init → PHASE 3 entry-skill dispatch → PHASE 4 cleanup).

<protocol>
1. Load `Skill(superpipelines:running-a-pipeline)`.
2. Pass `$ARGUMENTS` verbatim (e.g., `--resume`).
3. Follow the skill's protocol exactly. Do NOT improvise an alternative flow, do NOT collapse phases, do NOT skip phase ordering.
</protocol>

<invariants>
- The skill is the single source of truth for the workflow. This command file is a thin entry point.
- HARD-GATE: every phase 0 → 0.25 → 0.4 → 0.45 → 0.5 → 0.6 → 1 → 2 → 3 → 4 MUST run in that order. The command file MUST NOT embed any phase logic that would override or shortcut the skill.
- HARD-GATE: entry-skill inputs (e.g., `$TOPIC`) are owned by PHASE 3 inside the skill. NEVER prompt for them from this command file.
- NEVER auto-resume an `escalated` or `failed` state without explicit user confirmation (enforced by the skill's PHASE 1).
</invariants>
