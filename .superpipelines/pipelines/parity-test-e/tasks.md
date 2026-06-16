# Tasks: parity-test-e

## T-1: Scaffold pipeline directory structure

- **Description:** Create all required directories and verify the scope root is accessible.
- **Files:** `{ROOT}/superpipelines/pipelines/parity-test-e/`, `{ROOT}/agents/superpipelines/parity-test-e/`, `{ROOT}/skills/superpipelines/parity-test-e/`, `{ROOT}/output/`
- **Acceptance:** All directories exist; `ls {ROOT}/agents/superpipelines/parity-test-e/` returns `extractor.toml formatter.toml`.
- **Depends on:** none
- **Estimated turns:** 5 min

## T-2: Write extractor agent TOML + protocol skill

- **Description:** Write the `extractor.toml` TOML agent file and its companion `extractor-protocol/SKILL.md`. The TOML file must include scalar inline `instructions = """..."""` prompt content plus Codex metadata key-value pairs.
- **Files:** `{ROOT}/agents/superpipelines/parity-test-e/extractor.toml`, `{ROOT}/skills/superpipelines/parity-test-e/extractor-protocol/SKILL.md`
- **Acceptance:** `extractor.toml` is valid TOML with `name = "extractor"`, `description`, `model = "gpt-5.4-mini"`, `model_reasoning_effort = "medium"`, `sandbox_mode = "workspace-write"`, and scalar `instructions = """..."""`. It must not contain `[[developer_instructions]]`. `extractor-protocol/SKILL.md` has `disable-model-invocation: true` and `user-invocable: false`. No `---` frontmatter block in the TOML file.
- **Depends on:** T-1
- **Estimated turns:** 10 min

## T-3: Write formatter agent TOML + protocol skill

- **Description:** Write the `formatter.toml` TOML agent file and its companion `formatter-protocol/SKILL.md`. Same scalar inline `instructions = """..."""` TOML format rules as T-2.
- **Files:** `{ROOT}/agents/superpipelines/parity-test-e/formatter.toml`, `{ROOT}/skills/superpipelines/parity-test-e/formatter-protocol/SKILL.md`
- **Acceptance:** `formatter.toml` is valid TOML with `name = "formatter"`, `description`, `model = "gpt-5.4-mini"`, `model_reasoning_effort = "medium"`, `sandbox_mode = "workspace-write"`, and scalar `instructions = """..."""`. It must not contain `[[developer_instructions]]`. `formatter-protocol/SKILL.md` has `disable-model-invocation: true` and `user-invocable: false`.
- **Depends on:** T-1
- **Estimated turns:** 10 min

## T-4: Write topology.json

- **Description:** Write the pipeline topology with Tier 1d-required fields. No `model_intent_scaffold_tier` needed; Tier 1d supports per-step model natively. `source_tier` must be `"tier_1d"`. Agent references must end in `.toml`.
- **Files:** `{ROOT}/superpipelines/pipelines/parity-test-e/topology.json`
- **Acceptance:** `jq '.source_tier' topology.json` returns `"tier_1d"`. `jq '.steps[].agent' topology.json` returns paths ending in `.toml`. `jq '.plugin_version' topology.json` returns `"2.0.0"`.
- **Depends on:** T-2, T-3
- **Estimated turns:** 10 min

## T-5: Write entry skill run-parity-test-e

- **Description:** Write the entry skill SKILL.md with `user-invocable: true`, `disable-model-invocation: true`, model_driven dispatch protocol, and cleanup contract (C20): write status:completed, delete temp dir on DONE, preserve on BLOCKED/FAILED.
- **Files:** `{ROOT}/skills/superpipelines/parity-test-e/run-parity-test-e/SKILL.md`
- **Acceptance:** Skill has `user-invocable: true`; contains DISPATCH section referencing model_driven path; does NOT call `Task()`; Phase 3 cleanup contract deletes temp dir on DONE and preserves on BLOCKED/NEEDS_CONTEXT.
- **Depends on:** T-4
- **Estimated turns:** 15 min

## T-6: Write registry entry

- **Description:** Create `{ROOT}/superpipelines/registry.json` for the Tier 1d scope with the `parity-test-e` entry. Agent paths must end in `.toml`. `topology_path` field (not `topology`) must be present. `last_audit` field must be present.
- **Files:** `{ROOT}/superpipelines/registry.json`
- **Acceptance:** `jq '.pipelines[] | select(.name == "parity-test-e") | .source_tier' registry.json` returns `"tier_1d"`. Agent list paths end in `.toml`. `topology_path` key exists.
- **Depends on:** T-5
- **Estimated turns:** 5 min

## T-7: Write launcher document parity-test-e.md

- **Description:** Write the run launcher document referencing the entry skill, registry entry, topology, and last-run state path. Include Tier 1d platform notes (TOML agents, per-step model).
- **Files:** `{ROOT}/superpipelines/pipelines/parity-test-e/parity-test-e.md`
- **Acceptance:** File exists; contains references to `run-parity-test-e` entry skill and `topology.json`; includes note that agents are TOML files.
- **Depends on:** T-6
- **Estimated turns:** 5 min
