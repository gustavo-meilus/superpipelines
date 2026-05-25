# Command Delegator Batch Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite 4 command files (`new-pipeline`, `new-step`, `update-step`, `delete-step`) as thin delegators to their corresponding v2 skills, eliminating the inline-protocol hijack pattern that bypasses HARD-GATEs.

**Architecture:** Each command file currently embeds its own multi-phase protocol that CC executes instead of loading the target skill's full body. Fix is a copy-paste of the delegator pattern proven on `change-models.md` (commit `44e314d`) and `run-pipeline.md` (commit `5bf6ee4`). One file per task, one commit per task. Cache sync after the batch.

**Tech Stack:** Markdown frontmatter, `<protocol>` and `<invariants>` tags, PowerShell for cache sync verification.

---

## Background

Two prior fixes proved the bug and the fix:

- `commands/change-models.md` had an inline `Mode A/B/C` protocol that overrode the v2 6-mode workflow. Fixed at commit `44e314d`.
- `commands/run-pipeline.md` had an inline 3-step `DISCOVERY → INITIALIZATION → EXECUTION` protocol that skipped Phases 0.4 / 0.45 / 0.5 / 0.6. Fixed at commit `5bf6ee4`. Smoke test on ai-articles confirmed PASS (5/5 HARD-GATEs).

Audit of remaining commands (this session): `new-pipeline`, `new-step`, `update-step`, `delete-step` all have the same hijack pattern. `audit-pipeline` and `init-deep` are OK (correctly dispatch agent/skill).

Each delegator must:
1. Keep the frontmatter intact (description + argument-hint).
2. Replace the body with a one-sentence preamble naming the target skill and summarizing the phases it owns (so the user reading the command file understands what will happen).
3. Provide a 3-step `<protocol>` block: load skill, pass `$ARGUMENTS`, follow exactly.
4. Provide an `<invariants>` block that hard-gates against re-embedding protocol logic.

---

## File Structure

| Command file | Target skill | Phases owned by skill |
|---|---|---|
| `commands/new-pipeline.md` | `superpipelines:creating-a-pipeline` | 0 TIER DETECT → 0b GIT PREFLIGHT → 1 SCOPE & IDENTITY → 2 BRIEF REFINEMENT (4D) → 3 PATTERN SELECTION → 4 DESIGN & AUDIT LOOP → 5 HUMAN APPROVAL → 6 FINALIZATION |
| `commands/new-step.md` | `superpipelines:adding-a-pipeline-step` | 0 PIPELINE SELECTION & INSPECTION → 1 INSERTION DESIGN → 2 ARCHITECTED STAGING → 3 TOPOLOGY VALIDATION → 4 DELTA AUDIT → 5 PROMOTION & REGISTRATION |
| `commands/update-step.md` | `superpipelines:updating-a-pipeline-step` | 0 PIPELINE & STEP SELECTION → 1 IMPACT ANALYSIS (4D) → 2 EDGE RE-VALIDATION → 3 ARCHITECTED STAGING → 4 DELTA AUDIT → 5 HUMAN APPROVAL & PROMOTION |
| `commands/delete-step.md` | `superpipelines:deleting-a-pipeline-step` | 0 PIPELINE & STEP SELECTION → 1 GAP ANALYSIS → 2 MUTATION DESIGN (REWIRE) → 3 DELTA AUDIT → 4 HUMAN APPROVAL → 5 ATOMIC PROMOTION |

No other files touched. Cache mirror location:
- `C:\Users\gmeil\.claude\plugins\cache\superpipelines-marketplace\superpipelines\2.0.0\commands\`

---

## Task 1: Rewrite `commands/new-pipeline.md` as delegator

**Files:**
- Modify: `C:\Users\gmeil\Github\superpipelines\commands\new-pipeline.md` (full rewrite)

- [ ] **Step 1: Read current file to capture frontmatter values**

Run:
```powershell
Get-Content "C:\Users\gmeil\Github\superpipelines\commands\new-pipeline.md" -TotalCount 4
```
Expected output (preserves description + argument-hint verbatim):
```
---
description: Design and scaffold a new named multi-agent pipeline with git preflight, scope selection, pre-gate audit, and entry-skill generation
argument-hint: [brief description of the pipeline]
---
```

- [ ] **Step 2: Overwrite the file with the delegator body**

Use Write tool to replace the entire file content with:

```markdown
---
description: Design and scaffold a new named multi-agent pipeline with git preflight, scope selection, pre-gate audit, and entry-skill generation
argument-hint: "[brief description of the pipeline]"
---

