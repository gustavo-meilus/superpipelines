# Tasks: parity-test-h

## T-1: Scaffold pipeline directory structure

- **Description:** Create all required directories under the Tier 2 scope root (`.superpipelines/`). No `agents/` directory is created — Tier 2 has no agent files.
- **Files:** `{ROOT}/superpipelines/pipelines/parity-test-h/`, `{ROOT}/skills/superpipelines/parity-test-h/`, `{ROOT}/output/`
- **Acceptance:** All directories exist; NO `agents/` directory is created (Tier 2 invariant); `ls {ROOT}/skills/superpipelines/parity-test-h/` returns `run-parity-test-h/ validator-protocol/ reviewer-protocol/ reporter-protocol/`.
- **Depends on:** none
- **Estimated turns:** 5 min

## T-2: Write validator protocol skill

- **Description:** Write `validator-protocol/SKILL.md`. This is a protocol skill loaded and executed inline by the entry skill. It has `disable-model-invocation: true` and `user-invocable: false`. Full operational protocol: read the input YAML config file, parse it, check for required fields, type mismatches, and deprecated keys, write `validator-findings.json` to the temp directory.
- **Files:** `{ROOT}/skills/superpipelines/parity-test-h/validator-protocol/SKILL.md`
- **Acceptance:** Skill has `disable-model-invocation: true`; `user-invocable: false`; no `model:` field (model_field_format: omit); protocol references `{ROOT}` only (no hardcoded platform paths); invariants section present; emits exactly one of DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
- **Depends on:** T-1
- **Estimated turns:** 10 min

## T-3: Write reviewer protocol skill

- **Description:** Write `reviewer-protocol/SKILL.md`. This is a protocol skill loaded and executed inline by the entry skill after the validator step completes. It applies the C19 self-skepticism preamble (convention-only isolation), reads `validator-findings.json`, reviews each finding for false positives by re-deriving from raw YAML inputs, and writes `reviewed-findings.json` to the temp directory. Has `disable-model-invocation: true` and `user-invocable: false`.
- **Files:** `{ROOT}/skills/superpipelines/parity-test-h/reviewer-protocol/SKILL.md`
- **Acceptance:** Skill has `disable-model-invocation: true`; `user-invocable: false`; no `model:` field; Protocol section opens with the C19 self-skepticism preamble verbatim; reviewer re-reads the source YAML directly rather than relying solely on validator output; outputs `reviewed-findings.json` with `review_status` per finding; invariants section present; emits exactly one terminal status.
- **Depends on:** T-1
- **Estimated turns:** 10 min

## T-4: Write reporter protocol skill

- **Description:** Write `reporter-protocol/SKILL.md`. This is a protocol skill loaded and executed inline by the entry skill after the reviewer step completes. It reads `reviewed-findings.json`, formats a structured markdown validation report, and writes `parity-test-h-validation-report.md` to the output directory. Has `disable-model-invocation: true` and `user-invocable: false`.
- **Files:** `{ROOT}/skills/superpipelines/parity-test-h/reporter-protocol/SKILL.md`
- **Acceptance:** Skill has `disable-model-invocation: true`; `user-invocable: false`; no `model:` field; output path is exactly `{ROOT}/output/parity-test-h-validation-report.md`; protocol validates JSON input before processing; report contains separate sections for required-field violations, type mismatches, and deprecated keys; dismissed findings are listed in a separate section; invariants section present; emits exactly one terminal status.
- **Depends on:** T-1
- **Estimated turns:** 10 min

## T-5: Write topology.json

- **Description:** Write the pipeline topology with Tier 2-required fields. `source_tier` must be `"tier_2"`. Steps have `"agent": null` (no agent files on Tier 2). `model_field_format` must be `"omit"`. All 3 degradation warnings from the tier_2 profile must be present in `metadata.degradation_warnings`. Three steps: validator → reviewer → reporter.
- **Files:** `{ROOT}/superpipelines/pipelines/parity-test-h/topology.json`
- **Acceptance:** `jq '.source_tier' topology.json` returns `"tier_2"`. `jq '.steps[].agent' topology.json` returns `null` for all steps. `jq '.metadata.model_field_format' topology.json` returns `"omit"`. `jq '.metadata.degradation_warnings | length' topology.json` returns `3`. `jq '.plugin_version' topology.json` returns `"2.0.0"`. `jq '.steps | length' topology.json` returns `3`.
- **Depends on:** T-2, T-3, T-4
- **Estimated turns:** 10 min

## T-6: Write entry skill run-parity-test-h

- **Description:** Write the entry skill SKILL.md with `user-invocable: true`, `disable-model-invocation: true`, no `model:` field (model_field_format: omit), and the full inline dispatch protocol. Phase 0 surfaces all 3 degradation warnings. Phase 1 loads validator-protocol and executes inline. Phase 2 loads reviewer-protocol and executes inline. Phase 3 loads reporter-protocol and executes inline. Phase 4 finalizes with C20 cleanup contract (write status:completed → delete temp dir on DONE; preserve on BLOCKED/NEEDS_CONTEXT). No `Task()` call anywhere.
- **Files:** `{ROOT}/skills/superpipelines/parity-test-h/run-parity-test-h/SKILL.md`
- **Acceptance:** Skill has `user-invocable: true`; contains DEGRADATION WARNINGS section listing all 3 warnings; does NOT call `Task()`; Phase 4 cleanup deletes temp dir on DONE and preserves on BLOCKED/NEEDS_CONTEXT; no `model:` field; no platform paths hardcoded; three distinct inline execution phases for validator, reviewer, and reporter.
- **Depends on:** T-5
- **Estimated turns:** 15 min

## T-7: Write registry entry

- **Description:** Update `{ROOT}/superpipelines/registry.json` to add the `parity-test-h` entry while keeping `parity-test-g`. `agents` list must be empty (`[]`) — Tier 2 has no agent files. `topology_path` field (not `topology`) must be present. `last_audit` field must be present. `source_tier` must be `"tier_2"`. Skills list includes all 4 skills (entry + 3 protocol skills).
- **Files:** `{ROOT}/superpipelines/registry.json`
- **Acceptance:** `jq '.pipelines[] | select(.name == "parity-test-h") | .source_tier' registry.json` returns `"tier_2"`. `jq '.pipelines[] | select(.name == "parity-test-h") | .agents | length' registry.json` returns `0`. `topology_path` key exists. `last_audit` key exists. `jq '.pipelines | length' registry.json` returns `2` (parity-test-g preserved).
- **Depends on:** T-6
- **Estimated turns:** 5 min

## T-8: Write launcher document parity-test-h.md

- **Description:** Write the run launcher document referencing the entry skill, registry entry, topology, and last-run state path. Include Tier 2 platform notes (inline execution, no agent files, inherit model, degradation warnings active). Include note about the three-step flow with the convention-only reviewer.
- **Files:** `{ROOT}/superpipelines/pipelines/parity-test-h/parity-test-h.md`
- **Acceptance:** File exists; contains references to `run-parity-test-h` entry skill and `topology.json`; includes note that there are NO agent files; includes note that model is `inherit`; lists all 3 degradation warnings; describes the three-step topology (validator → reviewer → reporter) with the C19 reviewer note.
- **Depends on:** T-7
- **Estimated turns:** 5 min
