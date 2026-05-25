# PRD: Resolver Consolidation + Profile Schema (Architecture Candidates #1 + #2)

**Date:** 2026-05-25
**Branch:** `feat/multi-platform-impl` (in-scope; must merge before v2.0.0 tag)
**Target release:** v2.0.0 (not deferred)
**Status:** Ready for implementation
**Related ADRs:** [ADR-0001](../adr/0001-resolution-algorithm-one-spec-two-adapters.md), [ADR-0002](../adr/0002-platform-capabilities-are-independent.md)
**Glossary:** `CONTEXT.md`

---

## Problem Statement

A maintainer working on the model-resolution chain in Superpipelines today must reason across **five files in lockstep**: `sk-model-resolver/SKILL.md`, `sk-model-resolver/references/resolution-algorithm.md`, `running-a-pipeline/SKILL.md` Phase 0.4, `sk-model-migration/SKILL.md`, and `creating-a-pipeline/SKILL.md` Phase 2. The five-layer precedence chain is **defined** in the resolver and **re-implemented inline** in the orchestrator — and the inline path is a strict subset of the full algorithm. On **Tier 1c (Antigravity)** and **Tier 2 (Cursor/Windsurf/Cline)**, the inline path silently emits literal model names where the profile contract says the field should be omitted. This is incorrect output, not a degraded-mode tradeoff. The resolver is supposed to be a deep module; in practice it is shadowed by a parallel implementation.

Separately, the five **platform profiles** (`profiles/tier_*.json`) carry the entire load-bearing description of every supported platform — but no machine-readable schema validates their shape. A stray field on one profile is silently accepted; a missing required field crashes at runtime. When a new platform is added (Kiro deferred to v2.1+), there is no source-of-truth for what shape the new profile must have. The `DEPENDENCY_INVERSION: PROFILE_DRIVEN` invariant in `CLAUDE.md` promises that adding a platform is "a profile JSON + detection heuristic with zero skill-body edits" — the schema is what makes that promise enforceable.

## Solution

Consolidate the model-resolution algorithm into **one normative specification** with **two adapters**: a skill-loaded adapter (when the Skill tool is available) and an inline adapter in `running-a-pipeline` Phase 0.4 (when it is not). Both adapters cite the same algorithm file and produce identical outputs given identical inputs. The latent Tier 1c / Tier 2 bug disappears structurally because there is only one algorithm.

Authoring a **JSON Schema (draft 2020-12) for platform profiles**, co-located with the profiles themselves, gives every profile a `$schema` link for IDE auto-validation and gives the pipeline-auditor a `PR-01` criterion that catches malformed profiles before runtime. Capability-applicability constraints (e.g. *"`effort_emit_map` requires `effort_field_name`"*) live as auditor rules — not in the schema — because they cite specific branches of the resolution algorithm and would otherwise duplicate algorithm authority.

## User Stories

1. As a **pipeline maintainer**, I want the resolution algorithm to live in exactly one file, so that changing the precedence chain requires editing one file, not four.

2. As a **pipeline maintainer**, I want both the skill-loaded and inline resolution paths to cite the same normative algorithm, so that the two paths cannot drift.

3. As a **Tier 1c (Antigravity) user**, I want the resolver to emit `model: null` for non-orchestrator agents on dynamic-subagent platforms even when the Skill tool is unavailable, so that the inline path respects my platform's `dynamic_subagents: true` contract.

4. As a **Tier 2 (Cursor/Windsurf/Cline) user**, I want the resolver to omit the model field entirely when my profile has `model_field_format: omit`, so that the host IDE's model selection is not overridden.

5. As an **Antigravity user without the superpipelines plugin installed**, I want my workspace and user preference files to still be consulted when file reading is available, so that my preferences are not silently ignored just because a skill-loading tool is absent.

6. As an **author of a new platform profile (future tier_1e)**, I want a machine-readable schema describing what fields are required, so that I can validate my new profile without reading five existing profiles to infer the shape.

7. As a **contributor editing an existing profile**, I want my IDE to flag a misspelled field name immediately, so that I do not ship a typo that silently disables a capability.

8. As a **pipeline-auditor user**, I want shape violations on profile JSONs to surface as SEV-1 findings, so that broken profiles cannot reach a released branch.

9. As a **pipeline-auditor user**, I want capability-applicability violations (e.g. `effort_emit_map` set without `effort_field_name`) to surface as SEV-2 findings with a citation to the algorithm branch that justifies the rule, so that I can fix the violation by reading the cited branch.

