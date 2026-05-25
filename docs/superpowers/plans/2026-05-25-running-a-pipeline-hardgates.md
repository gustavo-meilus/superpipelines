# running-a-pipeline HARD-GATE Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close 4 rationalization-resistance gaps in `skills/running-a-pipeline/SKILL.md` exposed by the 2026-05-25 ai-articles smoke test (Phase 0.45 skipped migration, Phase 0.4 emit format drifted from resolver spec, Phase 0.5 conflated scopes, topic prompt jumped 5 phases ahead).

**Architecture:** Pure skill-body edits to `skills/running-a-pipeline/SKILL.md`. No code or fixture changes. Each bug gets an explicit HARD-GATE block, Red Flag entry, and Rationalization Table row so the model cannot rationalize past it on next execution. Verification is one full pipeline run against the ai-articles lac fixture plus an auditor pass.

**Tech Stack:** Markdown skill body. `<HARD-GATE>` and `<invariant>` tags. PowerShell for verification commands (Windows host).

---

## File Structure

Single file touched:
- Modify: `skills/running-a-pipeline/SKILL.md` — Phase 0.4, 0.45, 0.5, 0.6/3 boundary, Red Flags, Rationalization Table

Reference (read-only, no edits):
- `skills/sk-model-resolver/SKILL.md` — resolver output schema (used to anchor Phase 0.4 emit rules)
- `skills/sk-model-migration/SKILL.md` — migration protocol (Phase 0.45 calls into this)
- `docs/superpowers/plans/2026-05-24-cross-platform-model-resolver.execution.log` — append verification entries

Verification target (no edits, just runtime smoke test):
- `C:/Users/gmeil/Github/ai-articles/.claude/agents/superpipelines/linkedin-article-creator/*.md` — 5 v1-legacy agents

---

## Bug Inventory (anchored to 2026-05-25 trace)

| # | Bug | Phase | Trace evidence |
|---|---|---|---|
| 1 | Migration called "optional" when v1-legacy candidates found | 0.45 | `"Agents still function; migration optional."` — no `Skill(sk-model-migration)` load, no git commits |
| 2a | Source label transformed (lost `frontmatter_override` literal) | 0.4 emit | Table column shows `agent frontmatter (model: sonnet)` instead of `frontmatter_override` |
| 2b | Resolver warnings suppressed | 0.4 emit | No `"Explicit model override bypasses tier resolution"` line surfaced |
| 2c | Per-agent inconsistency (humanizer marked `profile default` despite same `model: sonnet`) | 0.4 loop | Resolver not called per agent; model summarized |
| 3 | Phase 0.5 wording conflates pipeline-version with agent-version | 0.5 | `"Phase 0.5: Pipeline has no plugin_version (pre-stamping era)"` line bled into Phase 0.45 agent-classification context |
| 4 | Topic prompt collected before Phases 0.4–2 | ordering | Topic asked between 0.25 and 0.4; entry skill input is Phase 3 dispatch payload |

---

## Task 1: Phase 0.45 — Make migration mandatory when v1-legacy candidates found

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md` — Phase 0.45 block (lines 63–78)

- [ ] **Step 1: Replace Phase 0.45 body with HARD-GATE language**

Replace the existing block exactly:

```markdown
### PHASE 0.45 — Model Migration Check

- Scan all agent files under the pipeline scope.
- FOR each agent with `model:` field AND no `model_tier:` field:
  - Read `plugin_version` from agent frontmatter.
  - IF `plugin_version` absent OR semver `< 2.0.0`: classify as **v1-legacy candidate** (stale schema).
  - ELSE (`plugin_version >= 2.0.0`): classify as **v2 intentional escape hatch**. Skip migration; auditor surfaces as MT-03 SEV-3 informational only.
