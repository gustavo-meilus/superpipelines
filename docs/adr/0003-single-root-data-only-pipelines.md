# ADR-0003 — Single-root, data-only pipelines with materialize-at-runtime dispatch

- **Status:** Accepted
- **Date:** 2026-06-14
- **Decision drivers:** Issue #61–#69 plan; spec `docs/specs/unified-superpipelines-layout-design.md` (gate passed 2026-06-14)
- **Supersedes:** —
- **Related:** [ADR-0001 — Resolution algorithm: one spec, two adapters](0001-resolution-algorithm-one-spec-two-adapters.md), [ADR-0002 — Platform capabilities are independent](0002-platform-capabilities-are-independent.md)

## Context

Before this change, generated pipelines were written into each host's native plugin
directories — `.claude/skills/superpipelines/{P}/…`, `.agents/codex/…`, `.opencode/…`,
`.agents/antigravity/…` — one physical layout per tier. Consequences:

- **Phase 0 paid a per-tier tax every run.** `ENUMERATE_ALL_SCOPE_ROOTS` scanned five
  per-tier roots × {workspace, user}, merged, and annotated `source_tier`; every state write
  ran `PORTABILITY_REWRITE` to translate a source-tier path into the runtime tier's layout.
- **Pipelines were not copy-paste portable.** A pipeline scaffolded on Claude Code carried
  CC-specific agent frontmatter; running it on OpenCode required re-scaffolding
  (`OC_NOT_PORTABLE`).
- **Discovery was coupled to tool registration.** Each generated artifact had to be a
  tool-registered skill/agent in a host-specific directory.

No host natively scans a shared `.superpipelines/` directory for executable skills/agents (CC,
Codex, OpenCode, and Antigravity each disagree on the path), so a shared *executable* root is
unreachable. But a shared *data* root, read by the bundle's own orchestrator, is reachable —
Tier 2 already used `.superpipelines/` as its scope root.

## Decision

**1. Single artifact root — data-only pipelines.** Generated pipelines become pure data under
one root: `<workspace>/.superpipelines/` (project + local scope) and `~/.superpipelines/`
(user scope). The bundle orchestrator (`running-a-pipeline`) reads entry/step/agent defs as
files and dispatches them. Nothing generated is tool-registered. The canonical, tool-neutral
**Canonical Agent Def (CAD)** under `.superpipelines/pipelines/{P}/agents/{agent}.md` is the
single source of truth for each agent.

**2. Materialize-at-runtime dispatch (Option A, not Option B).** For tiers with a structural
subagent boundary (CC `native_task`, OpenCode `native_subagent`, Codex `model_driven` TOML),
the orchestrator translates the CAD into the host's native agent file *just before dispatch*,
dispatches natively, and treats that file as disposable cache (regenerated every run, never
read as source, cleaned on completion). This **preserves the structural
`WRITE_REVIEW_ISOLATION` boundary** — the reviewer's `capabilities.write_files: false`
translates to a real host write-deny primitive. Option B (pure-data, convention-only
enforcement on every tier) was rejected because it downgrades that security boundary.
Antigravity (dynamic subagents) and Tier 2 (inline) cannot materialize a structural boundary;
they run **convention-only** with the degradation surfaced from `profile.degradation_warnings`.

**3. The per-tier `profile.scope_root` is retained — for two non-location jobs.** The single
data root is resolved by `RESOLVE_DATA_ROOT(scope)` (the `.superpipelines/` constant).
`profile.scope_root` no longer locates generated artifacts; it now serves only (a) the
**read-only legacy back-compat path** and (b) the **native materialization target** (CC must
materialize into `.claude/`, OpenCode into `.opencode/`, etc., because that is where each host
discovers native agents). Per `DEPENDENCY_INVERSION: PROFILE_DRIVEN`, these per-tier dir names
stay in profile JSON, never in skill bodies.

**4. Dual-read rollout.** Old per-tier roots are read-only back-compat for one major: existing
pipelines still list and resume. Old-root *writes* are removed immediately. A one-shot
`migrate-pipeline` command moves a pipeline's artifacts into `.superpipelines/` and rewrites
its registry entry. Shipped as a **minor** bump (2.2.x → 2.3.0).

## Consequences

**Positive:**

- Phase 0 collapses to two registry reads (workspace + user `.superpipelines/`); the per-tier
  enumeration loop and `PORTABILITY_REWRITE`-for-paths retire.
- Pipelines are copy-paste portable across tools and projects — `OC_NOT_PORTABLE` is upgraded
  to portable, because the CAD materializes structurally on OpenCode like every other Tier 1
  host.
- All five tiers now interpret one CAD: CC/OpenCode/Codex structurally, Antigravity/Tier 2 by
  convention with honest degradation surfacing.

**Negative / costs:**

- A dispatch-time materialization step and a cleanup step are added to the run loop; stale
  cache is mitigated by namespacing under `…/{native_agent_dir}/{P}/` and cleaning on Phase 4.
- Dual-read keeps legacy-root reading logic alive for one major (time-boxed; removed at the
  next major).
- The CAD schema must remain lossless for CC/OC/Codex dialects; the auditor (CAD-01..05)
  validates this.

## How to revisit

This ADR should be reopened if any of the following become true:

- The dual-read back-compat window closes (next major) — remove legacy-root *reads* and the
  `PORTABILITY_REWRITE` legacy branch; this ADR records that they are time-boxed to one major.
- A host emerges that natively scans a shared `.superpipelines/` for executable agents,
  making materialization unnecessary for that tier.
- The structural-vs-convention split changes — e.g. Antigravity or a Tier 2 host gains a
  per-subagent write-deny primitive, allowing it to materialize structurally.

## References

- `docs/specs/unified-superpipelines-layout-design.md` (§3 layout, §4 Phase 0, §5 dispatch, §8 migration)
- `skills/sk-pipeline-paths/SKILL.md` — `RESOLVE_DATA_ROOT`, legacy back-compat, `PORTABILITY_REWRITE`
- `skills/sk-platform-dispatch/SKILL.md` — MATERIALIZE / CLEANUP_MATERIALIZED, `TRANSLATE_CAD_TO_*`
- `skills/running-a-pipeline/SKILL.md` — Phase 0 single-root discovery, Phase 4 cleanup
- `skills/migrating-a-pipeline/SKILL.md` — one-shot legacy → data-only migration
- [ADR-0002 — Platform capabilities are independent](0002-platform-capabilities-are-independent.md)
