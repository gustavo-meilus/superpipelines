# Tasks: parity-test-d

## T-1: Scaffold pipeline directory structure

- **Description:** Create all required directories and verify the scope root is accessible.
- **Files:** `{ROOT}/superpipelines/pipelines/parity-test-d/`, `{ROOT}/agents/superpipelines/parity-test-d/`, `{ROOT}/skills/superpipelines/parity-test-d/`, `{ROOT}/output/`
- **Acceptance:** All directories exist; `ls {ROOT}/agents/superpipelines/parity-test-d/` returns `scanner.md reporter.md`.
- **Depends on:** none
- **Estimated turns:** 5 min

## T-2: Write scanner agent + protocol

- **Description:** Write the zero-body `scanner.md` frontmatter agent and its companion `scanner-protocol/SKILL.md`.
- **Files:** `{ROOT}/agents/superpipelines/parity-test-d/scanner.md`, `{ROOT}/skills/superpipelines/parity-test-d/scanner-protocol/SKILL.md`
- **Acceptance:** `scanner.md` has no body text after closing `---`; `scanner-protocol/SKILL.md` has `disable-model-invocation: true` and `user-invocable: false`.
- **Depends on:** T-1
- **Estimated turns:** 10 min

## T-3: Write reporter agent + protocol

- **Description:** Write the zero-body `reporter.md` frontmatter agent and its companion `reporter-protocol/SKILL.md`.
- **Files:** `{ROOT}/agents/superpipelines/parity-test-d/reporter.md`, `{ROOT}/skills/superpipelines/parity-test-d/reporter-protocol/SKILL.md`
- **Acceptance:** `reporter.md` has no body text after closing `---`; `reporter-protocol/SKILL.md` has `disable-model-invocation: true` and `user-invocable: false`.
- **Depends on:** T-1
- **Estimated turns:** 10 min

## T-4: Write topology.json

- **Description:** Write the pipeline topology with metadata including `model_intent_scaffold_tier` for each step and Tier 1c-required fields.
- **Files:** `{ROOT}/superpipelines/pipelines/parity-test-d/topology.json`
- **Acceptance:** `jq '.metadata.model_intent_scaffold_tier' topology.json` returns an object with `scanner` and `reporter` keys both set to `"fast"`. `jq '.metadata.source_tier' topology.json` returns `"tier_1c"`.
- **Depends on:** T-2, T-3
- **Estimated turns:** 10 min

## T-5: Write entry skill run-parity-test-d

- **Description:** Write the entry skill SKILL.md with `user-invocable: true`, `disable-model-invocation: true`, and model_driven dispatch protocol.
- **Files:** `{ROOT}/skills/superpipelines/parity-test-d/run-parity-test-d/SKILL.md`
- **Acceptance:** Skill has `user-invocable: true`; contains DISPATCH section referencing sk-platform-dispatch model_driven path; does NOT call `Task()`.
- **Depends on:** T-4
- **Estimated turns:** 15 min

## T-6: Write registry entry

- **Description:** Upsert the `parity-test-d` entry into `{ROOT}/superpipelines/registry.json`.
- **Files:** `{ROOT}/superpipelines/registry.json`
- **Acceptance:** `jq '.pipelines[] | select(.name == "parity-test-d") | .source_tier' registry.json` returns `"tier_1c"`.
- **Depends on:** T-5
- **Estimated turns:** 5 min

## T-7: Write launcher document parity-test-d.md

- **Description:** Write the run launcher document referencing the entry skill, registry entry, topology, and last-run state path.
- **Files:** `{ROOT}/superpipelines/pipelines/parity-test-d/parity-test-d.md`
- **Acceptance:** File exists; contains references to `run-parity-test-d` entry skill and `topology.json`.
- **Depends on:** T-6
- **Estimated turns:** 5 min
