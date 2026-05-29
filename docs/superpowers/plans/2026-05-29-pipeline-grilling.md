# Pipeline-Creation Grilling Protocol Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `sk-pipeline-grilling` skill that hardens a pipeline brief through crawl/grill/reconcile (conditional on pipeline type) before the architect designs the topology, and wire it into `creating-a-pipeline` and `using-superpipelines`.

**Architecture:** A new orchestrator-loaded reference skill (`disable-model-invocation: true`, `user-invocable: false`) exposing `GRILL(MODE)`. `MODE=brief` runs A0 context-determination → A1 conditional silent crawl → A2 grill → A3 reconciliation HARD GATE, returning a hardened brief. `MODE=architectural` runs a lighter post-pattern confirmation pass. `creating-a-pipeline` invokes it in Phase 2 and Phase 3, threads captured failure modes + pipeline type into the architect, and stamps them into `topology.json metadata.grilling`.

**Tech Stack:** Markdown skills (no build/compile, no test framework). "Verification" = constraint checks: body ≤500 lines, description ≤1536 chars, frontmatter keys, third-person impersonal voice, profile-driven (no hardcoded platform names/values). Spec: `docs/superpowers/specs/2026-05-29-pipeline-grilling-design.md`.

---

## Testing note (read first)

This repo has **no unit-test framework** — skills are markdown validated by CI's JSON-manifest check and by authoring constraints. Each task therefore replaces the usual "write failing test → implement → pass" loop with: **write content → run constraint checks → manual convention review → commit**. The constraint checks below are the real, runnable verifications for this codebase.

---

## File Structure

- **Create:** `skills/sk-pipeline-grilling/SKILL.md` — the entire grilling protocol (both modes). One file, one responsibility: brief-hardening + architectural-confirmation interrogation. No references dir (per spec §10 YAGNI).
- **Modify:** `skills/creating-a-pipeline/SKILL.md` — Phase 2 (invoke `MODE=brief`), Phase 3 (invoke `MODE=architectural`), Phase 4 (thread hardened brief into architect), Phase 6 (stamp `metadata.grilling`), Reference Files.
- **Modify:** `skills/using-superpipelines/SKILL.md` — add `sk-pipeline-grilling` to the Reference Files list.

No JSON manifests change. No agent files change.

---

## Task 1: Author `sk-pipeline-grilling/SKILL.md`

**Files:**
- Create: `skills/sk-pipeline-grilling/SKILL.md`

- [ ] **Step 1: Write the skill file**

Write `skills/sk-pipeline-grilling/SKILL.md` with exactly this content:

````markdown
---
name: sk-pipeline-grilling
description: Use when creating-a-pipeline needs to harden a pipeline brief before architect dispatch — runs an adversarial crawl/grill/reconcile interrogation (MODE=brief) and a lighter post-pattern architectural-confirmation pass (MODE=architectural). Reference-only; preload via the orchestrator's Skill invocation.
disable-model-invocation: true
user-invocable: false
---

# Pipeline Grilling — Brief-Hardening Interrogation

> Hardens a pipeline brief and fills knowledge gaps before the architect designs the topology. Trigger from `creating-a-pipeline` Phase 2 (`MODE=brief`) and Phase 3 (`MODE=architectural`). Adapted from the crawl/grill/reconcile protocol of `create-aiboarding`.

<overview>
Pipeline Grilling replaces passive slot-filling with an adversarial interrogation. It silently crawls available context, holds the findings, grills the user one question at a time while challenging vague answers, then confronts the held findings against the answers in a hard-gated reconciliation pass. The result is a hardened brief the architect can trust. The protocol is mandatory and self-scaling: a complete brief yields a short session.
</overview>

