# Run-Safety Audit Gate for Pre-Existing Pipelines

- **Date:** 2026-06-02
- **Status:** Approved (design)
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
  `status: "completed"` (Phase 4 cleanup skipped), so it lingered as
  "running (interrupted)" and confused the Phase 1 resume check.

## Root cause

`running-a-pipeline` Phase 0.4 migrates only the `model:` → `model_tier:`
schema. There is **no equivalent check** for stale runtime-safety conventions
such as legacy `isolation: worktree` on data-only agents. A v2.0.0 pipeline
passes Phase 0.4 ("all have `model_tier:`, skip") and runs straight into the
worktree trap.

The audit machinery to catch this **already exists** —
`/superpipelines:audit-steps`, the `pipeline-auditor` agent, the
`pipeline-auditor-protocol` skill (28-criterion matrix), `fix-templates.md`,
and `pipeline-architect` as the fix-applier. It is simply never invoked before
a run, and it lacks a criterion for this specific deviation.

## Goal & guiding principle

The run path must **detect and refuse** pre-existing pipelines carrying
run-breaking conventions, cheaply, then **redirect to the existing dedicated
audit process** for the actual fix.

- No new command, skill, or agent — extend what exists. A parallel auditor
  would duplicate the 28-criterion matrix and split the source of truth,
  violating `DEPENDENCY_INVERSION: PROFILE_DRIVEN`.
- The run path stays **read-only**. All mutation lives in `/audit-steps` →
  `pipeline-architect`.
- Detection is **version-conditioned and cheap** to honour the
  token-optimization goal.

## Decisions (resolved during brainstorming)

1. **Gate behavior on SEV-0/1 deviation:** *Stop + redirect to `/audit-steps`.*
   The run skill never mutates the pipeline definition.
2. **Gate scope:** *Cheap inline tripwire*, fired only when pipeline
   `plugin_version` < installed version. No subagent dispatch in the run path.
3. **Hygiene items:** *Bundle both* (verbatim profile copy + reliable Phase 4
   finalization) into this run-safety spec.

## Components touched (all existing)

| File | Change |
|---|---|
| `skills/pipeline-auditor-references/references/compliance-matrix.md` | Add criterion **WT-LEGACY** (SEV-0). |
| `skills/pipeline-auditor-references/references/fix-templates.md` | Add the WT-LEGACY remediation template. |
| `skills/running-a-pipeline/SKILL.md` | Add **Phase 0.7** tripwire; harden #31 fail-fast; Phase 2 verbatim profile copy; Phase 4 reliable finalization. |
| `commands/audit-steps.md` | Sync criterion count; confirm SEV-0 fix path covers WT-LEGACY. |
| `skills/pipeline-auditor-protocol/SKILL.md` | Update matrix-count reference if it states a fixed number. |
| `skills/pipeline-auditor-references/references/fixtures/` | Add a WT-LEGACY fixture. |

No new files beyond the fixture and this spec.

## Detailed design

### A. New compliance criterion — `WT-LEGACY`

Added to `compliance-matrix.md` in the runtime-safety band.

- **ID:** `WT-LEGACY`
- **Severity:** SEV-0 (artifact-loss / data-destruction class).
- **Criterion:** An agent that produces only data artifacts (its declared
  outputs all resolve under the gitignored `superpipelines/temp/` tree, i.e. it
  is not a tracked-code writer) declares `isolation: worktree` in frontmatter.
- **Detection:** For each agent, read frontmatter `isolation`. If
  `isolation: worktree` AND the agent's topology-declared outputs are all under
  `superpipelines/temp/` (no tracked-code paths, no `additionalDirectories`
  host-anchoring), flag SEV-0. Cite `file:line` and quote the `isolation:` line
  verbatim.
- **Rationale link:** generalizes the #31 fix to *existing* pipelines. The
  version is *why* old pipelines have it, but the criterion is not
  version-gated — `isolation: worktree` on a pure-data agent is always wrong
  post-#31.
- **Relationship to existing worktree criteria:** if criteria for #23 (SEV-0) /
  #24 (SEV-1) already cover code-writer host-anchoring, WT-LEGACY is the
  complementary check for the *data-only* case. During implementation, verify
  no overlap/duplication; merge into the existing criterion if it already
  expresses the data-only case.

### B. Fix template (in `fix-templates.md`)

- Remove the `isolation: worktree` line from each flagged data-only agent
  (Claude Code has no `isolation: none` — the field is simply omitted).
