# Tasks: parity-test-b

## T-1: Write analyzer agent and protocol skill

- **Description:** Write zero-body `analyzer.md` frontmatter and companion `analyzer-protocol/SKILL.md`. Frontmatter: `model_tier: fast`, `effort_tier: medium`, `plugin_version: "2.0.0"`, `permissionMode: acceptEdits`, `isolation: worktree`. Protocol reads JSON, checks nulls and type inconsistencies, writes `findings.json` to temp.
- **Files:** `.claude/agents/superpipelines/parity-test-b/analyzer.md`, `.claude/skills/superpipelines/parity-test-b/analyzer-protocol/SKILL.md`
- **Acceptance:** Agent is frontmatter-only; `model_tier: fast`; `isolation: worktree`; protocol validates JSON input; emits DONE_WITH_CONCERNS when issues found; writes `findings.json` with correct schema.
- **Depends on:** none
- **Estimated turns:** 10 min

## T-2: Write reviewer agent and protocol skill

- **Description:** Write zero-body `reviewer.md` with `disallowedTools: Write, Edit, Bash` + `permissionMode: plan` + `isolation: worktree` + `model_tier: medium`. Protocol validates findings schema, renders REVIEWER VERDICT block to terminal output text only (no file write).
- **Files:** `.claude/agents/superpipelines/parity-test-b/reviewer.md`, `.claude/skills/superpipelines/parity-test-b/reviewer-protocol/SKILL.md`
- **Acceptance:** `disallowedTools: Write, Edit, Bash` present; `permissionMode: plan`; `isolation: worktree`; `model_tier: medium`; protocol NEVER writes any file; REVIEWER VERDICT block emitted in terminal output; emits DONE / DONE_WITH_CONCERNS / BLOCKED.
- **Depends on:** none
- **Estimated turns:** 10 min

## T-3: Write reporter agent and protocol skill

- **Description:** Write zero-body `reporter.md` and companion `reporter-protocol/SKILL.md`. Protocol reads `findings.json` and reviewer verdict from dispatch context, renders markdown report with key analysis table and reviewer notes section.
- **Files:** `.claude/agents/superpipelines/parity-test-b/reporter.md`, `.claude/skills/superpipelines/parity-test-b/reporter-protocol/SKILL.md`
- **Acceptance:** `model_tier: fast`; `isolation: worktree`; report includes key analysis table and REVIEWER VERDICT section; confirms `reviewer_verdict` is `approved` or `approved_with_concerns` before proceeding; emits terminal status.
- **Depends on:** none
- **Estimated turns:** 10 min

## T-4: Write topology.json

- **Description:** Write topology with `source_tier: "tier_1"`, `model_field_format: "shorthand"`, three steps (analyzer → reviewer → reporter), `reviewer_isolation: "structural"` on reviewer step, `isolation: worktree` on all steps.
- **Files:** `.claude/superpipelines/pipelines/parity-test-b/topology.json`
- **Acceptance:** `source_tier: "tier_1"`; reviewer step has `reviewer_isolation: "structural"`; all steps have `isolation: worktree`; no concrete model IDs; `plugin_version: "2.0.0"`.
- **Depends on:** T-1, T-2, T-3
- **Estimated turns:** 5 min

## T-5: Write entry skill run-parity-test-b

- **Description:** Write entry skill with full three-phase dispatch (analyzer → reviewer → reporter). Captures REVIEWER VERDICT block from reviewer terminal output. Does NOT dispatch reporter if reviewer emits BLOCKED. C20 cleanup contract applied.
- **Files:** `.claude/skills/superpipelines/parity-test-b/run-parity-test-b/SKILL.md`
- **Acceptance:** `user-invocable: true`; `disable-model-invocation: true`; reporter dispatch blocked on reviewer BLOCKED; REVIEWER VERDICT block captured and passed to reporter context; C20 cleanup correct; emits terminal status.
- **Depends on:** T-4
- **Estimated turns:** 20 min

## T-6: Write registry entry and launcher

- **Description:** Add parity-test-b to `registry.json`. Write launcher `parity-test-b.md` documenting three-step flow and reviewer isolation mechanism.
- **Files:** `.claude/superpipelines/registry.json`, `.claude/superpipelines/pipelines/parity-test-b/parity-test-b.md`
- **Acceptance:** Registry `agents` list has 3 entries; `skills` list has 4 entries; `source_tier: "tier_1"`; launcher describes worktree + disallowedTools isolation.
- **Depends on:** T-5
- **Estimated turns:** 5 min