<glossary>
  <term name="Pipeline Type">project-embedded (operates on this repository's code/artifacts) vs self-contained/generative (does not consume the repo). Determines the crawl scope.</term>
  <term name="Track A (Crawl)">A silent scan whose findings are held, never revealed before reconciliation.</term>
  <term name="Track B (Grill)">The live, one-question-at-a-time interrogation of the user.</term>
  <term name="Hardened Brief">The structured output: goal, success criteria, pipeline I/O contract, step decomposition, failure modes, and pipeline type.</term>
</glossary>

## Operation

<protocol>
GRILL(MODE, platform_profile, scope, name, raw_brief):
  IF MODE == "brief":         run PASS A (A0 → A1 → A2 → A3), return hardened_brief
  IF MODE == "architectural": run PASS B, return acknowledgement
</protocol>

## PASS A — Brief Hardening (MODE=brief)

<protocol>
### A0 · CONTEXT DETERMINATION (pipeline type)
- Infer a suggested type from `raw_brief`: keywords like "endpoints", "this codebase", "the API", "the repo" lean **project-embedded**; "build/create an X generator/builder", content generation with no repo dependency lean **self-contained**.
- <HARD-GATE>Prompt the user to confirm the type before any crawl. Do NOT crawl the codebase until the type is confirmed.</HARD-GATE>
- Record the confirmed `pipeline_type` for A1 scope, A3 scope, and the hardened brief.

### A1 · SILENT CRAWL (Track A) — partly conditional
- Hold all findings silently. Do NOT reveal them until A3.
- **Always (context-independent):**
  - Enumerate existing pipelines via `sk-pipeline-paths.ENUMERATE_ALL_SCOPE_ROOTS` → detect name overlap / reuse / collision against `name`.
  - Read `platform_profile.capabilities` → which patterns / isolation / parallelism are possible.
- **Only when `pipeline_type == project_embedded`:**
  - Bounded scan of the target workspace: dependency manifests, top-level directory structure, key README/docs. Bounded — never a full read of every file. Prefer Glob for structure + targeted Grep over broad Reads.
- When `pipeline_type == self_contained`: skip the codebase scan entirely; the always-on scans still run.

### A2 · GRILL (Track B)
- One question at a time. NEVER batch questions.
- Challenge vague answers; push for a targeted brain-dump per micro-topic instead of accepting hand-waving.
- Walk the conceptual tree across micro-topics:
  1. **Goal** — push until measurable.
  2. **Success criteria** — observable, concrete.
  3. **Pipeline I/O contract** — exactly what enters the pipeline and exactly what it emits (format included).
  4. **Rough step decomposition** — the stages, not fine-grained per-step contracts.
  5. **Failure modes** — where it breaks; capture ≥1 pipeline-level mode.

### A3 · RECONCILIATION (HARD GATE)
- Confront the held Track A findings against the user's A2 answers; grill ONLY on discrepancies.
- Confrontation scope depends on what was crawled:
  - **project-embedded:** codebase contradictions (e.g. "the brief says the pipeline reads test results, but the repo has no test runner — where do results come from?") PLUS registry/capability contradictions.
  - **self-contained:** registry/capability contradictions only (e.g. "a pipeline named X already exists in {scope} doing Y — how does this differ?"). NO "the repo lacks X" challenges.
- <HARD-GATE>Do not exit until ZERO unresolved discrepancies remain (scoped to whatever crawl ran).</HARD-GATE>

### EXIT BAR — gate opens only when ALL true
- measurable goal
- explicit success criteria
- pipeline-level I/O contract
- rough step decomposition
- ≥1 pipeline-level failure mode
- zero unresolved crawl discrepancies (scoped to the crawl that ran)

### OUTPUT — hardened_brief
Return a structured object:
```
{
  pipeline_type: "project_embedded" | "self_contained",
  goal, success_criteria, io_contract,
  step_decomposition: [...],
  captured_failure_modes: [...]
}
```
</protocol>

## PASS B — Architectural Confirmation (MODE=architectural)

<protocol>
- Invoked AFTER the orchestrator selects a pattern. No new crawl — reuse `platform_profile` and the selected pattern.
- A short confirmation grill. Challenge ONLY when the user's stated expectation contradicts what the pattern/tier actually delivers:
  - the selected pattern's tradeoffs (e.g. Pattern 3 iteration cap of 3; Patterns 2/5 require worktrees).
  - isolation reality on this tier: `platform_profile.capabilities.reviewer_isolation` (structural vs convention-only). Surface every entry of `platform_profile.degradation_warnings`.
  - model-tier implications of the chosen tiers.
- Gate: the user acknowledges the key tradeoff(s). This is confirmation, not extraction.
</protocol>

<invariants>
- Crawl findings are HELD silently until A3 — never leak them before reconciliation.
- One question at a time, always.
- Vague answers are challenged, not accepted.
- The A3 reconciliation gate is a HARD GATE — zero unresolved discrepancies to pass.
- Mandatory and self-scaling — no skip flag. A complete brief yields a short A2 and an empty A3.
- Profile-driven: reference `platform_profile.<field>` abstractly; NEVER hardcode platform names, model IDs, or capability values (per `DEPENDENCY_INVERSION: PROFILE_DRIVEN`).
- Bounded crawl: manifests + structure + targeted greps only; never read the entire repository.
</invariants>

## Reference Files
- `sk-pipeline-paths/SKILL.md` — `ENUMERATE_ALL_SCOPE_ROOTS` for the registry scan.
- `sk-pipeline-patterns/SKILL.md` — pattern tradeoffs referenced in Pass B.
- `sk-4d-method/SKILL.md` — the per-invocation wrapper this complements.
- `creating-a-pipeline/SKILL.md` — the orchestrator that invokes both modes.
````

- [ ] **Step 2: Verify body line count ≤ 500**

Run (PowerShell):
```powershell
(Get-Content skills/sk-pipeline-grilling/SKILL.md | Measure-Object -Line).Lines
```
Expected: a number well under 500 (~150).

- [ ] **Step 3: Verify description length ≤ 1536 chars**

Run (PowerShell) — extracts the `description:` line value and measures it:
```powershell
$desc = (Select-String -Path skills/sk-pipeline-grilling/SKILL.md -Pattern '^description:\s*(.+)$').Matches[0].Groups[1].Value
$desc.Length
```
Expected: a number under 1536.

- [ ] **Step 4: Manual convention review**

Confirm by reading the file:
- Frontmatter has exactly `name`, `description`, `disable-model-invocation: true`, `user-invocable: false`.
- Voice is third-person impersonal throughout (no "you"/"I" in protocol prose — note: the example grilling *questions* directed at the user are quoted strings and may address the user, matching `creating-a-pipeline`'s style).
- No hardcoded platform names (e.g. "Claude Code", "OpenCode"), no concrete model IDs, no concrete capability values — only `platform_profile.<field>` references.

Expected: all confirmed; no edits needed.

- [ ] **Step 5: Commit**

```bash
git add skills/sk-pipeline-grilling/SKILL.md
git commit -m "feat: add sk-pipeline-grilling brief-hardening skill"
```

---

## Task 2: Wire grilling into `creating-a-pipeline`

**Files:**
- Modify: `skills/creating-a-pipeline/SKILL.md` (Phase 2, Phase 3, Phase 4, Phase 6, Reference Files)

- [ ] **Step 1: Invoke MODE=brief at the start of Phase 2**

In `skills/creating-a-pipeline/SKILL.md`, replace:
```markdown
### PHASE 2: BRIEF REFINEMENT (4D)
- Apply the 4D Method to deconstruct core intent and constraints.
```
with:
```markdown
### PHASE 2: BRIEF REFINEMENT (4D)
- **Grilling gate (mandatory)**: FIRST load `sk-pipeline-grilling` via the `Skill` tool and run `GRILL(MODE=brief, platform_profile, scope, name, raw_brief)`. It determines pipeline type, runs the conditional silent crawl, grills the user, and clears the reconciliation HARD GATE. Do NOT proceed to the 4D / model-preference / output-format steps below until it returns a `hardened_brief`. The grilling exit bar subsumes the legacy "≥3 critical slots missing" check.
- Apply the 4D Method to the `hardened_brief` to finalize intent and constraints.
```

- [ ] **Step 2: Verify the Phase 2 edit landed**

Run (PowerShell):
```powershell
Select-String -Path skills/creating-a-pipeline/SKILL.md -Pattern 'GRILL\(MODE=brief'
```
Expected: one match in the Phase 2 region.

- [ ] **Step 3: Invoke MODE=architectural at the end of Phase 3**

In `skills/creating-a-pipeline/SKILL.md`, replace:
```markdown
- **Restriction**: If git is absent OR `worktrees: false`, limit selection to Pattern 1 or 4 (these are the only patterns that do not require writer isolation via worktrees).
```
with:
```markdown
- **Restriction**: If git is absent OR `worktrees: false`, limit selection to Pattern 1 or 4 (these are the only patterns that do not require writer isolation via worktrees).
- **Architectural confirmation grill (mandatory)**: After the pattern is selected, load `sk-pipeline-grilling` via the `Skill` tool and run `GRILL(MODE=architectural, platform_profile, selected_pattern)`. It confirms the user understands the pattern/isolation/model-tier tradeoffs and surfaces every `platform_profile.degradation_warnings` entry. Do NOT advance to Phase 4 until the user acknowledges.
```

- [ ] **Step 4: Thread the hardened brief into the Phase 4 architect dispatch**

In `skills/creating-a-pipeline/SKILL.md`, replace:
```markdown
- **Output Formatter Rule**: The Architect MUST append a specific `output-formatter` step as the final node in the topology, designed to transform the output into the deduced format and save it to the `<workspace-root>/output/` folder.
```
with:
```markdown
- **Hardened-brief hand-off**: The Architect dispatch payload MUST include the `hardened_brief` from Phase 2 — especially `captured_failure_modes` (the Architect designs build-time guardrails from them, per 4D Diagnose) and `pipeline_type` (the Architect uses it to decide whether generated steps may assume repo access).
- **Output Formatter Rule**: The Architect MUST append a specific `output-formatter` step as the final node in the topology, designed to transform the output into the deduced format and save it to the `<workspace-root>/output/` folder.
```

- [ ] **Step 5: Stamp `metadata.grilling` in the Phase 6 topology checklist**

In `skills/creating-a-pipeline/SKILL.md`, replace:
```markdown
  4. `<scope-root>/superpipelines/pipelines/{P}/topology.json` (with `plugin_version` AND `source_tier` stamped — `source_tier` = `platform_profile.tier` from Phase 0)
```
with:
```markdown
  4. `<scope-root>/superpipelines/pipelines/{P}/topology.json` (with `plugin_version` AND `source_tier` stamped — `source_tier` = `platform_profile.tier` from Phase 0; AND `metadata.grilling = { completed: true, pipeline_type, captured_failure_modes: [...] }` from the Phase 2 hardened brief)
```

- [ ] **Step 6: Add the skill to Phase-skill Reference Files**

In `skills/creating-a-pipeline/SKILL.md`, replace:
```markdown
## Reference Files
- `sk-pipeline-paths/SKILL.md` — Scope and path resolution.
```
with:
```markdown
## Reference Files
- `sk-pipeline-grilling/SKILL.md` — Brief-hardening crawl/grill/reconcile protocol (Phase 2 and Phase 3).
- `sk-pipeline-paths/SKILL.md` — Scope and path resolution.
```

- [ ] **Step 7: Verify all edits and line count**

Run (PowerShell):
```powershell
Select-String -Path skills/creating-a-pipeline/SKILL.md -Pattern 'GRILL\(MODE=architectural|metadata\.grilling|Hardened-brief hand-off|sk-pipeline-grilling/SKILL\.md'
(Get-Content skills/creating-a-pipeline/SKILL.md | Measure-Object -Line).Lines
```
Expected: four matches (one per pattern); line count under 500.

- [ ] **Step 8: Commit**

```bash
git add skills/creating-a-pipeline/SKILL.md
git commit -m "feat: wire sk-pipeline-grilling into creating-a-pipeline phases 2-6"
```

---

## Task 3: Register the skill in `using-superpipelines`

**Files:**
- Modify: `skills/using-superpipelines/SKILL.md` (Reference Files list)

- [ ] **Step 1: Add to the Reference Files list**

In `skills/using-superpipelines/SKILL.md`, replace:
```markdown
## Reference Files
- `sk-pipeline-paths/SKILL.md` — Scope and path resolution.
```
with:
```markdown
## Reference Files
- `sk-pipeline-grilling/SKILL.md` — Brief-hardening interrogation run during pipeline creation (Phases 2 and 3).
- `sk-pipeline-paths/SKILL.md` — Scope and path resolution.
```

- [ ] **Step 2: Verify the edit landed**

Run (PowerShell):
```powershell
Select-String -Path skills/using-superpipelines/SKILL.md -Pattern 'sk-pipeline-grilling'
```
Expected: one match in the Reference Files list.

- [ ] **Step 3: Commit**

```bash
git add skills/using-superpipelines/SKILL.md
git commit -m "docs: reference sk-pipeline-grilling in using-superpipelines"
```

---

## Task 4: Audit + final verification

**Files:** none modified (verification only).

- [ ] **Step 1: Run the pipeline auditor on the topology authoring change**

This change touches authoring skills, not a pipeline topology, so the standard `/superpipelines:audit-steps` topology audit does not strictly apply. Instead, run the convention sweep below.

- [ ] **Step 2: Constraint sweep across all three touched skills**

Run (PowerShell):
```powershell
foreach ($f in 'skills/sk-pipeline-grilling/SKILL.md','skills/creating-a-pipeline/SKILL.md','skills/using-superpipelines/SKILL.md') {
  $lines = (Get-Content $f | Measure-Object -Line).Lines
  Write-Output "$f : $lines lines"
}
```
Expected: every file under 500 lines.

- [ ] **Step 3: Confirm no hardcoded platform values were introduced**

Run (PowerShell) against the new skill:
```powershell
Select-String -Path skills/sk-pipeline-grilling/SKILL.md -Pattern 'claude-opus|claude-sonnet|claude-haiku|"Claude Code"|"OpenCode"|"Codex"'
```
Expected: NO matches (profile-driven invariant holds).

- [ ] **Step 4: Verify CI still passes locally (manifest validity unaffected)**

Run (PowerShell) — confirm no JSON manifest was accidentally touched:
```powershell
git diff --name-only HEAD~3 HEAD
```
Expected: only the three `.md` skill files (plus the plan/spec docs from earlier commits) — no `.json` manifest changes.

- [ ] **Step 5: Final confirmation**

Report to the user: skill created, three integration points wired, all constraint checks green. No commit needed (verification-only task).

---

## Self-Review (completed by plan author)

**1. Spec coverage:**
- §3 Decisions (all five + pipeline type) → Task 1 frontmatter/protocol + A0 context determination. ✓
- §4 Skill shape/conventions → Task 1 Steps 1–4. ✓
- §5 Pass A (A0 context, A1 conditional crawl, A2 grill, A3 reconcile, exit bar, output) → Task 1 protocol block. ✓
- §6 Pass B → Task 1 Pass B block; invoked in Task 2 Step 3. ✓
- §7 Integration (Phase 2, Phase 3, Phase 4 hand-off, metadata.grilling stamp, discoverability) → Task 2 Steps 1–6 + Task 3. ✓
- §8 Discipline invariants → Task 1 `<invariants>`. ✓
- §9 Edge handling (bounded crawl, profile-driven) → Task 1 `<invariants>` + A1. ✓
- §10 Out of scope (no references dir) → honored; no references dir created. ✓
- §11 Affected files → Tasks 1–3 match exactly; CLAUDE.md/AGENTS.md untouched. ✓

**2. Placeholder scan:** No TBD/TODO; all skill content is literal; all commands are runnable. ✓

**3. Type/name consistency:** `GRILL(MODE)` operation name consistent across Task 1 and Task 2 Steps 1/3; `hardened_brief`, `captured_failure_modes`, `pipeline_type`, `metadata.grilling` spelled identically in skill output, architect hand-off, and topology stamp. ✓