- IF any v1-legacy candidates found:
  - <HARD-GATE>MUST load `sk-model-migration` via the `Skill` tool and execute the migration protocol. NEVER classify migration as "optional", "deferred", "informational", or "user discretion". The presence of a v1-legacy candidate is unambiguous evidence of schema drift that breaks dispatch metadata, audit reporting, and tier resolution provenance. The only legitimate skip path is the `plugin_version >= 2.0.0` classifier above.</HARD-GATE>
  - Pass the candidate list to `sk-model-migration`.
  - The migration protocol (creates git checkpoint + rewrites frontmatter + commits + stamps `plugin_version` to current) is non-interactive past the dirty-tree confirmation; do not insert additional prompts.
  - Re-run Phase 0.4 (resolution) against the migrated agents.
- ELSE: skip silently; proceed to next phase.

<invariant>
The classifier MUST use `plugin_version` to distinguish v1 legacy from v2 intentional escape hatch. NEVER migrate agents that explicitly stamp `plugin_version >= 2.0.0` — those are user-authored escape hatches and migration would clobber intent. Conversely, NEVER skip agents missing `plugin_version` — stamping was introduced in v2.0, so absence is unambiguous v1 evidence.
</invariant>

<invariant>
Once v1-legacy candidates are identified, migration is mandatory before dispatch. The orchestrator MUST NOT proceed to Phase 0.5 with un-migrated v1-legacy agents in scope. Rationalizing the migration as "optional" because agents "still function" is a known failure mode — the resolver's `source`, `warnings`, and state-file `resolved_models[step_id]` cannot be trusted while v1 schema is present.
</invariant>
```

- [ ] **Step 2: Verify edit landed**

Run:
```powershell
Select-String -Path "C:\Users\gmeil\Github\superpipelines\skills\running-a-pipeline\SKILL.md" -Pattern "migration is mandatory before dispatch"
```
Expected: one match line printed.

- [ ] **Step 3: Commit**

```bash
git add skills/running-a-pipeline/SKILL.md
git commit -m "fix(running-a-pipeline): HARD-GATE Phase 0.45 migration (no 'optional' rationalization)"
```

---

## Task 2: Phase 0.4 — Pin emit format to resolver output verbatim

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md` — Phase 0.4 block (lines 40–61)

- [ ] **Step 1: Replace Phase 0.4 body with explicit emit rules**

Replace the existing block exactly:

```markdown
### PHASE 0.4 — Model Resolution

- Load `sk-model-resolver` via the `Skill` tool.
- `LOAD_PREFS(workspace_root)` → user + workspace preference objects.
- `DETECT_CATALOG_DRIFT(prefs, platform_profile)` — IF drifted, emit advisory (non-blocking).
- FOR each agent in `topology.json` steps (no exceptions — iterate every node):
  - Read frontmatter from the agent's `agent` path in topology.
  - `resolved = RESOLVE(agent, platform_profile, prefs)`.
  - Cache to `state.metadata.resolved_models[step_id]` via atomic write.
  - Append every entry of `resolved.warnings` to the run advisory queue.
- <HARD-GATE>The resolution table MUST use the literal `resolved.source` enum value (one of `frontmatter_override | workspace_prefs | user_prefs | profile_default | host_inherit`) in the Source column. NEVER translate, paraphrase, abbreviate, or annotate the source value (e.g., `"agent frontmatter (model: sonnet)"` is wrong — emit `frontmatter_override`). The Model column MUST use `resolved.model` verbatim (e.g., if resolver returns `sonnet`, emit `sonnet`, not `claude-sonnet-4-6`). Display expansion belongs to `EMIT()`, not the orchestrator.</HARD-GATE>
- <HARD-GATE>Every `resolved.warnings` entry MUST be printed verbatim under the table as a bullet list before proceeding to the next phase. Suppressing warnings (including the `frontmatter_override` advisory) hides the only signal the user has that resolution bypassed preferences.</HARD-GATE>
- Emit user-facing resolution table with these exact columns:
  ```
  Step           Tier    Source              Model                   Effort
  architect      deep    user_prefs          claude-opus-4-7         high
  implementer    medium  profile_default     claude-sonnet-4-6       (none)
  formatter      fast    workspace_prefs     opencode/big-pickle     (none)
  legacy-step    —       frontmatter_override sonnet                  (none)
  ```
- Print warnings immediately after the table, one per line, prefixed `⚠️ {step_id}: {warning}`.
- Persist `metadata.resolved_models`, `metadata.preference_files_consulted`, `metadata.model_tiers_version_at_run` to state file.

<invariant>
Phase 0.4 runs exactly once per fresh run. On resume, IF `metadata.resolved_models` exists AND `metadata.runtime_tier` matches the new `runtime_tier` AND profile `model_tiers_version` unchanged: skip re-resolution. ELSE re-resolve and log a "models re-resolved on resume" entry to `metadata.resolution_events`.
</invariant>

<invariant>
RESOLVE MUST be called once per agent — never per pipeline. The orchestrator MUST NOT summarize multiple agents into a single resolver call or infer one agent's `source` from another's. Inconsistent Source values across agents in the same pipeline are evidence of skipped iterations.
</invariant>
```

