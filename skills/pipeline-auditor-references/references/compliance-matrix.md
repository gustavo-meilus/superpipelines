# Compliance Matrix — Auditor Reference

28-criterion checklist for `pipeline-auditor`. Applied to every file in a pipeline bundle.
Each criterion: PASS / FAIL / PARTIAL / N/A with cited file:line evidence.

## Table of contents

1. Layout & registry (criteria 1–5)
2. Frontmatter (criteria 6–11, including 10a)
3. Topology (criteria 12–16)
4. Runtime safety (criteria 17–22)
5. Resolver consolidation (criteria PR-01..PR-05, PR-07, PR-08, PR-09, PR-10)

---

## 1. Layout & registry

| # | Criterion | PASS condition |
|---|-----------|----------------|
| 1 | Files under correct scope root | Agents at `agents/superpipelines/{P}/`; skills at `skills/superpipelines/{P}/`; support files at `superpipelines/pipelines/{P}/` — all under the correct scope root resolved by `sk-pipeline-paths` |
| 2 | Registry entry present | `registry.json` in the scope root has an entry for this pipeline with all required fields (`name`, `scope`, `created_at`, `plugin_version`, `pattern`, `entry_skill`, `agents`, `skills`, `topology_path`, `last_audit`) |
| 3 | Registry consistent with disk | `registry.json[].agents` and `[].skills` match files on disk exactly; `topology_path` resolves to a readable file |
| 4 | Entry skill correctly flagged | `run-{P}/SKILL.md` has `disable-model-invocation: true` AND `user-invocable: true` in frontmatter |
| 5 | Internal skills suppressed | Every skill under `skills/superpipelines/{P}/` other than `run-{P}` has `user-invocable: false` in frontmatter |

## 2. Frontmatter

| # | Criterion | PASS condition |
|---|-----------|----------------|
| 6 | `name` valid | Lowercase + hyphens only, ≤64 chars, matches filename (without `.md`) |
| 7 | `description` triggering-only | Third person, ≤1536 chars combined with `when_to_use`, no workflow summary, no first/second person ("I", "you") |
| 8 | `model` appropriate | `sonnet` by default; any non-sonnet model must have a justification comment in the Architect's Brief or the companion `{agent-name}-protocol` skill |
| 9 | Core agent fields set | `effort` (one of `low/medium/high/xhigh/max`), `maxTurns` (integer), `version` (semver string) all present |
| 10 | `permissionMode` valid | If present: one of `default \| acceptEdits \| plan \| bypassPermissions`; `bypassPermissions` requires an inline justification comment in the companion `{agent-name}-protocol` skill |
| 10a | Agent body is empty | No text appears after the closing `---` of the agent frontmatter block; agent has a companion `{agent-name}-protocol` skill listed in `skills:` |
| 11 | `memory` valid | If present: `none` or `local` only. `memory: project` is a hard SEV-0 violation |

## 3. Topology

| # | Criterion | PASS condition |
|---|-----------|----------------|
| 12 | `topology.json` schema valid | Valid JSON; required top-level keys present; every step has `id`, `depends_on`, `inputs`, `outputs` (see `topology-rules.md` §1) |
| 13 | Agent coverage | Every non-null `step.agent` has a corresponding file; agent `name` frontmatter matches the `agent` field value |
| 14 | Dependency graph integrity | No dangling `depends_on` ids; no orphan steps; topological sort succeeds for non-pattern-3 graphs |
| 15 | Edge consistency | Step inputs reference valid producers; output-input type compatibility preserved where schemas are declared |
| 16 | Spec ↔ tasks coverage | Every acceptance criterion in `spec.md` maps to ≥1 task in `tasks.md`; no orphan tasks (tasks without a corresponding AC) |

## 4. Runtime safety

