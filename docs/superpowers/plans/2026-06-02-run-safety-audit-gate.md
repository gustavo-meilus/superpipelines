# Run-Safety Audit Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `running-a-pipeline` cheaply detect and refuse pre-existing pipelines that carry the run-breaking `isolation: worktree`-on-data-agent convention, redirecting them to `/audit-steps` for a checkpointed fix, plus close two state-hygiene defects.

**Architecture:** No new commands/skills/agents/criteria. A version-conditioned inline tripwire (new Phase 0.7) reuses compliance criterion #24's detection against frontmatter/topology already loaded in Phases 0.4/0.45; on a hit it stops and redirects. The actual fix lives in a new `fix-templates.md` entry (Fix 11) applied by the existing `pipeline-architect` under `/audit-steps`. Two hygiene fixes: a deterministic `jq` profile merge in Phase 2 and a defensive finalization backstop in Phase 4.

**Tech Stack:** Markdown skills + agent frontmatter (Claude Code plugin), JSON state/profiles, `jq`/`python3` for deterministic JSON ops, PowerShell/Bash on Win11. No build, no test framework — verification is by fixture audit + grep/read assertions.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `skills/pipeline-auditor-references/references/fix-templates.md` | Canonical remediations the architect applies | Modify — add Fix 11 + ToC entry |
| `skills/running-a-pipeline/SKILL.md` | Run orchestrator phases | Modify — Phase 0.7, fail-fast, Phase 2 merge, Phase 4 backstop, Red Flags + rationalization rows, phase-ordering invariant |
| `commands/audit-steps.md` | Audit command reference | Modify — criterion-count sync, confirm SEV-0/1 → Fix 11 path |
| `skills/pipeline-auditor-protocol/SKILL.md` | Auditor agent protocol | Modify — criterion-count reference sync |
| `skills/pipeline-auditor-references/references/fixtures/wt-legacy-data-agent-worktree.md` | Discriminating fixture for #23/#24 + Fix 11 | Create |

Each task is self-contained and independently committable.

---

## Task 1: Fix 11 — data-agent worktree artifact loss (fix template)

**Files:**
- Modify: `skills/pipeline-auditor-references/references/fix-templates.md` (ToC at lines 5–16; append after Fix 10 at line 154)

- [ ] **Step 1: Confirm the gap (red).**

Run: `rg -n "isolation|worktree" skills/pipeline-auditor-references/references/fix-templates.md`
Expected: **no matches** — confirms no existing worktree fix template (the gap this task fills).

- [ ] **Step 2: Add the ToC entry.**

In `fix-templates.md`, the ToC currently ends:

```markdown
10. Per-agent Bash hook with global allow
```

Change it to:

```markdown
10. Per-agent Bash hook with global allow
11. Data-agent worktree artifact loss
```

- [ ] **Step 3: Append Fix 11 after Fix 10.**

After line 154 (end of "Fix 10" section), append:

```markdown

## Fix 11 — Data-agent worktree artifact loss

**Symptom (compliance criteria #23 / #24):** a data-only agent declares
`isolation: worktree`. "Data-only" = the agent's `tools` lack `Write`/`Edit` to
source paths, OR its `topology.json` step outputs all resolve under
`superpipelines/temp/`. Such an agent writes only gitignored artifacts; Claude
Code auto-cleans its worktree on teardown and the artifact is destroyed (issue
#31). Legitimate tracked-code writers (tools include `Write`/`Edit` to source)
are NOT affected and MUST keep `isolation: worktree`.

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

Run: `rg -n "Fix 11 — Data-agent worktree artifact loss|Bump the pipeline-level" skills/pipeline-auditor-references/references/fix-templates.md`
Expected: 2 matches (the heading and the version-bump action line).

- [ ] **Step 5: Commit.**

```bash
git add skills/pipeline-auditor-references/references/fix-templates.md
git commit -m "feat(auditor): add Fix 11 for data-agent worktree artifact loss"
```

---

## Task 2: Phase 0.7 — Pre-Run Safety Tripwire

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md` (insert after Phase 0.6 block ending line 241, before `### PHASE 1` at line 243; update phase-ordering invariant at line 296)

