# Compliance Matrix — Auditor Reference

36-criterion checklist for `pipeline-auditor`. Applied to every file in a pipeline bundle.
Each criterion: PASS / FAIL / PARTIAL / N/A with cited file:line evidence.

## Table of contents

1. Layout & registry (criteria 1–5)
2. Frontmatter (criteria 6–11, including 10a)
3. Topology (criteria 12–16)
4. Runtime safety (criteria 17–25)
5. Resolver consolidation (criteria PR-01..PR-05, PR-07, PR-08, PR-09, PR-10)
6. Canonical agent-def (criteria CAD-01..CAD-05)

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
| 23 | Worktree artifact retention | No agent file in the bundle both declares `isolation: worktree` AND has its companion protocol/topology declare an output artifact under a gitignored `temp/` path without host-anchoring. Detection: `grep -ln "isolation: worktree" agents/superpipelines/{P}/*.md` cross-referenced against each step's declared outputs in `topology.json`; any worktree step whose outputs resolve under `superpipelines/temp/` without a host-anchor note = FAIL (SEV-0, silent data loss — issue #31). |
| 24 | Data agents omit isolation | Every agent that writes no tracked code (read-only / data-retrieval / artifact-only — i.e. `tools` has no `Write`/`Edit` to source paths, or the topology marks the step non-code-modifying) does NOT declare `isolation: worktree`. Detection: `grep -ln "isolation: worktree" agents/superpipelines/{P}/*.md`; for each hit, confirm the step modifies tracked code per `topology.json`. A worktree on a non-code step = FAIL (SEV-1 — issue #31). |
| 25 | Frontmatter ↔ protocol capability coherence | For every agent + companion `{agent-name}-protocol` skill pair, the protocol's **primary action** must not assume a tool the agent's frontmatter forbids, and `permissionMode` must not contradict the protocol's declared write behavior. **Forbidden-tool set** = (any tool absent from a present `tools:` allowlist) ∪ (`disallowedTools:` entries); `permissionMode: plan` additionally makes all write-class tools (`Write`, `Edit`, `Bash`) effectively forbidden. **Detection:** (1) build the forbidden set from agent frontmatter; (2) read the protocol's primary-action region (the `<protocol>`/`Workflow` block and any step labelled the agent's main job — NOT Red Flags, examples, or fix prose); (3) for each forbidden tool `T`, search that region for an **unconditional imperative** that performs `T` (e.g. "Write the report to …", "render … to a file", "Edit the agent", "run `<cmd>`" for `Bash`). A match whose primary path is blocked → **SEV-1** (frontmatter-vs-protocol split-brain — runtime/ownership defect, issue #34). A `permissionMode` that merely contradicts stated intent while the tool is still granted → **SEV-2**. **False-positive guard:** a forbidden-tool mention guarded as a *documented conditional fallback* — language like "if `T` unavailable", "on Tier N", "fallback", "otherwise", "when … absent", or an explicit `disallowedTools` self-citation declaring the agent does NOT do the action (e.g. the auditor protocol's "auditor is read-only … NEVER writes the report file") — is **PASS**, not a finding. Correct positive example: `pipeline-auditor-protocol/SKILL.md` step 3 declares `disallowedTools: Write` AND routes persistence to the orchestrator. |

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

## 6. Canonical agent-def

These criteria validate the tool-neutral canonical agent definition (CAD) stored as data under
`<scope-root>/superpipelines/pipelines/{P}/agents/{name}.md`. The def expresses **capability
intent** (`capabilities.{write_files,run_shell,network,edit_tracked_source}`), so
`write_files: false` is the single portable source for reviewer write-deny that materializes to
each tier's enforcement primitive. Full schema + translation contract: `references/canonical-agent-def.md`.
Fixture examples: `references/fixtures/cad-00-valid-canonical-def.md` (passing) and
`references/fixtures/cad-contradictions.md` (one failing section per rule). Apply CAD-* to every
file under `superpipelines/pipelines/{P}/agents/`; these criteria are N/A to legacy
zero-body agents under `agents/superpipelines/{P}/` (governed by criteria 6–11).

| ID | Criterion | SEV | Detection |
|---|---|---|---|
| CAD-01 | `tool_hints.allow` is a subset of what `capabilities` permits | SEV-1 | For each canonical def, build the denied-capability set from `capabilities.*: false` and map it to its tool class (`write_files:false` ⇒ Write/Edit; `run_shell:false` ⇒ Bash; `network:false` ⇒ web/fetch tools). If any entry of `tool_hints.allow` falls in a denied class, FAIL: the advisory allow-list grants a capability the intent contract denies, silently widening the security boundary at materialization. Example: `capabilities.write_files: false` with `tool_hints.allow: [Read, Write]`. |
| CAD-02 | `isolation_required` coherent with `edit_tracked_source` | SEV-1 | `isolation_required: true` requires `capabilities.edit_tracked_source: true`. A def with `isolation_required: true` AND `edit_tracked_source: false` (e.g. a reviewer or data agent requesting a worktree) = FAIL — incoherent intent that requests writer isolation for a non-writer, producing unnecessary worktree overhead plus auto-teardown data-loss risk (cf. criteria 23–24). Detection: `grep -A1 "isolation_required: true"` cross-referenced with the def's `edit_tracked_source` value. |
| CAD-03 | `io_contract` paths are relative to the run dir | SEV-1 | Every `io_contract.inputs[].*` and `io_contract.outputs[].path` MUST be relative to the active run dir: no absolute path, no leading scope-root name (`.claude/`, `.opencode/`, `.codex/`, `.agents/`, `.superpipelines/`), no `..` escape. Any violation = FAIL — breaks the copy-paste-portability guarantee (the orchestrator resolves paths against the run dir at runtime). Carries criterion 22's PORTABILITY intent into the io_contract. Detection: scan each `path:` value for a leading `/`, a drive letter, a known scope-root prefix, or a `..` segment. |
| CAD-04 | `schema_version` and `plugin_version` present | SEV-2 | Each canonical def MUST declare both `schema_version` (the CAD schema version, e.g. `"1.0"`) and `plugin_version` (current package version, per `PLUGIN_VERSION_STAMPING`). Missing either field = FAIL (SEV-2 drift risk — the def cannot be retro-compatibility-checked or schema-validated). Detection: `grep -L "^schema_version:" …/agents/*.md` and `grep -L "^plugin_version:" …/agents/*.md` return any file. |
| CAD-05 | Reviewer roles do not write | SEV-2 | A def with `role: reviewer` MUST declare `capabilities.write_files: false`. A writing reviewer (`role: reviewer` AND `write_files: true`) = FAIL (SEV-2 — breaks the write/review isolation boundary; a reviewer that can edit the artifact it reviews is the canonical-def analogue of criterion 19). Detection: for each def with `role: reviewer`, confirm `capabilities.write_files: false`. |

### Canonical agent-def remediation

- CAD-01: Remove the offending tool(s) from `tool_hints.allow`, OR flip the corresponding `capabilities.*` flag to `true` if the agent genuinely needs that capability (and re-verify the security intent is correct). `tool_hints` must never widen `capabilities`.
- CAD-02: Set `isolation_required: false` for non-writers, OR set `capabilities.edit_tracked_source: true` if the agent legitimately edits tracked source and needs a worktree.
- CAD-03: Rewrite the path relative to the run dir (strip the scope-root prefix / absolute root / `..`). Let the orchestrator resolve it via `sk-pipeline-paths` at runtime.
- CAD-04: Add the missing `schema_version: "1.0"` and/or `plugin_version: "<current>"` to the def frontmatter.
- CAD-05: Set `capabilities.write_files: false` on the reviewer, OR change `role` if the agent is in fact a writer (e.g. `fixer`).

---

## How to use

1. Read each target file with `Read`.
2. Walk criteria 1–25 (including 10a), then PR-01..PR-05, PR-07, PR-08, PR-09, PR-10, then CAD-01..CAD-05 (for canonical defs under `superpipelines/pipelines/{P}/agents/`) in order. Mark each PASS / FAIL / PARTIAL / N/A.
3. For every FAIL or PARTIAL: cite the file path, line number, and quoted evidence.
4. Assign severity per `severity-classification.md`.
5. Emit the audit report per `audit-report-template.md`.

Mark PARTIAL when a criterion is half-met (e.g., description has triggering conditions but also contains a workflow summary sentence). Do NOT guess on ambiguous cases — mark PARTIAL and explain.