# New Pipeline — Command Entry

Invoke the `creating-a-pipeline` skill. The skill owns the full protocol (PHASE 0 tier detect → PHASE 0b git preflight → PHASE 1 scope & identity → PHASE 2 brief refinement 4D → PHASE 3 pattern selection → PHASE 4 design & audit loop → PHASE 5 human approval → PHASE 6 finalization).

<protocol>
1. Load `Skill(superpipelines:creating-a-pipeline)`.
2. Pass `$ARGUMENTS` verbatim (brief description of the pipeline).
3. Follow the skill's protocol exactly. Do NOT improvise an alternative flow, do NOT collapse phases, do NOT skip git preflight or the pre-gate audit.
</protocol>

<invariants>
- The skill is the single source of truth for the workflow. This command file is a thin entry point.
- HARD-GATE: every phase 0 → 0b → 1 → 2 → 3 → 4 → 5 → 6 MUST run in that order. The command file MUST NOT embed any phase logic that would override or shortcut the skill.
- HARD-GATE: scope selection, git preflight, and pre-gate audit are owned by the skill. NEVER skip them from this command file.
- NEVER proceed to scaffold generation without explicit human approval in PHASE 5 (enforced by the skill).
</invariants>
```

- [ ] **Step 3: Verify edit landed**

Run:
```powershell
Select-String -Path "C:\Users\gmeil\Github\superpipelines\commands\new-pipeline.md" -Pattern "Load `Skill\(superpipelines:creating-a-pipeline\)`"
Select-String -Path "C:\Users\gmeil\Github\superpipelines\commands\new-pipeline.md" -Pattern "^### \d+\." -SimpleMatch:$false
```
Expected: first command returns one match. Second command returns NO matches (no inline `### 1.` phases remaining).

- [ ] **Step 4: Commit**

```bash
git add commands/new-pipeline.md
git commit -m "fix(command): new-pipeline delegates to creating-a-pipeline skill (was hijacking with inline v1 protocol)

Same systemic bug as run-pipeline (commit 5bf6ee4) and change-models (commit 44e314d):
command file embedded inline 4-phase protocol that bypassed the v2 skill's PHASE 0
tier detect, PHASE 0b git preflight, and the design/audit/approval loop.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Rewrite `commands/new-step.md` as delegator

**Files:**
- Modify: `C:\Users\gmeil\Github\superpipelines\commands\new-step.md` (full rewrite)

- [ ] **Step 1: Read current file to capture frontmatter values**

Run:
```powershell
Get-Content "C:\Users\gmeil\Github\superpipelines\commands\new-step.md" -TotalCount 4
```
Expected output:
```
---
description: Add a new step to an existing pipeline — select pipeline, choose insertion point, design component, audit the delta, then gate on human approval
argument-hint: [description of the new step]
---
```

- [ ] **Step 2: Overwrite the file with the delegator body**

Use Write tool to replace the entire file content with:

```markdown
---
description: Add a new step to an existing pipeline — select pipeline, choose insertion point, design component, audit the delta, then gate on human approval
argument-hint: "[description of the new step]"
---

# New Step — Command Entry

Invoke the `adding-a-pipeline-step` skill. The skill owns the full protocol (PHASE 0 pipeline selection & inspection → PHASE 1 insertion design → PHASE 2 architected staging → PHASE 3 topology validation → PHASE 4 delta audit → PHASE 5 promotion & registration).

<protocol>
1. Load `Skill(superpipelines:adding-a-pipeline-step)`.
2. Pass `$ARGUMENTS` verbatim (description of the new step).
3. Follow the skill's protocol exactly. Do NOT improvise an alternative flow, do NOT collapse phases, do NOT skip the delta audit or human gate.
</protocol>