- [ ] **Step 1: Insert the Phase 0.7 section.**

After line 241 (end of Phase 0.6 `Q7 pattern-vs-worktrees abort` bullet) and before `### PHASE 1: RESUME CHECK`, insert:

```markdown
### PHASE 0.7 — PRE-RUN SAFETY TRIPWIRE

> A cheap, inline, read-only fast-path subset of the auditor — NOT a
> reimplementation of the compliance matrix. `pipeline-auditor` remains the
> single source of truth (`DEPENDENCY_INVERSION`). The tripwire only pre-checks
> the genuinely run-breaking artifact-loss class so a doomed launch is refused
> before any dispatch. Its verdict MUST match what `/superpipelines:audit-steps`
> would conclude for criteria #23/#24.

- **Arming condition (version-conditioned):** Compute `armed` =
  (`pipeline.plugin_version` is ABSENT) OR (semver `pipeline.plugin_version` <
  semver `installed_version`), comparing FULL `major.minor.patch` (independent of
  Phase 0.5's major-only advisory). `installed_version` is the value already read
  in Phase 0.5 from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`. IF NOT
  `armed`: skip Phase 0.7 silently (zero added cost) and proceed to Phase 1.
- **Detection (inline, no subagent) — mirror criterion #24 precisely:** Using the
  agent frontmatter already read in Phase 0.4 and the topology steps from Phase
  0.45, build `tripped = []`. FOR each step's agent: IF frontmatter declares
  `isolation: worktree` AND the agent is data-only — defined as (`tools` contains
  no `Write`/`Edit` to source paths) OR (every one of the step's `outputs`
  resolves under `superpipelines/temp/`) — append `{step_id, agent_file, line}`
  to `tripped`. A legitimate tracked-code writer (tools include `Write`/`Edit` to
  source) is NEVER appended.
- **Halt set is artifact-loss only.** Do NOT halt on MT-02 (agent missing both
  `model_tier:` and `model:`) — the resolver tolerates it (defaults to `fast`).
  MT-02 and other non-fatal findings stay manual-`/audit-steps` concerns.
- <HARD-GATE>The tripwire is READ-ONLY. It MUST NOT edit frontmatter, strip
  `isolation`, copy artifacts, or apply any fix. Its only two outcomes are
  *proceed silently* or *stop+redirect*. This applies identically to fresh
  launches and resumes — placement before Phase 1 is deliberate so a drifted
  pipeline cannot be resumed back into the artifact-loss bleed.</HARD-GATE>
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

In the `<invariants>` block, find line 296:

```markdown
- Phase ordering is total: 0 → 0.25 → 0.4 → 0.45 → 0.5 → 0.6 → 1 → 2 → 3 → 4. (Q4 swap: migration check 0.4 now precedes resolution 0.45 so the resolver never sees v1-legacy schema.) Entry-skill payload assembly (including user-input prompts declared in the entry skill body) happens exclusively inside Phase 3. Pre-collecting Phase 3 inputs during Phase 0 selection is a known rationalization ("the user is already here, batch the prompts") that violates the ordering contract.
```

Replace the ordering string `0 → 0.25 → 0.4 → 0.45 → 0.5 → 0.6 → 1 → 2 → 3 → 4` with `0 → 0.25 → 0.4 → 0.45 → 0.5 → 0.6 → 0.7 → 1 → 2 → 3 → 4` and append this sentence to the same bullet:

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

