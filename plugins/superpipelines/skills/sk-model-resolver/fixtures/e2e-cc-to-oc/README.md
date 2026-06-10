# E2E: CC scaffold → OC resume

Simulates a pipeline scaffolded on Claude Code being resumed on OpenCode. Verifies Phase 0.4 re-resolves every step to OC-appropriate models without touching agent files.

## Steps to verify

1. Read `pipeline-state-input.json` — represents the state file just after Phase 0.25 cross-tier detection (tier flipped to tier_1b).
2. Walk the topology: three agents — `architect (deep)`, `coder (medium)`, `formatter (fast)`.
3. For each, run `RESOLVE(agent, tier_1b_profile, prefs={})` per `../../SKILL.md`.
4. Verify the resulting `resolved_models` block matches `pipeline-state-expected.json`.
