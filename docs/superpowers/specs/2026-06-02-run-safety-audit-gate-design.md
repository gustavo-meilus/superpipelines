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
   path.
3. **No new criterion.** #23/#24 already cover the case; the tripwire references
   those IDs. Only the missing **fix template** is added.
4. **Tripwire halt set = artifact-loss class only (#23/#24).** MT-02 (agent
   missing both `model_tier:` and `model:`) is explicitly *excluded* — the
   runtime resolver tolerates it (defaults to `fast`), so halting on it would
   block runs that would succeed. MT-02 remains a manual-`/audit-steps` finding.
5. **Detection mirrors #24 precisely** — flag `isolation: worktree` only when
   the agent's tools lack `Write`/`Edit` to source *or* its topology outputs all
   resolve under `temp/`. Avoids false-halting legitimate worktree code-writers.
6. **Arming condition = full semver `<`** (not Phase 0.5's major-only), and a
   **missing `plugin_version` is treated as drifted**.
7. **Tripwire gates both fresh and resume** (placement before Phase 1 achieves
   this).
8. **Hygiene — verbatim profile:** Phase 2 builds `metadata.platform_profile`
   via a **deterministic Bash/jq merge** of the profile JSON, never by LLM
   transcription.
9. **Hygiene — finalization:** criterion #20 keeps ownership in the entry skill;
   Phase 4 adds a **defensive backstop** only.
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
| `skills/running-a-pipeline/SKILL.md` | Add **Phase 0.7** tripwire; harden #31 fail-fast (prose + Red Flag + rationalization rows + diagnostic redirect); Phase 2 deterministic profile merge; Phase 4 defensive finalization backstop. |
| `commands/audit-steps.md` | Confirm SEV-0/1 fix path covers #23/#24 → Fix 11; sync the criterion-count line (currently "20-criterion") with the matrix's "30-criterion". |

No new files except this spec and a verification fixture.

## Detailed design

### A. Fix template — Fix 11 (data-agent worktree artifact loss)

Added to `fix-templates.md`. Remediation for compliance criteria **#23/#24**.

- **Symptom:** a data-only agent (tools lack `Write`/`Edit` to source, or its
  topology outputs all resolve under `superpipelines/temp/`) declares
  `isolation: worktree`.
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
  stamped `plugin_version` is **semver-less-than** (major.minor.patch) the
  installed plugin version, **or the pipeline `plugin_version` is absent**
  (treated as drifted). When versions match → skip silently, zero added cost.
  This arming comparison is independent of Phase 0.5's major-only advisory.
- **Detection (narrow, inline, no subagent):** using the agent frontmatter
  already read in Phase 0.4 and the topology steps from Phase 0.45, mirror
  criterion **#24** precisely — flag `isolation: worktree` on an agent only when
  the agent's tools lack `Write`/`Edit` to source **or** its topology-declared
  outputs all resolve under `superpipelines/temp/` (i.e. it is not a tracked-code
  writer). This makes the tripwire verdict identical to what `/audit-steps`
  would conclude (no "tripwire stops but audit clean" contradiction).
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
the state skeleton, then a Bash step (`python3`/`jq`, already used in the run for
hashing) reads `skills/sk-platform-dispatch/profiles/{tier}.json` and injects it
into `metadata.platform_profile`. The skill body adds a HARD-GATE forbidding
LLM transcription of the nested profile object field-by-field. Eliminates the
`subagent_env_ировать` corruption class at the mechanism level. State schema is
unchanged — resume and the Cross-Tier Resume Protocol still find the full object
where they expect it.

### E. Hygiene — Phase 4 defensive finalization backstop

Criterion #20 keeps the entry skill as the primary finalizer (it writes
`status: completed` on success and deletes temp). Phase 4 adds a backstop only:
when control returns to Phase 4 and the state shows **all** topology steps
`completed` but `status != "completed"`, Phase 4 stamps `completed` (atomic
write) before cleanup. Fixes the stale-run problem for already-created pipelines
without editing per-pipeline entry skills. Criterion #20 wording is unchanged.

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
   legitimate worktree **code-writer** (tools include Write/Edit to source) is
   NOT flagged.
4. Confirm a missing-`plugin_version` pipeline is treated as drifted (scan
   runs).
5. Confirm Phase 2 writes `metadata.platform_profile` byte-identical to the
   loaded profile JSON (deterministic merge), and Phase 4 stamps
   `status: "completed"` when all steps are done but status is stale.
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
