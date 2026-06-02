# Run-Safety Audit Gate for Pre-Existing Pipelines

- **Date:** 2026-06-02
- **Status:** Approved (design, grilled)
- **Plugin version at authoring:** v2.1.2

## Problem

Pipelines scaffolded by older plugin versions can carry conventions that are
now run-breaking. The concrete trigger: a `lectio-divina` pipeline created at
`plugin_version: "2.0.0"` — before the #31 worktree-artifact-safety fix
(v2.1.1) — still declares `isolation: worktree` on pure-data agents
(`researcher`, `exegete`, ...). Those agents write only to gitignored
`superpipelines/temp/`, so Claude Code auto-cleans the worktree on teardown and
destroys the artifact.

In the observed run this caused:

- **~105k tokens of bleed** — `researcher` re-dispatched three times
  (38.6k + 33.4k + 33.3k) plus a lost `exegete` run.
- The #31 fail-fast HARD-GATE (`running-a-pipeline` SKILL.md:261–266) was
  *rationalized past* by the orchestrator (Sonnet 4.6): it performed the
  explicitly-forbidden copy-back-from-worktree and inline re-dispatch.
- An improvised mid-run fix (hand-editing `isolation:` out of 5 of 7 agent
  files, no checkpoint, outside `/update-step`), abandoned at the session
  limit, leaving the pipeline in an inconsistent half-migrated state.

Two SEV-2/3 hygiene defects surfaced in the same run:

- **State-file corruption** — Phase 2 mandates writing the full nested
  `platform_profile` into `metadata.platform_profile`. The orchestrator
  hand-retyped it and produced a corrupted Cyrillic field
  (`subagent_env_ировать`), then "fixed" it.
- **Stale run never finalized** — a prior completed run was never marked
  `status: "completed"`, so it lingered as "running (interrupted)" and confused
  the Phase 1 resume check.

## Root cause

`running-a-pipeline` Phase 0.4 migrates only the `model:` → `model_tier:`
schema. There is **no run-path check** for stale runtime-safety conventions
such as legacy `isolation: worktree` on data-only agents.