- [ ] **Step 2: Verify edits landed**

Run:
```powershell
Select-String -Path "C:\Users\gmeil\Github\superpipelines\skills\running-a-pipeline\SKILL.md" -Pattern "literal `resolved.source` enum"
Select-String -Path "C:\Users\gmeil\Github\superpipelines\skills\running-a-pipeline\SKILL.md" -Pattern "RESOLVE MUST be called once per agent"
```
Expected: one match line for each.

- [ ] **Step 3: Commit**

```bash
git add skills/running-a-pipeline/SKILL.md
git commit -m "fix(running-a-pipeline): Phase 0.4 emit verbatim resolver source + surface warnings"
```

---

## Task 3: Phase 0.5 — Disambiguate pipeline plugin_version from agent plugin_version

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md` — Phase 0.5 block (lines 80–88)

- [ ] **Step 1: Replace Phase 0.5 first bullet + add scope clarifier**

Replace the existing block exactly:

```markdown
### PHASE 0.5: VERSION COMPATIBILITY ADVISORY

> **Scope clarifier:** Phase 0.5 inspects the **pipeline-level** `plugin_version` (stamped on `registry.json` or `topology.json` at scaffold time). It does NOT inspect agent-level `plugin_version` — that is owned by Phase 0.45. Phase 0.5 output MUST NOT reference agent migration state; Phase 0.45 output MUST NOT reference pipeline-version state. Mixing the two scopes in a single advisory line is a known failure mode.

- Read the pipeline's stamped `plugin_version` from its `registry.json` entry (or from `topology.json` if the registry entry predates version stamping).
- Read the currently installed plugin version from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`.
- **Compare major versions** (semver `MAJOR.minor.patch`):
  - Match → proceed silently.
  - Pipeline major < installed major → emit advisory: `"⚠️ Pipeline '{P}' was scaffolded under plugin v{pipeline_version}; installed plugin is v{installed_version}. Schema or topology conventions may have changed. Review the migration notes before resuming."` and ask the user to confirm continuation.
  - Pipeline major > installed major → emit advisory: `"⚠️ Pipeline '{P}' targets a newer plugin (v{pipeline_version}) than is installed (v{installed_version}). Upgrade recommended; running anyway may fail on unsupported features."` and ask the user to confirm continuation.
  - Missing `plugin_version` on the pipeline (pre-stamping era) → emit informational note only; do not block.
- **Advisory only — never blocks execution.** The user's confirmation is required only on a major mismatch.
```

- [ ] **Step 2: Verify edit landed**

Run:
```powershell
Select-String -Path "C:\Users\gmeil\Github\superpipelines\skills\running-a-pipeline\SKILL.md" -Pattern "Scope clarifier"
```
Expected: one match line.

- [ ] **Step 3: Commit**

