# Tasks: parity-test-c

## T-1: Scaffold pipeline directory structure

- **Description:** Create all required directories and verify the scope root is accessible.
- **Files:** `{ROOT}/superpipelines/pipelines/parity-test-c/`, `{ROOT}/agents/superpipelines/parity-test-c/`, `{ROOT}/skills/superpipelines/parity-test-c/`, `{ROOT}/output/`
- **Acceptance:** All directories exist; `ls {ROOT}/agents/superpipelines/parity-test-c/` returns `analyzer.md summarizer.md`.
- **Depends on:** none
- **Estimated turns:** 5 min

## T-2: Write analyzer agent + protocol

- **Description:** Write the zero-body `analyzer.md` frontmatter agent and its companion `analyzer-protocol/SKILL.md`.
- **Files:** `{ROOT}/agents/superpipelines/parity-test-c/analyzer.md`, `{ROOT}/skills/superpipelines/parity-test-c/analyzer-protocol/SKILL.md`
- **Acceptance:** `analyzer.md` has no body text after closing `---`; `analyzer-protocol/SKILL.md` has `disable-model-invocation: true` and `user-invocable: false`.
- **Depends on:** T-1
- **Estimated turns:** 10 min

## T-3: Write summarizer agent + protocol

- **Description:** Write the zero-body `summarizer.md` frontmatter agent and its companion `summarizer-protocol/SKILL.md`.
- **Files:** `{ROOT}/agents/superpipelines/parity-test-c/summarizer.md`, `{ROOT}/skills/superpipelines/parity-test-c/summarizer-protocol/SKILL.md`
- **Acceptance:** `summarizer.md` has no body text after closing `---`; `summarizer-protocol/SKILL.md` has `disable-model-invocation: true` and `user-invocable: false`.
- **Depends on:** T-1
- **Estimated turns:** 10 min

## T-4: Write topology.json

- **Description:** Write the pipeline topology with metadata including `model_intent_scaffold_tier` for each step and Tier 1c-required fields.
- **Files:** `{ROOT}/superpipelines/pipelines/parity-test-c/topology.json`
- **Acceptance:** `jq '.metadata.model_intent_scaffold_tier' topology.json` returns an object with `analyzer` and `summarizer` keys both set to `"medium"`. `jq '.metadata.source_tier' topology.json` returns `"tier_1c"`.
- **Depends on:** T-2, T-3
- **Estimated turns:** 10 min

## T-5: Write entry skill run-parity-test-c

- **Description:** Write the entry skill SKILL.md with `user-invocable: true`, `disable-model-invocation: true`, and model_driven dispatch protocol.
- **Files:** `{ROOT}/skills/superpipelines/parity-test-c/run-parity-test-c/SKILL.md`
- **Acceptance:** Skill has `user-invocable: true`; contains DISPATCH section referencing sk-platform-dispatch model_driven path; does NOT call `Task()`.
- **Depends on:** T-4
- **Estimated turns:** 15 min

## T-6: Write registry entry

- **Description:** Upsert the `parity-test-c` entry into `{ROOT}/superpipelines/registry.json`.
- **Files:** `{ROOT}/superpipelines/registry.json`
- **Acceptance:** `jq '.pipelines[] | select(.name == "parity-test-c") | .source_tier' registry.json` returns `"tier_1c"`.
- **Depends on:** T-5
- **Estimated turns:** 5 min

## T-7: Write launcher document parity-test-c.md

- **Description:** Write the run launcher document referencing the entry skill, registry entry, topology, and last-run state path.
- **Files:** `{ROOT}/superpipelines/pipelines/parity-test-c/parity-test-c.md`
- **Acceptance:** File exists; contains references to `run-parity-test-c` entry skill and `topology.json`.
- **Depends on:** T-6
- **Estimated turns:** 5 min