Crucially, the audit machinery to **detect** this already exists and is
complete: compliance-matrix criteria **#23 (SEV-0)** and **#24 (SEV-1)** already
flag exactly this deviation (both cite issue #31). The auditor is not missing
the rule — **nothing runs it before a launch**, and there is **no fix template**
for the deviation it detects.

## Goal & guiding principle

The run path must **detect and refuse** pre-existing pipelines carrying
run-breaking conventions, cheaply, then **redirect to the existing dedicated
audit process** for the actual fix.

- No new command, skill, agent, or compliance criterion — extend what exists.
  Adding a new criterion would be a third duplicate of #23/#24 and would itself
  trip the source-of-truth-drift class the auditor enforces
  (`DEPENDENCY_INVERSION: PROFILE_DRIVEN`).
- The run path stays **read-only**. All mutation lives in `/audit-steps` →
  `pipeline-architect`.
- Detection is **version-conditioned and cheap** to honour the
  token-optimization goal.

## Decisions (resolved during brainstorming + grilling)

1. **Gate behavior on a run-breaking deviation:** *Stop + redirect to
   `/audit-steps`.* The run skill never mutates the pipeline definition.
2. **Gate scope:** *Cheap inline tripwire*, no subagent dispatch in the run
   path. Cost is honestly a **single `topology.json` read + an agent `isolation`
   frontmatter scan**, reusing in-context data from Phases 0.4/0.45 when
   available — NOT "zero cost / already read". The two inputs the tripwire
   requires (topology step `outputs`, agent `isolation` field) are named
   explicitly so an orchestrator cannot rationalize skipping the read.
3. **No new criterion.** #23/#24 already cover the case; the tripwire references
   those IDs. Only the missing **fix template** is added.
4. **Tripwire halt set = artifact-loss class only (#23/#24).** MT-02 (agent
   missing both `model_tier:` and `model:`) is explicitly *excluded* — the
   runtime resolver tolerates it (defaults to `fast`), so halting on it would
   block runs that would succeed. MT-02 remains a manual-`/audit-steps` finding.
5. **Detection — single load-bearing discriminator + host-anchor carve-out.**
   The sole reliable test is: an agent declares `isolation: worktree` AND
   **every one of its topology-declared `outputs` resolves under
   `superpipelines/temp/`** AND it carries **no host-anchor note** (mirroring
   #23's "without host-anchoring" escape). A legitimate worktree code-writer —
   whose topology outputs include tracked source paths, or which host-anchors —
   is never flagged. The earlier "`tools` lack `Write`/`Edit` to source" clause
   is demoted to a non-load-bearing advisory hint only: Claude Code `tools:`
   grants are **name-only, not path-scoped** (verified against the sub-agents
   reference), so "Write/Edit to source paths" is not expressible in frontmatter
   and cannot discriminate — most data agents legitimately include `Write` (they
   write temp artifacts).
6. **Arming condition = full semver `<`** (not Phase 0.5's major-only), and a
   **missing `plugin_version` is treated as drifted**. The `pipeline.plugin_version`
   used for arming MUST be the **single value already resolved in Phase 0.5**
   (read once via the registry-entry→`topology.json` fallback), consumed by both
   phases — never re-read from a different file. This prevents split-brain on a
   half-migrated pipeline where registry and topology disagree (the exact state
   the triggering incident left behind).
7. **Tripwire gates both fresh and resume** (placement before Phase 1 achieves
   this).
8. **Hygiene — verbatim profile:** Phase 2 builds `metadata.platform_profile`
   via a **deterministic Bash/jq merge** of the profile JSON, never by LLM
   transcription.
9. **Hygiene — finalization (two entry points).** Criterion #20 keeps ownership
   in the entry skill. (a) **Phase 4 defensive backstop** finalizes a run the
   orchestrator actively drove to completion whose legacy entry skill never
   stamped `completed`. (b) **Phase 1 "appears complete (unfinalized)" option**
   handles already-abandoned stale runs the user did NOT resume — the path the
   triggering incident actually took (it chose *start fresh*, leaving a
   fully-complete run stuck at `running`). Both share the same finalization
   logic; (b) closes the loop (a) cannot reach.
10. **Fail-fast hardening:** prose + Red Flag + rationalization-table rows,
    *plus* a diagnostic redirect when the missing artifact's producer has
    `isolation: worktree`. Accepted as **best-effort** (no Tier-1 structural
    guarantee — the orchestrator is the model).
11. **Fix closes the loop:** Fix 11 + the architect bump the **pipeline-level**
    `plugin_version` (registry + topology), not just touched agents, so the next
    launch sees matching versions and skips the tripwire silently.

## Components touched (all existing)

| File | Change |
|---|---|
| `skills/pipeline-auditor-references/references/fix-templates.md` | Add **Fix 11 — data-agent worktree artifact loss** (strip `isolation: worktree`; bump agent + pipeline-level `plugin_version`). |
| `skills/running-a-pipeline/SKILL.md` | Add **Phase 0.7** tripwire; harden #31 fail-fast (prose + Red Flag + rationalization rows + diagnostic redirect); Phase 2 atomic python3-only profile merge; Phase 1 "appears complete (unfinalized) → finalize & clean up" option; Phase 4 defensive finalization backstop. |
| `commands/audit-steps.md` | Confirm SEV-0/1 fix path covers #23/#24 → Fix 11; sync the criterion-count line (currently "20-criterion") with the matrix's "30-criterion". |

No new files except this spec and a verification fixture.

## Detailed design

### A. Fix template — Fix 11 (data-agent worktree artifact loss)

Added to `fix-templates.md`. Remediation for compliance criteria **#23/#24**.

- **Symptom:** an agent declares `isolation: worktree` while **every one of its
  topology-declared `outputs` resolves under `superpipelines/temp/`** and it
  carries no host-anchor note (i.e. it is artifact-only, not a tracked-code
  writer). Note: `tools` cannot discriminate this — CC tool grants are name-only,
  not path-scoped, and data agents legitimately include `Write` for temp output.
- **Action:**
  1. Remove the `isolation: worktree` line from each flagged data-only agent.
     (Claude Code has no `isolation: none` — the field is simply omitted.)
  2. Re-stamp each touched agent's `plugin_version` to current.
  3. **Bump the pipeline-level `plugin_version`** in `topology.json` and the
     `registry.json` entry to current, keeping criterion #21 (version
     consistency) satisfied and closing the tripwire loop.
- **Applied by** `pipeline-architect` under `/audit-steps`, with a git
  checkpoint and explicit user authorization (existing FIX ROUTING; auditor is
  read-only).

### B. Phase 0.7 — Pre-Run Safety Tripwire (core)

Inserted in `running-a-pipeline` SKILL.md **after Phase 0.6 (portability),
before Phase 1 (resume)**. Phase ordering becomes
`0 → 0.25 → 0.4 → 0.45 → 0.5 → 0.6 → 0.7 → 1 → 2 → 3 → 4`. Placement before
Phase 1 means the tripwire judges the pipeline *definition* and therefore gates
**both fresh launches and resumes** identically.

- **Arming condition (version-conditioned):** fire only when the pipeline's
  stamped `plugin_version` is **semver-less-than** (full major.minor.patch) the
  installed plugin version, **or the pipeline `plugin_version` is absent**
  (treated as drifted). The `pipeline.plugin_version` value MUST be the single
  one already resolved in Phase 0.5 (registry-entry→`topology.json` fallback,
  read once and consumed by both phases) — never re-read from a different file,
  to avoid split-brain on a half-migrated pipeline. When versions match → skip
  silently. This arming comparison is independent of Phase 0.5's major-only
  advisory.
- **Detection (narrow, inline, no subagent):** reusing in-context data where
  available, the tripwire performs a cheap **single `topology.json` read + an
  agent `isolation` frontmatter scan** — it does not claim Phases 0.4/0.45 left
  the needed fields free. Flag `isolation: worktree` on an agent only when
  **every one of its topology-declared `outputs` resolves under
  `superpipelines/temp/`** AND it carries no host-anchor note (mirrors #23's
  "without host-anchoring" escape). The `tools`-to-source clause is advisory
  only — CC tool grants are name-only, not path-scoped, so it cannot
  discriminate. This makes the tripwire verdict identical to what `/audit-steps`
  would conclude (no "tripwire stops but audit clean" contradiction) and never
  false-halts a legitimate worktree code-writer.
- **Halt set:** artifact-loss class only (#23/#24). MT-02 and other non-fatal
  findings do NOT halt.
- **Explicitly a fast-path subset**, documented as such in the skill body — NOT
  a reimplementation of the matrix. The `pipeline-auditor` remains the single
  source of truth.
- **On trip → HARD-STOP + redirect** (no mutation, no proceed; applies to fresh
  AND resume):

  > ❌ Pipeline `{P}` was scaffolded under v{old} (installed: v{new}) and
  > carries run-breaking deviations (worktree artifact-loss, #23/#24):
  > {agent list with `file:line`}. The run is halted to prevent
  > artifact-loss / token-bleed. Run `/superpipelines:audit-steps {P}` to review
  > and apply the checkpointed fix, then re-launch.

- **On clean (or version match):** proceed to Phase 1 silently.
- **HARD-GATE wording:** the tripwire MUST NOT attempt any fix, frontmatter
  edit, or copy-back; its only outcomes are *proceed* or *stop+redirect*.
- **Ordering interaction (intentional):** Phase 0.7 runs *before* Phase 1. On a
  pipeline that is both worktree-drifted *and* has a stale-complete run, the
  tripwire halts first, so the Phase 1 "finalize & clean up" option (§E.b) for
  that stale run is only reachable after `/audit-steps` fixes the drift and the
  user re-launches. This is correct: fix the definition before touching its runs.

### C. #31 fail-fast hardening (best-effort)

Rewrite `running-a-pipeline` SKILL.md:261–266 with mechanical prohibitions, and
reinforce at three points (gate body, Red Flags section, rationalization table).
After any subagent returns `DONE` / `DONE_WITH_CONCERNS`, verify each declared
output artifact exists at its host-anchored path. If any is ABSENT:

- Immediately treat as `BLOCKED`. Do NOT proceed.
- FORBIDDEN: reading or copying any artifact from a worktree path.
- FORBIDDEN: re-dispatching the step or running the subagent's protocol inline
  to reconstruct the artifact.
- Surface a `BLOCKED` escalation naming the missing artifact path and the
  producing step.
- **Diagnostic redirect:** if the producing agent declares `isolation:
  worktree`, the BLOCKED message MUST name worktree artifact-loss as the cause
  and point at `/superpipelines:audit-steps {P}` — routing the runtime symptom
  to the same remediation as the tripwire.

**Limitation, stated explicitly:** at Tier 1 the orchestrator *is* the model;
this hardening is prose reinforcement, not a structural guarantee. The Phase 0.7
tripwire is the primary defense; this gate is the backstop.

### D. Hygiene — Phase 2 deterministic profile merge

Phase 2 MUST construct `metadata.platform_profile` by a deterministic copy: write
the state skeleton, then a **`python3`-only** step (proven available in the run —
already used for hashing; `jq` is NOT assumed present on Win11) reads
`skills/sk-platform-dispatch/profiles/{tier}.json` and injects it into
`metadata.platform_profile`. The merge MUST be **atomic and BOM-free**: dump to
`${STATE_PATH}.tmp` with `encoding="utf-8"`, then `os.replace(tmp, state_path)`
(atomic on Win32 and POSIX) — obeying the same `.tmp`+rename contract as every
other state write (invariant "All state updates must utilize the atomic write
pattern"), so this mechanism is never read as an exception to it. The skill body
adds a HARD-GATE forbidding LLM transcription of the nested profile object
field-by-field. Eliminates the `subagent_env_ировать` corruption class at the
mechanism level. State schema is unchanged — resume and the Cross-Tier Resume
Protocol still find the full object where they expect it.

### E. Hygiene — finalization (two entry points)

Criterion #20 keeps the entry skill as the primary finalizer (it writes
`status: completed` on success and deletes temp); its wording is unchanged. Two
backstops share one finalization routine:

**E.a — Phase 4 defensive backstop.** When control returns to Phase 4 of a run
the orchestrator actively drove and the state shows **all** topology steps
`completed` but `status != "completed"`, Phase 4 stamps `completed` (atomic
write) before cleanup. Do NOT stamp if any step is `pending`/`running`/`failed`.
Catches a legacy entry skill that finished work but predates the #20 contract.

**E.b — Phase 1 "appears complete (unfinalized)" option.** The Phase 1 resume
scan may surface an interrupted run whose state shows **every** `phases[*].status
== completed` but top-level `status == running`. Such a run is listed as "appears
complete (unfinalized)" with a third action alongside resume / start-fresh:
**finalize & clean up** — atomic-stamp `status: completed`, then delete the temp
run directory. This is the only path that recovers an *abandoned* stale run the
user does not resume (the triggering incident chose *start fresh*, orphaning a
complete run at `running` forever). Guards:

- Offered ONLY when every step is `completed`; never when any step is
  `pending`/`running`/`failed`.
- Honors the existing Phase 1 HARD-GATE: NEVER auto-act on an `escalated` or
  `failed` run — those still require explicit human review.
- The action is user-selected, not automatic; deletion happens only after the
  atomic `completed` stamp succeeds (preserving "never destroy recovery state
  without user say-so").

Both backstops reuse the same `all-steps-completed → atomic stamp` predicate so
the two entry points cannot diverge.

## Testing / verification

No test framework exists (CI = JSON-manifest validation + required-files check).
Verification is by **fixture audit**, matching
`skills/pipeline-auditor-references/references/fixtures/`:

1. Add a fixture data-only agent declaring `isolation: worktree`; confirm
   criteria #23/#24 FAIL and **Fix 11** resolves them (agent + pipeline-level
   `plugin_version` bumped).
2. Manually trace Phase 0.7 against the `lectio-divina` scenario (v2.0.0 +
   isolation drift): confirm the full-semver arming fires (2.0.0 < installed),
   the #24-mirror detection flags the data agents, and the run halts with the
   redirect — no mutation — on both a fresh launch and a resume.
3. Confirm a version-matching pipeline skips Phase 0.7 silently, and a
   legitimate worktree **code-writer** (topology outputs include tracked source
   paths, OR a host-anchor note present) is NOT flagged — the discriminator is
   the topology `outputs` path + host-anchor, not `tools`.
4. Confirm a missing-`plugin_version` pipeline is treated as drifted (scan
   runs), using the single Phase 0.5-resolved version value.
5. Confirm Phase 2 writes `metadata.platform_profile` byte-identical to the
   loaded profile JSON via the atomic `.tmp`+`os.replace` merge (no BOM); Phase 4
   stamps `status: "completed"` when all steps are done but status is stale; and
   the Phase 1 scan lists an all-steps-completed `running` run as "appears
   complete (unfinalized)" and the **finalize & clean up** action atomic-stamps
   `completed` then deletes temp.
6. Confirm the fail-fast BLOCKED message names worktree artifact-loss and the
   `/audit-steps` redirect when the missing artifact's producer has
   `isolation: worktree`.

## Out of scope (YAGNI)

- A new compliance criterion (covered by existing #23/#24).
- Auto-fix in the run path (delegated to `/audit-steps`).
- MT-02 as a run-halting condition (resolver tolerates it).
- Store-by-reference state schema for the profile (blast radius too wide;
  deterministic merge preserves the contract).
- Always-on auditing / dispatching the full auditor every run.
- Cross-platform parity automation (`PARITY_TESTING: MANUAL_PHASE1` stands).
- The protocol-skill invocation tension (`disable-model-invocation: true` skills
  cannot be preloaded via a subagent `skills:` field, per the skills reference —
  "skipped… logs a warning"). This contradicts CLAUDE.md's protocol-skill
  pattern but is pre-existing #33 territory, unrelated to the run-safety gate.
  Flagged here for a separate investigation; not addressed by this spec.