```bash
git add skills/running-a-pipeline/SKILL.md
git commit -m "fix(running-a-pipeline): Phase 0.5 scope-clarify pipeline vs agent plugin_version"
```

---

## Task 4: Phase 3 boundary — block entry-skill input collection before dispatch

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md` — Phase 3 block (lines 118–130) + invariants block (lines 138–147)

- [ ] **Step 1: Insert HARD-GATE at top of Phase 3**

Replace the existing Phase 3 opening (lines 118–120) exactly:

```markdown
### PHASE 3: ENTRY SKILL DISPATCH

<HARD-GATE>Entry-skill inputs (e.g., `$TOPIC`, `$LANGUAGE`, free-form prompts that the entry skill declares in its body) MUST NOT be collected before Phase 3. The orchestrator MUST complete Phases 0, 0.25, 0.4, 0.45, 0.5, 0.6, 1, and 2 in that order before reading any entry-skill `## 1. Initialization`-style requirements. Premature input collection (e.g., asking for a topic between 0.25 and 0.4) is a phase-ordering violation — it commits the user to inputs on un-migrated, un-resolved, or portability-defective state. The only inputs collected pre-Phase-3 are (a) pipeline selection (Phase 0) and (b) confirmations explicitly required by Phases 0.5/0.6 advisories.</HARD-GATE>

- Invoke the pipeline's entry skill (`run-{P}`).
- **Context Handoff**: Pass absolute paths to the scope root, state file, topology, AND `metadata.runtime_tier` from Phase 0.25. All paths handed to subagents on a non-CC tier MUST be resolved through `sk-pipeline-paths` first; raw `.claude/`-prefixed strings are a portability defect (see PORTABILITY_REWRITE invariant in `sk-platform-dispatch`).
```

- [ ] **Step 2: Append phase-ordering invariant to the `<invariants>` block**

Find the existing closing `</invariants>` (around line 147) and insert this line before it:

```markdown
- Phase ordering is total: 0 → 0.25 → 0.4 → 0.45 → 0.5 → 0.6 → 1 → 2 → 3 → 4. Entry-skill payload assembly (including user-input prompts declared in the entry skill body) happens exclusively inside Phase 3. Pre-collecting Phase 3 inputs during Phase 0 selection is a known rationalization ("the user is already here, batch the prompts") that violates the ordering contract.
```

- [ ] **Step 3: Verify both edits landed**

Run:
```powershell
Select-String -Path "C:\Users\gmeil\Github\superpipelines\skills\running-a-pipeline\SKILL.md" -Pattern "Premature input collection"
Select-String -Path "C:\Users\gmeil\Github\superpipelines\skills\running-a-pipeline\SKILL.md" -Pattern "Phase ordering is total"
```
Expected: one match line for each.

- [ ] **Step 4: Commit**

```bash
git add skills/running-a-pipeline/SKILL.md
git commit -m "fix(running-a-pipeline): HARD-GATE Phase 3 input collection (block pre-dispatch prompts)"
```

---

## Task 5: Red Flags + Rationalization Table — consolidate the 4 new failure modes

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md` — Red Flags block (lines 149–152) + Rationalization Table (lines 154–162)

- [ ] **Step 1: Append 4 Red Flag bullets**

Append after the existing `- "I'll delete the temp directory…"` line:

```markdown
- "v1-legacy agents still work, so migration is optional." → **STOP**. Phase 0.45 HARD-GATE: migration is mandatory once v1 candidates are classified. The only valid skip is `plugin_version >= 2.0.0`.
- "I'll translate the resolver source into something more readable." → **STOP**. Phase 0.4 HARD-GATE: emit `resolved.source` verbatim. The enum value is the contract.
- "The resolver warnings are noise, I'll drop them from the table." → **STOP**. Phase 0.4 HARD-GATE: every `resolved.warnings` entry is printed verbatim before the next phase.
- "The user already typed `Run X`, I'll batch the topic prompt now." → **STOP**. Phase 3 HARD-GATE: entry-skill inputs are collected during Phase 3, not before. Pre-collection commits the user to inputs on un-validated state.
```