- Re-stamp the agent's `plugin_version` to the current plugin version.
- Applied by `pipeline-architect` under `/audit-steps` with a git checkpoint,
  per the existing FIX ROUTING (auditor read-only; SEV-0/1 → architect with
  user authorization).

### C. Phase 0.7 — Pre-Run Safety Tripwire (core)

Inserted in `running-a-pipeline` SKILL.md **after Phase 0.6 (portability),
before Phase 1 (resume)**. Phase ordering becomes
`0 → 0.25 → 0.4 → 0.45 → 0.5 → 0.6 → 0.7 → 1 → 2 → 3 → 4`.

- **Trigger (version-conditioned):** fire only when the pipeline's stamped
  `plugin_version` (read in Phase 0.5) is semver-less-than the installed plugin
  version. When versions match → skip silently (zero added cost).
- **What it does (narrow, inline, no subagent):** scans the agent frontmatter
  already read during Phase 0.4 for a small fixed set of run-breaking SEV-0/1
  signatures. Initial set:
  - `WT-LEGACY` — data-only agent + `isolation: worktree`.
  - `MT-02` — agent missing both `model_tier:` and `model:`.
- **Explicitly a fast-path subset**, documented as such in the skill body: it is
  NOT a reimplementation of the 28-criterion matrix. The `pipeline-auditor`
  remains the single source of truth; the tripwire only catches the
  run-breaking classes so the launch can refuse early.
- **On trip → HARD-STOP + redirect** (no mutation, no proceed):

  > ❌ Pipeline `{P}` was scaffolded under v{old} (installed: v{new}) and
  > carries run-breaking deviations: {signature list with `file:line`}. The run
  > is halted to prevent artifact-loss / token-bleed. Run
  > `/superpipelines:audit-steps {P}` to review and apply the checkpointed fix,
  > then re-launch.

- **On clean (or version match):** proceed to Phase 1 silently.
- **HARD-GATE wording:** the tripwire MUST NOT attempt any fix, frontmatter
  edit, or copy-back; its only outcomes are *proceed* or *stop+redirect*.

### D. #31 fail-fast hardening

Rewrite `running-a-pipeline` SKILL.md:261–266 so prohibitions are mechanical,
not rationalizable. After any subagent returns `DONE` / `DONE_WITH_CONCERNS`,
verify each declared output artifact exists at its host-anchored path. If any
declared artifact is ABSENT:

- Immediately treat as `BLOCKED`. Do NOT proceed.
- It is FORBIDDEN to read or copy any artifact from a worktree path.
- It is FORBIDDEN to re-dispatch the step or run the subagent's protocol inline
  to reconstruct the artifact.
- Surface a `BLOCKED` escalation naming the missing artifact path and the
  producing step, and stop.

This is the backstop for any deviation the Phase 0.7 tripwire does not cover.

### E. Hygiene — Phase 2 verbatim profile copy

State init MUST copy the cached `platform_profile` object **verbatim** into
`metadata.platform_profile`. The skill body adds an explicit instruction not to
re-author / retype the nested object token-by-token. Root cause of the
`subagent_env_ировать` corruption.

### F. Hygiene — Phase 4 reliable finalization

On a fully-successful run, Phase 4 MUST set `status: "completed"` in
`pipeline-state.json` (atomic write) **before** deleting the temp directory, so
finished runs are never left as `running` to confuse the next Phase 1 resume
scan. If cleanup is skipped or fails, the `completed` status must still be
persisted.

## Testing / verification

No test framework exists (CI = JSON-manifest validation + required-files check).
Verification is by **fixture audit**, matching
`skills/pipeline-auditor-references/references/fixtures/`:

1. Add a fixture data-only agent declaring `isolation: worktree`; confirm
   `WT-LEGACY` trips at SEV-0 and the fix template resolves it.
2. Manually trace Phase 0.7 against the `lectio-divina` scenario (v2.0.0 +
   isolation drift): confirm version-conditioned trigger fires, the tripwire
   detects WT-LEGACY, and the run halts with the redirect message — no mutation.
3. Confirm a version-matching pipeline skips Phase 0.7 silently.
4. Confirm Phase 2 writes `metadata.platform_profile` byte-identical to the
   loaded profile, and Phase 4 sets `status: "completed"` on success.

## Out of scope (YAGNI)

- Auto-fix in the run path (deliberately delegated to `/audit-steps`).
- Always-on auditing / dispatching the full auditor every run.
- Cross-platform parity automation (`PARITY_TESTING: MANUAL_PHASE1` stands).
- Unrelated refactoring of the auditor matrix beyond the new criterion and the
  count sync.
