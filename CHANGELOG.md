# Changelog

## Distribution

Superpipelines is distributed via the GitHub-hosted marketplace at `gustavo-meilus/superpipelines`. Each entry below corresponds to a git tag of the same name on `main`.

**Install (Claude Code):**

```text
/plugin marketplace add gustavo-meilus/superpipelines
/plugin install superpipelines@superpipelines-marketplace
```

**Pin to a specific version:**

```text
/plugin install superpipelines@superpipelines-marketplace --version v1.0.2
```

## 1.0.2 — Scribius v1 AI-Readiness (2026-05-04)

### Documentation & AI-Readiness

- **Scribius v1 Refactor** — Migrated all core workflow, foundation, and engineering skills to semantically anchored XML envelopes (`<protocol>`, `<invariants>`, `<rationalization_table>`).
- **Master Manifests** — Added `llms.txt` (discovery index) and `llms-full.txt` (complete documentation suite) to the repository root.
- **Automation** — Added `scripts/generate_llms_full.py` for periodic doc-suite synchronization.
- **Integrity Verified** — Performed a multi-agent semantic audit confirming 100% information persistence between pre-refactor baselines and Scribius v1 versions.

### Engineering Protocols

- **Gate Enforcement** — Formalized operational gates in `systematic-debugging` (Root Cause), `tdd` (Red-Green), and `verification-before-completion` (Evidence-Before-Claim).
- **Structural Voice** — Enforced third-person impersonal voice throughout all documentation to maintain architectural objectivity.

## 1.0.2 — v2 Redesign

### Architecture

- **Scope-aware registry** — pipelines deploy to one of three scope roots (`project` → `<workspace>/.claude/`, `local` → `<workspace>/.claude/`, `user` → `~/.claude/`). Paths resolved by `sk-pipeline-paths`.
- **Multi-pipeline isolation** — multiple named pipelines coexist per workspace, each in its own `{P}/` directory tree.
- **State path migrated** — `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json` replaces the legacy flat `tmp/pipeline-state.json`. State schema now includes `pipeline_name`, `scope_root`, and `run_id`.
- **Temp dir lifecycle** — run directories are deleted on `DONE`; preserved on `ESCALATED / FAILED / BLOCKED` for inspection.

### Commands

- **New:** `/superpipelines:new-step` — add a step to an existing named pipeline.
- **New:** `/superpipelines:update-step` — modify an existing step within a named pipeline.
- **New:** `/superpipelines:delete-step` — remove a step with gap analysis and topology rewiring.
- **Updated:** `/superpipelines:audit-pipeline` — rewritten with a 20-criterion compliance matrix across 4 bands (layout, frontmatter, topology, runtime safety).

### Agent frontmatter

- **`permissionMode`** now declared per-agent: `acceptEdits` for executors, `plan` for reviewers/architects/auditors. All 7 agents updated.
- **`memory: local`** is now allowed for agents that persist learned heuristics. `memory: project` remains forbidden.
- **`skills:` frontmatter** stripped from non-agent SKILL.md files (5 workflow skills cleaned).

### Skills

- **`sk-pipeline-paths`** — added `disable-model-invocation: true` and `user-invocable: false` for proper suppression.
- **`sk-pipeline-state`** — complete rewrite for scope-aware multi-pipeline state management.
- **`severity-classification.md`** — `permissionMode` removed from SEV-0 list; `memory: local` on executors now valid; `bypassPermissions` without justification added as SEV-0.
- **`ai-pipelines-trimmed.md`** — `PERMISSION_MODE: PER_AGENT` replaces `NULL`; state management references v2 paths.
- **`anti-patterns.md`** — concurrent state race fix updated for multi-pipeline isolation.
- **`brainstorming`** — stripped ghost `writing-plans` references; terminal state is now user spec approval. Visual companion server and scripts removed.
- **`systematic-debugging`** — stripped `superpowers:` namespace prefix from skill cross-references.
- **`finishing-a-development-branch`** — caller references updated to point to `running-a-pipeline`.

### Documentation cleanup

- **Removed:** `docs/AI_PIPELINES_LLM.md`, `docs/ai-pipelines-improvement-plan.md`, `docs/superpowers-vs-ai-pipelines.md`, `docs/claude-plugins-complete-guide.md`, `docs/testing.md`, `docs/windows/`, `docs/plans/`, `docs/superpowers/`, `docs/examples/`.
- **Removed:** `RELEASE-NOTES.md` (58KB of Superpowers-era history), `CHAT_LOG_04-05-2026.md`.
- **Removed:** `tests/` directory (5 Superpowers-era test suites).
- **Updated:** `README.md` — full rewrite for v2 architecture.
- **Updated:** `.claudeignore` — `tmp/pipeline-*` replaced with `.claude/superpipelines/temp/`.
- **Synced:** `package.json` version to `1.0.2`.

## 1.0.0 — Initial release

Superpipelines is a fresh plugin built from the ground up to design and run multi-agent AI pipelines.

### Added

- Plugin manifest (`superpipelines` namespace) and marketplace entry.
- Bootstrap skill `using-superpipelines` loaded via SessionStart hook on Claude Code.
- Shared method skills (preloaded by orchestrator agents): `sk-4d-method`, `sk-spec-driven-development`, `sk-claude-code-conventions`, `sk-pipeline-patterns`, `sk-pipeline-state`, `sk-worktree-safety`, `sk-write-review-isolation`, `sk-rationalization-resistance`.
- User-invocable workflow skills: `creating-a-pipeline`, `running-a-pipeline`.
- Subagents: `pipeline-architect`, `pipeline-auditor`, `skill-architect`, `pipeline-task-executor`, `pipeline-spec-reviewer`, `pipeline-quality-reviewer`, `pipeline-failure-analyzer`.
- Companion reference libraries (no `SKILL.md`, read on demand): `pipeline-architect-references/`, `pipeline-auditor-references/`, `skill-architect-references/`, `pipeline-runner-references/`.
- Slash commands: `/superpipelines:new-pipeline`, `/superpipelines:run-pipeline`, `/superpipelines:audit-pipeline`.
- Settings: `autoMemoryEnabled: false`, `Bash(*)` permission, `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` env.
- Curated retained skills: `brainstorming`, `finishing-a-development-branch`, `test-driven-development`, `systematic-debugging`, `verification-before-completion`.

### Removed

Legacy Superpowers skills and components superseded by pipeline-specific equivalents.