10. As a **pipeline-architect agent**, I want a single API to call (`RESOLVE`, `RENDER_RESOLUTION_TABLE`, `EMIT`, `REVERSE_MAP`, `LOAD_PREFS`, `DETECT_CATALOG_DRIFT`) that owns all resolution-related rendering, so that I do not have to encode column formats or enum stringification in my own protocol.

11. As an **orchestrator running Phase 0.4**, I want to call `RENDER_RESOLUTION_TABLE(resolved[])` and print the output verbatim, so that the current HARD-GATEs (Source column = literal enum; Model column = `resolved.model` verbatim) collapse from runtime assertion into structural correctness.

12. As an **orchestrator running Phase 0.4 on a host without the Skill tool**, I want to attempt reading workspace and user preference files and gracefully degrade to empty preferences when file reading fails, so that I never assume two independent capabilities (skill-load and file-read) are coupled.

13. As an **author of a new resolver fixture**, I want existing fixtures under `sk-model-resolver/fixtures/` to remain valid against the consolidated algorithm, so that the regression surface I rely on does not silently change.

14. As a **regression-test author**, I want one fixture pair for the Tier 1c dynamic-subagent case and one for the Tier 2 omit case, so that the fixed bug cannot return.

15. As a **regression-test author**, I want one fixture for `RENDER_RESOLUTION_TABLE`, so that the table format authority cannot drift back into the orchestrator.

16. As a **profile-schema author**, I want one fixture profile that passes validation and one with a stray capability field that is rejected, so that `additionalProperties: false` is verifiably wired up.

17. As an **auditor-rule author**, I want one minimal malformed-profile fixture per capability rule (PR-02 through PR-05, plus PR-07), so that each rule's behavior is independently verifiable.

18. As a **future contributor reading `running-a-pipeline` Phase 0.4**, I want the inline path to be a short citation ("Execute the algorithm in `references/resolution-algorithm.md` with `prefs` from the degraded-LOAD_PREFS step") rather than a self-contained restatement of the algorithm, so that I cannot accidentally fix a bug in only one of the two adapters.

19. As a **plugin maintainer**, I want `CONTEXT.md` and `docs/adr/` to be the canonical references for design decisions and domain vocabulary used in this work, so that decision rationale survives turnover.

20. As a **future maintainer adding a new platform (tier_1e or beyond)**, I want adding a new tier to be exactly "write one tier_1e.json that validates against the schema, plus one detection heuristic in `bin/install.js`," so that the `DEPENDENCY_INVERSION: PROFILE_DRIVEN` invariant is enforceable instead of aspirational.

## Implementation Decisions

### Architectural decisions (locked by ADR-0001 + ADR-0002)

- **The resolution algorithm seam is a file path** — `sk-model-resolver/references/resolution-algorithm.md` — not a skill invocation. Both adapters cite this file as their normative source.
- **`sk-model-resolver/references/resolution-algorithm.md` is promoted from "examples" to normative specification.** Its top section becomes the 10-step pseudocode; existing branch-by-branch examples move below as "Worked Examples."
- **`sk-model-resolver/SKILL.md` body shrinks** to: public API list, invariants, Red Flags, and a normative pointer to the algorithm file. The skill body never restates algorithm steps.
- **Both adapters execute the same algorithm with the same branches.** No degraded variant of the algorithm exists. The inline path uses degenerate (empty) `prefs` only when file-read also fails.
- **Each platform capability is independent until proven otherwise.** Code that branches on capability A may not silently assume the value of capability B. Inferring B from A is permitted only with documented justification.

### New module: `RENDER_RESOLUTION_TABLE(resolved[]) → string`

- Resolver-owned operation; lives alongside `EMIT`, `RESOLVE`, `LOAD_PREFS`, `REVERSE_MAP`, `DETECT_CATALOG_DRIFT`.
- Public API grows from 5 operations to 6.
- Optional `target_format` parameter (defaulting to `"text"`) mirrors `EMIT`'s shape; reserved for future Tier 2 IDE rendering.
- Output is a fixed-width text table with exactly these columns: `Step | Tier | Source | Model | Effort`. Source column emits the literal `resolved.source` enum value; Model column emits `resolved.model` verbatim; warnings printed below the table, one per line, prefixed `⚠️ {step_id}: {warning}`.
- `running-a-pipeline` Phase 0.4 HARD-GATEs collapse to: "MUST call `RENDER_RESOLUTION_TABLE(resolved[])` and print its output verbatim. The table format is owned by the resolver."

