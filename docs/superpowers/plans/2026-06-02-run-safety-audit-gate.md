# Run-Safety Audit Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `running-a-pipeline` cheaply detect and refuse pre-existing pipelines that carry the run-breaking `isolation: worktree`-on-data-agent convention, redirecting them to `/audit-steps` for a checkpointed fix, plus close three state-hygiene defects (profile-merge corruption, stale-status finalization on both the resume and start-fresh paths).

**Architecture:** No new commands/skills/agents/criteria. A version-conditioned inline tripwire (new Phase 0.7) reuses compliance criteria #23/#24's detection against the topology + frontmatter, halting and redirecting on a hit. The actual fix lives in a new `fix-templates.md` entry (Fix 11) applied by the existing `pipeline-architect` under `/audit-steps`. Three hygiene fixes: an atomic `python3` profile merge in Phase 2, a Phase 4 finalization backstop, and a Phase 1 "appears complete (unfinalized) → finalize & clean up" option.

**Tech Stack:** Markdown skills + agent frontmatter (Claude Code plugin), JSON state/profiles, `python3` for deterministic atomic JSON ops, PowerShell/Bash on Win11. No build, no test framework — verification is by fixture audit + grep/read assertions.

---

## Edit-ordering contract (READ FIRST)

Five tasks (Tasks 2–6) modify `skills/running-a-pipeline/SKILL.md`. **Task 6 inserts the entire Phase 0.7 block, shifting every line below the insertion point.** Therefore:

1. **Execute Tasks 2, 3, 4, 5 (all below-the-insertion edits) BEFORE Task 6 (the insertion).** Task 6 is the LAST edit to that file.
2. **Every same-file task navigates by quoted-string anchor, not by line number.** Line numbers in this plan are "(approx, pre-edit)" hints only; the `Edit` tool matches on the quoted `old_string`. If the snapshot has drifted, re-locate by the quoted anchor.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `skills/pipeline-auditor-references/references/fix-templates.md` | Canonical remediations the architect applies | Modify — add Fix 11 + ToC entry |
| `skills/running-a-pipeline/SKILL.md` | Run orchestrator phases | Modify — Phase 2 atomic merge, fail-fast hardening, Phase 4 backstop, Phase 1 finalize option, Phase 0.7 tripwire (last), Red Flags + rationalization rows, phase-ordering invariant |
| `commands/audit-steps.md` | Audit command reference | Modify — criterion-count sync, confirm SEV-0/1 → Fix 11 path |
| `skills/pipeline-auditor-protocol/SKILL.md` | Auditor agent protocol | Modify — criterion-count reference sync |
| `skills/pipeline-auditor-references/references/fixtures/wt-legacy-data-agent-worktree.md` | Discriminating fixture for #23/#24 + Fix 11 | Create |

Each task is self-contained and independently committable.

---

## Task 1: Fix 11 — data-agent worktree artifact loss (fix template)

**Files:**
- Modify: `skills/pipeline-auditor-references/references/fix-templates.md` (ToC near top; append after the Fix 10 section)

- [ ] **Step 1: Confirm the gap (red).**

Run: `rg -n "isolation|worktree" skills/pipeline-auditor-references/references/fix-templates.md`
Expected: **no matches** — confirms no existing worktree fix template (the gap this task fills).

- [ ] **Step 2: Add the ToC entry.**

Anchor on the ToC line `10. Per-agent Bash hook with global allow` and replace it with:

```markdown
10. Per-agent Bash hook with global allow
11. Data-agent worktree artifact loss
```

- [ ] **Step 3: Append Fix 11 after the Fix 10 section.**

Anchor on the end of the Fix 10 section (the last line before the next `---` separator or EOF) and append:

