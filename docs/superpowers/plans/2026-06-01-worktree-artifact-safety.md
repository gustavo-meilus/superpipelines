# Worktree Artifact Safety & Orchestrator Fail-Fast — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop sub-agent git-worktree isolation from silently destroying gitignored artifacts and triggering inline orchestrator token-bleed (issue #31), and add an auditor rule so new pipelines cannot ship the flaw.

**Architecture:** Pure documentation/skill edits — no runtime code. Four components: (B, primary) data/artifact-only agents **omit** `isolation` so they run in the host cwd; (A) code-modifying worktree steps write artifacts to a **host-anchored absolute path** registered via `additionalDirectories`; (C) the runner treats a missing artifact after `DONE` as fail-fast escalation, never inline re-execution; (D) the auditor gains SEV-0/SEV-1 detection for the flaw.

**Tech Stack:** Markdown SKILL.md files + agent frontmatter + reference docs. No build, no test framework. CI validates JSON manifests + required-file presence only (`.github/workflows/ci.yml`). Verification is by `grep`, line-count, and `/superpipelines:audit-steps` per `PARITY_TESTING: MANUAL_PHASE1`.

**Spec:** `docs/superpowers/specs/2026-06-01-worktree-artifact-safety-design.md`

**Authoring constraints (from CLAUDE.md):** skill bodies ≤500 lines; third-person impersonal voice; references >100 lines need a ToC; per-platform facts live only in profile JSON (no concrete platform names/values in skill bodies); re-stamp `plugin_version` only on *pipeline artifact* mutations (the parity-test agents in Task 5), not on framework skill edits.

**Windows/PowerShell note:** the repo dev shell is PowerShell. The `git commit` steps below use POSIX-style `&&`; run each command on its own line in PowerShell (`;`-separate or sequential calls) if `&&` is unavailable.

---

## File Structure

| File | Responsibility | Component |
|------|----------------|-----------|
| `docs/superpowers/specs/2026-06-01-worktree-artifact-safety-design.md` | Correct `isolation: none` → "omit `isolation`" | B (fix) |
| `skills/pipeline-architect-references/references/agent-frontmatter-schema.md` | Document isolation rule + default-branch note | B, A |
| `skills/creating-a-pipeline/SKILL.md` | Phase 4: architect classifies each step's isolation | B |
| `skills/sk-pipeline-patterns/SKILL.md` | Clarify worktree mandate = code-writer isolation only | B |
| `skills/sk-pipeline-paths/SKILL.md` | Add `RESOLVE_HOST_WORKSPACE()` + host-anchor invariant | A |
| `skills/pipeline-runner-references/references/dispatch-protocols.md` | Inject host artifact path; `additionalDirectories` for worktree steps | A |
| `skills/running-a-pipeline/SKILL.md` | Fail-fast on missing artifact; no inline fallback | C |
| `skills/pipeline-runner-references/references/escalation.md` | Anti-pattern: no inline fallback on missing artifact | C |
| `skills/pipeline-auditor-references/references/severity-classification.md` | SEV-0 + SEV-1 examples | D |
| `skills/pipeline-auditor-references/references/compliance-matrix.md` | Criteria #23, #24 with grep detection | D |
| `.claude/agents/superpipelines/parity-test-{a,b}/*.md` | Reference config: data agents omit `isolation` | B (example) |

**Out of scope:** parity-test pipelines c/d/e/f/g/h/i/j (other tiers) — they are unshipped demo artifacts pending the curated-examples effort (see project memory). Only the CC reference pair (a/b) is updated as the canonical example.

---

## Task 1: Correct the spec, then document the isolation rule in the architect schema

**Files:**
- Modify: `docs/superpowers/specs/2026-06-01-worktree-artifact-safety-design.md`
- Modify: `skills/pipeline-architect-references/references/agent-frontmatter-schema.md:27-28` (schema block) and `:48` (field-rules row)

**Rationale:** The official CC sub-agents docs define only `isolation: worktree`; omitting the field runs the subagent in the parent's cwd. There is no `isolation: none` value — writing one would be ignored by CC and mislead authors. The schema is the architect's source of truth, so the rule must live here.

- [ ] **Step 1: Fix the spec wording**