| # | Criterion | PASS condition |
|---|-----------|----------------|
| 17 | Temp path convention | State and outputs stored at `{ROOT}/superpipelines/temp/{P}/{runId}/` — no `tmp/` or hardcoded absolute paths |
| 18 | No hardcoded absolute paths in agent or protocol skill bodies | Agent files are zero-body; companion `{agent-name}-protocol` skills reference paths via a scope-root variable (`${SCOPE_ROOT}` or equivalent), never literal `/home/...` or `~/.claude/...` |
| 19 | Write/review isolation honored | Review-role agents (`*-spec-reviewer`, `*-quality-reviewer`) have `disallowedTools: Write, Edit, Bash` (or equivalent) in frontmatter |
| 20 | Cleanup contract present in entry skill | Entry skill body explicitly: (a) writes `status: completed` to `pipeline-state.json` on success, (b) deletes `temp/{P}/{runId}/` on DONE, (c) preserves temp on ESCALATED/FAILED/BLOCKED |
| 21 | `plugin_version` present and consistent | `topology.json` has a `plugin_version` field; all agent frontmatter have `plugin_version`; registry entry has `plugin_version`. Missing → SEV-2. Mismatch between topology and agents → SEV-3 |
| 22 | No hardcoded scope-root paths (PORTABILITY) | Entry skill, all step agents, all protocol skills, and topology.json contain no hardcoded scope-root directory names (`.claude/`, `.opencode/`, `.codex/`, `.agents/`, `.superpipelines/`) except inside comments that explicitly document `PORTABILITY_REWRITE`. **Permitted pattern:** paths MUST use the `{ROOT}` template variable resolved via `sk-pipeline-paths` at runtime. Hardcoded scope-root path outside of PORTABILITY_REWRITE documentation → SEV-1 |

Note: Tier 1c (Antigravity) and Tier 1d (Codex) both resolve `workspace` to `.agents/` per the cross-tool open skill-path standard (`.agents/skills/` is read by both Codex and Antigravity). Pipeline state files for either tier live under `.agents/superpipelines/`; the active tier is disambiguated by which orchestrator is loaded in the workspace.

---

## 5. Resolver consolidation

These criteria enforce ADR-0001 (one normative algorithm spec, two adapters) and ADR-0002 (capability independence). Each detection rule cites the specific algorithm branch or architectural decision that justifies it. Fixture examples live in `references/fixtures/pr-0*.md`.