## Task 3: Harden the #31 fail-fast gate

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md` (gate at lines 261–266; Red Flags at lines 300–308; rationalization table at lines 310–323)

- [ ] **Step 1: Rewrite the fail-fast HARD-GATE.**

Replace the existing gate (lines 261–266):

```markdown
<HARD-GATE>
**Missing-artifact fail-fast (#31).** After any subagent returns `DONE` / `DONE_WITH_CONCERNS`, the orchestrator MUST verify each declared output artifact exists at its host-anchored path (sk-pipeline-paths `RESOLVE_HOST_WORKSPACE`). If a declared artifact is ABSENT:
- Treat it as a hard failure equivalent to `BLOCKED`. Do NOT proceed.
- Surface a `BLOCKED`-style escalation naming the missing artifact path and the producing step.
- The orchestrator MUST NOT copy artifacts out of a worktree path, and MUST NOT execute the subagent's protocol inline in the root session to reconstruct the artifact. Inline reconstruction floods the root context with raw tool output (token bleed) and is forbidden.
</HARD-GATE>
```

with:

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

- [ ] **Step 2: Add a Red Flag row.**

In the `## Red Flags — STOP` section, after the existing line at 307 (the `DisableModelInvocation` red flag), append:

```markdown
- "The artifact is right there in the worktree, I'll just copy it back." → **STOP**. Fail-fast gate step 2: copy-back from a worktree is forbidden, no exceptions. A missing declared artifact is `BLOCKED`. If the producer has `isolation: worktree`, redirect to `/superpipelines:audit-steps {P}` (Fix 11).
- "The artifact is missing, I'll just re-run the agent once." → **STOP**. Fail-fast gate step 3: re-dispatch/inline reconstruction causes the exact token bleed this gate exists to prevent. Escalate `BLOCKED`.
```

- [ ] **Step 3: Add a rationalization-table row.**

In the `<rationalization_table>` block, before the closing `</rationalization_table>` (line 323), add:

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

## Task 4: Phase 2 — deterministic profile merge

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md` (Phase 2 block at lines 252–255)

- [ ] **Step 1: Append the deterministic-merge requirement to Phase 2.**

After the Phase 2 `**Invariants**` bullet (line 255), append a new bullet:

```markdown
- **Deterministic `platform_profile` write (no transcription).** `metadata.platform_profile` MUST be populated by a deterministic copy, never by the orchestrator transcribing the nested object field-by-field into the Write payload. Procedure: (1) write the state skeleton with `"metadata": { ..., "platform_profile": null }` via the atomic write; (2) run a Bash merge that injects the profile JSON verbatim, e.g.:
  ```bash
  python3 - "$STATE_PATH" "$PROFILE_PATH" <<'PY'
  import json, sys
  state_path, profile_path = sys.argv[1], sys.argv[2]
  with open(state_path, encoding="utf-8") as f: state = json.load(f)
  with open(profile_path, encoding="utf-8") as f: profile = json.load(f)
  state["metadata"]["platform_profile"] = profile
  with open(state_path, "w", encoding="utf-8") as f: json.dump(state, f, indent=2)
  PY
  ```
  where `$PROFILE_PATH` = `skills/sk-platform-dispatch/profiles/{platform_profile.tier}.json`. The state schema is unchanged — resume and the Cross-Tier Resume Protocol still find the full object at `metadata.platform_profile`.
```

- [ ] **Step 2: Add the matching HARD-GATE.**

Immediately after the bullet from Step 1, add:

```markdown
<HARD-GATE>The orchestrator MUST NOT hand-author the nested `platform_profile` object in the state-file Write payload. Field-by-field transcription is the root cause of state-file corruption (e.g. a garbled `subagent_env_override` key). Use the deterministic merge above.</HARD-GATE>
```

- [ ] **Step 3: Verify (green).**

Run: `rg -n "Deterministic .platform_profile. write|MUST NOT hand-author the nested" skills/running-a-pipeline/SKILL.md`
Expected: 2 matches.

- [ ] **Step 4: Commit.**

```bash
git add skills/running-a-pipeline/SKILL.md
git commit -m "fix(run): write platform_profile via deterministic jq/python merge (no transcription)"
```

---

## Task 5: Phase 4 — defensive finalization backstop

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md` (Phase 4 block at lines 281–285)

- [ ] **Step 1: Add the backstop bullet to Phase 4.**

In `### PHASE 4: COMPLETION & CLEANUP`, after the `Read final state` bullet (line 282) and before the `Status: completed` bullet (line 283), insert:

```markdown
- **Defensive finalization backstop.** The entry skill is the primary finalizer (compliance criterion #20: it writes `status: completed` on success). As a backstop only: IF the state shows EVERY topology step with `status == "completed"` (or `phases[*].status` all `completed`) BUT the top-level `status != "completed"`, the orchestrator MUST stamp `status: "completed"` via the atomic write BEFORE evaluating cleanup below. This recovers already-created pipelines whose entry skill predates the criterion #20 contract, so a fully-finished run is never left labeled `running` to confuse the next Phase 1 resume scan. Do NOT stamp `completed` if any step is `pending`/`running`/`failed`.
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

## Task 6: Sync criterion-count references

**Files:**
- Modify: `commands/audit-steps.md:26` ("20-criterion compliance matrix")
- Modify: `skills/pipeline-auditor-protocol/SKILL.md` (any "28-criterion" reference)

Rationale: the matrix header (`compliance-matrix.md:3`) states **30** criteria; the command says 20 and the protocol says 28 — pre-existing drift. No criterion is added by this plan, so the authoritative count stays 30; the stale references are corrected.

- [ ] **Step 1: Confirm the drift (red).**

Run: `rg -n "20-criterion|28-criterion|30-criterion" commands/audit-steps.md skills/pipeline-auditor-protocol/SKILL.md skills/pipeline-auditor-references/references/compliance-matrix.md`
Expected: matrix shows `30-criterion`; command shows `20-criterion`; protocol shows `28-criterion`.

- [ ] **Step 2: Fix `audit-steps.md`.**

In `commands/audit-steps.md`, change:

```markdown
- Apply the 20-criterion compliance matrix across the four standard bands.
```

to:

```markdown
- Apply the full compliance matrix (see `compliance-matrix.md`) across the four standard bands plus the resolver-consolidation criteria.
```

(Use a non-numeric reference so future criterion additions don't re-introduce drift.)

- [ ] **Step 3: Fix the protocol reference.**

In `skills/pipeline-auditor-protocol/SKILL.md`, replace each `28-criterion` occurrence with `full` and point to the matrix, e.g. change the glossary line:

```markdown
  <term name="Compliance Matrix">A 28-criterion checklist covering layout, frontmatter, topology, runtime safety, and resolver consolidation (PR-01..PR-05, PR-07).</term>
```

to:

```markdown
  <term name="Compliance Matrix">The full checklist in `compliance-matrix.md` covering layout, frontmatter, topology, runtime safety, and resolver consolidation (PR-01..PR-05, PR-07..PR-10).</term>
```

Also update the AUDIT step body line `Execute the 28-criterion check in references/compliance-matrix.md` to `Execute the full compliance check in references/compliance-matrix.md`.

- [ ] **Step 4: Verify (green).**

Run: `rg -n "20-criterion|28-criterion" commands/audit-steps.md skills/pipeline-auditor-protocol/SKILL.md`
Expected: **no matches** (numeric drift removed).

- [ ] **Step 5: Commit.**

```bash
git add commands/audit-steps.md skills/pipeline-auditor-protocol/SKILL.md
git commit -m "docs(auditor): replace stale criterion-count references with matrix pointer"
```

---

## Task 7: Verification fixture + end-to-end trace

**Files:**
- Create: `skills/pipeline-auditor-references/references/fixtures/wt-legacy-data-agent-worktree.md`

- [ ] **Step 1: Create the discriminating fixture.**

Write `skills/pipeline-auditor-references/references/fixtures/wt-legacy-data-agent-worktree.md`:

```markdown
# Fixture — Data-agent worktree artifact loss (#23/#24 → Fix 11)

Discriminating fixture for the worktree-artifact-loss criteria and the Phase 0.7
tripwire. Mirrors the real `lectio-divina` v2.0.0 defect.

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
`superpipelines/temp/` (data-only) → criterion #24 / #23 FAIL; Phase 0.7
(armed because 2.0.0 < installed) appends this agent to `tripped`.

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
whose topology outputs include tracked source paths (NOT under
`superpipelines/temp/`). The #24-mirror detection MUST NOT flag this agent —
worktree isolation is correct for tracked-code writers.
```

- [ ] **Step 2: Trace the tripwire against the fixture (green).**

Manually walk Phase 0.7 (Task 2) against each fixture block and confirm:
- PRE-baseline: `armed` = true (2.0.0 < 2.1.2), `tripped` = [researcher] → HARD-STOP + redirect message naming `agents/superpipelines/demo/researcher.md`.
- POST-baseline: `armed` = false (2.1.2 == 2.1.2) → skipped silently.
- Negative control: `armed` may be true, but detection does NOT append the code-writer → `tripped` empty → proceeds silently.

Record the three outcomes in the commit message body.

- [ ] **Step 3: Trace Fix 11 against the PRE-baseline (green).**

Confirm Fix 11 (Task 1) transforms PRE → POST: strips `isolation: worktree`, bumps agent `plugin_version` to current, and bumps pipeline-level `plugin_version` in topology + registry. Confirm the POST state then passes criteria #21, #23, #24.

- [ ] **Step 4: Commit.**

```bash
git add skills/pipeline-auditor-references/references/fixtures/wt-legacy-data-agent-worktree.md
git commit -m "test(auditor): add discriminating fixture for worktree artifact loss + Fix 11"
```

---

## Task 8: Final integration check

- [ ] **Step 1: Full-text consistency scan.**

Run: `rg -n "Phase 0.7|Fix 11|platform_profile.*merge|Defensive finalization" skills/running-a-pipeline/SKILL.md skills/pipeline-auditor-references/references/fix-templates.md`
Expected: matches in both files confirming all four behaviors are present and cross-referenced.

- [ ] **Step 2: Confirm no new criterion was introduced (scope guard).**

Run: `rg -n "WT-LEGACY" skills/`
Expected: **no matches** — confirms the design decision to reuse #23/#24, not add a criterion.

- [ ] **Step 3: Version stamping note.**

These edits change skill/reference behavior. Per project convention (`PLUGIN_VERSION_STAMPING`), confirm whether a plugin version bump (`.version-bump.json`) is warranted with the user before merge — out of scope for the per-task commits but required before release.

- [ ] **Step 4: Run the auditor on a real pipeline (smoke).**

Run `/superpipelines:audit-steps` against any installed pipeline and confirm the report renders without error and that, if a pipeline with legacy worktree data agents exists, #23/#24 surface with Fix 11 as the remediation.

---

## Self-review notes (author)

- **Spec coverage:** Fix template → T1; Phase 0.7 (arming/detection/halt/placement/message) → T2; fail-fast hardening + diagnostic redirect → T3; deterministic profile merge → T4; Phase 4 backstop → T5; count sync → T6; fixture verification + #24 negative control + missing-version handling → T7; integration/scope guard/version-bump → T8. All spec sections mapped.
- **No new criterion:** enforced by T8 Step 2 scope guard.
- **Naming consistency:** "Fix 11", "Phase 0.7", "tripwire", `metadata.platform_profile`, `plugin_version` used identically across tasks.
- **Adaptation:** no test runner exists; "red/green" steps are `rg` assertions and fixture traces — the faithful analog in a markdown-skill repo.