```markdown

## Fix 11 — Data-agent worktree artifact loss

**Symptom (compliance criteria #23 / #24):** an agent declares
`isolation: worktree` while **every one of its topology-declared `outputs`
resolves under `superpipelines/temp/`** and it carries no host-anchor note —
i.e. it is artifact-only, not a tracked-code writer. Such an agent writes only
gitignored artifacts; Claude Code auto-cleans its worktree on teardown and the
artifact is destroyed (issue #31).

> **Detection note — `tools` cannot discriminate this.** Claude Code `tools:`
> grants are name-only, not path-scoped (verified against the sub-agents
> reference), so "Write/Edit to source paths" is NOT expressible in frontmatter.
> Most data agents legitimately include `Write` (they write temp artifacts). The
> sole reliable discriminator is the topology `outputs` path + absence of a
> host-anchor note. Legitimate tracked-code writers (topology outputs include
> tracked source paths, OR a host-anchor note present) are NOT affected and MUST
> keep `isolation: worktree`.

**Before (data agent):**
```yaml
permissionMode: acceptEdits
isolation: worktree
skills:
  - researcher-protocol
```

**After:**
```yaml
permissionMode: acceptEdits
skills:
  - researcher-protocol
```

**Action:**
1. Remove the `isolation: worktree` line from each flagged data-only agent.
   Claude Code has no `isolation: none` — omit the field entirely.
2. Re-stamp each touched agent's `plugin_version` to the current plugin version.
3. **Bump the pipeline-level `plugin_version`** to current in BOTH `topology.json`
   and the pipeline's `registry.json` entry. This keeps criterion #21 (version
   consistency) satisfied and ensures the run-time Phase 0.7 tripwire's
   version-drift arming condition is no longer met on the next launch.

**Applied by** `pipeline-architect` under `/superpipelines:audit-steps` with a
git checkpoint and explicit user authorization (auditor is read-only; SEV-0/1
fixes route to the architect).
```

- [ ] **Step 4: Verify (green).**

Run: `rg -n "Fix 11 — Data-agent worktree artifact loss|Bump the pipeline-level|tools. cannot discriminate" skills/pipeline-auditor-references/references/fix-templates.md`
Expected: 3 matches (heading, version-bump action line, detection note).

- [ ] **Step 5: Commit.**

```bash
git add skills/pipeline-auditor-references/references/fix-templates.md
git commit -m "feat(auditor): add Fix 11 for data-agent worktree artifact loss"
```

---

## Task 2: Phase 2 — deterministic atomic profile merge

> First of the `running-a-pipeline/SKILL.md` edits. Safe to do before the Phase 0.7 insertion.

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md` (Phase 2 block, approx lines 252–255, pre-edit)

- [ ] **Step 1: Append the deterministic-merge requirement to Phase 2.**

Anchor on the Phase 2 `**Invariants**` bullet (the one beginning `- **Invariants**: Must include \`pipeline_id\``). Immediately after that bullet, append a new bullet:

```markdown
- **Deterministic atomic `platform_profile` write (no transcription).** `metadata.platform_profile` MUST be populated by a deterministic copy, never by the orchestrator transcribing the nested object field-by-field into the Write payload. Procedure: (1) write the state skeleton with `"metadata": { ..., "platform_profile": null }` via the atomic write; (2) run a `python3` merge that injects the profile JSON verbatim and writes **atomically and BOM-free** — dump to `${STATE_PATH}.tmp` then `os.replace`, obeying the same `.tmp`+rename contract as every other state update:
  ```bash
  python3 - "$STATE_PATH" "$PROFILE_PATH" <<'PY'
  import json, os, sys
  state_path, profile_path = sys.argv[1], sys.argv[2]
  with open(state_path, encoding="utf-8") as f: state = json.load(f)
  with open(profile_path, encoding="utf-8") as f: profile = json.load(f)
  state["metadata"]["platform_profile"] = profile
  tmp = state_path + ".tmp"
  with open(tmp, "w", encoding="utf-8") as f: json.dump(state, f, indent=2)
  os.replace(tmp, state_path)  # atomic on Win32 and POSIX
  PY
  ```
  where `$PROFILE_PATH` = `skills/sk-platform-dispatch/profiles/{platform_profile.tier}.json`. `python3` only (proven available in-run for hashing); do NOT use `jq` (not assumed present on Win11). `encoding="utf-8"` yields no BOM. The state schema is unchanged — resume and the Cross-Tier Resume Protocol still find the full object at `metadata.platform_profile`.
```