### New module: `profile.schema.json`

- JSON Schema **draft 2020-12** (chosen over draft-07 for `unevaluatedProperties` support and superior tooling).
- Path: `skills/sk-platform-dispatch/profiles/profile.schema.json` — co-located with the profiles it validates.
- `additionalProperties: false` at every object level. New capability fields require schema edit *before* a profile can use them; this enforces documentation-first authoring.
- **Required base fields** (8): `tier`, `name`, `profile_version`, `model_tiers_version`, `capabilities`, `scope_root`, `model_tiers`, `degradation_warnings`. `extensions` stays optional.
- **Required `capabilities` fields**: `subagents`, `parallel_subagents`, `task_primitive`, `skill_tool`, `worktrees`, `reviewer_isolation`, `dispatch_mechanism`, `dynamic_subagents`, `model_field_format`. All other capability fields optional.
- **Required `model_tiers` keys** (all four): `triage`, `fast`, `medium`, `deep` — each `{model: string, effort: string}`. `inherit` is a valid `model` value, never a key.
- **Required `scope_root` keys**: `workspace`, `user` — each non-empty string.
- Every profile JSON gains a `"$schema": "./profile.schema.json"` field for IDE auto-validation.
- **Validation timing**: dev-time only (auditor PR-01 + IDE via `$schema`). No runtime validator. Resolver remains a pure function; malformed-profile crashes are authoring bugs caught in audit.

### Auditor rules (6 criteria, capability-applicability lives here not in schema)

| Rule | Body summary | SEV |
|---|---|---|
| **PR-01** | Profile validates against `profile.schema.json`. | SEV-1 |
| **PR-02** | `effort_emit_map` set ⇒ `effort_field_name` set. Cites algorithm branch 9. | SEV-2 |
| **PR-03** | `effort_field_applies_to_providers` set ⇒ `effort_field_name` set. Cites algorithm branch 8b. | SEV-2 |
| **PR-04** | `model_field_format == "toml_split"` ⇒ `effort_field_name` set. Cites algorithm branch 9 / `EMIT` toml_split case. | SEV-2 |
| **PR-05** | `skill_tool_name` set ⇒ `skill_tool == true`. Internal contradiction otherwise. | SEV-3 |
| **PR-07** | Profile carries a capability field that no algorithm branch reads for that tier (e.g. `effort_emit_map` on tier_1). | SEV-3 |

PR-06 (proposed during grilling) was **dropped** — the algorithm enforces the constraint at runtime regardless of profile authorship, so the rule would be documentation in audit-rule clothing.

### Adapter rewrite: `running-a-pipeline` Phase 0.4

- Both code paths cite `references/resolution-algorithm.md`.
- Inline path attempts `LOAD_PREFS` (reads `<workspace>/.superpipelines/model-preferences.json` and `~/.superpipelines/model-preferences.json`). On read failure, falls back to `prefs = { user: {platforms:{}}, workspace: {platforms:{}} }`. Algorithm proceeds identically.
- Inline path's current `source: "profile_default"` hardcoding is **removed** — `source` is whatever the algorithm computes.
- Inline-path advisory is rewritten from "user/workspace preference files will NOT be consulted" to "preference files were attempted; consult the Source column for which rows used them."
- HARD-GATE: "MUST call `RENDER_RESOLUTION_TABLE(resolved[])` and print its output verbatim."
- HARD-GATE: "Every `resolved.warnings` entry MUST be printed verbatim under the table."

### Vertical slicing (4 slices, S3 → S4 → S1 → S2 serial order)

| Slice | Bundles | Verifiable by |
|---|---|---|
| **S3** | `profile.schema.json` authoring + `$schema` link on all 5 profile JSONs | VSCode auto-validates; stray field rejected; missing required field rejected. Lowest-risk slice. |
| **S4** | Auditor PR-01..PR-05, PR-07 in `pipeline-auditor-protocol/SKILL.md` and the compliance matrix | `/superpipelines:audit-pipeline` against current profiles → zero new findings. Introduce one controlled violation per rule → caught. |
| **S1** | Promote `resolution-algorithm.md` to normative; shrink `sk-model-resolver/SKILL.md`; add `RENDER_RESOLUTION_TABLE`; fix latent Tier 1c/2 bug (γ folded in, flagged in commit + ADR-0001) | Existing 8 resolver fixtures still pass; 3 new fixtures (Tier 1c, Tier 2, `RENDER_RESOLUTION_TABLE`) pass. |
| **S2** | Rewrite `running-a-pipeline` Phase 0.4 (both paths cite algorithm doc; HARD-GATEs collapse; LOAD_PREFS attempted in inline path) | Smoke-test on Tier 1 (full path) and on a host without Skill tool (inline path); resolution table identical given identical inputs. |

