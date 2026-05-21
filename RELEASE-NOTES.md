# Superpipelines — Release Notes

> Canonical record of versioned changes, feature additions, and removals for the Superpipelines framework. This document serves as the primary reference for tracking migration paths and architectural evolution.

<overview>
Superpipelines release notes document the transition from legacy Superpowers-era infrastructure to the standalone v1.0.6 architecture. Key milestones include the implementation of scope-aware deployment, multi-pipeline isolation, the 20-criterion compliance matrix, and the Lean Agents zero-body architecture.
</overview>

## v2.0.0 — Multi-Platform Release (2026-05-21)

### Highlights

Superpipelines now runs on **five execution tiers** spanning Claude Code, OpenCode, Codex, Cursor, Windsurf, Cline, and Antigravity CLI 2.0. One repo, one installer, one set of skills.

### Multi-platform execution model

| Tier | Platform | Subagent primitive |
|------|----------|--------------------|
| 1 | Claude Code | Skill-callable `Task()` |
| 1b | OpenCode (sibling repo) | `mode: subagent` agents |
| 1c | Antigravity CLI 2.0 | Dynamic Subagents (aspirational) |
| 1d | Codex App/CLI | Native model-driven subagents (up to 6 concurrent) |
| 2 | Cursor / Windsurf / Cline | Single-agent inline via `sk-platform-dispatch` |

### Universal installer

```bash
# macOS / Linux / WSL
curl -fsSL https://raw.githubusercontent.com/gustavo-meilus/superpipelines/main/install.sh | bash

# Windows PowerShell
irm https://raw.githubusercontent.com/gustavo-meilus/superpipelines/main/install.ps1 | iex

# Pick one platform
node bin/install.js --only claude-code
```

Auto-detects every supported platform. Use `--list` to see detection results, `--dry-run` to preview commands, `--all` to install for every detected platform.

### OpenCode-originated improvements (backported to CC)

- **Per-step model preference** in the pipeline creation flow. Deep tier → `claude-opus-4-7`; fast tier → `claude-sonnet-4-6`.
- **Run Launcher artifact** `<scope-root>/superpipelines/pipelines/{P}/{P}.md` (launcher document; on CC this is a discovery file, not a slash command — `/superpipelines:{P}` direct invocation remains OpenCode-only in v2.0.0).
- **Version-compatibility advisory** at run start.
- **`plugin_version` stamping** in `pipeline-state.json`.

### Write/Review isolation — degradation made explicit

The `WRITE_REVIEW_ISOLATION` invariant is now tier-aware:

- **Tier 1 (CC)** — structural, enforced via agent `tools:` frontmatter.
- **Tier 1b (OC)** — structural, enforced via `permission: { edit: deny }`.
- **Tier 1d (Codex)** — pending per-agent `sandbox_mode` verification.
- **Tier 2 (Cursor/Windsurf/Cline)** — convention-only. Reviews are advisory. The orchestrator surfaces this degradation at run start (stderr advisory) and run end (state-file footer + entry-skill summary).

### Breaking changes

- `WRITE_REVIEW_ISOLATION: TRUE` invariant removed. Replaced by tier-aware `STRUCTURAL_ON_TIER1_1B_1D; CONVENTION_ONLY_ON_TIER2`. Tooling that hard-asserted the boolean form must update.
- New `metadata.tier` and `plugin_version` fields required at state init. Pre-v2.0.0 runs without these fields surface informational notes at resume; do not block.
- Generated entry skills now route through `sk-platform-dispatch` DISPATCH instead of direct `Task()`. Policy:
  - **Existing pre-v2.0.0 entry skills on Claude Code:** continue to work unchanged. No forced regeneration.
  - **Cross-tier portability (running a CC-scaffolded pipeline on Tier 1b/1c/1d/2):** REQUIRES regenerating the entry skill with the v2.0.0 architect — raw `Task()` calls do not dispatch correctly on non-CC tiers.
  - **New pipelines (v2.0.0+):** architect emits DISPATCH-routed entry skills by default; no action needed.