- [ ] **Step 2: Add the matching HARD-GATE.**

Immediately after the bullet from Step 1, add:

```markdown
<HARD-GATE>The orchestrator MUST NOT hand-author the nested `platform_profile` object in the state-file Write payload. Field-by-field transcription is the root cause of state-file corruption (e.g. a garbled `subagent_env_override` key). Use the deterministic atomic merge above; it obeys the same `.tmp`+`os.replace` contract as invariant "All state updates must utilize the atomic write pattern" and is NOT an exception to it.</HARD-GATE>
```

- [ ] **Step 3: Verify (green).**

Run: `rg -n "Deterministic atomic .platform_profile. write|MUST NOT hand-author the nested|os.replace" skills/running-a-pipeline/SKILL.md`
Expected: ≥3 matches.

- [ ] **Step 4: Commit.**

```bash
git add skills/running-a-pipeline/SKILL.md
git commit -m "fix(run): write platform_profile via deterministic atomic python3 merge (no transcription)"
```

---

## Task 3: Harden the #31 fail-fast gate

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md` (gate approx lines 261–266; Red Flags approx 300–308; rationalization table approx 310–323, pre-edit)

- [ ] **Step 1: Rewrite the fail-fast HARD-GATE.**

Anchor on the existing gate block beginning `**Missing-artifact fail-fast (#31).** After any subagent returns` and ending at its `</HARD-GATE>`. Replace that entire block with:

```markdown
<HARD-GATE>
**Missing-artifact fail-fast (#31).** After any subagent returns `DONE` / `DONE_WITH_CONCERNS`, the orchestrator MUST verify each declared output artifact exists at its host-anchored path (sk-pipeline-paths `RESOLVE_HOST_WORKSPACE`). If a declared artifact is ABSENT, the orchestrator MUST, in order:
1. STOP. Treat it as a hard failure equivalent to `BLOCKED`. Do NOT proceed to the next step under any circumstance.
2. NOT read, copy, move, or otherwise touch any file under a worktree path to recover the artifact. There is no exception — copy-back from a worktree is forbidden even if the worktree still exists and the file is visibly present.
3. NOT re-dispatch the step, retry the agent, or execute the subagent's protocol inline in the root session to reconstruct the artifact. Re-running floods the root context with raw tool output (token bleed) and is forbidden.
4. Surface a `BLOCKED` escalation naming the missing artifact path and the producing step.
5. **Diagnostic redirect:** IF the producing agent's frontmatter declares `isolation: worktree`, the BLOCKED message MUST additionally state that the cause is worktree artifact-loss (#31) and instruct: "Run `/superpipelines:audit-steps {P}` to apply the checkpointed fix (Fix 11), then re-launch."

This gate is best-effort prose: at Tier 1 the orchestrator is the model, so there is no structural enforcement. Phase 0.7 is the primary defense; this gate is the runtime backstop for any deviation the tripwire did not arm on.
</HARD-GATE>
```

- [ ] **Step 2: Add Red Flag rows.**

Anchor on the last bullet of the `## Red Flags — STOP` section (the `DisableModelInvocation` red flag beginning `- "\`sk-platform-dispatch\` threw \`DisableModelInvocation\``). Append after it:

```markdown
- "The artifact is right there in the worktree, I'll just copy it back." → **STOP**. Fail-fast gate step 2: copy-back from a worktree is forbidden, no exceptions. A missing declared artifact is `BLOCKED`. If the producer has `isolation: worktree`, redirect to `/superpipelines:audit-steps {P}` (Fix 11).
- "The artifact is missing, I'll just re-run the agent once." → **STOP**. Fail-fast gate step 3: re-dispatch/inline reconstruction causes the exact token bleed this gate exists to prevent. Escalate `BLOCKED`.
```

- [ ] **Step 3: Add rationalization-table rows.**

Anchor on the closing `</rationalization_table>` tag. Insert immediately before it:

```markdown
| "Copying the artifact out of the worktree is faster than blocking." | Forbidden by the #31 fail-fast gate. Copy-back masks a definition defect (data agent in a worktree) that recurs every run. Block and route to `/audit-steps` Fix 11. |
| "One re-dispatch to regenerate the missing artifact is cheap." | It is the token-bleed failure mode (#31): a worktree data agent will lose the artifact again. Re-running N times costs N×. Block; fix the definition. |
```

- [ ] **Step 4: Verify (green).**

Run: `rg -n "copy-back from a worktree is forbidden|Diagnostic redirect:|Copying the artifact out of the worktree" skills/running-a-pipeline/SKILL.md`
Expected: 3 matches (gate step 2 text, gate step 5 label, rationalization row).

- [ ] **Step 5: Commit.**

```bash
git add skills/running-a-pipeline/SKILL.md
git commit -m "feat(run): harden #31 fail-fast gate with mechanical prohibitions + diagnostic redirect"
```

---

## Task 4: Phase 4 — defensive finalization backstop

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md` (Phase 4 block, approx lines 281–285, pre-edit)

- [ ] **Step 1: Add the backstop bullet to Phase 4.**

Anchor on the Phase 4 bullet `- Read final state from \`pipeline-state.json\`.`. Insert immediately after it (before the `- **Status: \`completed\`**` bullet):

```markdown
- **Defensive finalization backstop (E.a).** The entry skill is the primary finalizer (compliance criterion #20: it writes `status: completed` on success). As a backstop only: IF the state shows EVERY topology step with `status == "completed"` (or `phases[*].status` all `completed`) BUT the top-level `status != "completed"`, the orchestrator MUST stamp `status: "completed"` via the atomic write BEFORE evaluating cleanup below. This recovers already-created pipelines whose entry skill predates the criterion #20 contract, so a fully-finished run is never left labeled `running` to confuse the next Phase 1 resume scan. Do NOT stamp `completed` if any step is `pending`/`running`/`failed`. (Shares the same `all-steps-completed → atomic stamp` predicate as the Phase 1 finalize option in Task 5.)
```

- [ ] **Step 2: Verify (green).**

Run: `rg -n "Defensive finalization backstop" skills/running-a-pipeline/SKILL.md`
Expected: 1 match.

- [ ] **Step 3: Confirm criterion #20 is unchanged (regression guard).**

Run: `rg -n "writes .status: completed. to .pipeline-state.json. on success" skills/pipeline-auditor-references/references/compliance-matrix.md`
Expected: 1 match — confirms #20 ownership wording was NOT altered by this task.

- [ ] **Step 4: Commit.**

```bash
git add skills/running-a-pipeline/SKILL.md
git commit -m "fix(run): add Phase 4 defensive finalization backstop for stale-status runs"
```

---

## Task 5: Phase 1 — "appears complete (unfinalized) → finalize & clean up"

> Closes the start-fresh path the triggering incident took: a fully-complete run abandoned at `status: running`, which Phase 4 (Task 4) never reaches because the user did not resume it.

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md` (Phase 1 block, approx lines 243–250, pre-edit)

- [ ] **Step 1: Add the unfinalized-run detection + option to Phase 1.**

Anchor on the Phase 1 `**Logic**` bullet beginning `- **Logic**: If valid runs exist`. Insert immediately after it:

```markdown
- **Unfinalized-complete detection.** For each valid run directory found, read its state. IF top-level `status == "running"` AND EVERY `phases[*].status == "completed"` (no step `pending`/`running`/`failed`), label that entry in the resume listing as **"appears complete (unfinalized)"** and offer a third action alongside resume / start-fresh: **finalize & clean up**. On selection: atomic-stamp `status: "completed"` (`.tmp`+`os.replace`), THEN delete the temp run directory. Deletion happens ONLY after the atomic stamp succeeds (preserving "never destroy recovery state without user say-so"). This shares the same `all-steps-completed → atomic stamp` predicate as the Phase 4 backstop (Task 4). It NEVER applies to `escalated` or `failed` runs — those still require explicit human review per the HARD-GATE below.
```

- [ ] **Step 2: Verify (green).**

Run: `rg -n "appears complete .unfinalized.|finalize & clean up" skills/running-a-pipeline/SKILL.md`
Expected: ≥1 match (label + action).

- [ ] **Step 3: Confirm the escalated/failed HARD-GATE is intact (regression guard).**

Run: `rg -n "NEVER auto-resume an .escalated. or .failed. run" skills/running-a-pipeline/SKILL.md`
Expected: 1 match — the new option must not have weakened it.

- [ ] **Step 4: Commit.**

```bash
git add skills/running-a-pipeline/SKILL.md
git commit -m "feat(run): add Phase 1 finalize-and-cleanup for abandoned complete runs"
```

---

## Task 6: Phase 0.7 — Pre-Run Safety Tripwire (LAST same-file edit)

> **MUST run after Tasks 2–5.** This inserts a whole block and shifts subsequent lines.

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md` (insert between the end of the Phase 0.6 block and `### PHASE 1: RESUME CHECK`; update the phase-ordering invariant)

- [ ] **Step 1: Insert the Phase 0.7 section.**

Anchor on the boundary: the Phase 0.6 block ends at its last bullet (the `Q7 pattern-vs-worktrees abort` bullet) and is immediately followed by `### PHASE 1: RESUME CHECK`. Insert the following block between them (i.e. after the Q7 bullet, before `### PHASE 1`):

```markdown
### PHASE 0.7 — PRE-RUN SAFETY TRIPWIRE

> A cheap, inline, read-only fast-path subset of the auditor — NOT a
> reimplementation of the compliance matrix. `pipeline-auditor` remains the
> single source of truth (`DEPENDENCY_INVERSION`). The tripwire only pre-checks
> the genuinely run-breaking artifact-loss class so a doomed launch is refused
> before any dispatch. Its verdict MUST match what `/superpipelines:audit-steps`
> would conclude for criteria #23/#24.

- **Inputs (named explicitly — do not assume earlier phases left them free):**
  the tripwire performs a cheap **single `topology.json` read** (for each step's
  `outputs`) **plus an agent `isolation` frontmatter scan**, reusing in-context
  data from Phases 0.4/0.45 when available. This is low cost, not "zero cost".
- **Arming condition (version-conditioned):** Compute `armed` =
  (`pipeline.plugin_version` is ABSENT) OR (semver `pipeline.plugin_version` <
  semver `installed_version`), comparing FULL `major.minor.patch` (independent of
  Phase 0.5's major-only advisory). `pipeline.plugin_version` and
  `installed_version` are the SAME single values already resolved in Phase 0.5
  (`pipeline.plugin_version` via the registry-entry→`topology.json` fallback;
  `installed_version` from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`).
  Do NOT re-read `pipeline.plugin_version` from a different file — reusing Phase
  0.5's value prevents split-brain on a half-migrated pipeline. IF NOT `armed`:
  skip Phase 0.7 silently and proceed to Phase 1.
