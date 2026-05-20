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

## 1.0.6 — Lean Agents & Zero-Body Architecture (2026-05-20)

### Architecture & Governance

- **`LEAN_AGENTS: TRUE` Invariant** — Added as a core architecture invariant in `CLAUDE.md`. Agent files are now frontmatter-only configuration envelopes; zero body text is permitted after the closing `---`.
- **Protocol Skill Companion Pattern** — Every framework agent now has a companion `{agent-name}-protocol/SKILL.md` carrying its full operational protocol (`disable-model-invocation: true`, `user-invocable: false`). This replaces the previous fat-agent model where protocol lived directly in the agent body.
- **3-Layer Progressive Disclosure** — Architecture now enforces: agent (config) → protocol skill (workflow) → reference files (deep content).

### Added

- **7 Protocol Skills** — Companion `{agent-name}-protocol/SKILL.md` created for every framework agent: `pipeline-architect-protocol`, `pipeline-auditor-protocol`, `pipeline-failure-analyzer-protocol`, `pipeline-quality-reviewer-protocol`, `pipeline-spec-reviewer-protocol`, `pipeline-task-executor-protocol`, `skill-architect-protocol`. Each carries operating modes, protocol steps, invariants, rationalization tables, and reference file links.
- **Release Skill** — Added `.claude/skills/release.md` with an 8-step release workflow covering version discovery, user-gated version selection, commit categorization, multi-file version bumping, changelog authoring, staged approval gate, git tagging, and GitHub release publication.

### Changed

- **Zero-Body Agents** — All 7 framework agents (`pipeline-architect`, `pipeline-auditor`, `pipeline-failure-analyzer`, `pipeline-quality-reviewer`, `pipeline-spec-reviewer`, `pipeline-task-executor`, `skill-architect`) reduced to frontmatter-only stubs. Versions bumped accordingly (2.0→3.0 for architect/auditor, 1.0→2.0 for the rest).
- **`agent-frontmatter-schema.md`** — Replaced "Capability contract (agent body)" section with "Protocol skill companion" section. Updated `skills` field rule and all `bypassPermissions` guidance to reference the protocol skill.
- **`compliance-matrix.md`** — Added criterion 10a (agent body must be empty); updated criterion 10 (`bypassPermissions` justification in protocol skill); updated criterion 18 to cover protocol skill bodies.
- **`pipeline-architect-protocol`** — DESIGN constraint and DEVELOP section updated to generate zero-body stubs with companion protocol skills for every new pipeline agent.
- **`.gitignore`** — Removed `.claude/` ignore rule; the `.claude` directory is now fully tracked.
- **README** — Dual-theme local SVG architecture diagrams replace external `mermaid.ink` image URLs; prose restructured with hook, badges, quick-start, and humanized style.

### Fixed

- **Marketplace Schema** — Added missing `owner.email` and `author.email` fields to `marketplace.json` to satisfy strict JSON schema validation requirements.

## 1.0.5 — Plugin Version Stamping & Model Change Command (2026-05-12)

### Architecture & Governance

- **PLUGIN_VERSION_STAMPING** — Enforced the `plugin_version` field across all pipeline artifacts (`topology.json`, `registry.json`, `pipeline-state.json`, agent frontmatter). Every mutation (create, add-step, update-step, delete-step) now stamps `plugin_version` with the current superpipelines version, enabling future retro-compatibility checks.
- **Compliance Criterion #21** — Added `plugin_version` presence and consistency check to the compliance matrix. Missing `plugin_version` → SEV-2; topology/agent mismatch → SEV-3.
- **Topology Schema Update** — `plugin_version` added as a required top-level field in `topology.json`. Missing → SEV-2.

### New Commands

- **`/superpipelines:change-models`** — New command allowing interactive model reassignment for pipeline step agents. Discovers models from OpenCode Zen, Go, and custom providers, then applies changes to agent frontmatter.

### Skill Routing

- **`/change-models` Routing** — Added `change-models` skill to the routing table in `using-superpipelines`, ensuring the orchestrator dispatches model change requests to the correct skill.

## 1.0.4 — OMOA Integration & Hierarchical Context (2026-05-05)

### Architecture & Agent Optimizations

- **Hashline Editing Protocol** — Implemented `sk-hashline-protocol` to enforce content-hash validation prior to any atomic file mutation by `pipeline-task-executor`, eliminating stale-line corruption.
- **Hierarchical Context Maps** — Introduced `/superpipelines:init-deep` and `sk-hierarchical-context` to generate token-efficient, distributed `PIPELINE-CONTEXT.md` files conforming strictly to Scribius v1 XML-anchored standards.
- **Dynamic Model Routing** — Relaxed the strict `SONNET_ONLY` invariant to `DYNAMIC_DEFAULT_SONNET`, permitting specific agents (like `pipeline-architect` and `pipeline-quality-reviewer`) to dynamically route to Opus or Haiku based on their intent category (`deep-plan` vs `quick-audit`), optimizing reasoning and cost.

## 1.0.3 — Adherence Cleanup (2026-05-04)

### Documentation & Maintenance

- **Adherence Audit** — Verified 100% compliance with the v1.0.2 specification.
- **Marketplace Sync** — Updated marketplace description to remove stale references and align with plugin capabilities.
- **Structural Integrity** — Removed corrupted lines in `skill-architect.md` and consolidated duplicate headers in `RELEASE-NOTES.md`.

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
