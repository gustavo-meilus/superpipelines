# Tasks: parity-test-j

## T-1: Scaffold pipeline directory structure

- **Description:** Create all required directories under the Tier 1b scope root (`.opencode/`). Includes `agents/` directory — Tier 1b uses agent files.
- **Files:** `{ROOT}/superpipelines/pipelines/parity-test-j/`, `{ROOT}/skills/superpipelines/parity-test-j/run-parity-test-j/`, `{ROOT}/agents/superpipelines/parity-test-j/`, `{ROOT}/output/`
- **Acceptance:** All directories exist; `{ROOT}/agents/superpipelines/parity-test-j/` exists (Tier 1b invariant); `{ROOT}/skills/superpipelines/parity-test-j/` contains only `run-parity-test-j/` (no protocol skill subdirectories — OC puts protocols in agent bodies).
- **Depends on:** none
- **Estimated turns:** 5 min

## T-2: Write analyzer agent

- **Description:** Write `analyzer.md` agent file. YAML frontmatter declares `name`, `description`, `model: opencode/big-pickle`, `plugin_version: "2.0.0"`, `version: "1.0.0"`, `permissionMode: acceptEdits`. Body ≤150 lines contains the full operational protocol: read the input CSV file, compute per-column quality metrics (null counts, IQR-based outlier detection for numeric columns, type inconsistency detection), write `findings.json` to the temp directory.
- **Files:** `{ROOT}/agents/superpipelines/parity-test-j/analyzer.md`
- **Acceptance:** Frontmatter has `model: opencode/big-pickle`; `plugin_version: "2.0.0"`; `version: "1.0.0"`; `permissionMode: acceptEdits`; body ≤150 lines; no `disallowedTools` (writer agent); no companion protocol skill; emits exactly one of DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED; `dominant_type` values are exactly one of string/integer/float/boolean/empty.
- **Depends on:** T-1
- **Estimated turns:** 10 min

## T-3: Write reviewer agent

- **Description:** Write `reviewer.md` agent file. YAML frontmatter declares `name`, `description`, `model: opencode/big-pickle`, `plugin_version: "2.0.0"`, `version: "1.0.0"`, `permissionMode: plan`, `disallowedTools: [Write, Edit, Bash]`. Body ≤150 lines contains the full read-only review protocol: read `findings.json` from temp directory, validate completeness (all columns present, required fields populated, metric values non-negative), surface verdict text in terminal output. The reviewer MUST NOT write any file or execute shell commands.
- **Files:** `{ROOT}/agents/superpipelines/parity-test-j/reviewer.md`
- **Acceptance:** Frontmatter has `model: opencode/big-pickle`; `plugin_version: "2.0.0"`; `version: "1.0.0"`; `permissionMode: plan`; `disallowedTools` includes Write, Edit, Bash; body ≤150 lines; protocol is read-only (no file writes); verdict is communicated in the terminal status output text; emits exactly one terminal status.
- **Depends on:** T-1
- **Estimated turns:** 10 min

## T-4: Write reporter agent

- **Description:** Write `reporter.md` agent file. YAML frontmatter declares `name`, `description`, `model: opencode/big-pickle`, `plugin_version: "2.0.0"`, `version: "1.0.0"`, `permissionMode: acceptEdits`. Body ≤150 lines contains the full operational protocol: read `findings.json` and reviewer verdict from the dispatch context, render final markdown data quality report, write `parity-test-j-report.md` to `output/`.
- **Files:** `{ROOT}/agents/superpipelines/parity-test-j/reporter.md`
- **Acceptance:** Frontmatter has `model: opencode/big-pickle`; `plugin_version: "2.0.0"`; `version: "1.0.0"`; `permissionMode: acceptEdits`; body ≤150 lines; no `disallowedTools`; no companion protocol skill; output path is exactly `{ROOT}/output/parity-test-j-report.md`; protocol validates JSON input before processing; emits exactly one terminal status.
- **Depends on:** T-1
- **Estimated turns:** 10 min

## T-5: Write topology.json

