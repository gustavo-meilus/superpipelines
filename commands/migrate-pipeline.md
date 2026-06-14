---
description: Migrate an existing pre-v2 per-tier pipeline (.claude/, .opencode/, .agents/codex/) into the unified data-only .superpipelines/ layout — select legacy pipeline, translate frontmatter to canonical agent defs, stage, delta-audit, gate on human approval, then atomically promote, rewrite the registry, and move the legacy artifacts
argument-hint: "[optional: pipeline name]"
---

# Migrate Pipeline — Command Entry

Invoke the `migrating-a-pipeline` skill. The skill owns the full protocol (PHASE 0 legacy selection → PHASE 1 translation analysis → PHASE 2 stage CAD + entry.md → PHASE 3 delta audit → PHASE 4 human approval → PHASE 5 atomic promotion + registry rewrite + git checkpoint pair + legacy move).

<protocol>
1. Load `Skill(superpipelines:migrating-a-pipeline)`.
2. Pass `$ARGUMENTS` verbatim (optional pipeline name).
3. Follow the skill's protocol exactly. Do NOT improvise an alternative flow, do NOT collapse phases, do NOT skip the delta audit or the human approval gate.
</protocol>

<invariants>
- The skill is the single source of truth for the workflow. This command file is a thin entry point.
- HARD-GATE: every phase 0 → 1 → 2 → 3 → 4 → 5 MUST run in that order. The command file MUST NOT embed any phase logic that would override or shortcut the skill.
- HARD-GATE: NEVER write generated artifacts to a legacy scope root. Migration writes only under `.superpipelines/`; the only legacy-root mutation is the delete-at-promotion step in PHASE 5.
- HARD-GATE: legacy artifacts are deleted ONLY after the data-only copy is promoted AND a git checkpoint (or an explicit no-anchor confirmation) exists. Atomic promotion + registry rewrite + git checkpoint are owned by PHASE 5. NEVER promote or delete from this command file.
</invariants>