| ID | Criterion | SEV | Detection |
|---|---|---|---|
| PR-01 | Every `skills/sk-platform-dispatch/profiles/tier_*.json` has a `"$schema": "./profile.schema.json"` field | SEV-2 | `grep -rL '"\\$schema"' skills/sk-platform-dispatch/profiles/tier_*.json` returns any file. A profile without `$schema` cannot be auto-validated by editors and may silently drift from the contract. |
| PR-02 | `sk-model-resolver/SKILL.md` body does NOT restate algorithm steps | SEV-2 | `grep -cE "^[[:space:]]*[0-9]+\\." skills/sk-model-resolver/SKILL.md` returns any non-zero count (numbered pseudocode block in body — the canonical algorithm-restatement shape, matching the format used in `references/resolution-algorithm.md`). Body must contain only: public API list, invariants, Red Flags, and a normative pointer. Restating steps creates a second source of truth that drifts (ADR-0001). **Discriminating-power baselines:** `fixtures/discriminating-power/pr-02/` — pre-baseline returns ≥1, post-baseline returns 0. Any regex edit that breaks either assertion has lost enforcement power. |
| PR-03 | Both resolution adapters cite `sk-model-resolver/references/resolution-algorithm.md` | SEV-2 | (a) `grep -n "resolution-algorithm" skills/sk-model-resolver/SKILL.md` must return ≥1 match in the skill body (not just a `references:` frontmatter list). (b) `grep -n "resolution-algorithm" skills/running-a-pipeline/SKILL.md` must return ≥1 match inside the Phase 0.45 block. Missing in either = violation. |
| PR-04 | Inline adapter (Phase 0.45) attempts `LOAD_PREFS` independently of the Skill-tool probe | SEV-1 | Extract the Phase 0.45 *Inline Path* block by header anchors and count `LOAD_PREFS(` invocations (with opening paren — invocation syntax, not the bare identifier): `sed -n '/\\*\\*Inline Path/,/<HARD-GATE>/p' skills/running-a-pipeline/SKILL.md \| grep -c "LOAD_PREFS("`. Result `0` = SEV-1 violation: the inline adapter never invokes LOAD_PREFS, silently dropping user/workspace preferences on Tier 1c and Tier 2 hosts (ADR-0002 capability-independence violation). Bare `LOAD_PREFS` mentions elsewhere in the file (public API summaries, Red Flag prose) do NOT satisfy this criterion. **Discriminating-power baselines:** `fixtures/discriminating-power/pr-04/` — pre-baseline returns 0 (false-negative trap for whole-file grep), post-baseline returns ≥1. Any regex edit that breaks either assertion has lost enforcement power on a SEV-1 criterion. |
| PR-05 | Phase 0.45 calls `RENDER_RESOLUTION_TABLE(resolved[])` rather than hand-crafting the table | SEV-2 | Scan `running-a-pipeline/SKILL.md` Phase 0.45: must contain a `RENDER_RESOLUTION_TABLE` call. Presence of a hardcoded markdown table (` | model | tier |` or similar header) without a `RENDER_RESOLUTION_TABLE` call = violation. Format authority belongs to the resolver (ADR-0001 §Consequences). |
| PR-07 | `sk-model-resolver/SKILL.md` declares `RENDER_RESOLUTION_TABLE(resolved[]) → string` as a public API operation | SEV-2 | `grep -n "RENDER_RESOLUTION_TABLE" skills/sk-model-resolver/SKILL.md` must return ≥1 match in the public API section. Missing = the resolver's interface contract is incomplete; Phase 0.45 would be calling an undeclared operation. |
| PR-08 | `sk-model-resolver/references/resolution-algorithm.md` references only agent-frontmatter fields declared in `agent-frontmatter-schema.md` | SEV-2 | Detect **consultation** of `agent.<field>` (comparison or assignment use), not bare prose mention. Concrete v2.0.0 rule: `grep -nE "agent\\.role[[:space:]]*(==\|!=\|<\|>)" skills/sk-model-resolver/references/resolution-algorithm.md` MUST return 0 — `role` is the only known phantom field (no `role:` key in the canonical schema). Any match = SEV-2 violation: the algorithm consults a field that does not exist, producing accidentally-correct outputs that mask their own root-cause. Bare prose mentions in rationale comments (e.g., `` `agent.role` here would be... ``) do NOT trip the regex because they lack a comparison operator. **Discriminating-power baselines:** `fixtures/discriminating-power/pr-08/` — pre-baseline (`agent.role != "orchestrator"` clause present) returns ≥1, post-baseline (clause removed; rationale prose retained) returns 0. |
| PR-09 | Pipeline entry skill does NOT coexist with v2-migrated agents while using direct `Task()` calls | SEV-1 | For each pipeline `{P}` in registry: IF any agent file under `<scope-root>/agents/superpipelines/{P}/` has `model_tier:` (v2 schema) AND no `model:` field, AND the entry skill at `<scope-root>/skills/superpipelines/{P}/run-{P}/SKILL.md` contains `Task(subagent_type=` invocations (direct dispatch, bypassing `sk-platform-dispatch` DISPATCH): SEV-1 violation. The entry skill silently dispatches at session-default model, erasing per-step `model_tier` intent stamped in `state.metadata.resolved_models[step_id]`. Detection: `grep -l "Task(subagent_type=" skills/superpipelines/*/run-*/SKILL.md` cross-referenced with `grep -L "^model:" agents/superpipelines/*/*.md`. Remediation: re-run Phase 0.4 (migration) on that pipeline — migration regenerates the entry skill via the v2.0.0 architect; original is archived. (Q13: prevents the post-migration incoherent state where Phase 0.45 resolves a model that dispatch never honors.) |
| PR-10 | `reviewer_isolation` field on every profile JSON agrees with the `WRITE_REVIEW_ISOLATION` invariant text in `CLAUDE.md` | SEV-1 | Extract `reviewer_isolation` from each `skills/sk-platform-dispatch/profiles/tier_*.json` and cross-reference against the `WRITE_REVIEW_ISOLATION` invariant in `CLAUDE.md`. Invariant text `STRUCTURAL_ON_TIER1_1B_1D; CONVENTION_ONLY_ON_TIER2` requires: tier_1/1b/1d profiles MUST declare `"reviewer_isolation": "structural"`; tier_2 MUST declare `"reviewer_isolation": "convention"`. Tier 1c may be either; if `"structural"` the profile MUST include `extensions.reviewer_isolation_recipe`. Any mismatch = SEV-1: the profile and the invariant text contradict each other; users cannot trust either. Remediation: pick one side of the contradiction (verify the structural claim via tier-specific integration test, OR downgrade to convention with degradation_warning) before tagging. (Q8: prevents the v1.0.6-era drift where profile and CLAUDE.md disagreed for a release cycle.) |