- `CLAUDE.md` Project Version jumps from `v1.2.0` (stale) to `v2.0.0`. Plugin manifest version (`1.0.6` → `2.0.0`) is now the source of truth.

### Known limitations

- `--uninstall` flag stub (full uninstall deferred to v2.1).
- `--with-init` flag reserved (no-op).
- Tier 1c (Antigravity Dynamic Subagents) aspirational — falls back to Tier 2 unless dispatch primitive verified.
- Tier 1d (Codex) `sandbox_mode` per-agent isolation pending verification.
- Codex installer command syntax unverified against a stable release.
- No automated cross-platform parity gate (manual tracking via `docs/SYNC.md`).

### Deprecations

- **Gemini CLI** as a distribution target. Runtime retires June 18, 2026. Migrate to Antigravity CLI 2.0 via `agy plugin import gemini`.

### Repo relationship

- `superpipelines` (this repo) — Tier 1 (CC), Tier 1d (Codex), Tier 2 (Cursor/Windsurf/Cline), Tier 1c aspirational (Antigravity).
- `superpipelines-opencode` — Tier 1b (OpenCode). Permanent sibling repo, not deprecated. Shared skills tracked in `docs/SYNC.md`.

### Upgrade path

Existing Claude Code users:

```bash
claude plugin update superpipelines
```

Or re-run the installer to pull v2.0.0 plus any newly detected platforms:

```bash
curl -fsSL https://raw.githubusercontent.com/gustavo-meilus/superpipelines/main/install.sh | bash
```

### Full changelog

See `CHANGELOG.md`.

## v1.0.6 — Lean Agents & Zero-Body Architecture (2026-05-20)

This release introduces the Lean Agents pattern: agent files become pure frontmatter configuration envelopes, and all operational protocol moves into companion `{agent-name}-protocol` skills. Every framework agent is now a zero-body stub, enforcing a clean contract between configuration and behavior.

<release_entry version="1.0.6" status="STABLE">

### Added
- **7 Protocol Skills** — Companion `{agent-name}-protocol/SKILL.md` created for every framework agent: `pipeline-architect-protocol`, `pipeline-auditor-protocol`, `pipeline-failure-analyzer-protocol`, `pipeline-quality-reviewer-protocol`, `pipeline-spec-reviewer-protocol`, `pipeline-task-executor-protocol`, `skill-architect-protocol`. Each uses `disable-model-invocation: true` and `user-invocable: false` and carries the full operating modes, protocol steps, invariants, rationalization tables, and reference file links previously embedded in the agent body.
- **`LEAN_AGENTS: TRUE` Invariant** — Added to `CLAUDE.md` as a core architecture invariant. Agent files are frontmatter-only; zero body text is permitted after the closing `---`.
- **Release Skill** — Added `.claude/skills/release.md` with an 8-step release workflow covering version discovery, user-gated version selection, commit categorization, multi-file version bumping, changelog authoring, staged approval gate, git tagging, and GitHub release publication.

### Changed
- **Zero-Body Agents** — All 7 framework agents reduced to frontmatter-only stubs. Versions bumped: `pipeline-architect` and `pipeline-auditor` to `3.0`; all others to `2.0`.
- **`CLAUDE.md`** — `Constraints` updated from "agent bodies ≤150 lines" to "agent bodies are empty (frontmatter only)". Protocol Skills file-layout rule added.
- **`agent-frontmatter-schema.md`** — Replaced "Capability contract (agent body)" section with "Protocol skill companion" section documenting the zero-body stub pattern. Updated `skills` field rule and all `bypassPermissions` guidance to reference the protocol skill instead of the agent body.
- **`compliance-matrix.md`** — Added criterion 10a (agent body must be empty); updated criterion 10 (`bypassPermissions` justification now in protocol skill); updated criterion 18 to cover protocol skill bodies.
- **`pipeline-architect-protocol`** — DESIGN constraint and DEVELOP section updated to generate zero-body stubs with companion protocol skills for every new pipeline agent.
- **`.gitignore`** — Removed `.claude/` ignore rule; the `.claude` directory is now fully tracked.
- **README** — Dual-theme local SVG architecture diagrams replace external `mermaid.ink` image URLs; prose restructured and humanized.

