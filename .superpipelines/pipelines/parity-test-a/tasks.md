# Tasks: parity-test-a

## T-1: Write reader agent and protocol skill

- **Description:** Write zero-body `reader.md` frontmatter and companion `reader-protocol/SKILL.md`. Frontmatter declares `model_tier: fast`, `effort_tier: medium`, `plugin_version: "2.0.0"`, `permissionMode: acceptEdits`. Protocol reads input YAML, extracts top-level keys and string-rendered values, writes `key-value-data.json` to temp, updates state, emits terminal status.
- **Files:** `.claude/agents/superpipelines/parity-test-a/reader.md`, `.claude/skills/superpipelines/parity-test-a/reader-protocol/SKILL.md`
- **Acceptance:** Agent file is frontmatter-only (no body after closing `---`); `model_tier: fast` present; `plugin_version: "2.0.0"` present; no concrete model ID; protocol skill has `disable-model-invocation: true`, `user-invocable: false`; emits exactly one of DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
- **Depends on:** none
- **Estimated turns:** 10 min

## T-2: Write summarizer agent and protocol skill

- **Description:** Write zero-body `summarizer.md` frontmatter and companion `summarizer-protocol/SKILL.md`. Protocol reads `key-value-data.json` from temp, renders aligned plain-text summary table, writes `parity-test-a-summary.txt` to `output/`.
- **Files:** `.claude/agents/superpipelines/parity-test-a/summarizer.md`, `.claude/skills/superpipelines/parity-test-a/summarizer-protocol/SKILL.md`
- **Acceptance:** Same agent frontmatter criteria as T-1; output written as UTF-8 without BOM; protocol validates JSON input before rendering; emits terminal status.
- **Depends on:** none
- **Estimated turns:** 10 min

## T-3: Write topology.json

- **Description:** Write topology with `source_tier: "tier_1"`, `model_field_format: "shorthand"`, two steps (reader → summarizer), `model_tier` per step, no concrete model IDs.
- **Files:** `.claude/superpipelines/pipelines/parity-test-a/topology.json`
- **Acceptance:** `source_tier` = `"tier_1"`; `model_field_format` = `"shorthand"`; no `model` field (concrete) in steps; `plugin_version: "2.0.0"`; `degradation_warnings` = `[]`.
- **Depends on:** T-1, T-2
- **Estimated turns:** 5 min

## T-4: Write entry skill run-parity-test-a

- **Description:** Write entry skill with `user-invocable: true`, `disable-model-invocation: true`, full two-phase dispatch protocol using abstract `DISPATCH(mode="task", ...)`, C20 cleanup contract, terminal status emit.
- **Files:** `.claude/skills/superpipelines/parity-test-a/run-parity-test-a/SKILL.md`
- **Acceptance:** `user-invocable: true`; `disable-model-invocation: true`; NO `Task(subagent_type=...)` call; uses `DISPATCH(mode="task", ...)` notation; C20 cleanup deletes temp on DONE, preserves on BLOCKED/NEEDS_CONTEXT; emits terminal status.
- **Depends on:** T-3
- **Estimated turns:** 15 min

## T-5: Write registry entry and launcher

- **Description:** Create `registry.json` with parity-test-a entry (agents list, skills list, topology_path, last_audit). Write launcher `parity-test-a.md`.
- **Files:** `.claude/superpipelines/registry.json`, `.claude/superpipelines/pipelines/parity-test-a/parity-test-a.md`
- **Acceptance:** `agents` list has 2 entries; `skills` list has 3 entries; `topology_path` key present; `last_audit` present; `source_tier: "tier_1"`.
- **Depends on:** T-4
- **Estimated turns:** 5 min