- [ ] **Step 2: Append 4 Rationalization Table rows**

Append inside the table, before `</rationalization_table>`:

```markdown
| "Agents still function with model: sonnet, migration is non-urgent." | Phase 0.45's existence is the urgency signal. v1 schema breaks resolver provenance for the rest of the run. |
| "The source label is more useful as prose than as an enum." | The Source column is a contract with `sk-model-resolver`. Auditors and downstream tools key off the enum. |
| "Warnings are duplicated in state metadata, no need to print them." | State metadata is not user-facing during the run. Phase 0.4 table is the only synchronous warning surface. |
| "Collecting topic up-front shortens the perceived wait." | Phase ordering exists to prevent input commitment on un-migrated / un-validated state. UX optimization is the wrong axis. |
```

- [ ] **Step 3: Verify both blocks updated**

Run:
```powershell
Select-String -Path "C:\Users\gmeil\Github\superpipelines\skills\running-a-pipeline\SKILL.md" -Pattern "migration is optional"
Select-String -Path "C:\Users\gmeil\Github\superpipelines\skills\running-a-pipeline\SKILL.md" -Pattern "shortens the perceived wait"
```
Expected: one match line for each.

- [ ] **Step 4: Commit**

```bash
git add skills/running-a-pipeline/SKILL.md
git commit -m "fix(running-a-pipeline): Red Flags + Rationalization Table cover 4 new failure modes"
```

---

## Task 6: Auditor pass

**Files:**
- No edits. Read-only audit.

- [ ] **Step 1: Verify line count stayed under 500**

Run:
```powershell
(Get-Content "C:\Users\gmeil\Github\superpipelines\skills\running-a-pipeline\SKILL.md" | Measure-Object -Line).Lines
```
Expected: integer < 500. If ≥ 500, split a section into a reference file (per `authoring_rules` in `CLAUDE.md`) and re-commit.

- [ ] **Step 2: Confirm no new hardcoded model IDs**

Run:
```powershell
Select-String -Path "C:\Users\gmeil\Github\superpipelines\skills\running-a-pipeline\SKILL.md" -Pattern "claude-(sonnet|opus|haiku)-\d|gpt-5\.\d|gemini-3\."
```
Expected: only matches inside the example table block (`claude-opus-4-7`, `claude-sonnet-4-6` shown as illustrative output). If matches appear outside the example block → defect, replace with `<profile.model_tiers.{tier}>` placeholder.

- [ ] **Step 3: Confirm frontmatter unchanged**

Run:
```powershell
Get-Content "C:\Users\gmeil\Github\superpipelines\skills\running-a-pipeline\SKILL.md" -TotalCount 5
```
Expected: original frontmatter block (`---`, `name:`, `description:`, `---`) unchanged from pre-Task-1 state.

---

## Task 7: Cache sync to CC plugin directory

**Files:**
- No edits in the repo. Mirrors files into the active CC plugin cache so the next CC restart picks up the fix.

- [ ] **Step 1: Robocopy SKILL.md into the cache**

Run:
```powershell
robocopy "C:\Users\gmeil\Github\superpipelines\skills\running-a-pipeline" "C:\Users\gmeil\.claude\plugins\cache\<marketplace-slug>\superpipelines\<sha>\skills\running-a-pipeline" SKILL.md
```
Where `<marketplace-slug>` and `<sha>` come from `installed_plugins.json`. Expected exit code: 1 (success — file copied).

- [ ] **Step 2: Bump `installed_plugins.json` SHA to current HEAD**

Run:
```powershell
git -C "C:\Users\gmeil\Github\superpipelines" rev-parse HEAD
```
Capture the SHA, then edit `C:\Users\gmeil\.claude\plugins\installed_plugins.json` and update the `superpipelines.gitCommitSha` field to the new SHA.

- [ ] **Step 3: Note CC restart required**