### Fixed
- **Marketplace Schema** — Added missing `owner.email` and `author.email` fields to `marketplace.json` to satisfy strict JSON schema validation requirements.

</release_entry>

## v1.0.5 — Plugin Version Stamping & Model Change Command (2026-05-12)

This release enforces a critical governance invariant — `plugin_version` stamping across all pipeline artifacts — and introduces the interactive `/superpipelines:change-models` command for runtime model reassignment.

<release_entry version="1.0.5" status="STABLE">

### Added
- **Plugin Version Stamping**: Added `PLUGIN_VERSION_STAMPING` as a core pipeline invariant. Every pipeline artifact (`topology.json`, `registry.json` entries, `pipeline-state.json`, agent frontmatter) must now include a `plugin_version` field set to the current superpipelines package version. This field is updated on every mutation (create, add-step, update-step, delete-step) and enables future retro-compatibility checks.
- **`/superpipelines:change-models` Command**: New interactive command for changing LLM models assigned to pipeline step agents. Discovers models from OpenCode Zen, Go, and custom providers, then applies changes to agent frontmatter.
- **Compliance Criterion #21**: Added `plugin_version` presence and consistency check to the compliance matrix. Missing → SEV-2. Topology/agent mismatch → SEV-3.

### Changed
- **Topology Schema**: `plugin_version` is now a required top-level field in `topology.json` schema. Missing → SEV-2.
- **Pipeline Skills Updated**: `adding-a-pipeline-step`, `creating-a-pipeline`, `deleting-a-pipeline-step`, `updating-a-pipeline-step` — all updated to include `plugin_version` stamping instructions.
- **Reference Docs Updated**: `agent-frontmatter-schema.md`, `compliance-matrix.md`, `topology-rules.md` — all updated to document the new `plugin_version` field and rules.

</release_entry>

## v1.0.4 — OMOA Integration & Hierarchical Context (2026-05-05)

This release integrates three major architectural enhancements inspired by the Oh My OpenAgent ecosystem, dramatically improving edit stability, context efficiency, and cost-to-performance ratios for specific agents.

<release_entry version="1.0.4" status="STABLE">

### Added
- **Hashline Protocol**: Added `sk-hashline-protocol` skill and updated the `pipeline-task-executor` to enforce hash-anchored code modifications, preventing source code corruption from stale line edits.
- **Hierarchical Context Command**: Added the `/superpipelines:init-deep` command and `sk-hierarchical-context` skill to map repository architecture into distributed `PIPELINE-CONTEXT.md` files, ensuring agents access lean, localized context without bloating global prompts.
- **Scribius Formatting Enforcement**: Enforced strict Scribius v1 standards (H1-first, XML-anchored structured envelopes, third-person voice) on all generated `PIPELINE-CONTEXT.md` files.
- **Dynamic Intent Routing**: Added `sk-dynamic-routing` to permit intent-based LLM selection. `pipeline-architect` now defaults to `claude-opus-4-7` (`deep-plan` category) and `pipeline-quality-reviewer` routes to `claude-haiku-4-5-20251001` (`quick-audit` category), while standard implementation workers remain bound to `claude-sonnet-4-6`.

### Changed
- **Architecture Invariant Updated**: `MODEL_SELECTION: SONNET_ONLY` updated to `MODEL_SELECTION: DYNAMIC_DEFAULT_SONNET` to support category-based routing.
- **New Pipeline Preflight**: The `/superpipelines:new-pipeline` command now explicitly checks for a root context map and suggests `/superpipelines:init-deep` during the preflight phase.

</release_entry>

## v1.0.3 — Adherence Cleanup (2026-05-04)

