---
aiboarding_version: 1
generated: 2026-06-01
last_synced_commit: 82e9ff8afce96d25eead4f5c4ee7bd2779077939
---

# 1. Engineering Basics

**What:** Superpipelines — Claude Code plugin (+ multi-platform). Design, generate, run multi-agent AI pipelines from subagents + skills. Goal: replicable process. Define path once -> tier/effort-matched agents fan out -> parallel exec, efficient tokens, no manual babysit when step clear.

**Stack:** No build/compile. Plugin = markdown skills + agent frontmatter + JSON manifests/profiles. Node ≥18 only for installer (`bin/install.js`, `type: module`). No test framework, no lint. CI (`.github/workflows/ci.yml`) = validate JSON manifests + check required files (plugin.json, README.md, LICENSE) exist. That all.

**Run/install:** `claude plugin install github:gustavo-meilus/superpipelines`. Universal installer auto-detects 7 platforms: `install.sh` (POSIX), `install.ps1` (Win), `npx -y superpipelines-install`.

**Versioning:** v2.2.1. `.version-bump.json` syncs version across `package.json` + `.claude-plugin/plugin.json` + `marketplace.json` (`plugins.0.version`). `.cursor-plugin/plugin.json` + `CLAUDE.md` Project Version tracked manually. Stamp `plugin_version` on every artifact mutation.

**Source roots (repo root):** `agents/` (8 zero-body defs), `skills/` (~40), `commands/` (9 slash wrappers), `hooks/` (SessionStart + opt-in SubagentStop telemetry). Manifests: `.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/`, `gemini-extension.json`.

**Ground truth:** `CLAUDE.md` = canonical invariants + authoring rules. `AGENTS.md` = universal context. `GEMINI.md` = Antigravity. Read CLAUDE.md before editing.

**Platform:** Win11 dev. Shell = PowerShell. Watch UTF-8 BOM trap: never `Set-Content -Encoding UTF8` for JSON CC reads -> BOM breaks `JSON.parse`.

# 2. Domain & Business Logic

**Core unit:** pipeline = named multi-agent workflow. Lifecycle: 9 phases (DECONSTRUCT -> DIAGNOSE -> DEVELOP -> HARD GATE -> IMPLEMENT -> STAGE1 -> STAGE2 -> COMMIT -> DONE).

**6 exec patterns:** Sequential, Parallel Fan-Out, Iterative Loop (cap 3 iter), Human-Gated, Spec-Driven Dev, 4D Wrapper.

**On-demand lifecycle ops:** beyond create/run — `new/update/delete-step` (staged `edit-{ts}/` + auditor DELTA + human gate), `audit-steps`, `change-models`, and **`optimize-pipeline`** (v2.2.0): read-only `pipeline-optimizer` surveys 4 axes (topology / model-tier cost / past-run signals / protocol quality) -> 4D+brainstorm+grill -> single plan-gate -> all-or-nothing batch-apply via existing engines + post-apply audit.

