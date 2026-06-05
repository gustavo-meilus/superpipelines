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

## 2.2.1 — Phase-Skip Safety Hardening (2026-06-04)

### Fixed

- **`running-a-pipeline` phase-skip during live orchestration (#45)** — a run could drift from the canonical phase order, invent a non-existent "no-active-run" phase, and skip Phase 0.6 (portability) and Phase 0.7 (pre-run safety tripwire) on the way to dispatch. Three structural weaknesses are now closed in `skills/running-a-pipeline/SKILL.md`: (1) a **Phase Ordering Contract** lifted to the top of the protocol, stating the total order verbatim and explicitly noting that no "soft-gate" / "no-active-run" phase exists; (2) a **mandatory phase-manifest `TodoWrite`** at Phase 0 entry so a skipped or out-of-order phase becomes user-visible mid-run; (3) a **Phase 3 dispatch precondition** that HARD-STOPs when `0.6`/`0.7` are absent from the in-session phase ledger. The ledger is persisted to `metadata.phases_executed` at Phase 2 so a resume cannot re-enter dispatch with the safety phases missing. Two new red-flag entries codify the failure mode.

## 2.2.0 — On-Demand Pipeline Optimizer (2026-06-03)

### Added

- **`optimizing-a-pipeline` workflow + `/superpipelines:optimize-pipeline` command** — on-demand optimization of an existing named pipeline. Surveys topology, model-tier cost, and past-run signals; runs a discovery session (`sk-4d-method` → `brainstorming` → grilling) to lock an `optimization_plan`; then batch-applies it atomically through the existing mutation + `change-models` engines with a snapshot + git checkpoint, an all-or-nothing promotion gated by `pipeline-auditor` DELTA + full audits (SEV-0/1 == 0 on both), a graph-integrity check, and auto-rollback on failure. Single human plan-gate; a multi-change optimization is treated as one semantic change.
- **`pipeline-optimizer` agent + `pipeline-optimizer-protocol`** — read-only four-axis analyst (topology structure / model-tier cost / past-run signals / protocol quality). Mirrors `pipeline-auditor`: `tools: Read, Glob, Grep`, `disallowedTools: Write, Edit, Bash`, `permissionMode: plan`, `model_tier: deep`, and **omits `isolation`** (data/analysis agent, #31). Renders its opportunity report inline; the orchestrator persists it (render-inline, #33). Isolation/frontmatter compliance is delegated to `pipeline-auditor`, never re-checked (`DEPENDENCY_INVERSION`).
- **Opportunity taxonomy reference** — `skills/pipeline-optimizer-references/references/opportunity-taxonomy.md` catalogues each opportunity class with symptom · discriminator · false-positive guard · `suggested_engine`.
- **`sk-pipeline-grilling` `MODE=optimization`** — new PASS C reconciles analyst opportunities one at a time against the 4D-hardened constraints, with a zero-unresolved HARD GATE, returning a structured `optimization_plan`.
- **Opt-in `subagent-telemetry` hook** — `SubagentStop` capture appending per-step cost/latency rows to `run-telemetry.jsonl`. **Ships disabled** (not registered in `hooks/hooks.json`): the orchestrator model cannot see per-subagent token counts (anthropics/claude-code #21837, #22625), so capture must be hook-authored. Fail-open (`exit 0` on any error), BOM-free. `optimizing-a-pipeline` degrades gracefully across no-run / state-only / full-telemetry tiers.

### Documentation

- **Design spec + implementation plan** — `docs/superpowers/specs/2026-06-03-optimizing-a-pipeline-design.md` and `docs/superpowers/plans/2026-06-03-optimizing-a-pipeline.md`.
- **`AIBOARDING.md` sync** — onboarding doc updated for the optimizer feature, the run-safety audit gate (#37), and the subagent-telemetry blind-spot gotcha.

## 2.1.3 — Run-Safety Audit Gate (2026-06-02)

### Added

- **Phase 0.7 — Pre-run safety tripwire** — new read-only fast-path phase between 0.6 and 1 that pre-checks for run-breaking worktree artifact-loss deviations (#23/#24) before any dispatch. Arming is version-conditioned (compares `pipeline.plugin_version` vs `installed_version`). Detection uses a single load-bearing discriminator: step agent with `isolation: worktree` whose every output resolves under `superpipelines/temp/` with no host-anchor note. HARD-STOP with redirect to `/superpipelines:audit-steps {P}` (Fix 11) when tripped. Placement before Phase 1 gates both fresh launches and resumed runs against a drifted definition.
- **Phase 1 finalize-and-cleanup** — stalled runs with all steps completed but top-level `status: "running"` (unfinalized) now get a third resume-prompt action: atomic-stamp `status: "completed"`, then delete the temp run directory. Deletion only after the atomic stamp succeeds (preserving "never destroy recovery state without user say-so"). Never applies to `escalated` or `failed` runs — still requires explicit human review.
- **Fix 11 — Data-agent worktree artifact-loss template** — new checkpointed audit fix for #23 (worktree step with gitignored output, no host-anchor) and #24 (data agent carrying unnecessary `isolation: worktree`). Applied via `/superpipelines:audit-steps`.

### Fixed

- **Phase 2 deterministic atomic `platform_profile` write** — `metadata.platform_profile` is now populated via a deterministic `python3` merge (dump to `.tmp` then `os.replace`), not by the orchestrator transcribing the nested object field-by-field into the Write payload. Field-by-field transcription caused state-file corruption (e.g. garbled `subagent_env_override` key). The `.tmp`+`os.replace` contract is identical to every other state update — not an exception.
- **Phase 4 defensive finalization backstop** — if the entry skill predates criterion #20 and left a fully-finished run labeled `status: "running"`, the orchestrator now stamps `status: "completed"` via atomic write before evaluating cleanup. Shares the same `all-steps-completed → atomic stamp` predicate as the Phase 1 finalize option. Only fires when every step is `completed`; never stamps on `pending`/`running`/`failed` steps.
- **#31 fail-fast gate hardened** — gate now specifies a strict 5-step sequence: stop, no copy-back, no re-dispatch, surface BLOCKED escalation, diagnostic redirect to `/superpipelines:audit-steps` (Fix 11). Two new anti-rationalizations explicitly ruled out: "copy from worktree is faster" and "one re-dispatch is cheap".
- **AUDIT criterion-count reference sync** — stale hardcoded `28-criterion` and `criteria 1–22` references replaced with matrix-pointer prose in `pipeline-auditor-protocol` and `commands/audit-steps.md`.

### Changed

- **Phase ordering** — total order advanced from `0 → 0.25 → 0.4 → 0.45 → 0.5 → 0.6 → 1 → 2 → 3 → 4` to include `0.7` between 0.6 and 1.
- **Red Flags + rationalization table** — two new Red Flag entries (worktree copy-back, re-dispatch-as-cheap-fix) and two new rationalization rows document the mechanical prohibitions in the hardened #31 fail-fast gate.

### Documentation

- **Discriminating fixture** — `skills/pipeline-auditor-references/references/fixtures/discriminating-power/wt-legacy-data-agent-worktree.md` exercises the detection discriminator identically across Phase 0.7, Fix 11, and the fixture.
- **Design spec + implementation plan** — `docs/superpowers/specs/2026-06-02-run-safety-audit-gate-design.md` and `docs/superpowers/plans/2026-06-02-run-safety-audit-gate.md`.

## 2.1.2 — Audit Report Ownership & permissionMode Consistency (2026-06-01)

### Fixed

- **Audit-steps report-ownership split-brain (#33)** — a `/superpipelines:audit-steps` run exposed that the `pipeline-auditor` protocol framed writing the report as its own primary action behind a never-false "if `Write` is disallowed" fallback, even though the agent permanently carries `disallowedTools: Write`. Real persistence ownership lived only in the command file, and no party owned ensuring the `audit/` directory exists — so the orchestrator's first write on a fresh pipeline failed on a missing directory. Resolved by:
  - **Auditor protocol** (`pipeline-auditor-protocol`) now states plainly that the auditor is read-only and never writes the report or mutates `registry.json`; it renders the report as inline output and hands the orchestrator an explicit registry-update instruction.
  - **audit-steps command** now makes the orchestrator own persistence in order: ensure `audit/` exists (idempotent) **before** writing `latest.md`, then update `registry.json`, with a fail-surface fallback so findings are never lost.
- **Agent `permissionMode` vs protocol/capability contradiction** — `pipeline-architect` and `skill-architect` are file-producers (their `tools:` include `Write`/`Edit` and their protocols create/edit files) yet were declared `permissionMode: plan`, contradicting both the allowlist and the protocol. Both corrected to `acceptEdits` (mirroring `pipeline-task-executor`). The architect authoring rule (`pipeline-architect-protocol`) is generalized to a capability-based mapping — `plan` for read-only/advisory agents (reviewers, auditor, failure-analyzer), `acceptEdits` for file-producers (architect, skill-architect, task-executor). All 7 agents are now consistent. Framed as a consistency fix, not a verified runtime write-failure.

### Documentation

- **Design spec + implementation plan** — `docs/superpowers/specs/2026-06-01-audit-steps-report-ownership-design.md` and `docs/superpowers/plans/2026-06-01-audit-steps-report-ownership.md`.

## 2.1.1 — Worktree Artifact Safety & Fail-Fast (2026-06-01)

### Fixed

- **Sub-agent worktree artifact data loss + orchestrator token bleed (#31)** — a pure data-retrieval/generation agent running under `isolation: worktree` that wrote its artifact only to the gitignored `superpipelines/temp/` tree made zero tracked changes, so Claude Code auto-cleaned the worktree on teardown and destroyed the only copy. The orchestrator's manual copy-back then hit `cannot stat` and re-ran the entire subagent protocol **inline in the root session**, flooding the main context window. Four coordinated changes:
  - **(B, primary) Data agents omit `isolation`** — the architect (`creating-a-pipeline` Phase 4) now classifies each step by a tracked-code-write test: code-modifying → `isolation: worktree`; read-only / data-emitting → omit the field (runs in the parent's host cwd). Documented in `agent-frontmatter-schema` and `sk-pipeline-patterns`; CC corrects an earlier prescription of the non-existent `isolation: none`.
  - **(A) Host-anchored artifacts** — `sk-pipeline-paths` adds `RESOLVE_HOST_WORKSPACE()` (resolves the main-worktree root via `git rev-parse --git-common-dir`); worktree code-writers that also emit artifacts write to the host temp path, registered in the subagent's `additionalDirectories`. The fragile post-DONE copy-back is deleted.
  - **(C) Runner fail-fast** — `running-a-pipeline` treats a `DONE` with a missing declared artifact as a hard `BLOCKED` escalation naming the missing path and producing step; inline re-execution is explicitly forbidden (`escalation.md` anti-pattern).
  - **(D) Auditor detection** — `pipeline-auditor` gains criterion #23 (SEV-0: worktree step with gitignored output, no host-anchor) and #24 (SEV-1: data agent carrying unnecessary `isolation: worktree`); runs on `/audit-steps` and the post-mutation auto-audit.
- **Live flaw in shipped examples** — the CC `parity-test-b` example agents (`analyzer`, `reporter`, `reviewer`) were carrying `isolation: worktree` as pure data agents; corrected to omit it as the canonical reference configuration.

### Documentation

- **Design spec + implementation plan** — `docs/superpowers/specs/2026-06-01-worktree-artifact-safety-design.md` and `docs/superpowers/plans/2026-06-01-worktree-artifact-safety.md`.

## 2.1.0 — Pipeline Grilling Gate & Opus 4.8 (2026-05-29)

### Added

- **`sk-pipeline-grilling` skill** — a brief-hardening interrogation run during pipeline creation, adapted from the crawl/grill/reconcile protocol. `MODE=brief` runs A0 pipeline-type determination (project-embedded vs self-contained) → A1 conditional silent crawl (codebase scan only when project-embedded; registry + capability scans always run) → A2 one-question-at-a-time grill → A3 reconciliation **HARD GATE**, returning a `hardened_brief`. `MODE=architectural` runs a lighter post-pattern confirmation pass. Orchestrator-loaded (`disable-model-invocation: true`, `user-invocable: false`).
- **`AIBOARDING.md`** — compressed agent-onboarding doc at the repo root, plus the `.aiboarding/hooks/` enforcement hooks (SessionStart / PreToolUse / PostToolUse) that keep it loaded and surface drift.

### Changed

- **`creating-a-pipeline` wired to the grilling gate** — Phase 2 runs `GRILL(MODE=brief)` before the 4D step and architect dispatch (returns a `hardened_brief`); Phase 3 runs `GRILL(MODE=architectural)` after pattern selection; Phase 4 threads `captured_failure_modes` + `pipeline_type` into the architect dispatch; Phase 6 stamps `topology.json metadata.grilling`. The legacy "≥3 critical slots missing" hard-gate is subsumed by the grilling exit bar and removed.
- **`using-superpipelines`** — `sk-pipeline-grilling` added to the Reference Files list.
- **CC deep-tier model → Opus 4.8** — `skills/sk-platform-dispatch/profiles/tier_1.json` `deep` model `claude-opus-4-7` → `claude-opus-4-8` (reflected in `CLAUDE.md` and the `change-models` model catalog). `model_tiers_version` advanced to `2026-05-29` on the `tier_1` (Claude Code) profile — the only catalog that changed.
- **All plugin manifests versioned at `2.1.0`** — `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` (plugin entry; marketplace catalog root stays `1.0.0`), `.codex-plugin/plugin.json`, `.cursor-plugin/plugin.json`, `gemini-extension.json`, the Codex marketplace subdirectory manifest (`plugins/superpipelines/.codex-plugin/plugin.json`), and `profile_version` on all five tier profiles.
- **Release process** — `.claude/skills/release.md` now also tracks the Codex marketplace subdirectory manifest (`plugins/superpipelines/.codex-plugin/plugin.json`), which was added in 2.0.1 but went untracked by the bump list.
- **Skill authoring pass across all 34 `SKILL.md` files (#25)** — description fields restructured to a triggering-conditions-only form (sentence 1 = what it does; sentence 2 = "Use when …"); redundant `<overview>` blocks and duplicate blockquotes removed; imperative / second-person voice converted to third-person impersonal; concrete-example gaps filled (`brainstorming`, `systematic-debugging`, `sk-hashline-protocol`); time-sensitive markers removed; UTF-8 BOM + mojibake in `sk-model-migration` corrected; assorted stale-value fixes (model IDs, tier labels, the `skill-architect-protocol` ≤1536 char-limit invariant, `change-models` mode count). Net −55 lines, zero behavioral change.

### Fixed

- **Manifest version drift** — `.codex-plugin/plugin.json` and `gemini-extension.json`, left at `2.0.0` during the 2.0.1 install-fix patch, are realigned to the current plugin version.

### Documentation

- **README** — copy update (#20), plus a note on the brief-hardening grilling gate.

---

## 2.0.1 — Install Fixes (2026-05-26)

### Fixed

- **`bin/install.js` — Codex subcommand**: `codex plugin install` → `codex plugin add` (the `install` subcommand does not exist in Codex CLI).
- **`bin/install.js` — Claude Code marketplace name**: changed `@superpipelines` → `@superpipelines-marketplace` to match the registered marketplace ID.
- **`bin/install.js` — `--version` flag removed**: `claude plugin install` rejects `--version` as an unknown option; `agy plugin install` silently ignores it. Removed from both.
- **Codex marketplace index**: added `.agents/plugins/marketplace.json` — the index file the Codex CLI requires to resolve third-party marketplace plugins. Without it `codex plugin add` fails with "plugin not found".
- **Codex plugin subdirectory**: added `plugins/superpipelines/.codex-plugin/plugin.json` — Codex resolves plugins from named subdirectories, not the marketplace root (`path: "./"` is unsupported).

Closes #19.

---

## 2.0.0 — Multi-Platform (2026-05-26)

### Architecture & Governance

- **Multi-Platform Targets** — Single repo supports Claude Code (Tier 1), OpenCode (Tier 1b), Antigravity CLI 2.0 (Tier 1c aspirational), Codex App/CLI (Tier 1d), and Cursor/Windsurf/Cline (Tier 2).
- **5-Tier Execution Model** — New `TIER_MODEL: 5-TIER` invariant in `CLAUDE.md`.
- **Tier-Aware Write/Review Isolation** — `WRITE_REVIEW_ISOLATION: TRUE` invariant replaced by `STRUCTURAL_ON_TIER1_1B_1D; CONVENTION_ONLY_ON_TIER2`. On Tier 2 the orchestrator runs both writer and reviewer protocols with full tools; reviews are advisory. Surfaced at run start and run end.
- **Skill Primacy** — `SKILL_PRIMACY: TRUE` invariant. Intelligence lives in `SKILL.md`; platform manifests are discovery-only.
- **Manual Parity Testing** — `PARITY_TESTING: MANUAL_PHASE1` invariant. Per-platform validation is manual.
- **Project consolidated to a single repo.** OpenCode (Tier 1b) remains a supported platform in the resolver; this repo does not ship a packaged OpenCode installer.

### Added — Parity Test Pipeline Suite

A 10-pipeline cross-tier validation suite verifying v2.0.0 scaffold correctness on all supported platforms:

| Pipeline | Tier | Platform | Pattern | Status |
| :--- | :--- | :--- | :--- | :--- |
| parity-test-a | 1 | Claude Code | Sequential (2-step) | Scaffolded |
| parity-test-b | 1 | Claude Code | Sequential + reviewer isolation (3-step) | Scaffolded |
| parity-test-c | 1c | Antigravity CLI 2.0 | Sequential (2-step) | Scaffolded |
| parity-test-d | 1c | Antigravity CLI 2.0 | Sequential + reviewer isolation (3-step) | Scaffolded |
| parity-test-e | 1d | Codex App/CLI | Sequential (2-step) | Scaffolded + run verified |
| parity-test-f | 1d | Codex App/CLI | Sequential + reviewer isolation (3-step) | Scaffolded + run verified |
| parity-test-g | 2 | Cursor | Sequential (2-step) | Scaffolded |
| parity-test-h | 2 | Cursor | Sequential + reviewer isolation (3-step) | Scaffolded |
| parity-test-i | 1b | OpenCode | Sequential (2-step) | Scaffolded |
| parity-test-j | 1b | OpenCode | Sequential + reviewer isolation (3-step) | Scaffolded |

Each pipeline includes: SDD artifacts (`spec.md`, `plan.md`, `tasks.md`), `topology.json`, run launcher, zero-body agent stubs (or tier-equivalent), companion protocol skills, and a scope-local registry entry. CC, OC, AGY, Codex, and Cursor scopes all receive their own scope-root-local registry.

### Fixed

- **tier_1b `effort_emit_map` missing** — `skills/sk-platform-dispatch/profiles/tier_1b.json` lacked the `effort_emit_map` field. Without it, `sk-model-resolver` could not translate abstract effort tiers (`low`/`medium`/`high`) into the concrete `reasoningEffort` string values required by the OpenCode runtime. Identity mapping `{ "low": "low", "medium": "medium", "high": "high" }` added. (`tier_1d.json` already had `{ "low": "minimal", "medium": "medium", "high": "high" }`.)
- **OC parity agents missing `reasoningEffort` field** — All 5 OpenCode parity agents (`inspector`, `formatter` in parity-test-i; `analyzer`, `reviewer`, `reporter` in parity-test-j) were missing the `reasoningEffort: low` frontmatter field required by the tier_1b profile when the provider is `opencode` or `opencode-go`.
- **Codex entry skills missing terminal status emit** — `run-parity-test-e` and `run-parity-test-f` were missing the explicit "Emit terminal status" step in their final phases. Added as step 4 to the Phase 3 / Phase 4 finalization sections.

### Added — Multi-Platform Targets

- **Codex App/CLI (Tier 1d)** — `.codex-plugin/plugin.json` manifest. Native parallel subagents, model-driven dispatch, up to 6 concurrent threads, TOML agent files.
- **Cursor / Windsurf / Cline (Tier 2)** — `.cursor-plugin/plugin.json` manifest + `hooks/hooks-cursor.json` stub. Single-agent inline execution via `sk-platform-dispatch`.
- **Antigravity CLI 2.0 (Tier 1c aspirational)** — `gemini-extension.json` manifest. Tier 1c if Dynamic Subagent dispatch is exposed to skills; falls back to Tier 2 otherwise.
- **Universal context files** — `AGENTS.md` (any AGENTS.md-aware tool) and `GEMINI.md` (Antigravity CLI 2.0).
- **Universal installer** — `bin/install.js` Node.js entrypoint with platform auto-detection; `install.sh` POSIX wrapper; `install.ps1` PowerShell wrapper. Flags: `--all`, `--only`, `--dry-run`, `--list`, `--uninstall`, `--non-interactive`, `--with-init`.
- **`sk-platform-dispatch` skill** — Tier detection + Tier 2 single-agent inline dispatch loop + per-tier scope-root resolution + Tier 2 degradation surfacing.
- **Per-tier scope roots in `sk-pipeline-paths`** — `PORTABILITY_REWRITE` enables CC-scaffolded pipelines to run on Tier 2 by rewriting `.claude/` paths to `.superpipelines/` at read/write time.

### Added — OC → CC Backports

- **Model preference per step** in `creating-a-pipeline` Phase 2. Deep tier → `claude-opus-4-7`; fast tier → `claude-sonnet-4-6`. Embedded in generated agent `model:` frontmatter by the architect.
- **`{P}.md` Run Launcher artifact** in `creating-a-pipeline` Phase 6. Launcher document referenced by registry and runner. Note: CC does NOT auto-register `{P}.md` as a slash command — `/superpipelines:{P}` direct invocation is OpenCode-only in v2.0.0.
- **Phase 0.5 version-compatibility advisory** in `running-a-pipeline` — non-blocking warning on major-version mismatch.
- **Mandatory `plugin_version`** in `pipeline-state.json` schema, stamped at run init.

### Changed

- `CLAUDE.md` Architecture Invariants block fully revised — see Architecture & Governance above.
- `CLAUDE.md` Project Version reconciled to `v2.0.0` (was `v1.2.0`, out of sync with plugin manifest at `v1.0.6`).
- `running-a-pipeline` gained Phase 0.25 (tier detect & dispatch load) and Phase 0.5 (version-compatibility advisory).
- `pipeline-architect-protocol` now requires generated entry skills to dispatch every step via `sk-platform-dispatch` DISPATCH rather than direct `Task(subagent_type=...)` calls. Existing entry skills predating v2.0.0 continue to work on Tier 1; tier portability requires regenerating with the new architect.
- `pipeline-runner-references/references/dispatch-protocols.md` documents Tier 2 single-agent inline dispatch.
- All five plugin manifests (`.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` plugin entry, `.codex-plugin/plugin.json`, `.cursor-plugin/plugin.json`, `gemini-extension.json`) versioned at `2.0.0`.

### Deprecated

- **Gemini CLI** as a distribution target — runtime retired June 18, 2026. Migrate to Antigravity CLI 2.0 via `agy plugin import gemini`.

### Known Limitations (Phase 1)

- `--uninstall` flag in `bin/install.js` is a stub in v2.0.0 — prints a per-platform pointer message; full uninstall logic deferred to v2.1.
- `--with-init` flag in `bin/install.js` is reserved (no-op) in v2.0.0.
- Tier 1c (Antigravity Dynamic Subagents) is aspirational — falls back to Tier 2 unless the dispatch primitive is verified exposed to skills.
- Tier 1d (Codex) per-agent isolation via TOML `sandbox_mode = "read-only"` is documented as structural in `tier_1d.json`. The release-process parity gate (`.claude/skills/release.md` Step 5c) requires this be verified via a one-shot integration test before each release tag: confirm that a reviewer agent with `sandbox_mode = "read-only"` is blocked from writing to the workspace. If the test fails on a future Codex version, downgrade the profile's `reviewer_isolation` to `"convention"` and amend the invariant text.
- **F-AGY-01 — hooks.json dual incompatibility with Antigravity CLI:** `agy plugin validate` reports "hooks: skipped (not found)". Root cause is two-layered: (1) `hooks/hooks.json` references `${CLAUDE_PLUGIN_ROOT}` — a CC-specific environment variable; AGY injects `${extensionPath}` (Gemini CLI lineage) and does not recognize `${CLAUDE_PLUGIN_ROOT}`, causing the hook command to be unresolvable. (2) The `session-start` script emits a CC-specific `hookSpecificOutput.hookEventName` payload format that AGY does not consume. Fix requires an AGY-specific hook file (`hooks/hooks-antigravity.json`) using the correct env var and a companion AGY-format `session-start-agy` script. Blocked pending confirmation of the exact AGY env var name from official docs (antigravity.google/docs currently returns JS-rendered blank pages). Tracking: F-AGY-01.
- **F-COD-03 — Codex `workspace-write` sandbox unavailable on Windows 11 Home:** Writer TOML agents use `sandbox_mode = "workspace-write"`. This mode requires Windows Sandbox (Hyper-V virtualization), which is unavailable on Windows 11 Home. Parity runs on this platform used `--sandbox danger-full-access`. No TOML change required — this is a host-machine capability gap, not a plugin defect. Tracking: F-COD-03.
- **F-CC-02 — `effort_tier` silently ignored on Tier 1 (CC):** `effort_field_name: null` in `tier_1.json` means `effort_tier` frontmatter on CC agents is accepted but produces no runtime effect. Non-blocking: CC agents rely on `model_tier` for capacity selection. Tracking: F-CC-02.
- Codex plugin-install command syntax (`codex plugin add ...`) in the installer is unverified against a stable Codex release; patch in v2.0.1 if the verified command differs.
- No automated cross-platform parity gate. Per-platform validation is manual.
- True parallel execution on Tier 2 degrades to sequential — Cursor/Windsurf/Cline have no subagent primitive.

### Non-Goals (Phase 1)

- True parallel execution on Tier 2.
- Automated cross-platform parity tests.

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