This release ensures 100% adherence to the framework's core architectural standards. It resolves cosmetic and structural issues identified during a comprehensive audit, including stale marketplace metadata, corrupted agent definitions, and structural inconsistencies in the release history.

<release_entry version="1.0.3" status="STABLE">

### Added
- **Adherence Audit Verified**: Confirmed 100% compliance with all 16 core architectural requirements (Git preflight, multi-pipeline isolation, scope-aware pathing, temp lifecycle).

### Improved
- **Marketplace Metadata**: Synchronized marketplace description with canonical plugin capabilities, removing stale documentation references.
- **Structural Integrity**: Resolved file corruption in `skill-architect.md` and consolidated duplicate history headers in `RELEASE-NOTES.md`.

</release_entry>

## v1.0.2 — Scribius v1 & Standardized Architecture (2026-05-04)

This release implements a repository-wide refactoring to the Scribius v1 documentation standard and finalizes the v2 scope-aware architecture. It introduces semantically anchored XML envelopes for machine-readability and master manifests for high-performance context retrieval.

<release_entry version="1.0.2" status="STABLE">

### Added
- **Scribius v1 Standardization**: All 20+ core skills migrated to semantically anchored XML envelopes (`<overview>`, `<protocol>`, `<invariants>`, `<rationalization_table>`).
- **AI-Ready Indexing**: Added `llms.txt` and `llms-full.txt` master manifests for optimized LLM context injection.
- **Integrity Verification**: Verified 100% semantic alignment between pre-refactor baselines and standardized documentation via a multi-agent audit protocol.
- **Automated Registry**: Added `generate_llms_full.py` script for periodic manifest updates.
- **Scope-aware deployment**: Pipelines support `project`, `local`, and `user` scopes with path resolution via `sk-pipeline-paths`.
- **Multi-pipeline support**: Multiple named pipelines coexist per workspace in isolated directories.
- **Step management commands**: `/superpipelines:new-step`, `/superpipelines:update-step`, and `/superpipelines:delete-step` enable granular pipeline mutations.
- **Compliance Matrix**: A 20-criterion audit system for layout, frontmatter, topology, and runtime safety.
- **Local Memory**: Agents may utilize `memory: local` for persisting cross-run heuristics.

### Improved
- **Protocol Clarity**: Refined operational gates in `systematic-debugging`, `tdd`, and `verification-before-completion` for sharper agent adherence.
- **Structural Voice**: Standardized all documentation to third-person impersonal voice to reinforce protocol objectivity.

### Breaking changes
- **State file path moved**: Pipeline state now lives at `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json` instead of `tmp/pipeline-state.json`. There is no migration path — any in-progress pipelines from v1.0.0 must be restarted.
- **State schema extended**: `pipeline-state.json` now requires `pipeline_name`, `scope_root`, and `run_id` fields.
- **`.claudeignore` updated**: The ignore pattern changed from `tmp/pipeline-*` to `.claude/superpipelines/temp/`.
- **Agent `permissionMode` now required**: All agents declare `permissionMode` in frontmatter (`acceptEdits` for executors, `plan` for reviewers/architects).

### Removed
- `docs/AI_PIPELINES_LLM.md` — Replaced by `ai-pipelines-trimmed.md` and agent-frontmatter-schema.
- `docs/ai-pipelines-improvement-plan.md` — Legacy gap analysis.
- `docs/superpowers-vs-ai-pipelines.md`, `docs/claude-plugins-complete-guide.md`, `docs/testing.md`.
- `docs/windows/`, `docs/plans/`, `docs/superpowers/`, `docs/examples/` — Legacy directories.
- `tests/` — Legacy Superpowers-era test suites.
- Visual companion server scripts from `skills/brainstorming/`.

</release_entry>

## v1.0.0 — Initial Release (2026-05-03)

<release_entry version="1.0.0" status="INITIAL">
First standalone release of Superpipelines. Established the core framework with 7 agents, 6 execution patterns, and the spec-driven development (SDD) workflow.
</release_entry>
