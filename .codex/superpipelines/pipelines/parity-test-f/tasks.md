# Tasks: parity-test-f

## T-1: Scaffold pipeline directory structure

- **Description:** Create all required directories and verify the scope root is accessible.
- **Files:** `{ROOT}/superpipelines/pipelines/parity-test-f/`, `{ROOT}/agents/superpipelines/parity-test-f/`, `{ROOT}/skills/superpipelines/parity-test-f/`, `{ROOT}/output/`
- **Acceptance:** All directories exist; `ls {ROOT}/agents/superpipelines/parity-test-f/` returns `analyzer.toml formatter.toml reporter.toml`.
- **Depends on:** none
- **Estimated turns:** 5 min

## T-2: Write analyzer agent TOML + protocol skill

- **Description:** Write the `analyzer.toml` TOML agent file and its companion `analyzer-protocol/SKILL.md`. The TOML file must have no body text — only TOML key-value pairs. Protocol skill supplies full operational instructions.
- **Files:** `{ROOT}/agents/superpipelines/parity-test-f/analyzer.toml`, `{ROOT}/skills/superpipelines/parity-test-f/analyzer-protocol/SKILL.md`
- **Acceptance:** `analyzer.toml` is valid TOML with `model = "gpt-5.4-mini"`, `model_reasoning_effort = "medium"`, `sandbox_mode = "workspace-write"`, `version = "1.0.0"`, `plugin_version = "2.0.0"`. `analyzer-protocol/SKILL.md` has `disable-model-invocation: true` and `user-invocable: false`. No `---` frontmatter block in the TOML file.
- **Depends on:** T-1
- **Estimated turns:** 10 min

## T-3: Write reviewer agent TOML + protocol skill

- **Description:** Write the `reviewer.toml` TOML agent file and its companion `reviewer-protocol/SKILL.md`. CRITICAL: `sandbox_mode = "read-only"` is MANDATORY for the reviewer per the Tier 1d `reviewer_isolation_recipe`. The TOML file must have no body text — only TOML key-value pairs.
- **Files:** `{ROOT}/agents/superpipelines/parity-test-f/reviewer.toml`, `{ROOT}/skills/superpipelines/parity-test-f/reviewer-protocol/SKILL.md`
- **Acceptance:** `reviewer.toml` is valid TOML with `model = "gpt-5.5"`, `model_reasoning_effort = "high"`, `sandbox_mode = "read-only"` (NOT "workspace-write"), `version = "1.0.0"`, `plugin_version = "2.0.0"`. `reviewer-protocol/SKILL.md` has `disable-model-invocation: true` and `user-invocable: false`.
- **Depends on:** T-1
- **Estimated turns:** 10 min

## T-4: Write reporter agent TOML + protocol skill

- **Description:** Write the `reporter.toml` TOML agent file and its companion `reporter-protocol/SKILL.md`. Same TOML format rules as T-2.
- **Files:** `{ROOT}/agents/superpipelines/parity-test-f/reporter.toml`, `{ROOT}/skills/superpipelines/parity-test-f/reporter-protocol/SKILL.md`
- **Acceptance:** `reporter.toml` is valid TOML with `model = "gpt-5.4-mini"`, `model_reasoning_effort = "medium"`, `sandbox_mode = "workspace-write"`, `version = "1.0.0"`, `plugin_version = "2.0.0"`. `reporter-protocol/SKILL.md` has `disable-model-invocation: true` and `user-invocable: false`.
- **Depends on:** T-1
- **Estimated turns:** 10 min

## T-5: Write topology.json

- **Description:** Write the pipeline topology with Tier 1d-required fields. No `model_intent_scaffold_tier` needed — Tier 1d supports per-step model natively. `source_tier` must be `"tier_1d"`. Agent references must end in `.toml`. Reviewer step must declare `sandbox_mode: "read-only"`.
- **Files:** `{ROOT}/superpipelines/pipelines/parity-test-f/topology.json`
- **Acceptance:** `jq '.source_tier' topology.json` returns `"tier_1d"`. `jq '.steps[].agent' topology.json` returns paths ending in `.toml`. `jq '.plugin_version' topology.json` returns `"2.0.0"`. `jq '.steps[] | select(.step_id=="reviewer") | .sandbox_mode' topology.json` returns `"read-only"`.
- **Depends on:** T-2, T-3, T-4
- **Estimated turns:** 10 min

## T-6: Write entry skill run-parity-test-f

- **Description:** Write the entry skill SKILL.md with `user-invocable: true`, `disable-model-invocation: true`, model_driven dispatch protocol (three phases: analyzer → reviewer → reporter), and cleanup contract (C20): write status:completed → delete temp dir on DONE, preserve on BLOCKED/FAILED.
- **Files:** `{ROOT}/skills/superpipelines/parity-test-f/run-parity-test-f/SKILL.md`
- **Acceptance:** Skill has `user-invocable: true`; contains DISPATCH sections referencing all three agents in order; does NOT call `Task()`; Phase 4 cleanup contract deletes temp dir on DONE and preserves on BLOCKED/NEEDS_CONTEXT.
- **Depends on:** T-5
- **Estimated turns:** 15 min

## T-7: Write registry entry

- **Description:** Update `{ROOT}/superpipelines/registry.json` to add the `parity-test-f` pipeline entry alongside the existing `parity-test-e` entry. Agent paths must end in `.toml`. `topology_path` field (not `topology`) must be present. `last_audit` field must be present.
- **Files:** `{ROOT}/superpipelines/registry.json`
- **Acceptance:** `jq '.pipelines[] | select(.name == "parity-test-f") | .source_tier' registry.json` returns `"tier_1d"`. Agent list has three paths all ending in `.toml`. `topology_path` key exists. `parity-test-e` entry is preserved.
- **Depends on:** T-6
- **Estimated turns:** 5 min

## T-8: Write launcher document parity-test-f.md

- **Description:** Write the run launcher document referencing the entry skill, registry entry, topology, and last-run state path. Include Tier 1d platform notes (TOML agents, per-step model, reviewer sandbox isolation).
- **Files:** `{ROOT}/superpipelines/pipelines/parity-test-f/parity-test-f.md`
- **Acceptance:** File exists; contains references to `run-parity-test-f` entry skill and `topology.json`; includes note that agents are TOML files and that the reviewer uses `sandbox_mode = "read-only"`.
- **Depends on:** T-7
- **Estimated turns:** 5 min