- **Description:** Write the pipeline topology with Tier 1b-required fields. `source_tier` must be `"tier_1b"`. Steps have `"agent"` pointing to `.md` agent files. `model_field_format` must be `"provider_prefixed"`. The single Tier 1b degradation warning must be present in `metadata.degradation_warnings`. Three steps: analyzer → reviewer → reporter. No `model_intent_scaffold_tier` field (dynamic_subagents: false, model is per-step in agent frontmatter). Reviewer step records `reviewer_isolation: "structural"`.
- **Files:** `{ROOT}/superpipelines/pipelines/parity-test-j/topology.json`
- **Acceptance:** `jq '.source_tier' topology.json` returns `"tier_1b"`. `jq '.steps[].agent' topology.json` returns `.md` paths for all steps. `jq '.metadata.model_field_format' topology.json` returns `"provider_prefixed"`. `jq '.metadata.degradation_warnings | length' topology.json` returns `1`. `jq '.plugin_version' topology.json` returns `"2.0.0"`. `jq '.steps | length' topology.json` returns `3`. `jq '.steps[1].reviewer_isolation' topology.json` returns `"structural"`.
- **Depends on:** T-2, T-3, T-4
- **Estimated turns:** 10 min

## T-6: Write entry skill run-parity-test-j

- **Description:** Write the entry skill SKILL.md with `user-invocable: true`, `disable-model-invocation: true`, and the full native-subagent dispatch protocol. Phase 0 surfaces the single Tier 1b degradation warning. Phase 1 dispatches the analyzer subagent. Phase 2 dispatches the reviewer subagent and captures verdict from its output. Phase 3 dispatches the reporter subagent (only if reviewer approved or approved_with_concerns). Phase 4 finalizes with C20 cleanup contract. Uses `DISPATCH(mode="subagent", agent="{name}", context={...})` — NOT `Task()`.
- **Files:** `{ROOT}/skills/superpipelines/parity-test-j/run-parity-test-j/SKILL.md`
- **Acceptance:** Skill has `user-invocable: true`; `disable-model-invocation: true`; contains DEGRADATION WARNINGS section listing the 1 Tier 1b warning; does NOT call `Task()`; uses `DISPATCH(mode="subagent", ...)` syntax; Phase 4 cleanup deletes temp dir on DONE/DONE_WITH_CONCERNS and preserves on BLOCKED/NEEDS_CONTEXT; no hardcoded platform paths; three distinct subagent dispatch phases; reviewer BLOCKED/rejected halts pipeline before reporter.
- **Depends on:** T-5
- **Estimated turns:** 15 min

## T-7: Write registry entry

- **Description:** Update `{ROOT}/superpipelines/registry.json` to add the `parity-test-j` entry alongside the existing `parity-test-i` entry. `agents` list MUST contain the three `.md` agent file paths. `topology_path` field must be present. `last_audit` field must be present. `source_tier` must be `"tier_1b"`. Skills list includes the entry skill only (no protocol skills on Tier 1b).
- **Files:** `{ROOT}/superpipelines/registry.json`
- **Acceptance:** `jq '.pipelines[] | select(.name == "parity-test-j") | .source_tier' registry.json` returns `"tier_1b"`. `jq '.pipelines[] | select(.name == "parity-test-j") | .agents | length' registry.json` returns `3`. `topology_path` key exists. `last_audit` key exists. `jq '.pipelines | length' registry.json` returns `2` (parity-test-i preserved).
- **Depends on:** T-6
- **Estimated turns:** 5 min

## T-8: Write launcher document parity-test-j.md

- **Description:** Write the run launcher document referencing the entry skill, registry entry, topology, and last-run state path. Include Tier 1b platform notes (native subagent dispatch, agent files with body protocols, provider_prefixed model, degradation warning active, reviewer structural isolation). Describe the three-step flow (analyzer → reviewer → reporter).
- **Files:** `{ROOT}/superpipelines/pipelines/parity-test-j/parity-test-j.md`
- **Acceptance:** File exists; contains references to `run-parity-test-j` entry skill and `topology.json`; includes note that agents use `model: opencode/big-pickle` in frontmatter; lists the 1 Tier 1b degradation warning; describes the three-step topology (analyzer → reviewer → reporter); notes that protocol is in agent body, not a companion skill; documents reviewer structural isolation mechanism.
- **Depends on:** T-7
- **Estimated turns:** 5 min