S1+S2 are independent of S3+S4 and can land in parallel. Within each pair, the second slice depends on the first.

## Testing Decisions

**Test surface:** all tests in Superpipelines are **fixture-based** — input JSONs + expected output JSONs that an engineer or LLM walks an algorithm against. There is no test runner; SKILL.md files are LLM instructions, not executable code. This testing model is established prior art: see `sk-model-resolver/fixtures/` (8 existing fixtures covering algorithm branches 1, 2, 3, 4, 5, 6 + cross-tier e2e scenarios).

**What makes a good test in this codebase:** observable external behavior only. A fixture tests "input X produces output Y" — never "algorithm reached pseudocode line 7." Naming intermediate variables, citing branch numbers in the fixture, or asserting on `warnings[]` array ordering are all anti-patterns. The fixture must remain valid even if the algorithm internally restructures.

### Tests in scope

**Resolution algorithm spec (3 new fixtures, plus 8 existing remain valid):**

1. `fixtures/tier_1c-dynamic-subagent-bug/` — input: agent with `model_tier: deep`, profile with `dynamic_subagents: true`, role = "worker"; expected output: `resolved.model = null`, `resolved.source = "host_inherit"`, warning about dynamic-subagent platform. Regression for the latent Tier 1c bug.
2. `fixtures/tier_2-omit-bug/` — input: agent with `model_tier: medium`, profile with `model_field_format: "omit"`; expected output: `resolved.model = null`, `resolved.source = "host_inherit"`. Regression for the latent Tier 2 bug.
3. `fixtures/render-table-basic/` — input: a `resolved[]` array of 4 entries (one per `source` enum); expected output: a verbatim fixed-width text table. Verifies `RENDER_RESOLUTION_TABLE` format authority.

**Profile schema (2 new fixtures):**

4. `fixtures/profile-schema/valid/` — every existing `tier_*.json` validates. (Implicit: re-running the auditor against the current branch produces zero PR-01 findings post-merge.)
5. `fixtures/profile-schema/invalid-stray-field/` — a profile with an unknown `capabilities.foo` field is rejected by `additionalProperties: false`. Single negative fixture covers schema strictness end-to-end.

**Auditor rules (5 violation fixtures, one per capability rule):**

6. `fixtures/auditor/pr-02-effort-emit-map-without-name/`
7. `fixtures/auditor/pr-03-effort-applies-to-providers-without-name/`
8. `fixtures/auditor/pr-04-toml-split-without-name/`
9. `fixtures/auditor/pr-05-skill-tool-name-without-skill-tool/`
10. `fixtures/auditor/pr-07-unused-capability-field/`

Each fixture is a minimal malformed profile + expected auditor finding (severity + rule ID + cited algorithm branch). PR-01 is covered by fixture 5 above.

### Prior art

- `sk-model-resolver/fixtures/cc-deep-userprefs/` — single-tier RESOLVE fixture.
- `sk-model-resolver/fixtures/oc-cross-tier/` — cross-tier scenario.
- `sk-model-resolver/fixtures/codex-cross-family/` — cross-family scenario.
- `sk-model-resolver/fixtures/e2e-cc-to-codex/` — end-to-end state-file evolution.
- `sk-model-resolver/fixtures/e2e-cc-to-oc/` — end-to-end with OC frontmatter portability.
- `sk-model-migration/fixtures/v1-agent.md` + `v2-agent-expected.md` — before/after migration fixtures.

The new fixtures follow the same input/expected-output JSON pair structure plus a one-line `README.md`.

### Out of test scope (deliberately)

- **Performance regression tests** — Superpipelines does not measure resolver throughput; resolution is amortized over pipeline run time.
- **Cross-LLM-fidelity tests** — whether different LLMs interpret the algorithm prose identically is a parity concern deferred to v2.1 (per `PARITY_TESTING: MANUAL_PHASE1` invariant in CLAUDE.md).
- **Runtime schema validation tests** — schema validation is dev-time only; runtime crashes on malformed profiles are not in-scope to recover from.