**Skill primacy:** intelligence lives in `SKILL.md`. Agents zero-body (frontmatter only). Each agent has companion `{agent}-protocol/SKILL.md` (full protocol; `disable-model-invocation: true`, `user-invocable: false`). `*-references/` dirs omit SKILL.md -> not preloaded, load on demand. **Invocation-flag trap:** `disable-model-invocation: true` blocks Skill-tool (model) load — use ONLY on `{agent}-protocol` skills. Utility skills loaded programmatically (`sk-model-resolver` via running-a-pipeline) + orchestration skills with a `commands/` wrapper use `user-invocable: false` ALONE (hides from `/` menu, stays Skill-tool-loadable). `disable-model-invocation` on a Skill-tool-loaded skill = runtime block. **Frontmatter-vs-protocol trap (#33, v2.1.2):** an agent's `permissionMode` MUST match its write capability + protocol — `acceptEdits` for file-producers (architect, skill-architect, task-executor: `tools:` include Write/Edit, protocol writes files), `plan` for read-only/advisory (reviewers, auditor, failure-analyzer: `disallowedTools: Write`). A read-only agent's protocol must NOT instruct it to write (auditor renders report inline; ORCHESTRATOR persists + ensures `audit/` dir exists, not the auditor). Empirically `permissionMode: plan` is largely inert for dispatched subagents — real write-gate = `tools:`/`disallowedTools:` allowlist.

**Key skills:** `using-superpipelines` (router), `creating-a-pipeline`/`running-a-pipeline`/`optimizing-a-pipeline`, `sk-platform-dispatch` (tier detect + dispatch), `sk-model-resolver` (5-layer model precedence), `sk-pipeline-paths` (scope roots), `sk-pipeline-grilling` (brief-hardening crawl/grill/reconcile; MODE=brief|architectural|optimization), `sk-spec-driven-development`, `sk-4d-method`.

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

**Worktree artifact-safety (#31, v2.1.1):** data/artifact-only agents OMIT `isolation` (run in parent host cwd); `isolation: worktree` ONLY for tracked-code writers. Pure data agent in worktree writing gitignored `superpipelines/temp/` = zero tracked changes -> CC auto-cleans worktree on teardown -> artifact destroyed -> copy-back fails -> orchestrator re-runs protocol INLINE = token bleed. Code-writers host-anchor artifacts via `RESOLVE_HOST_WORKSPACE()` + `additionalDirectories`; runner fail-fast (missing declared artifact after DONE = BLOCKED, never inline); auditor #23 SEV-0 / #24 SEV-1. NOTE: CC has no `isolation: none` — omit the field.

**Failure-mode honesty:** structural guardrails (isolation, iter cap, profile inversion) = mostly PREVENTIVE — EXCEPT two real reported flaws now fixed: worktree artifact-loss (#31, v2.1.1) + audit-report-ownership / `permissionMode` split-brain (#33, v2.1.2). Plus run-safety audit gate (#37): `running-a-pipeline` Phase 0.7 pre-run tripwire HARD-STOPs a version-drifted pipeline carrying worktree artifact-loss (#23/#24) before dispatch. Plus phase-skip hardening (#45, v2.2.1): live orchestration could drift phase order, invent a fake "no-active-run" phase, skip 0.6/0.7 pre-dispatch -> no runtime observer caught it (auditor checks defs, CI checks JSON, guardrails self-enforced by drifting model). Fix in `running-a-pipeline`: Phase Ordering Contract lifted to top of protocol (total order stated verbatim, no fake phase exists) + mandatory phase-manifest `TodoWrite` at Phase 0 (skip = user-visible) + Phase 3 dispatch precondition HARD-STOPs if 0.6/0.7 absent from phase ledger (persisted to `metadata.phases_executed` at Phase 2 -> resume-safe). `PARITY_TESTING: MANUAL_PHASE1` — no automated cross-platform gate. Cross-platform parity = manual per-platform.

**Before claiming done:** invoke `verification-before-completion`. Before topology edits: `/superpipelines:audit-steps` (SEV-0..3 report). Use `Skill` tool not `Read` for skills.

**Subagent telemetry blind spot (v2.2.0):** orchestrator model CANNOT see per-subagent token counts (anthropics/claude-code #21837/#22625) -> cost/latency signals must be HOOK-authored. `hooks/subagent-telemetry` (SubagentStop) appends `run-telemetry.jsonl`; SHIPS DISABLED (opt-in: needs `CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1` + manual register). `optimizing-a-pipeline` degrades gracefully (static / state-only / full-telemetry).

**Current CC model IDs (verified Anthropic docs 2026-05-29):** deep=`claude-opus-4-8` (Opus 4.8, latest, shipped 2026-05-28), medium=`claude-sonnet-4-6`, triage/fast=`claude-haiku-4-5-20251001`. Source of truth = `skills/sk-platform-dispatch/profiles/tier_1.json` `model_tiers`. `claude-opus-4-7` now legacy. Other tiers use own platform models (OpenCode/Gemini/GPT).
