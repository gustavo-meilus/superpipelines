---
aiboarding_version: 1
generated: 2026-05-29
last_synced_commit: caad6ab7f19aba6b343130c92fa9b67144251f33
---

# 1. Engineering Basics

**What:** Superpipelines — Claude Code plugin (+ multi-platform). Design, generate, run multi-agent AI pipelines from subagents + skills. Goal: replicable process. Define path once -> tier/effort-matched agents fan out -> parallel exec, efficient tokens, no manual babysit when step clear.

**Stack:** No build/compile. Plugin = markdown skills + agent frontmatter + JSON manifests/profiles. Node ≥18 only for installer (`bin/install.js`, `type: module`). No test framework, no lint. CI (`.github/workflows/ci.yml`) = validate JSON manifests + check required files (plugin.json, README.md, LICENSE) exist. That all.

**Run/install:** `claude plugin install github:gustavo-meilus/superpipelines`. Universal installer auto-detects 7 platforms: `install.sh` (POSIX), `install.ps1` (Win), `npx -y superpipelines-install`.

**Versioning:** v2.0.1. `.version-bump.json` syncs version across `package.json` + `.claude-plugin/plugin.json` + `marketplace.json` (`plugins.0.version`). `.cursor-plugin/plugin.json` + `CLAUDE.md` Project Version tracked manually. Stamp `plugin_version` on every artifact mutation.

**Source roots (repo root):** `agents/` (7 zero-body defs), `skills/` (~38), `commands/` (8 slash wrappers), `hooks/`. Manifests: `.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/`, `gemini-extension.json`.

**Ground truth:** `CLAUDE.md` = canonical invariants + authoring rules. `AGENTS.md` = universal context. `GEMINI.md` = Antigravity. Read CLAUDE.md before editing.

**Platform:** Win11 dev. Shell = PowerShell. Watch UTF-8 BOM trap: never `Set-Content -Encoding UTF8` for JSON CC reads -> BOM breaks `JSON.parse`.

# 2. Domain & Business Logic

**Core unit:** pipeline = named multi-agent workflow. Lifecycle: 9 phases (DECONSTRUCT -> DIAGNOSE -> DEVELOP -> HARD GATE -> IMPLEMENT -> STAGE1 -> STAGE2 -> COMMIT -> DONE).

**6 exec patterns:** Sequential, Parallel Fan-Out, Iterative Loop (cap 3 iter), Human-Gated, Spec-Driven Dev, 4D Wrapper.

**Skill primacy:** intelligence lives in `SKILL.md`. Agents zero-body (frontmatter only). Each agent has companion `{agent}-protocol/SKILL.md` (full protocol; `disable-model-invocation: true`, `user-invocable: false`). `*-references/` dirs omit SKILL.md -> not preloaded, load on demand.

**Key skills:** `using-superpipelines` (router), `creating-a-pipeline`/`running-a-pipeline`, `sk-platform-dispatch` (tier detect + dispatch), `sk-model-resolver` (5-layer model precedence), `sk-pipeline-paths` (scope roots), `sk-pipeline-grilling` (brief-hardening crawl/grill/reconcile), `sk-spec-driven-development`, `sk-4d-method`.

**State:** structured JSON at `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json`. Carries `plugin_version`, `metadata.source_tier`, `metadata.runtime_tier`. Crash -> resume from last checkpoint, reset in-progress phases, keep completed work. Topology mutations stage in `edit-{ts}/` before promote (atomic).

**Generated artifacts portable + standalone.** Created pipeline = drop into any project after creation. `parity-test-*` dirs (`.claude/` a,b · `.opencode/` i,j · `.agents/codex/` e,f · `.agents/antigravity/` c,d) = EXAMPLE generated pipelines from dry-run tests. NOT part of shipped plugin bundle. Demo of portability. Future direction: curate generic useful example pipelines so users learn + lift into own projects.

# 3. AI-Specific Context

**Hard invariants (CLAUDE.md ground truth):**
- `SUB_AGENT_SPAWNING: FALSE` — subagents never spawn children. Orchestration only at top-level skill/parent.
- `WRITE_REVIEW_ISOLATION` — writer agent never reviews own code. Stage1 (spec compliance) gates Stage2 (quality). Structural on Tier 1/1b/1d (permission layer); convention-only on Tier 2 (advisory, must surface warning).
- `DEPENDENCY_INVERSION: PROFILE_DRIVEN` — per-platform facts (model IDs, dispatch, scope roots, isolation recipe) live ONLY in `skills/sk-platform-dispatch/profiles/{tier}.json`. Skill bodies depend on abstract `platform_profile.<field>`, never concrete platform names/values. Duplicate in skill body = SEV-2 defect.
- `MODEL_SELECTION: TIER_BASED` — agent frontmatter writes `model_tier:` (triage|fast|medium|deep|inherit), NOT `model:`. Architect writes model_tier only. Runtime resolves via sk-model-resolver 5-layer chain.
- Agent emit exactly ONE terminal status: `DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED`.
- `GRILLING_GATE` — `creating-a-pipeline` Phase 2 MUST run `sk-pipeline-grilling` MODE=brief before architect dispatch: confirm pipeline type (project-embedded vs self-contained) -> conditional silent crawl (findings HELD until reconcile) -> one-question-at-a-time grill -> A3 reconciliation HARD GATE (zero unresolved discrepancies). Phase 3 -> MODE=architectural post-pattern-select. Hardened brief (goal, success_criteria, io_contract, step_decomposition, captured_failure_modes, pipeline_type) -> architect; stamped `topology.json metadata.grilling`.

**Authoring rules:** third-person impersonal voice. Skill body ≤500 lines. Agent body empty. Skill desc ≤1536 chars, triggering conditions only (no workflow summary). References >100 lines need ToC.

**Tier model (5):** Tier1 CC `Task()` · 1b OpenCode `mode: subagent` · 1c Antigravity (aspirational) · 1d Codex (TOML agents, ≤6 concurrent) · 2 Cursor/Windsurf/Cline (single-agent inline). Gemini CLI retired 2026-06-18.

**Failure-mode honesty:** structural guardrails (isolation, iter cap, profile inversion) = PREVENTIVE, NOT yet validated against real incidents. `PARITY_TESTING: MANUAL_PHASE1` — no automated cross-platform gate. No observed prod failures reported by maintainer. Cross-platform parity = manual per-platform.

**Before claiming done:** invoke `verification-before-completion`. Before topology edits: `/superpipelines:audit-steps` (SEV-0..3 report). Use `Skill` tool not `Read` for skills.

**Current CC model IDs (verified Anthropic docs 2026-05-29):** deep=`claude-opus-4-8` (Opus 4.8, latest, shipped 2026-05-28), medium=`claude-sonnet-4-6`, triage/fast=`claude-haiku-4-5-20251001`. Source of truth = `skills/sk-platform-dispatch/profiles/tier_1.json` `model_tiers`. `claude-opus-4-7` now legacy. Other tiers use own platform models (OpenCode/Gemini/GPT).