### Resolver remediation

- PR-01: Add `"$schema": "./profile.schema.json"` as the first key in the profile JSON.
- PR-02: Delete any numbered pseudocode blocks (lines beginning with `1.`, `2.`, …) from `sk-model-resolver/SKILL.md`; replace with a single normative pointer line: `Algorithm: see references/resolution-algorithm.md (normative).`
- PR-03: Add an explicit citation line in the violating adapter body: `# Algorithm: skills/sk-model-resolver/references/resolution-algorithm.md (normative source)`.
- PR-04: Add a `LOAD_PREFS(workspace_root)` invocation (with parens) inside the Phase 0.45 *Inline Path* block, with graceful degradation to empty prefs only when file-read fails. Do not gate on Skill-tool availability. Bare-name mentions outside the inline block do not satisfy this criterion.
- PR-05: Replace the hand-crafted table with `RENDER_RESOLUTION_TABLE(resolved[])` and print the result verbatim.
- PR-07: Add `RENDER_RESOLUTION_TABLE(resolved[]) → string` to the public API list in `sk-model-resolver/SKILL.md`.
- PR-08: Remove the `agent.role` clause from the algorithm. On dynamic-subagent platforms the orchestrator is the entry skill (caller), not a topology node (callee) — `agent.role` is never set on a topology agent. Either drop the role check (Step 4 becomes unconditional on `dynamic_subagents`) or add `role:` to `agent-frontmatter-schema.md` first; the algorithm MUST NOT reference undeclared fields.
- PR-09: Re-run `/superpipelines:run-pipeline` against the affected pipeline. Phase 0.4 (migration) detects the incoherent state, regenerates the entry skill via the v2.0.0 architect, and archives the pre-v2 entry skill to `<scope-root>/superpipelines/pipelines/{P}/entry-skill.pre-v2-backup.md`. After regeneration, the entry skill routes every step through `sk-platform-dispatch` DISPATCH, which consumes `state.metadata.resolved_models[step_id]`.
- PR-10: Reconcile profile vs invariant before tagging. EITHER verify the `structural` claim via tier-specific integration test (see `.claude/skills/release.md` Step 5c Q8 Tier 1d sandbox-isolation verification) AND keep the profile + invariant in sync, OR downgrade the profile's `reviewer_isolation` to `"convention"`, add a degradation_warning, and amend the invariant text. Shipping with profile and invariant disagreeing is the worst outcome — neither claim can be trusted.

---

## How to use

1. Read each target file with `Read`.
2. Walk criteria 1–22 (including 10a) then PR-01..PR-05, PR-07, PR-08, PR-09, PR-10 in order. Mark each PASS / FAIL / PARTIAL / N/A.
3. For every FAIL or PARTIAL: cite the file path, line number, and quoted evidence.
4. Assign severity per `severity-classification.md`.
5. Emit the audit report per `audit-report-template.md`.

Mark PARTIAL when a criterion is half-met (e.g., description has triggering conditions but also contains a workflow summary sentence). Do NOT guess on ambiguous cases — mark PARTIAL and explain.
