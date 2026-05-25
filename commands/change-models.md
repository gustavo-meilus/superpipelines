---
description: Set, change, or audit model preferences for pipeline agents — interactive 6-mode workflow (global/workspace prefs, per-agent overrides, first-run wizard, catalog refresh)
argument-hint: "[optional fast-path: e.g. 'all deep to opus', 'reset tier_1', 'drift']"
---

# Change Models — Command Entry

Invoke the `change-models` skill. The skill owns the full protocol (PHASE 0 platform detection → PHASE 1 6-mode selection A–F → PHASE 2 agent selection → PHASE 3 apply → PHASE 4 verification).

<protocol>
1. Load `Skill(superpipelines:change-models)`.
2. Pass `$ARGUMENTS` verbatim. Empty args → present all six modes (HARD-GATE: never fabricate intent).
3. Follow the skill's protocol exactly. Do NOT improvise an alternative flow.
</protocol>

<invariants>
- The skill is the single source of truth for the workflow. This command file is a thin entry point.
- HARD-GATE: empty `$ARGUMENTS` MUST surface all six modes (A–F). NEVER skip PHASE 0 platform detection or PHASE 1 mode selection.
- Never embed protocol logic here that would override or shortcut the skill.
</invariants>