## Out of Scope

- **`sk-model-migration` rework** — the migration skill is unchanged. Its `REVERSE_MAP` call is internal; Phase 0.45 HARD-STOP behavior on inline + v1-legacy remains as shipped.
- **`change-models` rework** — the 6-mode change-models skill is unchanged. It already calls the resolver correctly via the Skill tool.
- **`creating-a-pipeline` Phase 2 rework** — the model_tier prompt UI is unchanged. Phase 2 will continue to defer concrete resolution to Phase 5 preview.
- **Adding Kiro (tier_1e)** — explicitly deferred to v2.1+ per `docs/superpowers/specs/2026-05-20-multi-platform-design.md` NG6. This PRD's schema work *enables* Kiro authoring but does not perform it.
- **Automated cross-platform parity testing** — v2.1 objective per CLAUDE.md.
- **Orchestrator phase extraction (Candidate #3 from architecture review)** — deferred; may dissolve once #1 lands.
- **Agent + protocol-skill seam (Candidate #5)** — speculative; no action this PRD.
- **References directory reorganization (Candidate #6)** — speculative; no action this PRD.

## Further Notes

### Risks

- **The largest hidden risk is in S2** (Phase 0.4 rewrite). The orchestrator currently has working HARD-GATEs that prevent paraphrasing of the Source column. Collapsing them to "call and print verbatim" trusts that `RENDER_RESOLUTION_TABLE` is correctly authored *and* that the orchestrator faithfully prints what it returns. The S1 fixture for `RENDER_RESOLUTION_TABLE` mitigates the first; an auditor criterion ("Phase 0.4 must literally print `RENDER_RESOLUTION_TABLE` output without surrounding prose") mitigates the second.
- **Tier 1c bug fix is a behavior change** (γ). It will change observable output for Antigravity users running on hosts without the plugin installed. Today they see literal model names emitted; post-fix they see `model: null` and a degradation advisory. The commit message and ADR-0001 footnote flag this; no further user-facing migration is required (no v1 state schema involved).

### Standards-doc alignment (user-supplied 2026-05-25 AI-Driven Development Standards)

- §1 Project Initialization: `CONTEXT.md` and `docs/adr/` created during the grilling session that produced this PRD.
- §2 Shared Domain Language: `CONTEXT.md` updated inline during grilling.
- §3 Architecture Remediation: HTML report at `C:\Users\gmeil\AppData\Local\Temp\architecture-review-20260525-162554.html` proposed Candidates #1–#6; this PRD takes on #1 and #2.
- §4 Spec-Driven Planning: 9-question grilling transcript is the spec source. ADR-0001 and ADR-0002 record the irreversible/surprising/trade-off decisions.
- §5 Task Breakdown Pipeline: 4 vertical slices (S3, S4, S1, S2) described above; can be expanded into 4 sub-issues via `/to-issues`.
- §6 Autonomous Execution: implementation should follow TDD — write each fixture before the algorithm/schema/rule it tests, using effort tier `medium` for slice work and `high` for the algorithm rewrite (S1).
- §7 Quality Assurance: two-axis review on the merged PR — standards review (does the code conform to `CONTEXT.md` + ADRs?) + spec review (does it implement this PRD without scope creep?).

### Release scope and branching

- **All four slices (S1–S4) land on `feat/multi-platform-impl`** alongside the other v2.0.0 work currently on that branch. No separate integration branch.
- **v2.0.0 cannot tag** until S1–S4 are merged and the auditor reports zero new findings. This PRD is a v2.0.0 release-gating item.
- The `feat/multi-platform-impl` branch already carries the model_tier/effort_tier migration (commit `52bc8c9`), the resolver skill (commit `b4f8ceb`), and the 5-layer algorithm (current `sk-model-resolver/SKILL.md`). This PRD's S1 builds on those — it does not relitigate them.
- The in-progress cross-platform skill-tool fallback plan at `docs/superpowers/plans/2026-05-25-cross-platform-skill-tool-fallback.md` should complete first (it stabilizes Phase 0.25/0.4/0.45 boundaries that S2 depends on). Both plans target the same v2.0.0 tag.

### Out-of-band

- ADR-0001 and ADR-0002 were authored 2026-05-25 alongside this PRD; both must land in the same v2.0.0 tag so the rationale and the implementation ship together.
