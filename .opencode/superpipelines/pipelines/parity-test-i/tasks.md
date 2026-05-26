# Tasks: parity-test-i

## T-1: Scaffold pipeline directory structure

- **Description:** Create all required directories under the Tier 1b scope root (`.opencode/`). Includes `agents/` directory — Tier 1b uses agent files.
- **Files:** `{ROOT}/superpipelines/pipelines/parity-test-i/`, `{ROOT}/skills/superpipelines/parity-test-i/run-parity-test-i/`, `{ROOT}/agents/superpipelines/parity-test-i/`, `{ROOT}/output/`
- **Acceptance:** All directories exist; `{ROOT}/agents/superpipelines/parity-test-i/` exists (Tier 1b invariant); `{ROOT}/skills/superpipelines/parity-test-i/` contains only `run-parity-test-i/` (no protocol skill subdirectories — OC puts protocols in agent bodies).
- **Depends on:** none
- **Estimated turns:** 5 min

## T-2: Write inspector agent

- **Description:** Write `inspector.md` agent file. YAML frontmatter declares `name`, `description`, `model: opencode/big-pickle`, `plugin_version: "2.0.0"`, `version: "1.0.0"`, `permissionMode: acceptEdits`. Body ≤150 lines contains the full operational protocol: read the input JSON file, extract each top-level key and its value type, write `key-type-data.json` to the temp directory.
- **Files:** `{ROOT}/agents/superpipelines/parity-test-i/inspector.md`
- **Acceptance:** Frontmatter has `model: opencode/big-pickle`; `plugin_version: "2.0.0"`; `version: "1.0.0"`; `permissionMode: acceptEdits`; body ≤150 lines; no `disallowedTools` (writer agent); no companion protocol skill; emits exactly one of DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED; key types are exactly one of string/number/boolean/object/array/null.
- **Depends on:** T-1
- **Estimated turns:** 10 min

## T-3: Write formatter agent

- **Description:** Write `formatter.md` agent file. YAML frontmatter declares `name`, `description`, `model: opencode/big-pickle`, `plugin_version: "2.0.0"`, `version: "1.0.0"`, `permissionMode: acceptEdits`. Body ≤150 lines contains the full operational protocol: read `key-type-data.json` from temp directory, format human-readable summary with one line per key, write `parity-test-i-summary.txt` to output/.
- **Files:** `{ROOT}/agents/superpipelines/parity-test-i/formatter.md`
- **Acceptance:** Frontmatter has `model: opencode/big-pickle`; `plugin_version: "2.0.0"`; `version: "1.0.0"`; `permissionMode: acceptEdits`; body ≤150 lines; no `disallowedTools`; no companion protocol skill; output path is exactly `{ROOT}/output/parity-test-i-summary.txt`; protocol validates JSON input before processing; emits exactly one terminal status.
- **Depends on:** T-1
- **Estimated turns:** 10 min

## T-4: Write topology.json

- **Description:** Write the pipeline topology with Tier 1b-required fields. `source_tier` must be `"tier_1b"`. Steps have `"agent"` pointing to `.md` agent files. `model_field_format` must be `"provider_prefixed"`. The single Tier 1b degradation warning must be present in `metadata.degradation_warnings`. Two steps: inspector → formatter. No `model_intent_scaffold_tier` field (dynamic_subagents: false, model is per-step in agent frontmatter).
- **Files:** `{ROOT}/superpipelines/pipelines/parity-test-i/topology.json`
- **Acceptance:** `jq '.source_tier' topology.json` returns `"tier_1b"`. `jq '.steps[].agent' topology.json` returns `.md` paths for all steps. `jq '.metadata.model_field_format' topology.json` returns `"provider_prefixed"`. `jq '.metadata.degradation_warnings | length' topology.json` returns `1`. `jq '.plugin_version' topology.json` returns `"2.0.0"`. `jq '.steps | length' topology.json` returns `2`.
- **Depends on:** T-2, T-3
- **Estimated turns:** 10 min

## T-5: Write entry skill run-parity-test-i

- **Description:** Write the entry skill SKILL.md with `user-invocable: true`, `disable-model-invocation: true`, and the full native-subagent dispatch protocol. Phase 0 surfaces the single Tier 1b degradation warning. Phase 1 dispatches the inspector subagent. Phase 2 dispatches the formatter subagent. Phase 3 finalizes with C20 cleanup contract. Uses `DISPATCH(mode="subagent", agent="{name}", context={...})` — NOT `Task()`.
- **Files:** `{ROOT}/skills/superpipelines/parity-test-i/run-parity-test-i/SKILL.md`
- **Acceptance:** Skill has `user-invocable: true`; `disable-model-invocation: true`; contains DEGRADATION WARNINGS section listing the 1 Tier 1b warning; does NOT call `Task()`; uses `DISPATCH(mode="subagent", ...)` syntax; Phase 3 cleanup deletes temp dir on DONE/DONE_WITH_CONCERNS and preserves on BLOCKED/NEEDS_CONTEXT; no hardcoded platform paths; two distinct subagent dispatch phases for inspector and formatter.
- **Depends on:** T-4
- **Estimated turns:** 15 min

## T-6: Write registry entry

- **Description:** Create `{ROOT}/superpipelines/registry.json` for the `.opencode/` scope with the `parity-test-i` entry. `agents` list MUST contain the two `.md` agent file paths. `topology_path` field (not `topology`) must be present. `last_audit` field must be present. `source_tier` must be `"tier_1b"`. Skills list includes the entry skill only (no protocol skills on Tier 1b).
- **Files:** `{ROOT}/superpipelines/registry.json`
- **Acceptance:** `jq '.pipelines[] | select(.name == "parity-test-i") | .source_tier' registry.json` returns `"tier_1b"`. `jq '.pipelines[] | select(.name == "parity-test-i") | .agents | length' registry.json` returns `2`. `topology_path` key exists. `last_audit` key exists. `jq '.pipelines | length' registry.json` returns `1`.
- **Depends on:** T-5
- **Estimated turns:** 5 min

## T-7: Write launcher document parity-test-i.md

- **Description:** Write the run launcher document referencing the entry skill, registry entry, topology, and last-run state path. Include Tier 1b platform notes (native subagent dispatch, agent files with body protocols, provider_prefixed model, degradation warning active). Describe the two-step flow (inspector → formatter).
- **Files:** `{ROOT}/superpipelines/pipelines/parity-test-i/parity-test-i.md`
- **Acceptance:** File exists; contains references to `run-parity-test-i` entry skill and `topology.json`; includes note that agents use `model: opencode/big-pickle` in frontmatter; lists the 1 Tier 1b degradation warning; describes the two-step topology (inspector → formatter); notes that protocol is in agent body, not a companion skill.
- **Depends on:** T-6
- **Estimated turns:** 5 min
