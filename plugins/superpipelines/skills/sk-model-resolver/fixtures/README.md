# Resolver Fixtures

> Input/expected pairs for verifying `sk-model-resolver` RESOLVE algorithm. There is no automated runner; an engineer or LLM reads `input.json`, runs RESOLVE mentally per `../SKILL.md`, and diffs against `expected.json`.

## Fixture format

Each fixture directory contains:
- `input.json` — `{ agent: {...}, profile: {...}, prefs: {...} }`
- `expected.json` — the `resolved` object RESOLVE should return.

## How to verify

1. Open `input.json` and `expected.json`.
2. Walk RESOLVE step-by-step per `../SKILL.md` § RESOLVE Algorithm.
3. Compare your computed output against `expected.json`. They must match key-for-key.

## Fixture list

| Fixture | Branch tested |
|---|---|
| `cc-deep-userprefs/` | Standard tier resolution, user_prefs wins, CC profile |
| `oc-cross-tier/` | CC-scaffolded agent resolved on OC profile (cross-tier) |
| `codex-cross-family/` | CC-scaffolded agent resolved on Codex (cross-family + effort_emit_map) |
| `antigravity-dynamic/` | Dynamic-subagent platform — host_inherit branch |