- **Detection (inline, no subagent) — single load-bearing discriminator:** build
  `tripped = []`. FOR each step's agent: IF frontmatter declares
  `isolation: worktree` AND **every one of the step's `outputs` resolves under
  `superpipelines/temp/`** AND the agent carries no host-anchor note (mirroring
  #23's "without host-anchoring" escape), append `{step_id, agent_file, line}` to
  `tripped`. A legitimate tracked-code writer (topology outputs include tracked
  source paths, OR a host-anchor note present) is NEVER appended. NOTE: `tools`
  CANNOT discriminate this — CC tool grants are name-only, not path-scoped, and
  data agents legitimately include `Write` for temp output; treat any tools check
  as advisory only, never load-bearing.
- **Halt set is artifact-loss only.** Do NOT halt on MT-02 (agent missing both
  `model_tier:` and `model:`) — the resolver tolerates it (defaults to `fast`).
  MT-02 and other non-fatal findings stay manual-`/audit-steps` concerns.
- <HARD-GATE>The tripwire is READ-ONLY. It MUST NOT edit frontmatter, strip
  `isolation`, copy artifacts, or apply any fix. Its only two outcomes are
  *proceed silently* or *stop+redirect*. This applies identically to fresh
  launches and resumes — placement before Phase 1 is deliberate so a drifted
  pipeline cannot be resumed back into the artifact-loss bleed.</HARD-GATE>
- **Ordering interaction (intentional):** Because Phase 0.7 precedes Phase 1, a
  pipeline that is BOTH worktree-drifted AND has a stale-complete run halts here
  first; the Phase 1 "finalize & clean up" option for that stale run becomes
  reachable only after `/audit-steps` fixes the drift and the user re-launches.
  This is correct — fix the definition before touching its runs.
- IF `tripped` is non-empty: HARD-STOP (do not proceed to Phase 1) and emit:

  > ❌ Pipeline `{P}` was scaffolded under v{pipeline_version} (installed:
  > v{installed_version}) and carries run-breaking deviations (worktree
  > artifact-loss, compliance #23/#24):
  > {for each tripped: `- {agent_file}:{line}  ({step_id})`}
  > The run is halted to prevent artifact-loss / token-bleed. Run
  > `/superpipelines:audit-steps {P}` to review and apply the checkpointed fix
  > (Fix 11), then re-launch.

- ELSE (`armed` but `tripped` empty): proceed to Phase 1 silently.
```

- [ ] **Step 2: Update the phase-ordering invariant.**

Anchor on the invariant bullet containing `0 → 0.25 → 0.4 → 0.45 → 0.5 → 0.6 → 1 → 2 → 3 → 4`. Replace that ordering string with `0 → 0.25 → 0.4 → 0.45 → 0.5 → 0.6 → 0.7 → 1 → 2 → 3 → 4`, and append to the same bullet:

```markdown
 Phase 0.7 (pre-run safety tripwire) runs after 0.6 and before Phase 1 so it gates both fresh launches and resumes against the pipeline definition.
```

- [ ] **Step 3: Verify (green).**

Run: `rg -n "PHASE 0.7 — PRE-RUN SAFETY TRIPWIRE|0 → 0.25 → 0.4 → 0.45 → 0.5 → 0.6 → 0.7 → 1 → 2 → 3 → 4" skills/running-a-pipeline/SKILL.md`
Expected: 2 matches (section header + updated ordering invariant).

- [ ] **Step 4: Commit.**

```bash
git add skills/running-a-pipeline/SKILL.md
git commit -m "feat(run): add Phase 0.7 pre-run safety tripwire for legacy worktree drift"
```

---

## Task 7: Sync criterion-count references

**Files:**
- Modify: `commands/audit-steps.md` ("20-criterion compliance matrix")
- Modify: `skills/pipeline-auditor-protocol/SKILL.md` (each "28-criterion" reference)

Rationale: the matrix header (`compliance-matrix.md:3`) states **30** criteria; the command says 20 and the protocol says 28 — pre-existing drift. No criterion is added by this plan, so the authoritative count stays 30; the stale references are replaced with a non-numeric matrix pointer so future additions don't re-introduce drift.

- [ ] **Step 1: Confirm the drift (red).**

Run: `rg -n "20-criterion|28-criterion|30-criterion" commands/audit-steps.md skills/pipeline-auditor-protocol/SKILL.md skills/pipeline-auditor-references/references/compliance-matrix.md`
Expected: matrix shows `30-criterion`; command shows `20-criterion`; protocol shows `28-criterion`.

- [ ] **Step 2: Fix `audit-steps.md`.**

Anchor on `- Apply the 20-criterion compliance matrix across the four standard bands.` and replace with:

```markdown
- Apply the full compliance matrix (see `compliance-matrix.md`) across the four standard bands plus the resolver-consolidation criteria.
```

- [ ] **Step 3: Fix the protocol references.**

In `skills/pipeline-auditor-protocol/SKILL.md`, anchor on the glossary line:

```markdown
  <term name="Compliance Matrix">A 28-criterion checklist covering layout, frontmatter, topology, runtime safety, and resolver consolidation (PR-01..PR-05, PR-07).</term>
```

replace with:

```markdown
  <term name="Compliance Matrix">The full checklist in `compliance-matrix.md` covering layout, frontmatter, topology, runtime safety, and resolver consolidation (PR-01..PR-05, PR-07..PR-10).</term>
```

Also anchor on the AUDIT-step line `Execute the 28-criterion check in references/compliance-matrix.md` and the description line `28-criterion compliance matrix dispatch` (frontmatter `description:`); replace each `28-criterion` occurrence with `full compliance` / `full`, pointing to the matrix (e.g. `Execute the full compliance check in references/compliance-matrix.md`).

- [ ] **Step 4: Verify (green).**

Run: `rg -n "20-criterion|28-criterion" commands/audit-steps.md skills/pipeline-auditor-protocol/SKILL.md`
Expected: **no matches** (numeric drift removed).

- [ ] **Step 5: Commit.**

```bash
git add commands/audit-steps.md skills/pipeline-auditor-protocol/SKILL.md
git commit -m "docs(auditor): replace stale criterion-count references with matrix pointer"
```

---

## Task 8: Verification fixture + end-to-end trace

**Files:**
- Create: `skills/pipeline-auditor-references/references/fixtures/wt-legacy-data-agent-worktree.md`

- [ ] **Step 1: Create the discriminating fixture.**

Write `skills/pipeline-auditor-references/references/fixtures/wt-legacy-data-agent-worktree.md`:

```markdown
# Fixture — Data-agent worktree artifact loss (#23/#24 → Fix 11)

Discriminating fixture for the worktree-artifact-loss criteria and the Phase 0.7
tripwire. Mirrors the real `lectio-divina` v2.0.0 defect. The load-bearing
discriminator is the topology `outputs` path + host-anchor — NOT `tools`.

## PRE-baseline (must FAIL #23 SEV-0 and #24 SEV-1; Phase 0.7 MUST trip)

Agent file `agents/superpipelines/demo/researcher.md` frontmatter:
```yaml
---
name: researcher
plugin_version: "2.0.0"
permissionMode: acceptEdits
isolation: worktree
tools: Read, WebFetch, WebSearch, Write
skills:
  - researcher-protocol
---
```
Topology step:
```json
{ "id": "researcher", "agent": "researcher", "depends_on": [],
  "inputs": [], "outputs": ["superpipelines/temp/{P}/{runId}/00-readings.md"] }
```
Why it trips: `isolation: worktree` AND every output resolves under
`superpipelines/temp/` AND no host-anchor note → criterion #24 / #23 FAIL; Phase
0.7 (armed because 2.0.0 < installed) appends this agent to `tripped`. Note the
agent DOES include `Write` in `tools` — proving the `tools` check is not the
discriminator; the topology-outputs path is.

## POST-baseline (must PASS; Phase 0.7 MUST NOT trip)

Same agent after Fix 11:
```yaml
---
name: researcher
plugin_version: "2.1.2"
permissionMode: acceptEdits
tools: Read, WebFetch, WebSearch, Write
skills:
  - researcher-protocol
---
```
Pipeline-level `plugin_version` in topology.json and registry bumped to `2.1.2`.
Why it passes: `isolation: worktree` removed → #23/#24 PASS; pipeline version no
longer < installed → Phase 0.7 arming condition false → skipped silently.

## Negative control (legitimate code-writer — MUST NOT trip)

Agent `task-executor.md` with `isolation: worktree` AND `tools: Read, Write, Edit`
whose topology outputs include tracked source paths (NOT all under
`superpipelines/temp/`). The detection MUST NOT flag this agent — at least one
output is a tracked path, so worktree isolation is correct. (A second valid
non-trip shape: all-temp outputs BUT a host-anchor note present.)
```

- [ ] **Step 2: Trace the tripwire against the fixture (green).**

Manually walk Phase 0.7 (Task 6) against each fixture block and confirm:
- PRE-baseline: `armed` = true (2.0.0 < 2.1.2), `tripped` = [researcher] → HARD-STOP + redirect message naming `agents/superpipelines/demo/researcher.md`.
- POST-baseline: `armed` = false (2.1.2 == 2.1.2) → skipped silently.
- Negative control: `armed` may be true, but detection does NOT append the code-writer (an output is a tracked path) → `tripped` empty → proceeds silently.

Record the three outcomes in the commit message body.

- [ ] **Step 3: Trace Fix 11 against the PRE-baseline (green).**

Confirm Fix 11 (Task 1) transforms PRE → POST: strips `isolation: worktree`, bumps agent `plugin_version` to current, and bumps pipeline-level `plugin_version` in topology + registry. Confirm the POST state then passes criteria #21, #23, #24.

- [ ] **Step 4: Commit.**

```bash
git add skills/pipeline-auditor-references/references/fixtures/wt-legacy-data-agent-worktree.md
git commit -m "test(auditor): add discriminating fixture for worktree artifact loss + Fix 11"
```

---

## Task 9: Final integration check

- [ ] **Step 1: Full-text consistency scan.**

Run: `rg -n "Phase 0.7|Fix 11|platform_profile|Defensive finalization|appears complete" skills/running-a-pipeline/SKILL.md skills/pipeline-auditor-references/references/fix-templates.md`
Expected: matches confirming all five behaviors are present and cross-referenced.

- [ ] **Step 2: Confirm no new criterion was introduced (scope guard).**

Run: `rg -n "WT-LEGACY" skills/`
Expected: **no matches** — confirms the design decision to reuse #23/#24, not add a criterion.

- [ ] **Step 3: Confirm phase ordering + same-file edits all landed.**

Run: `rg -n "0 → 0.25 → 0.4 → 0.45 → 0.5 → 0.6 → 0.7 → 1 → 2 → 3 → 4|os.replace|appears complete .unfinalized.|Defensive finalization backstop|copy-back from a worktree is forbidden" skills/running-a-pipeline/SKILL.md`
Expected: 5 matches (one per same-file task) — verifies no task's edit was clobbered by the Phase 0.7 insertion.

- [ ] **Step 4: Version stamping note.**

These edits change skill/reference behavior. Per project convention (`PLUGIN_VERSION_STAMPING`), confirm whether a plugin version bump (`.version-bump.json`) is warranted with the user before merge — out of scope for the per-task commits but required before release.

- [ ] **Step 5: Run the auditor on a real pipeline (smoke).**

Run `/superpipelines:audit-steps` against any installed pipeline and confirm the report renders without error and that, if a pipeline with legacy worktree data agents exists, #23/#24 surface with Fix 11 as the remediation.

---

## Self-review notes (author)

- **Spec coverage:** Fix template (detection-note correction) → T1; Phase 2 atomic merge → T2; fail-fast hardening + diagnostic redirect → T3; Phase 4 backstop → T4; Phase 1 finalize option → T5; Phase 0.7 (arming pinned to Phase 0.5 value / outputs-path detection / halt / placement / ordering note / message) → T6; count sync → T7; fixture verification + negative control → T8; integration/scope guard/edit-order verification/version-bump → T9. All spec sections mapped.
- **Edit-ordering safety:** Tasks 2–5 edit `running-a-pipeline/SKILL.md` below the Phase 0.7 insertion point; Task 6 inserts last. All same-file tasks anchor on quoted strings, not line numbers (line numbers are pre-edit hints). T9 Step 3 verifies all five edits coexist.
- **Detection correctness:** single load-bearing discriminator = topology `outputs` all under `temp/` + no host-anchor; `tools` demoted to advisory (CC tool grants are name-only, docs-verified). Mirrored identically in T1, T6, T8.
- **No new criterion:** enforced by T9 Step 2 scope guard.
- **Naming consistency:** "Fix 11", "Phase 0.7", "tripwire", `metadata.platform_profile`, `plugin_version`, "appears complete (unfinalized)" used identically across tasks.
- **Adaptation:** no test runner exists; "red/green" steps are `rg` assertions and fixture traces — the faithful analog in a markdown-skill repo.
```