In the spec, the design currently says data agents set `isolation: none`. Replace every occurrence of the `isolation: none` instruction with "omit `isolation`". Concretely, in the Component B section and the "Data flow" + "Affected files" sections, change phrasing like:

> Pipeline data agents set `isolation: none`.

to:

> Pure data agents **omit** the `isolation` field entirely (CC defines only `worktree`; omission runs the subagent in the parent's host cwd — there is no `none` value).

- [ ] **Step 2: Verify the spec no longer prescribes a `none` value**

Run: `grep -n "isolation: none" docs/superpowers/specs/2026-06-01-worktree-artifact-safety-design.md`
Expected: no matches (exit 1). Any match must describe it as a *rejected* option only.

- [ ] **Step 3: Update the schema frontmatter example**

In `agent-frontmatter-schema.md`, the schema block line currently reads:

```yaml
isolation: worktree                           # Patterns 2/2b/3/5
```

Replace with:

```yaml
isolation: worktree                           # ONLY for steps that modify tracked code under Patterns 2/2b/3/5.
                                              # OMIT for data-retrieval/generation agents (no tracked-code writes):
                                              # a worktree with no tracked changes is auto-cleaned by Claude Code,
                                              # destroying any gitignored artifact the agent produced.
                                              # Worktrees branch from the DEFAULT branch, not the parent HEAD.
```

- [ ] **Step 4: Update the field-rules row**

The field-rules table row currently reads:

```
| `isolation` | conditional | `worktree` for parallel/iterative patterns. Omit for read-only analysis. |
```

Replace with:

```
| `isolation` | conditional | `worktree` ONLY for steps that modify tracked code under Patterns 2/2b/3/5. OMIT for any agent that does not write tracked code (read-only analysis AND data-retrieval/generation agents that only emit coordination artifacts). A worktree with no tracked changes is auto-cleaned by Claude Code, destroying gitignored artifacts; and worktrees branch from the default branch, not the parent HEAD. |
```

- [ ] **Step 5: Verify the schema edits landed**

Run: `grep -n "auto-cleaned by Claude Code" skills/pipeline-architect-references/references/agent-frontmatter-schema.md`
Expected: ≥2 matches (schema comment + field-rules row).

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-06-01-worktree-artifact-safety-design.md skills/pipeline-architect-references/references/agent-frontmatter-schema.md
git commit -m "fix(spec,schema): omit isolation for data agents, not isolation:none (#31)"
```

---

## Task 2: Architect classifies isolation per step (Component B)

**Files:**
- Modify: `skills/creating-a-pipeline/SKILL.md:98-100` (Phase 4 architect output rules)
- Modify: `skills/sk-pipeline-patterns/SKILL.md:31` (Q7 note)

**Rationale:** The architect (Phase 4) generates agent frontmatter. It must decide isolation per step using a tracked-code-write test, and the patterns doc must clarify that the worktree mandate is about *code-writer* isolation, not data steps inside those patterns.

- [ ] **Step 1: Add the isolation classification rule to Phase 4**

In `creating-a-pipeline/SKILL.md`, immediately after the "Architect output rule for agent frontmatter" bullet (the one ending "...resolves at runtime via `sk-model-resolver`."), insert a new bullet:

```markdown
- **Isolation classification rule**: For each generated step, the architect sets `isolation: worktree` ONLY if the step writes tracked code (source files git would track). Steps that only read sources, fetch/scrape, or emit coordination artifacts under `superpipelines/temp/` MUST OMIT `isolation` — they run in the host cwd. Rationale: Claude Code auto-cleans a worktree whose subagent made no tracked changes, destroying any gitignored artifact (issue #31). A pattern's worktree requirement (Patterns 2/3/5) binds the code-writer step(s), NOT every step in the topology.
```

- [ ] **Step 2: Verify the Phase 4 rule landed**

Run: `grep -n "Isolation classification rule" skills/creating-a-pipeline/SKILL.md`
Expected: 1 match.

- [ ] **Step 3: Clarify the patterns Q7 note**

In `sk-pipeline-patterns/SKILL.md`, the Q7 paragraph at line 31 ends with "...multi-writer file collisions across iterations or parallel branches." Append this sentence to that paragraph:

```markdown
 The worktree requirement binds **code-writer** steps only: data-retrieval/generation steps within a worktree pattern still OMIT `isolation` (a no-tracked-change worktree is auto-cleaned, losing gitignored artifacts — issue #31).
```

- [ ] **Step 4: Verify the patterns note landed**

Run: `grep -n "binds .code-writer. steps only" skills/sk-pipeline-patterns/SKILL.md`
Expected: 1 match.

- [ ] **Step 5: Confirm both skills remain ≤500 lines**

Run: `wc -l skills/creating-a-pipeline/SKILL.md skills/sk-pipeline-patterns/SKILL.md`
Expected: both counts ≤500.

- [ ] **Step 6: Commit**

```bash
git add skills/creating-a-pipeline/SKILL.md skills/sk-pipeline-patterns/SKILL.md
git commit -m "feat(architect): classify step isolation by tracked-code-write test (#31)"
```

---

## Task 3: Host-anchored artifact resolution + dispatch injection (Component A)

**Files:**
- Modify: `skills/sk-pipeline-paths/SKILL.md` (`<protocol>` block — add `RESOLVE_HOST_WORKSPACE`)
- Modify: `skills/pipeline-runner-references/references/dispatch-protocols.md:18-34` (Common dispatch shape)

**Rationale:** When a code-modifying step legitimately uses a worktree but must also emit a coordination artifact, the artifact must land on the **host** filesystem (outside the worktree dir, which CC tears down). Git already exposes the host anchor via `--git-common-dir`. Because the host path is outside the worktree's working directory, `acceptEdits` will not auto-accept the write (CC docs) — so the host scope-root must be registered in `additionalDirectories` at dispatch.

- [ ] **Step 1: Add `RESOLVE_HOST_WORKSPACE` to the path resolver protocol**

In `sk-pipeline-paths/SKILL.md`, inside the `<protocol>` block, after the `RESOLVE_SCOPE_ROOT(scope, tier)` definition, insert:

```
RESOLVE_HOST_WORKSPACE():
  // The main-worktree root, NOT a linked worktree's cwd. Artifacts and state
  // MUST anchor here so they survive worktree teardown (issue #31).
  common = `git rev-parse --path-format=absolute --git-common-dir`   // → <host>/.git
  if command succeeds: return dirname(strip_trailing("/.git", common))
  else (not a git repo): return cwd

// INVARIANT: the superpipelines/temp/{P}/{runId}/ artifact + state tree ALWAYS
// resolves under RESOLVE_HOST_WORKSPACE(), never a linked worktree path. Code
// edits stay isolated in the worktree; coordination artifacts land on the host.
```

- [ ] **Step 2: Verify the resolver edit landed**

Run: `grep -n "RESOLVE_HOST_WORKSPACE" skills/sk-pipeline-paths/SKILL.md`
Expected: ≥2 matches (definition + invariant).

- [ ] **Step 3: Confirm the resolver skill remains ≤500 lines**

Run: `wc -l skills/sk-pipeline-paths/SKILL.md`
Expected: ≤500.

- [ ] **Step 4: Make the dispatch artifact path explicit + add additionalDirectories**

In `dispatch-protocols.md`, replace the "Common dispatch shape (Claude Code)" code block (the `Task(...)` example, lines ~20-33) with:

````markdown
```
# Resolve the host-anchored artifact directory ONCE (sk-pipeline-paths.RESOLVE_HOST_WORKSPACE):
HOST_TEMP = {RESOLVE_HOST_WORKSPACE()}/{scope_root_dir}/superpipelines/temp/{P}/{runId}

Task(
  subagent_type="pipeline-task-executor",
  description="Implement T-1: {short_name}",
  # For steps with isolation: worktree that ALSO emit artifacts, the host temp dir is
  # OUTSIDE the worktree working dir, so acceptEdits will not auto-accept writes there.
  # Register it so the artifact write is permitted and survives teardown (issue #31):
  additionalDirectories=[HOST_TEMP],
  prompt="""
    Inputs:
      - task_text: <extracted from tasks.md>
      - spec_path: {ROOT}/superpipelines/pipelines/{P}/spec.md
      - plan_path: {ROOT}/superpipelines/pipelines/{P}/plan.md
      - project_context: <relevant files / commands>

    Output:
      - Write ALL artifacts to the ABSOLUTE host path: {HOST_TEMP}/<artifact-name>.
        NEVER write artifacts to a worktree-relative path — a worktree with no tracked
        changes is auto-cleaned by Claude Code and the artifact is lost.
      - Emit one of DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED with the agent's output schema.
  """
)
```

> **Artifact retention contract.** Data-only steps OMIT `isolation` and write to `{HOST_TEMP}` directly from the parent cwd (no `additionalDirectories` needed). Worktree code-writer steps that also emit artifacts MUST receive `additionalDirectories=[HOST_TEMP]` and write artifacts to the absolute `{HOST_TEMP}` path. The orchestrator NEVER copies artifacts out of a worktree path and NEVER re-runs a step inline to reconstruct a missing artifact (see escalation.md).
````

- [ ] **Step 5: Verify the dispatch edits landed**

Run: `grep -n "HOST_TEMP\|additionalDirectories\|Artifact retention contract" skills/pipeline-runner-references/references/dispatch-protocols.md`
Expected: multiple matches across the block.

- [ ] **Step 6: Confirm the reference still has a ToC (it is >100 lines)**

Run: `grep -n "Table of contents" skills/pipeline-runner-references/references/dispatch-protocols.md`
Expected: 1 match (ToC already present at line ~5; no new top-level sections were added, so no ToC update needed).

- [ ] **Step 7: Commit**

```bash
git add skills/sk-pipeline-paths/SKILL.md skills/pipeline-runner-references/references/dispatch-protocols.md
git commit -m "feat(paths,dispatch): host-anchor artifacts + additionalDirectories for worktree steps (#31)"
```

---

## Task 4: Runner fail-fast — forbid inline fallback (Component C)

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md` (Phase 3 dispatch / status handling area, after line ~257)
- Modify: `skills/pipeline-runner-references/references/escalation.md:68-90` (BLOCKED escalation section) and `:126-131` (Red Flags)

**Rationale:** The skills are currently *silent* on what to do when a subagent reports DONE but its declared artifact is absent. That silence is what lets the orchestrator improvise a `cp` and then an inline protocol re-run (token bleed). Codify the fail-fast.

- [ ] **Step 1: Add the missing-artifact fail-fast rule to running-a-pipeline**

In `running-a-pipeline/SKILL.md`, in PHASE 3 (ENTRY SKILL DISPATCH), after the existing HARD-GATE block, insert:

```markdown
<HARD-GATE>
**Missing-artifact fail-fast (#31).** After any subagent returns `DONE` / `DONE_WITH_CONCERNS`, the orchestrator MUST verify each declared output artifact exists at its host-anchored path (sk-pipeline-paths `RESOLVE_HOST_WORKSPACE`). If a declared artifact is ABSENT:
- Treat it as a hard failure equivalent to `BLOCKED`. Do NOT proceed.
- Surface a `BLOCKED`-style escalation naming the missing artifact path and the producing step.
- The orchestrator MUST NOT copy artifacts out of a worktree path, and MUST NOT execute the subagent's protocol inline in the root session to reconstruct the artifact. Inline reconstruction floods the root context with raw tool output (token bleed) and is forbidden.
</HARD-GATE>
```

- [ ] **Step 2: Verify the runner rule landed**

Run: `grep -n "Missing-artifact fail-fast" skills/running-a-pipeline/SKILL.md`
Expected: 1 match.

- [ ] **Step 3: Confirm running-a-pipeline remains ≤500 lines**

Run: `wc -l skills/running-a-pipeline/SKILL.md`
Expected: ≤500. (If already >500 from prior work, place the rule in `pipeline-runner-references/references/escalation.md` instead and add a one-line pointer in Phase 3 — do not push the body over budget.)

- [ ] **Step 4: Add a dedicated escalation sub-section**

In `escalation.md`, after the "`BLOCKED` status escalation" section (before "Worktree handling on escalation"), insert a new section and add it to the ToC.

ToC: change line 9 `3. \`BLOCKED\` status escalation` to keep numbering, and insert after it a new entry `4. Missing-artifact fail-fast` (renumbering the subsequent ToC entries 4→5, 5→6, 6→7, 7→8).

New section body:

```markdown
## Missing-artifact fail-fast

A subagent that returns `DONE` but whose declared output artifact is absent is a hard failure (issue #31). The artifact is verified at its host-anchored path; a missing artifact most often means the step ran with `isolation: worktree` and wrote to a worktree-relative path that Claude Code auto-cleaned.

```
on DONE | DONE_WITH_CONCERNS:
  for artifact in step.declared_outputs:
    if not exists(HOST_TEMP/artifact):
      escalate(reason="missing artifact after DONE",
               missing=HOST_TEMP/artifact, step=step.id)
      # FORBIDDEN: cp from worktree path; re-run protocol inline.
```

Remediation surfaced to the user: re-scaffold the step to OMIT `isolation` (data agents) or to write to the absolute host path (worktree code-writers) per the artifact retention contract in `dispatch-protocols.md`.
```

- [ ] **Step 5: Add the Red Flag**

In `escalation.md`, in the "Red Flags — STOP" section, add:

```markdown
- "The artifact's missing, I'll just re-run the agent's work inline myself" → STOP. Inline reconstruction = token bleed (issue #31). Escalate with the missing path; never run a step's protocol in the root session.
```

- [ ] **Step 6: Verify the escalation edits landed**

Run: `grep -n "Missing-artifact fail-fast\|token bleed" skills/pipeline-runner-references/references/escalation.md`
Expected: ≥3 matches (ToC entry, section heading, Red Flag).

- [ ] **Step 7: Commit**

```bash
git add skills/running-a-pipeline/SKILL.md skills/pipeline-runner-references/references/escalation.md
git commit -m "feat(runner): fail-fast on missing artifact, forbid inline fallback (#31)"
```

---

## Task 5: Update CC parity-test reference agents (Component B example)

**Files:**
- Modify: `.claude/agents/superpipelines/parity-test-a/reader.md`
- Modify: `.claude/agents/superpipelines/parity-test-a/summarizer.md`
- Modify: `.claude/agents/superpipelines/parity-test-b/analyzer.md`
- Modify: `.claude/agents/superpipelines/parity-test-b/reporter.md`
- Modify: `.claude/agents/superpipelines/parity-test-b/reviewer.md`

**Rationale:** These are the canonical CC example data-agent pipelines (reader→summarizer; analyzer→reviewer→reporter). They are pure data agents; any of them carrying `isolation: worktree` is exactly the #31 flaw and would be flagged SEV-1 by the new auditor rule. They double as the reference for "correct data-agent config." These ARE pipeline artifacts, so re-stamp `plugin_version` to the current version (v2.1.0).

- [ ] **Step 1: Inspect current isolation + version of each agent**

Run: `grep -n "isolation\|plugin_version" .claude/agents/superpipelines/parity-test-a/reader.md .claude/agents/superpipelines/parity-test-a/summarizer.md .claude/agents/superpipelines/parity-test-b/analyzer.md .claude/agents/superpipelines/parity-test-b/reporter.md .claude/agents/superpipelines/parity-test-b/reviewer.md`
Expected: note which declare `isolation: worktree` and each file's current `plugin_version`.

- [ ] **Step 2: Remove `isolation: worktree` from each data agent**

For every file above that contains a frontmatter line `isolation: worktree`, delete that entire line (data agents omit the field). If a file has no `isolation` line, leave it — it is already correct.

- [ ] **Step 3: Re-stamp `plugin_version` on every edited file**

In each file edited in Step 2, set the frontmatter `plugin_version` to `"2.1.0"` (the current project version per CLAUDE.md). Do NOT edit files left untouched in Step 2.

- [ ] **Step 4: Verify no data agent retains a worktree**

Run: `grep -rn "isolation: worktree" .claude/agents/superpipelines/parity-test-a/ .claude/agents/superpipelines/parity-test-b/`
Expected: no matches (exit 1).

- [ ] **Step 5: Verify agent bodies remain empty (zero-body invariant)**

Run: `for f in .claude/agents/superpipelines/parity-test-a/*.md .claude/agents/superpipelines/parity-test-b/*.md; do echo "== $f"; awk 'c==2{print} /^---[[:space:]]*$/{c++}' "$f"; done`
Expected: no body text printed after the second `---` for any file (empty output under each header).

- [ ] **Step 6: Commit**

```bash
git add .claude/agents/superpipelines/parity-test-a/ .claude/agents/superpipelines/parity-test-b/
git commit -m "fix(examples): CC parity-test data agents omit isolation (#31 reference config)"
```

---

## Task 6: Auditor detection rule (Component D)

**Files:**
- Modify: `skills/pipeline-auditor-references/references/severity-classification.md` (SEV-0 + SEV-1 example lists)
- Modify: `skills/pipeline-auditor-references/references/compliance-matrix.md` (add criteria #23, #24; update count + "How to use")

**Rationale:** The owner's comment: "configure the audit to make sure that created pipelines do not have possible flaws like that." The auditor walks the compliance matrix; new criteria with concrete grep detection make the flaw machine-checkable, and the severity examples justify the SEV assignment.

- [ ] **Step 1: Add the SEV-0 example**

In `severity-classification.md`, under "## SEV-0 examples", add:

```markdown
- Step declares `isolation: worktree` and writes a declared output artifact to a gitignored path (e.g. `superpipelines/temp/`) without host-anchoring — Claude Code auto-cleans the no-tracked-change worktree, silently destroying the artifact (issue #31).
```

- [ ] **Step 2: Add the SEV-1 example**

In `severity-classification.md`, under "## SEV-1 examples", add:

```markdown
- Pure data agent (reads/fetches/emits artifacts; no tracked-code writes) declares `isolation: worktree`. Unnecessary worktree overhead plus auto-teardown risk; data agents must omit `isolation` (issue #31).
```

- [ ] **Step 3: Verify the severity examples landed**

Run: `grep -n "issue #31" skills/pipeline-auditor-references/references/severity-classification.md`
Expected: 2 matches (one SEV-0, one SEV-1).

- [ ] **Step 4: Add compliance criteria #23 and #24**

In `compliance-matrix.md`, in the "## 4. Runtime safety" table (after criterion 22), add two rows:

```markdown
| 23 | Worktree artifact retention | No agent file in the bundle both declares `isolation: worktree` AND has its companion protocol/topology declare an output artifact under a gitignored `temp/` path without host-anchoring. Detection: `grep -ln "isolation: worktree" agents/superpipelines/{P}/*.md` cross-referenced against each step's declared outputs in `topology.json`; any worktree step whose outputs resolve under `superpipelines/temp/` without a host-anchor note = FAIL (SEV-0, silent data loss — issue #31). |
| 24 | Data agents omit isolation | Every agent that writes no tracked code (read-only / data-retrieval / artifact-only — i.e. `tools` has no `Write`/`Edit` to source paths, or the topology marks the step non-code-modifying) does NOT declare `isolation: worktree`. Detection: `grep -ln "isolation: worktree" agents/superpipelines/{P}/*.md`; for each hit, confirm the step modifies tracked code per `topology.json`. A worktree on a non-code step = FAIL (SEV-1 — issue #31). |
```

- [ ] **Step 5: Update the criterion count and ToC**

In `compliance-matrix.md`:
- Line 3: change "28-criterion checklist" to "30-criterion checklist".
- Line 11 ToC: change "Runtime safety (criteria 17–22)" to "Runtime safety (criteria 17–24)".
- Line 96 ("How to use" step 2): change "Walk criteria 1–22 (including 10a)" to "Walk criteria 1–24 (including 10a)".

- [ ] **Step 6: Verify the matrix edits landed**

Run: `grep -n "Worktree artifact retention\|Data agents omit isolation\|30-criterion\|criteria 17–24\|criteria 1–24" skills/pipeline-auditor-references/references/compliance-matrix.md`
Expected: ≥5 matches.

- [ ] **Step 7: Confirm both reference files keep their ToC (both >100 lines)**

Run: `grep -c "Table of contents" skills/pipeline-auditor-references/references/compliance-matrix.md`
Expected: 1 (ToC already present; no new top-level section added).

- [ ] **Step 8: Commit**

```bash
git add skills/pipeline-auditor-references/references/severity-classification.md skills/pipeline-auditor-references/references/compliance-matrix.md
git commit -m "feat(auditor): SEV-0/SEV-1 worktree-artifact-safety criteria (#31)"
```

---

## Task 7: Full self-audit and acknowledgement on the issue

**Files:** none modified (verification only)

- [ ] **Step 1: Audit the CC parity-test pipelines against the new rules**

Invoke the `superpipelines:audit-steps` skill (or `/superpipelines:audit-steps`) against `parity-test-a` and `parity-test-b`.
Expected: criteria #23 and #24 PASS for both (no worktree on data agents after Task 5).

- [ ] **Step 2: Spot-check the detection has discriminating power**

Temporarily add `isolation: worktree` to `.claude/agents/superpipelines/parity-test-a/reader.md`, re-run the audit, and confirm criterion #24 reports FAIL (SEV-1). Then revert the temporary edit.

Run to revert: `git checkout .claude/agents/superpipelines/parity-test-a/reader.md`
Expected: file restored; re-running audit returns to PASS.

- [ ] **Step 3: Verify no skill body exceeded 500 lines**

Run: `wc -l skills/creating-a-pipeline/SKILL.md skills/sk-pipeline-patterns/SKILL.md skills/sk-pipeline-paths/SKILL.md skills/running-a-pipeline/SKILL.md`
Expected: all ≤500.

- [ ] **Step 4: Confirm the full commit series is clean**

Run: `git log --oneline -7 && git status`
Expected: 6 feature/fix commits (Tasks 1–6) + the pre-existing spec commit; working tree clean.

- [ ] **Step 5: Acknowledge the fix on issue #31**

Post a comment summarizing the resolution and linking the spec + plan. Run:

```bash
gh issue comment 31 --repo gustavo-meilus/superpipelines --body "Root-caused and addressed. Verified against the official sub-agents docs: the mechanism is Claude Code's no-change worktree auto-teardown (a subagent making zero *tracked* changes has its worktree auto-removed), not git ignoring files — same outcome. Fix lands in four parts: (1) data/artifact-only agents omit \`isolation\` so they run in the host cwd; (2) code-modifying worktree steps write artifacts to a host-anchored absolute path registered via \`additionalDirectories\`; (3) the runner fails fast on a missing artifact after DONE and never re-runs a step inline (kills the token bleed); (4) new auditor criteria #23 (SEV-0) and #24 (SEV-1) make the flaw machine-checkable at create/mutation time, per the comment on this issue. Spec: docs/superpowers/specs/2026-06-01-worktree-artifact-safety-design.md; plan: docs/superpowers/plans/2026-06-01-worktree-artifact-safety.md."
```

- [ ] **Step 6: Leave the issue open or close per maintainer preference**

Do NOT auto-close. Surface to the user whether to close #31 now or after a live dry-run validation (the manual reproduction in the spec's Testing section).

---

## Self-Review

**Spec coverage:**
- Component B (omit isolation for data agents) → Tasks 1, 2, 5. ✓
- Component A (host-anchor + additionalDirectories + default-branch note) → Tasks 1 (note), 3. ✓
- Component C (fail-fast, no inline fallback) → Task 4. ✓
- Component D (SEV-0/SEV-1 + auditor criteria) → Task 6. ✓
- Spec's `isolation: none` error → corrected in Task 1. ✓
- Testing/validation (manual audit + discriminating-power check) → Task 7. ✓
- `plugin_version` re-stamp (pipeline artifacts only) → Task 5 Step 3. ✓

**Placeholder scan:** No "TBD/TODO/handle edge cases". Every edit step shows the exact text to insert and a grep/`wc` verification with expected result. ✓

**Type/name consistency:** `RESOLVE_HOST_WORKSPACE` (Task 3) is referenced consistently in Tasks 3 and 4. `HOST_TEMP` defined in Task 3 dispatch block, reused in Task 4 escalation pseudocode. Criteria numbers #23/#24 consistent between Task 6 and Task 7. "omit `isolation`" phrasing consistent across Tasks 1, 2, 5, 6. ✓

**Known adaptation:** This is a docs/skill repo with no unit-test framework, so the TDD template's "write failing test" maps to "grep proves the text is absent → edit → grep proves present"; the final functional gate is `/superpipelines:audit-steps` discriminating-power check in Task 7 Step 2.