User must restart CC for the cache reload. No auto-test possible in this session.

---

## Task 8: Smoke test in ai-articles + execution log update

**Files:**
- Modify: `docs/superpowers/plans/2026-05-24-cross-platform-model-resolver.execution.log`
- No code changes in ai-articles. Read-only run.

- [ ] **Step 1: User runs full pipeline in ai-articles after CC restart**

Out-of-band step. Hand back to user with this exact instruction:
> In CC, working dir `C:\Users\gmeil\Github\ai-articles`, run `/superpipelines:run-pipeline` → select `linkedin-article-creator`. Do NOT type a topic. Expected order: Phase 0 (selection) → Phase 0.25 (tier) → Phase 0.4 (table with `frontmatter_override` source + 4 warnings printed) → Phase 0.45 (migration fires, 2 git commits in ai-articles, 5 agents stamped) → Phase 0.4 re-run (new table with `profile_default` or `user_prefs` source) → Phase 0.5 (silent or scoped advisory only about pipeline version) → Phase 0.6 (silent, paths already fixed) → Phase 1 (resume prompt or skip) → Phase 2 (state init) → Phase 3 (THEN topic prompt).

- [ ] **Step 2: User reports observed phase order back**

Hand back to user. Wait for trace. Compare against the expected order above.

- [ ] **Step 3: Append result to execution log**

Append to `docs/superpowers/plans/2026-05-24-cross-platform-model-resolver.execution.log`:

```markdown
## 2026-05-25 — HARD-GATE smoke test (post-hardening)

- Phase 0.45 fired migration: PASS|FAIL (note: <observed>)
- Phase 0.4 emitted `frontmatter_override` verbatim: PASS|FAIL
- Phase 0.4 surfaced warnings: PASS|FAIL
- Phase 0.5 did not reference agent state: PASS|FAIL
- Topic prompt arrived in Phase 3 only: PASS|FAIL
- Trace excerpt: <paste>
```

- [ ] **Step 4: Commit execution log**

```bash
git add docs/superpowers/plans/2026-05-24-cross-platform-model-resolver.execution.log
git commit -m "test(running-a-pipeline): record HARD-GATE smoke test result"
```

---

## Self-Review

**Spec coverage:**
- Bug 1 (migration optional) → Task 1 ✓
- Bug 2a (source label) → Task 2 ✓
- Bug 2b (warnings suppressed) → Task 2 ✓
- Bug 2c (per-agent inconsistency) → Task 2 invariant `RESOLVE MUST be called once per agent` ✓
- Bug 3 (Phase 0.5 conflation) → Task 3 ✓
- Bug 4 (topic prompt jump) → Task 4 ✓
- Auditor compliance (line count + no hardcoded models) → Task 6 ✓
- Cache delivery → Task 7 ✓
- Verification → Task 8 ✓

**Placeholder scan:** No TBD/TODO/"add appropriate" instances. Every step has exact text or exact command.

**Type consistency:** Source enum values (`frontmatter_override | workspace_prefs | user_prefs | profile_default | host_inherit`) match `sk-model-resolver/SKILL.md` glossary. Phase numbering (0, 0.25, 0.4, 0.45, 0.5, 0.6, 1, 2, 3, 4) matches existing skill body throughout.

**Risk:** Task 7 path uses `<marketplace-slug>` and `<sha>` placeholders — these are runtime values discovered from `installed_plugins.json`, not plan-time literals. Acceptable because the value changes per install.

---

## Notes for Executor

- All 5 task commits stay on `feat/multi-platform-impl`. No PR yet — bundle with the v2.0.0 tag after smoke test passes.
- If Task 8 fails (smoke test does not pass all 5 checks), do NOT iterate inline. Escalate to user with the failing trace; the fix may need stronger HARD-GATE wording or a Skill-tool routing change rather than further skill-body edits.
- ai-articles is the test fixture only — never commit fixes there as part of this plan. Path fixes already applied in a prior session.