<invariants>
- The skill is the single source of truth for the workflow. This command file is a thin entry point.
- HARD-GATE: every phase 0 → 1 → 2 → 3 → 4 → 5 MUST run in that order. The command file MUST NOT embed any phase logic that would override or shortcut the skill.
- HARD-GATE: all mutations MUST stage to `temp/{P}/edit-{ts}/` first. NEVER write to final paths from this command file.
- NEVER promote without an explicit human approval gate (enforced by the skill's PHASE 5).
</invariants>
```

- [ ] **Step 3: Verify edit landed**

Run:
```powershell
Select-String -Path "C:\Users\gmeil\Github\superpipelines\commands\new-step.md" -Pattern "Load `Skill\(superpipelines:adding-a-pipeline-step\)`"
Select-String -Path "C:\Users\gmeil\Github\superpipelines\commands\new-step.md" -Pattern "^### \d+\." -SimpleMatch:$false
```
Expected: first command returns one match. Second command returns NO matches.

- [ ] **Step 4: Commit**

```bash
git add commands/new-step.md
git commit -m "fix(command): new-step delegates to adding-a-pipeline-step skill (was hijacking with inline v1 protocol)

Same systemic bug as run-pipeline (commit 5bf6ee4) and change-models (commit 44e314d).
Inline 4-phase protocol bypassed staging, topology validation, and delta audit.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Rewrite `commands/update-step.md` as delegator

**Files:**
- Modify: `C:\Users\gmeil\Github\superpipelines\commands\update-step.md` (full rewrite)

- [ ] **Step 1: Read current file to capture frontmatter values**

Run:
```powershell
Get-Content "C:\Users\gmeil\Github\superpipelines\commands\update-step.md" -TotalCount 4
```
Expected output:
```
---
description: Update an existing step in a pipeline — select pipeline, select step, apply changes, re-validate edges, audit the delta, then gate on human approval
argument-hint: [description of changes to the step]
---
```

- [ ] **Step 2: Overwrite the file with the delegator body**

Use Write tool to replace the entire file content with:

```markdown
---
description: Update an existing step in a pipeline — select pipeline, select step, apply changes, re-validate edges, audit the delta, then gate on human approval
argument-hint: "[description of changes to the step]"
---

# Update Step — Command Entry

Invoke the `updating-a-pipeline-step` skill. The skill owns the full protocol (PHASE 0 pipeline & step selection → PHASE 1 impact analysis 4D → PHASE 2 edge re-validation → PHASE 3 architected staging → PHASE 4 delta audit → PHASE 5 human approval & promotion).

<protocol>
1. Load `Skill(superpipelines:updating-a-pipeline-step)`.
2. Pass `$ARGUMENTS` verbatim (description of changes to the step).
3. Follow the skill's protocol exactly. Do NOT improvise an alternative flow, do NOT collapse phases, do NOT skip edge re-validation or the delta audit.
</protocol>

<invariants>
- The skill is the single source of truth for the workflow. This command file is a thin entry point.
- HARD-GATE: every phase 0 → 1 → 2 → 3 → 4 → 5 MUST run in that order. The command file MUST NOT embed any phase logic that would override or shortcut the skill.
- HARD-GATE: edge re-validation and impact propagation are owned by the skill. NEVER apply changes to final paths before the delta audit returns PASS.
- Atomic consistency between component code and `topology.json` is enforced by the skill's PHASE 5 promotion step.
</invariants>
```

- [ ] **Step 3: Verify edit landed**

Run:
```powershell
Select-String -Path "C:\Users\gmeil\Github\superpipelines\commands\update-step.md" -Pattern "Load `Skill\(superpipelines:updating-a-pipeline-step\)`"
Select-String -Path "C:\Users\gmeil\Github\superpipelines\commands\update-step.md" -Pattern "^### \d+\." -SimpleMatch:$false
```
Expected: first command returns one match. Second command returns NO matches.

- [ ] **Step 4: Commit**

```bash
git add commands/update-step.md
git commit -m "fix(command): update-step delegates to updating-a-pipeline-step skill (was hijacking with inline v1 protocol)

Same systemic bug as run-pipeline (commit 5bf6ee4) and change-models (commit 44e314d).
Inline 5-phase protocol bypassed edge re-validation, staging, and delta audit.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Rewrite `commands/delete-step.md` as delegator

**Files:**
- Modify: `C:\Users\gmeil\Github\superpipelines\commands\delete-step.md` (full rewrite)

- [ ] **Step 1: Read current file to capture frontmatter values**

Run:
```powershell
Get-Content "C:\Users\gmeil\Github\superpipelines\commands\delete-step.md" -TotalCount 4
```
Expected output:
```
---
description: Delete a step from an existing pipeline — select pipeline, select step, perform gap analysis, optionally rewire, audit the delta, then gate on human approval before any deletion
argument-hint: [optional: step name]
---
```

- [ ] **Step 2: Overwrite the file with the delegator body**

Use Write tool to replace the entire file content with:

```markdown
---
description: Delete a step from an existing pipeline — select pipeline, select step, perform gap analysis, optionally rewire, audit the delta, then gate on human approval before any deletion
argument-hint: "[optional: step name]"
---

# Delete Step — Command Entry

Invoke the `deleting-a-pipeline-step` skill. The skill owns the full protocol (PHASE 0 pipeline & step selection → PHASE 1 gap analysis → PHASE 2 mutation design / rewire → PHASE 3 delta audit → PHASE 4 human approval → PHASE 5 atomic promotion).

<protocol>
1. Load `Skill(superpipelines:deleting-a-pipeline-step)`.
2. Pass `$ARGUMENTS` verbatim (optional step name).
3. Follow the skill's protocol exactly. Do NOT improvise an alternative flow, do NOT collapse phases, do NOT skip gap analysis or the human approval gate.
</protocol>

<invariants>
- The skill is the single source of truth for the workflow. This command file is a thin entry point.
- HARD-GATE: every phase 0 → 1 → 2 → 3 → 4 → 5 MUST run in that order. The command file MUST NOT embed any phase logic that would override or shortcut the skill.
- HARD-GATE: gap analysis MUST classify the gap (none | through-gap | blocking-gap) before any deletion is staged. NEVER delete a step that creates an unresolvable gap without a verified rewire plan and explicit human confirmation.
- Atomic promotion is owned by the skill's PHASE 5. NEVER write deletions to final paths from this command file.
</invariants>
```

- [ ] **Step 3: Verify edit landed**

Run:
```powershell
Select-String -Path "C:\Users\gmeil\Github\superpipelines\commands\delete-step.md" -Pattern "Load `Skill\(superpipelines:deleting-a-pipeline-step\)`"
Select-String -Path "C:\Users\gmeil\Github\superpipelines\commands\delete-step.md" -Pattern "^### \d+\." -SimpleMatch:$false
```
Expected: first command returns one match. Second command returns NO matches.

- [ ] **Step 4: Commit**

```bash
git add commands/delete-step.md
git commit -m "fix(command): delete-step delegates to deleting-a-pipeline-step skill (was hijacking with inline v1 protocol)

Same systemic bug as run-pipeline (commit 5bf6ee4) and change-models (commit 44e314d).
Inline 5-phase protocol bypassed gap analysis and atomic promotion staging.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Batch cache sync

**Files:**
- Mirror: `commands/*.md` from repo to plugin cache.

- [ ] **Step 1: Mirror all 4 files to cache and verify hashes**

Run:
```powershell
$pairs = @(
    @{src = "C:\Users\gmeil\Github\superpipelines\commands\new-pipeline.md";  dst = "C:\Users\gmeil\.claude\plugins\cache\superpipelines-marketplace\superpipelines\2.0.0\commands\new-pipeline.md"},
    @{src = "C:\Users\gmeil\Github\superpipelines\commands\new-step.md";      dst = "C:\Users\gmeil\.claude\plugins\cache\superpipelines-marketplace\superpipelines\2.0.0\commands\new-step.md"},
    @{src = "C:\Users\gmeil\Github\superpipelines\commands\update-step.md";   dst = "C:\Users\gmeil\.claude\plugins\cache\superpipelines-marketplace\superpipelines\2.0.0\commands\update-step.md"},
    @{src = "C:\Users\gmeil\Github\superpipelines\commands\delete-step.md";   dst = "C:\Users\gmeil\.claude\plugins\cache\superpipelines-marketplace\superpipelines\2.0.0\commands\delete-step.md"}
)
foreach ($p in $pairs) {
    Copy-Item -Path $p.src -Destination $p.dst -Force
    $srcHash = (Get-FileHash $p.src).Hash
    $dstHash = (Get-FileHash $p.dst).Hash
    Write-Host "$(Split-Path $p.src -Leaf): match=$($srcHash -eq $dstHash)"
}
```
Expected: 4 lines, each printing `match=True`.

- [ ] **Step 2: No commit needed for cache sync (cache is not under git)**

The cache mirror is local-only state. No commit step.

---

## Task 6: Repository-wide sanity grep

**Files:**
- No edits. Read-only verification.

- [ ] **Step 1: Confirm no command file still has the inline-protocol smell**

Run:
```powershell
Select-String -Path "C:\Users\gmeil\Github\superpipelines\commands\*.md" -Pattern "^### \d+\. " | Select-Object Path, LineNumber, Line
```
Expected output: zero lines, OR only matches inside `audit-pipeline.md` / `init-deep.md` (those are not in scope of this plan and were previously vetted as correctly dispatching).

If any of the 4 fixed files (`new-pipeline`, `new-step`, `update-step`, `delete-step`) appears in the output → defect, re-open the corresponding task.

- [ ] **Step 2: Confirm all 4 fixed files load the correct skill**

Run:
```powershell
Select-String -Path "C:\Users\gmeil\Github\superpipelines\commands\*.md" -Pattern "Load `Skill\(superpipelines:"
```
Expected output: 6 matches total — `change-models.md`, `run-pipeline.md`, `new-pipeline.md`, `new-step.md`, `update-step.md`, `delete-step.md`.

---

## Task 7: Smoke-test handoff to user (no automated test)

These commands trigger long, interactive workflows (scaffolding, mutating, deleting pipelines) that cannot be safely automated in a smoke test without polluting the ai-articles fixture. The user can manually verify by invoking each command in CC and observing that:

1. The command file's body does NOT print inline phase numbers.
2. CC loads the target skill via the `Skill(...)` tool (visible in CC output).
3. The skill's PHASE 0 (or PHASE 0b for `new-pipeline`) is the first phase printed — not a fabricated inline phase.

- [ ] **Step 1: Surface user-facing test instructions**

After Tasks 1–6 complete, report to the user:

> Restart CC. In a throwaway directory (NOT ai-articles, NOT superpipelines), run `/superpipelines:new-pipeline test-cmd-delegator-check`. Expected first observable behavior: CC loads `superpipelines:creating-a-pipeline` skill, then prints "PHASE 0: TIER DETECT". If you see "### 1. PREFLIGHT" or any other inline phase numbering, the delegator failed — paste the trace back.
>
> Repeat for `/superpipelines:new-step`, `/superpipelines:update-step`, `/superpipelines:delete-step` against any existing pipeline of your choice. Abort each at the first PHASE 0 prompt — no need to complete the workflow.

- [ ] **Step 2: On user PASS report, append to execution log**

Append to `docs/superpowers/plans/2026-05-24-cross-platform-model-resolver.execution.log`:

```markdown
## 2026-05-25 — Command delegator batch fix (plan 2026-05-25-command-delegators-batch)

Fixed 4 remaining commands with inline-protocol hijack: new-pipeline (commit <sha>), new-step (commit <sha>), update-step (commit <sha>), delete-step (commit <sha>).

User smoke test: PASS|FAIL (paste user-reported trace excerpt).

Backlog item from project_v2_resolver_impl.md memory: CLOSED.
```

Commit:
```bash
git add docs/superpowers/plans/2026-05-24-cross-platform-model-resolver.execution.log
git commit -m "test(commands): record delegator-batch smoke test result"
```

- [ ] **Step 3: Update memory**

Edit `C:\Users\gmeil\.claude\projects\C--Users-gmeil-Github-superpipelines\memory\project_v2_resolver_impl.md`:

In the `## Systemic Bug Backlog` section, remove the 4 bullet items (`new-pipeline`, `new-step`, `update-step`, `delete-step`) and replace with one line:

```markdown
**Resolved 2026-05-25** — all 4 commands rewritten as thin delegators (plan `2026-05-25-command-delegators-batch.md`). `audit-pipeline.md` and `init-deep.md` were already correctly dispatching.
```

---

## Self-Review

**Spec coverage:**
- new-pipeline → Task 1 ✓
- new-step → Task 2 ✓
- update-step → Task 3 ✓
- delete-step → Task 4 ✓
- Cache sync → Task 5 ✓
- Verification grep → Task 6 ✓
- User smoke test handoff → Task 7 ✓

**Placeholder scan:** No TBD/TODO/"add appropriate". Every Write step has full file content. Every Bash/PowerShell step has the exact command.

**Type consistency:** Skill names match `Skill tool` output observed in prior smoke tests (`superpipelines:creating-a-pipeline`, etc.). Phase numbering matches the heads of each target SKILL.md as inspected in this session.

**Risk:** Task 7 is a manual handoff because automated smoke testing would either (a) require a fresh workspace per command to avoid mutation pollution or (b) require completing irreversible scaffolding workflows. The verification grep in Task 6 is the strongest automated signal we can produce without spinning up test fixtures.

---

## Notes for Executor

- All 4 task commits go on branch `feat/multi-platform-impl`. No PR yet — bundle with the v2.0.0 tag after Task 7 PASS.
- If Task 6 reveals additional command files with inline `### N.` patterns that were missed in scope (other than `audit-pipeline` / `init-deep` which are vetted OK), STOP and escalate to the user — the scope was wrong, do not improvise additional rewrites.
- Cache mirror in Task 5 is critical. Skipping it means CC continues to load the stale command body until next restart with marketplace refresh.
- argument-hint frontmatter values are quoted in the new bodies (e.g., `"[brief description of the pipeline]"`) because YAML parses square brackets as flow sequences when unquoted. Match this convention across all 4 files.
