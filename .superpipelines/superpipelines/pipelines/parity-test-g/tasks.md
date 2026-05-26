# Tasks: parity-test-g

## T-1: Scaffold pipeline directory structure

- **Description:** Create all required directories under the Tier 2 scope root (`.superpipelines/`). No `agents/` directory is created — Tier 2 has no agent files.
- **Files:** `{ROOT}/superpipelines/pipelines/parity-test-g/`, `{ROOT}/skills/superpipelines/parity-test-g/`, `{ROOT}/output/`
- **Acceptance:** All directories exist; NO `agents/` directory is created (Tier 2 invariant); `ls {ROOT}/skills/superpipelines/parity-test-g/` returns `run-parity-test-g/ tokenizer-protocol/ reporter-protocol/`.
- **Depends on:** none
- **Estimated turns:** 5 min

## T-2: Write tokenizer protocol skill

- **Description:** Write `tokenizer-protocol/SKILL.md`. This is a protocol skill loaded and executed inline by the entry skill. It has `disable-model-invocation: true` and `user-invocable: false`. Full operational protocol: read the input markdown file, tokenize, count frequencies (excluding stopwords), write `frequency-counts.json` to the temp directory.
- **Files:** `{ROOT}/skills/superpipelines/parity-test-g/tokenizer-protocol/SKILL.md`
- **Acceptance:** Skill has `disable-model-invocation: true`; `user-invocable: false`; no `model:` field (model_field_format: omit); protocol references `{ROOT}` only (no hardcoded platform paths); invariants section present; emits exactly one of DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
- **Depends on:** T-1
- **Estimated turns:** 10 min

## T-3: Write reporter protocol skill

- **Description:** Write `reporter-protocol/SKILL.md`. This is a protocol skill loaded and executed inline by the entry skill after the tokenizer step completes. It reads `frequency-counts.json`, selects the top-20 entries, and writes `parity-test-g-word-freq.txt` to the output directory. Has `disable-model-invocation: true` and `user-invocable: false`.
- **Files:** `{ROOT}/skills/superpipelines/parity-test-g/reporter-protocol/SKILL.md`
- **Acceptance:** Skill has `disable-model-invocation: true`; `user-invocable: false`; no `model:` field; output path is exactly `{ROOT}/output/parity-test-g-word-freq.txt`; protocol validates JSON input before processing; invariants section present; emits exactly one terminal status.
- **Depends on:** T-1
- **Estimated turns:** 10 min

## T-4: Write topology.json

- **Description:** Write the pipeline topology with Tier 2-required fields. `source_tier` must be `"tier_2"`. Steps have `"agent": null` (no agent files on Tier 2). `model_field_format` must be `"omit"`. All 3 degradation warnings from the tier_2 profile must be present in `metadata.degradation_warnings`.
- **Files:** `{ROOT}/superpipelines/pipelines/parity-test-g/topology.json`
- **Acceptance:** `jq '.source_tier' topology.json` returns `"tier_2"`. `jq '.steps[].agent' topology.json` returns `null` for all steps. `jq '.metadata.model_field_format' topology.json` returns `"omit"`. `jq '.metadata.degradation_warnings | length' topology.json` returns `3`. `jq '.plugin_version' topology.json` returns `"2.0.0"`.
- **Depends on:** T-2, T-3
- **Estimated turns:** 10 min

## T-5: Write entry skill run-parity-test-g

- **Description:** Write the entry skill SKILL.md with `user-invocable: true`, `disable-model-invocation: true`, no `model:` field (model_field_format: omit), and the full inline dispatch protocol. Phase 0 surfaces all 3 degradation warnings. Phase 1 loads tokenizer-protocol and executes inline. Phase 2 loads reporter-protocol and executes inline. Phase 3 finalizes with C20 cleanup contract (write status:completed → delete temp dir on DONE; preserve on BLOCKED/NEEDS_CONTEXT). No `Task()` call anywhere.
- **Files:** `{ROOT}/skills/superpipelines/parity-test-g/run-parity-test-g/SKILL.md`
- **Acceptance:** Skill has `user-invocable: true`; contains DEGRADATION WARNINGS section listing all 3 warnings; does NOT call `Task()`; Phase 3 cleanup deletes temp dir on DONE and preserves on BLOCKED/NEEDS_CONTEXT; no `model:` field; no platform paths hardcoded.
- **Depends on:** T-4
- **Estimated turns:** 15 min

## T-6: Write registry entry

- **Description:** Create `{ROOT}/superpipelines/registry.json` for the Tier 2 scope with the `parity-test-g` entry. `agents` list must be empty (`[]`) — Tier 2 has no agent files. `topology_path` field (not `topology`) must be present. `last_audit` field must be present. `source_tier` must be `"tier_2"`.
- **Files:** `{ROOT}/superpipelines/registry.json`
- **Acceptance:** `jq '.pipelines[] | select(.name == "parity-test-g") | .source_tier' registry.json` returns `"tier_2"`. `jq '.pipelines[] | select(.name == "parity-test-g") | .agents | length' registry.json` returns `0`. `topology_path` key exists. `last_audit` key exists.
- **Depends on:** T-5
- **Estimated turns:** 5 min

## T-7: Write launcher document parity-test-g.md

- **Description:** Write the run launcher document referencing the entry skill, registry entry, topology, and last-run state path. Include Tier 2 platform notes (inline execution, no agent files, inherit model, degradation warnings active).
- **Files:** `{ROOT}/superpipelines/pipelines/parity-test-g/parity-test-g.md`
- **Acceptance:** File exists; contains references to `run-parity-test-g` entry skill and `topology.json`; includes note that there are NO agent files; includes note that model is `inherit`; lists all 3 degradation warnings.
- **Depends on:** T-6
- **Estimated turns:** 5 min
