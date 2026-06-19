# CAD Context Hygiene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply Matt Pocock-style invocation/context hygiene to Superpipelines bundle skills and newly generated data-only CAD pipelines in one scoped implementation.

**Architecture:** Keep `skills/` as the source of truth and regenerate `plugins/superpipelines/skills/` from it. Preserve the existing public command and skill names; improve routing metadata, CAD authoring templates, stale legacy guidance, and auditor criteria without changing runtime dispatch semantics. Treat generated CADs as portable agent data, not skills.

**Tech Stack:** Markdown skills/references, YAML frontmatter, JSON package metadata, Node.js packaging script, PowerShell/rg verification.

---

## File Structure

- Modify: `skills/using-superpipelines/SKILL.md`  
  Owns the bundle router/index, concise framework description, command routing, internal-support classification, and direct-Q&A escape hatch.
- Modify: `skills/using-superpipelines/references/skill-routing.md`  
  Becomes the detailed routing table and compatibility note for command/workflow, reusable discipline, and internal protocol/reference skills.
- Modify: user-facing workflow skill frontmatter only:
  - `skills/creating-a-pipeline/SKILL.md`
  - `skills/running-a-pipeline/SKILL.md`
  - `skills/adding-a-pipeline-step/SKILL.md`
  - `skills/updating-a-pipeline-step/SKILL.md`
  - `skills/deleting-a-pipeline-step/SKILL.md`
  - `skills/change-models/SKILL.md`
  - `skills/optimizing-a-pipeline/SKILL.md`
  - `skills/migrating-a-pipeline/SKILL.md`
- Modify: model-invoked or loader-facing skill descriptions only where they currently carry workflow summaries or stale trigger breadth:
  - `skills/sk-pipeline-grilling/SKILL.md`
  - `skills/pipeline-auditor-protocol/SKILL.md`
  - `skills/pipeline-architect-protocol/SKILL.md`
  - `skills/pipeline-task-executor-protocol/SKILL.md`
  - `skills/pipeline-spec-reviewer-protocol/SKILL.md`
  - `skills/pipeline-quality-reviewer-protocol/SKILL.md`
  - `skills/pipeline-failure-analyzer-protocol/SKILL.md`
  - `skills/pipeline-optimizer-protocol/SKILL.md`
  - `skills/skill-architect-protocol/SKILL.md`
- Modify: `skills/creating-a-pipeline/SKILL.md`  
  Adds the CAD context-hygiene handoff to the architect and final scaffold summary requirement.
- Modify: `skills/pipeline-architect-protocol/SKILL.md`  
  Owns the inline CAD body, per-pipeline reference heuristic, scaffold summary, and no companion-protocol generation rule.
- Modify: `skills/pipeline-architect-references/references/sdd-artifacts.md`  
  Updates the canonical CAD template with Required Sources, Completion Criterion, invariants, and Red Flags rules.
- Modify: `skills/pipeline-architect-references/references/agent-frontmatter-schema.md`  
  Rewrites stale zero-body guidance as legacy-only and points new data-only generation to CAD schema/template references.
- Modify: `skills/pipeline-architect-references/references/anti-patterns.md`  
  Replaces “agent body is non-empty” as a current anti-pattern with “CAD description/body confusion” and marks zero-body companion guidance legacy-only.
- Modify: `skills/pipeline-auditor-protocol/SKILL.md`  
  Extends audit execution to CAD-06..CAD-10 and BUNDLE-01..BUNDLE-07 where applicable.
- Modify: `skills/pipeline-auditor-references/references/compliance-matrix.md`  
  Adds CAD-06..CAD-10 and the canonical bundle-maintenance audit surface for BUNDLE-01..BUNDLE-07.
- Modify: `skills/pipeline-auditor-references/references/topology-rules.md`  
  Updates data-only topology coverage rules to use `DATA_ROOT/pipelines/{P}/agents/{agent}.md` and `entry.md`, while keeping legacy rules labelled legacy-only.
- Modify: `skills/pipeline-auditor-references/references/fix-templates.md`  
  Replaces current-data fixes that create companion protocol skills with CAD inline-body fixes and adds BUNDLE/CAD hygiene remediation.
- Modify: fixtures/examples only where they assert new pipeline shape:
  - `skills/sk-platform-dispatch/fixtures/*/input/*.cad.md`
  - `skills/sk-platform-dispatch/fixtures/*/expected-*/*`
  - `skills/migrating-a-pipeline/fixtures/README.md`
  - `skills/migrating-a-pipeline/fixtures/migrated-expected/agents/*.md`
  - legacy fixtures under `skills/migrating-a-pipeline/fixtures/legacy-*` and `skills/pipeline-auditor-references/references/fixtures/` only to label them legacy where needed.
- Create or modify: `scripts/check-cad-hygiene.js` or the equivalent existing Node validation surface.
  Enforces objective repo-owned CAD/BUNDLE hygiene checks and is called by, or run immediately alongside, `node scripts/package-codex-plugin.js --check`.
- Modify: `scripts/package-codex-plugin.js`
  Only if needed to wire the hygiene validator into the existing package check.
- Generated: `plugins/superpipelines/skills/**`  
  Regenerated by `node scripts/package-codex-plugin.js`; do not edit by hand.
- Optional create: `docs/superpowers/evidence/2026-06-19-cad-context-hygiene.md`  
  Records before/after description lengths, stale-phrase hit counts, compatibility matrix, false-positive/expected-invocation checks, and executable hygiene validation result.

## Scope Boundaries

- Do not split, rename, or remove public commands or skill directories.
- Do not migrate already-created user pipelines.
- Do not add `disable-model-invocation` or `user-invocable` to generated CAD frontmatter.
- Do not rewrite `sk-platform-dispatch` materialization semantics.
- Do not hand-edit packaged plugin copies under `plugins/superpipelines/skills/`.
- Do not scan or migrate real user-created pipelines under local runtime roots such as `.superpipelines/`, `.codex/`, `.agents/`, `.claude/`, or home-directory pipeline stores.
- Do not make subjective skill-description quality a hard lint rule; record description evidence and review it manually.

---

### Task 1: Capture Baseline Evidence

**Files:**
- Create: `docs/superpowers/evidence/2026-06-19-cad-context-hygiene.md`
- Read: `skills/**/*.md`
- Read: `plugins/superpipelines/skills/**/*.md`

- [ ] **Step 1: Write the evidence file header**

Create `docs/superpowers/evidence/2026-06-19-cad-context-hygiene.md` with:

```markdown
# CAD Context Hygiene Evidence

## Compatibility Matrix

| Surface | Skill path source | `disable-model-invocation` | `user-invocable` | Implementation decision |
|---|---|---|---|---|
| Claude Code | `skills/*/SKILL.md`, `.claude-plugin` conventions | Recognized by existing bundle docs and skills | Recognized by existing bundle docs and skills | Safe to use on bundle skills; do not apply to CADs |
| Codex plugin | `plugins/superpipelines/skills/*/SKILL.md` mirrored from `skills/` | Present in installed skill metadata; prior spec notes show it can block Skill-tool loading | Present in current skill metadata but treated as metadata by packaging | Safe for loader/internal skills already using it; use conservatively for command skills |
| Cursor / Windsurf / Cline fallback | `.superpipelines` data-only runtime plus skill markdown | Not guaranteed as an enforcement primitive | Not guaranteed as an enforcement primitive | Treat as advisory metadata; description cleanup is the portable behavior |
| OpenCode | `.agents/skills` / plugin mirrored skills | Not verified as strict enforcement in this repo | Not verified as strict enforcement in this repo | Treat as advisory unless existing skill already depends on it |
| Universal data-only CAD | `DATA_ROOT/pipelines/{P}/agents/*.md` | Not part of CAD schema | Not part of CAD schema | Never add skill invocation fields to CAD frontmatter |

## Baseline Description Lengths

Command to refresh:

```powershell
Get-ChildItem skills -Recurse -Filter SKILL.md | ForEach-Object {
  $content = Get-Content -Raw $_.FullName
  if ($content -match '(?ms)^---\s*(.*?)\s*---') {
    $frontmatter = $Matches[1]
    $description = ($frontmatter -split "`n" | Where-Object { $_ -match '^description:' }) -join "`n"
    [pscustomobject]@{ Path = (Resolve-Path -Relative $_.FullName); DescriptionChars = $description.Length; Description = $description }
  }
} | Sort-Object Path | Format-Table -AutoSize
```

## Baseline Stale Phrase Hits

Command to refresh:

```powershell
rg -n "zero-body|companion protocol|-protocol skill|agents/superpipelines|skills/superpipelines" skills docs plugins/superpipelines/skills
```

## Expected Invocation Checks

| Skill | Expected prompt | Should route? | Result after implementation |
|---|---|---:|---|
| `using-superpipelines` | "Which Superpipelines command handles adding a step?" | yes | Record the observed route after Task 2 |
| `creating-a-pipeline` | "/superpipelines:new-pipeline" | yes | Record the observed route after Task 2 |
| `running-a-pipeline` | "run the release-review pipeline" | yes | Record the observed route after Task 2 |

## False Positive Checks

| Prompt | Should not auto-route to | Result after implementation |
|---|---|---|
| "Explain what a pipeline is" | `creating-a-pipeline` | Record whether the router keeps this as direct Q&A after Task 2 |
| "Review this single file" | `creating-a-pipeline` | Record whether the router avoids pipeline creation after Task 2 |
| "Change the app model class" | `change-models` | Record whether model-change routing remains pipeline-specific after Task 2 |

## After Measurements

Fill this section after implementation with the same commands above.

## Executable Hygiene Validation

Record the exact command and concise pass/fail result after the validator is added. The validator scans repo-owned sources, fixtures, and packaged plugin copies only; it does not scan user-created runtime pipelines.
```

- [ ] **Step 2: Run the baseline description command**

Run the PowerShell command from the evidence file.

Expected: table of `skills/**/SKILL.md` paths and description lengths.

- [ ] **Step 3: Run the baseline stale phrase command**

Run:

```powershell
rg -n "zero-body|companion protocol|-protocol skill|agents/superpipelines|skills/superpipelines" skills docs plugins/superpipelines/skills
```

Expected: matches in architect/auditor references, legacy docs, and packaged mirrors.

- [ ] **Step 4: Paste concise baseline results into the evidence file**

Append:

```markdown
### Baseline Summary

- Longest workflow descriptions before cleanup: recorded from the command above.
- Stale active-path hits before cleanup: recorded from `rg`.
- Known intentional legacy hit categories: migration fixtures, old-root audit applicability, previous superpowers specs/plans.
```

- [ ] **Step 5: Commit baseline evidence**

```powershell
git add docs/superpowers/evidence/2026-06-19-cad-context-hygiene.md
git commit -m "docs: capture CAD hygiene baseline"
```

Expected: commit succeeds.

---

### Task 2: Clean Router and Invocation Metadata

**Files:**
- Modify: `skills/using-superpipelines/SKILL.md`
- Modify: `skills/using-superpipelines/references/skill-routing.md`
- Modify: workflow skill frontmatter files listed in File Structure
- Modify: loader-facing protocol skill frontmatter files listed in File Structure

- [ ] **Step 1: Update `using-superpipelines` frontmatter**

Replace the current description in `skills/using-superpipelines/SKILL.md` with:

```yaml
description: Route Superpipelines requests to the right command workflow, reusable method skill, or direct codebase answer.
```

Do not add `disable-model-invocation`; the router must remain discoverable.

- [ ] **Step 2: Replace the router table with command-prefixed routes**

In `skills/using-superpipelines/SKILL.md`, replace the `<routing_table>` with:

```markdown
<routing_table>
| User Request / Situation | Route | Rationale |
| :--- | :--- | :--- |
| `/superpipelines:new-pipeline`, "design a pipeline", "build a workflow", "plan multi-step feature work" | `creating-a-pipeline` | End-to-end new pipeline scaffolding. |
| `/superpipelines:run-pipeline`, `/superpipelines:{P}`, "run/execute/resume pipeline" | `running-a-pipeline` | Registry-driven launcher and resume flow. |
| `/superpipelines:new-step`, "add/insert a step/capability" | `adding-a-pipeline-step` | Existing topology mutation. |
| `/superpipelines:update-step`, "update/change a pipeline step" | `updating-a-pipeline-step` | Contract-aware step modification. |
| `/superpipelines:delete-step`, "remove/delete a pipeline step" | `deleting-a-pipeline-step` | Safe topology removal and gap analysis. |
| `/superpipelines:audit-steps`, "audit/review pipeline X" | dispatch `pipeline-auditor` | Pipeline bundle compliance review. |
| `/superpipelines:change-models`, "change/reassign pipeline model tiers" | `change-models` | Model preference and tier reassignment. |
| `/superpipelines:optimize-pipeline`, "optimize pipeline X" | `optimizing-a-pipeline` | Cost, latency, and topology optimization. |
| `/superpipelines:migrate-pipeline`, "migrate legacy pipeline" | `migrating-a-pipeline` | Legacy old-root to data-only conversion. |
| Ambiguous Superpipelines request | Ask one clarifying question or use `sk-4d-method` | Avoid loading heavy workflows prematurely. |
| Read-only Q&A about the repo or plugin | Answer directly with file reads/searches | Do not invoke a workflow for explanation-only requests. |
</routing_table>
```

- [ ] **Step 3: Add router ownership note**

After the routing table, add:

```markdown
The router owns global command selection. Workflow skills should only describe their local workflow and may point back here for global routing. Do not duplicate this full table in workflow bodies.
```

- [ ] **Step 4: Update `skill-routing.md` with the invocation taxonomy**

Insert this section after the title:

```markdown
## Invocation Roles

Superpipelines keeps public command names stable and uses invocation metadata only where the current platform understands it.

| Role | Examples | Description style | Flag policy |
|---|---|---|---|
| Router/index | `using-superpipelines` | Model-facing routing summary | Remains model-discoverable |
| User-facing workflow | `creating-a-pipeline`, `running-a-pipeline`, step mutation skills, model changes, migration, optimization | Short human-facing summary | Prefer explicit command/router invocation; only add strict flags where platform compatibility is confirmed |
| Reusable discipline/method | `test-driven-development`, `systematic-debugging`, `verification-before-completion`, `sk-spec-driven-development` | Leading trigger words for autonomous reach | Keep model-invoked when autonomous reach is useful |
| Internal protocol/reference | `pipeline-architect-protocol`, `pipeline-auditor-protocol`, `sk-platform-dispatch`, path/state/model helpers | Loader-facing summary | `user-invocable: false`; usually `disable-model-invocation: true` |

Generated CAD files are not skills. Do not add skill invocation flags to CAD frontmatter.
```

- [ ] **Step 5: Prune workflow skill descriptions**

Use these exact frontmatter descriptions:

```yaml
# skills/creating-a-pipeline/SKILL.md
description: Design and scaffold a new named Superpipelines workflow after scope, brief, topology, audit, and human approval gates.

# skills/running-a-pipeline/SKILL.md
description: Run, resume, or list installed Superpipelines workflows from the registry.

# skills/adding-a-pipeline-step/SKILL.md
description: Add a new step, capability, or agent to an existing named Superpipelines workflow.

# skills/updating-a-pipeline-step/SKILL.md
description: Modify an existing step in a named Superpipelines workflow while preserving contracts and topology continuity.

# skills/deleting-a-pipeline-step/SKILL.md
description: Remove a step from an existing named Superpipelines workflow while preserving topology continuity.

# skills/change-models/SKILL.md
description: Reassign Superpipelines model-tier preferences across user, workspace, and pipeline scopes.

# skills/optimizing-a-pipeline/SKILL.md
description: Optimize an existing named Superpipelines workflow for topology, model tiers, cost, latency, and reliability.

# skills/migrating-a-pipeline/SKILL.md
description: Migrate a legacy old-root Superpipelines workflow into the data-only pipeline layout.
```

Keep existing `user-invocable` / `disable-model-invocation` fields unchanged in this task unless a field is already present and clearly contradicts the compatibility matrix.

- [ ] **Step 6: Prune loader-facing protocol descriptions**

For each protocol skill, keep `disable-model-invocation: true` and `user-invocable: false`. Replace descriptions with loader-facing summaries such as:

```yaml
description: Loaded by the pipeline-architect agent to design or mutate Superpipelines pipeline topology and data-only CAD artifacts.
description: Loaded by the pipeline-auditor agent to audit Superpipelines pipeline bundles against compliance, CAD, topology, and bundle hygiene rules.
description: Loaded by the pipeline-task-executor agent to execute one assigned implementation task under the pipeline contract.
description: Loaded by the pipeline-spec-reviewer agent to perform Stage 1 spec-compliance review.
description: Loaded by the pipeline-quality-reviewer agent to perform Stage 2 code-quality review after spec compliance passes.
description: Loaded by the pipeline-failure-analyzer agent to diagnose iterative pipeline failures and escalation gates.
description: Loaded by the pipeline-optimizer agent to inspect an existing workflow and recommend optimization opportunities.
description: Loaded by the skill-architect agent to design or revise Superpipelines-compatible skills.
```

- [ ] **Step 7: Verify no public command names changed**

Run:

```powershell
rg -n "/superpipelines:(new-pipeline|run-pipeline|audit-steps|new-step|update-step|delete-step|change-models|init-deep)" AGENTS.md commands skills
```

Expected: existing public commands still appear; no renamed command strings introduced.

- [ ] **Step 8: Commit router and metadata cleanup**

```powershell
git add skills/using-superpipelines skills/*/SKILL.md
git commit -m "docs: clean superpipelines invocation metadata"
```

Expected: commit succeeds.

---

### Task 3: Update CAD Generation Contract

**Files:**
- Modify: `skills/creating-a-pipeline/SKILL.md`
- Modify: `skills/pipeline-architect-protocol/SKILL.md`
- Modify: `skills/pipeline-architect-references/references/sdd-artifacts.md`
- Modify: `skills/pipeline-architect-references/references/agent-frontmatter-schema.md`
- Modify: `skills/pipeline-architect-references/references/anti-patterns.md`

- [ ] **Step 1: Add CAD hygiene handoff to creation Phase 4**

In `skills/creating-a-pipeline/SKILL.md`, after the architect output rule for agent frontmatter, add:

```markdown
- **CAD context-hygiene contract:** The Architect MUST generate one CAD per step agent with tool-neutral frontmatter plus inline protocol body. CAD `description` is third-person trigger metadata only; operational workflow belongs in the body. CAD frontmatter MUST NOT include skill invocation fields such as `disable-model-invocation` or `user-invocable`. Per-pipeline `references/` files are allowed only for reused, scanability-improving, or stable-contract material.
```

- [ ] **Step 2: Add scaffold summary to creation Phase 6**

In Phase 6 finalization list, add a new required artifact after the step agents item:

```markdown
  8. `DATA_ROOT/pipelines/{P}/scaffold-summary.md` — records generated CAD count, generated reference files, the reason for each reference (`reuse`, `scanability`, or `stable-contract`), and any deliberate exceptions to the default inline-body pattern. Required evidence for audit criterion `CAD-09`.
```

Renumber the following registry and preference bootstrap items.

- [ ] **Step 3: Strengthen architect design/develop rules**

In `skills/pipeline-architect-protocol/SKILL.md`, replace the current generated-agent constraint with:

```markdown
- **Constraint:** Generated agents are single CAD files (data): tool-neutral frontmatter plus inline operational protocol body. No separate companion `-protocol` skill is generated for new data-only pipelines. Bundle `sk-*` method skills may be referenced via `protocol_skills`.
- **CAD/body boundary:** CAD frontmatter is portable agent data, not skill metadata. Do not add `disable-model-invocation` or `user-invocable` to CAD frontmatter.
- **Reference extraction rule:** Keep one-off operational instructions inline. Create `DATA_ROOT/pipelines/{P}/references/{name}.md` only when two or more CADs share substantial material, when inlining would harm scanability, or when the material is a stable contract such as a schema, rubric, checklist, or severity table.
- **Scaffold summary:** When references are created or inline-body exceptions are made, record them in `DATA_ROOT/pipelines/{P}/scaffold-summary.md`.
```

- [ ] **Step 4: Replace the canonical CAD template**

In `skills/pipeline-architect-references/references/sdd-artifacts.md`, replace the CAD markdown body template with:

```markdown
# {Agent Display Name} - Operational Protocol

<overview>
{One short paragraph describing the agent's responsibility and quality bar.}
</overview>

## Required Sources
- {source} - {why this source is required}

## Protocol

<protocol>
### 1. DISCOVER
{What to read and verify before acting.}

### 2. PROCESS
{Core operational steps.}

### 3. DELIVER
{Output schema, persistence expectations, and terminal status emission.}
</protocol>

## Completion Criterion
{Visible condition that proves this step is done.}

<invariants>
- {Non-negotiable rule.}
- Emit exactly one terminal status: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
</invariants>
```

Below it add:

```markdown
Reviewer, safety, debugging, and discipline-enforcing agents also include:

```markdown
## Red Flags - STOP
- "{rationalization}" -> {corrective action}
```

If no external source is required, use:

```markdown
## Required Sources
- None. This step is self-contained.
```
```

- [ ] **Step 5: Rewrite `agent-frontmatter-schema.md` as legacy-only**

Replace the title and opening with:

```markdown
# Legacy Agent Frontmatter Schema - Architect Reference

This reference applies only to legacy old-root pipeline artifacts that still use tool-native agent files under `agents/superpipelines/{P}/` plus companion protocol skills under `skills/superpipelines/{P}/`.

New pipeline scaffolding MUST NOT use this schema. New data-only pipelines use the canonical agent definition (CAD): one file at `DATA_ROOT/pipelines/{P}/agents/{agent-name}.md` containing tool-neutral frontmatter plus inline protocol body. For new CADs, use:

- `pipeline-auditor-references/references/canonical-agent-def.md` for schema authority.
- `pipeline-architect-references/references/sdd-artifacts.md` for the authoring template.
```

Keep the old schema content below a heading named:

```markdown
## Legacy Old-Root Schema
```

- [ ] **Step 6: Update anti-pattern 2**

In `skills/pipeline-architect-references/references/anti-patterns.md`, replace anti-pattern 2 with:

```markdown
## 2. CAD Workflow Summary

**Symptoms:** A generated CAD `description` explains the agent's internal workflow, lists process steps, or repeats the protocol body.

**Fix:** Keep `description` as third-person trigger-only routing metadata. Put operational steps in the inline CAD body under Required Sources, Protocol, Completion Criterion, and invariants.

**Legacy note:** Zero-body agents plus companion `{agent-name}-protocol/SKILL.md` were the old-root pattern. They are valid only for legacy migration/audit references, not new data-only pipeline scaffolding.
```

- [ ] **Step 7: Verify active references no longer instruct new zero-body generation**

Run:

```powershell
rg -n "Every agent file is zero-body|Move all content to the companion|Place the companion skill|companion \\{agent-name\\}-protocol|new data-only.*companion" skills/pipeline-architect-references skills/pipeline-architect-protocol skills/creating-a-pipeline
```

Expected: any remaining hits are under legacy-only headings or say not to create companion protocol skills.

- [ ] **Step 8: Commit CAD generation contract**

```powershell
git add skills/creating-a-pipeline skills/pipeline-architect-protocol skills/pipeline-architect-references
git commit -m "docs: update CAD generation contract"
```

Expected: commit succeeds.

---

### Task 4: Extend Auditor Rules and Fix Templates

**Files:**
- Modify: `skills/pipeline-auditor-protocol/SKILL.md`
- Modify: `skills/pipeline-auditor-references/references/compliance-matrix.md`
- Modify: `skills/pipeline-auditor-references/references/topology-rules.md`
- Modify: `skills/pipeline-auditor-references/references/fix-templates.md`

- [ ] **Step 1: Update auditor protocol scope**

In `skills/pipeline-auditor-protocol/SKILL.md`, update the Compliance Matrix bullet to say:

```markdown
- **Compliance Matrix**: Execute the full compliance check in `references/compliance-matrix.md` (criteria 1-25 including 10a, resolver consolidation criteria PR-01..PR-05 and PR-07..PR-10, canonical agent-def criteria CAD-01..CAD-10, and bundle-maintenance criteria BUNDLE-01..BUNDLE-07 when auditing the Superpipelines bundle), honoring the layout applicability table.
```

- [ ] **Step 2: Extend the compliance matrix table of contents**

In `skills/pipeline-auditor-references/references/compliance-matrix.md`, change the table of contents item 6 to:

```markdown
6. Canonical agent-def (criteria CAD-01..CAD-10)
7. Bundle maintenance hygiene (criteria BUNDLE-01..BUNDLE-07)
```

- [ ] **Step 3: Add CAD-06..CAD-10**

After CAD-05, add:

```markdown
| CAD-06 | `description` is trigger-only metadata | SEV-2 | A CAD description must be third-person routing metadata and must not summarize workflow steps. Flag descriptions containing process chains such as "reads X, analyzes Y, writes Z", first/second person, or protocol-like ordering. Escalate to SEV-1 only when the description/body split makes the step contract ambiguous. |
| CAD-07 | CAD body includes required operational sections | SEV-2 | Every data-only CAD body must include `<overview>`, `## Required Sources`, `## Protocol`, `## Completion Criterion`, and `<invariants>`. Reviewer, safety, debugging, and discipline-enforcing agents must also include `## Red Flags - STOP`. Missing required sections = FAIL. |
| CAD-08 | Completion Criterion is explicit and verifiable | SEV-2 | `## Completion Criterion` must name the visible condition that proves the step is done. Vague text such as "when complete" or "after processing" = PARTIAL. Missing section = FAIL. |
| CAD-09 | Per-pipeline references are justified | SEV-3 | If `DATA_ROOT/pipelines/{P}/references/*.md` exists, `scaffold-summary.md` must justify each reference as `reuse`, `scanability`, or `stable-contract`. Missing summary or missing justification = PARTIAL unless it creates a direct execution ambiguity. |
| CAD-10 | New data-only pipelines avoid stale legacy generation patterns | SEV-1 | New data-only pipelines must not generate zero-body agents, companion `-protocol` skills, or source artifacts under `skills/superpipelines/{P}/` or `agents/superpipelines/{P}/`. Any active-path violation = FAIL. Legacy migration fixtures are N/A when labelled legacy-only. |
```

- [ ] **Step 4: Add CAD remediation**

After the existing CAD remediation list, add:

```markdown
- CAD-06: Move workflow/process text from `description` into the CAD body. Keep `description` third-person and trigger-only.
- CAD-07: Add the missing body section using the canonical template in `pipeline-architect-references/references/sdd-artifacts.md`.
- CAD-08: Rewrite the completion criterion as a concrete, observable done condition.
- CAD-09: Add or update `scaffold-summary.md` with one justification per generated reference.
- CAD-10: Regenerate the affected new pipeline as data-only CAD artifacts; do not create companion protocol skills for new pipelines.
```

- [ ] **Step 5: Add bundle-maintenance section**

At the end of `compliance-matrix.md`, before "How to use", add:

```markdown
## 7. Bundle maintenance hygiene

Apply BUNDLE-* only when auditing the Superpipelines bundle itself, not ordinary user-generated pipelines.

| ID | Criterion | SEV | Detection |
|---|---|---|---|
| BUNDLE-01 | Skill descriptions match invocation role | SEV-2 | User-facing workflow skills have short human-facing summaries; model-invoked method skills have leading trigger words; internal protocol/reference skills have loader-facing summaries. |
| BUNDLE-02 | Invocation flags match role | SEV-2 | Internal protocol/reference skills use `user-invocable: false` and normally `disable-model-invocation: true`; router and reusable method skills remain reachable when autonomous reach is intended. |
| BUNDLE-03 | Workflow-summary descriptions are absent | SEV-2 | Flag descriptions that explain internal process steps instead of routing purpose or loader ownership. |
| BUNDLE-04 | Internal protocol/reference skills are not user-facing | SEV-2 | Any internal protocol/reference skill without `user-invocable: false` is a finding unless explicitly justified in its body. |
| BUNDLE-05 | Cross-skill deep links are justified | SEV-2 | Flag instructions that deep-link into another skill's private `references/` files unless that reference is declared public normative by the owning skill. |
| BUNDLE-06 | Active authoring paths contain no stale generated-agent guidance | SEV-1 | Active creation/architect/auditor paths must not instruct new pipelines to create zero-body agents, companion protocol skills, or tool-dir source artifacts. Legacy-only references and migration fixtures are N/A when labelled. |
| BUNDLE-07 | Packaged plugin mirrors source skills | SEV-1 | `node scripts/package-codex-plugin.js --check` must pass after source edits. |

### Bundle hygiene remediation

- BUNDLE-01/BUNDLE-03: Rewrite the description according to the skill's invocation role.
- BUNDLE-02/BUNDLE-04: Adjust frontmatter only where platform compatibility is confirmed; otherwise document the advisory limitation and keep descriptions clean.
- BUNDLE-05: Replace private deep links with an instruction to load the owning skill, or mark the target reference as public normative in the owning skill.
- BUNDLE-06: Move old-root guidance under legacy-only headings or remove it from active authoring paths.
- BUNDLE-07: Run `node scripts/package-codex-plugin.js`, then `node scripts/package-codex-plugin.js --check`.
```

- [ ] **Step 6: Update topology rules for data-only layout**

In `skills/pipeline-auditor-references/references/topology-rules.md`, add this after the title:

```markdown
These rules apply to both layouts. For data-only pipelines, agent coverage and entry coverage resolve under `DATA_ROOT/pipelines/{P}/`. For legacy old-root pipelines, use the old `agents/superpipelines/{P}/` and `skills/superpipelines/{P}/` paths.
```

Replace the Agent coverage bullets with:

```markdown
For every step where `step.agent` is non-null:

- Data-only: `step.agent_def` or the topology convention must resolve to `DATA_ROOT/pipelines/{P}/agents/{step.agent}.md`.
- Legacy old-root: a file must exist at `agents/superpipelines/{P}/{step.agent}.md`.
- The agent file's `name` frontmatter field must match `step.agent` exactly.
```

Replace Entry-skill contract heading with `## 5. Entry contract` and include:

```markdown
- Data-only: `DATA_ROOT/pipelines/{P}/entry.md` must exist and dispatch steps through `sk-platform-dispatch` with `agent_def` references.
- Legacy old-root: `topology.json["entry_skill"]` must equal `run-{P}` and the corresponding `skills/superpipelines/{P}/run-{P}/SKILL.md` must exist with `disable-model-invocation: true` and `user-invocable: true`.
```

- [ ] **Step 7: Update fix templates for CAD data-only fixes**

In `fix-templates.md`, rename Fix 2 to:

```markdown
## Fix 2 - CAD body missing required sections
```

Replace its action with:

```markdown
**Action:** For data-only pipelines, keep operational logic inline in the CAD and add the missing sections from the canonical template. Do not move the body to a companion protocol skill.

Required body shape:

```markdown
<overview>
The agent performs one narrowly scoped pipeline step and reports a terminal status.
</overview>

## Required Sources
- None. This step is self-contained.

## Protocol

<protocol>
### 1. DISCOVER
Read the inputs declared in `io_contract` and verify each required input is available.
### 2. PROCESS
Perform the step responsibility described in the overview without changing undeclared files.
### 3. DELIVER
Return the declared output and one terminal status.
</protocol>

## Completion Criterion
The step is complete when the declared output is returned and exactly one terminal status is emitted.

<invariants>
- Emit exactly one terminal status: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
</invariants>
```
```

Rename Fix 9 to:

```markdown
## Fix 9 - Legacy missing companion protocol skill
```

Add:

```markdown
This fix applies only to legacy old-root pipelines. It MUST NOT be used for new data-only pipelines.
```

- [ ] **Step 8: Verify new audit IDs exist**

Run:

```powershell
rg -n "CAD-06|CAD-07|CAD-08|CAD-09|CAD-10|BUNDLE-01|BUNDLE-07" skills/pipeline-auditor-references skills/pipeline-auditor-protocol
```

Expected: all IDs appear in the compliance matrix; CAD range appears in auditor protocol.

- [ ] **Step 9: Commit auditor rule updates**

```powershell
git add skills/pipeline-auditor-protocol skills/pipeline-auditor-references
git commit -m "docs: add CAD and bundle hygiene audit rules"
```

Expected: commit succeeds.

---

### Task 5: Update Fixtures and Legacy Labels

**Files:**
- Modify: `skills/sk-platform-dispatch/fixtures/non-materializing-dispatch/input/*.cad.md`
- Modify: `skills/sk-platform-dispatch/fixtures/oc-materialize/input/*.cad.md`
- Modify: `skills/sk-platform-dispatch/fixtures/codex-materialize/input/*.cad.md`
- Modify: expected materialized outputs under `skills/sk-platform-dispatch/fixtures/*/expected-*/*` if fixture descriptions/body sections affect output
- Modify: `skills/migrating-a-pipeline/fixtures/README.md`
- Modify: legacy fixture README files under `skills/pipeline-auditor-references/references/fixtures/**/README.md` where stale old-root patterns are intentionally retained

- [ ] **Step 1: Inspect CAD fixture bodies**

Run:

```powershell
Get-ChildItem skills\\sk-platform-dispatch\\fixtures -Recurse -Filter *.cad.md | ForEach-Object { $_.FullName; Select-String -Path $_.FullName -Pattern "## Required Sources|## Completion Criterion|<invariants>|disable-model-invocation|user-invocable" }
```

Expected: identify which CAD fixtures lack Required Sources or Completion Criterion; no CAD should contain skill invocation flags.

- [ ] **Step 2: Update each CAD fixture body**

For each fixture CAD under `skills/sk-platform-dispatch/fixtures/**/input/*.cad.md`, add body sections matching:

```markdown
## Required Sources
- None. This step is self-contained.

## Completion Criterion
The step is complete when it emits exactly one terminal status and returns the output declared in `io_contract`.
```

Keep fixture-specific protocol text if already present.

- [ ] **Step 3: Ensure CAD fixtures do not include skill invocation flags**

Run:

```powershell
rg -n "disable-model-invocation|user-invocable" skills/sk-platform-dispatch/fixtures
```

Expected: no matches in `*.cad.md` files. Matches in expected native skill outputs are allowed only if the materialized native format intentionally includes those fields.

- [ ] **Step 4: Label migration fixtures as legacy where appropriate**

In `skills/migrating-a-pipeline/fixtures/README.md`, add:

```markdown
## Legacy fixture note

Fixtures under `legacy-*` intentionally preserve old-root pipeline shapes so the migration workflow can prove lossless conversion into data-only artifacts. They are not examples for new pipeline scaffolding.
```

- [ ] **Step 5: Label auditor discriminating fixtures that preserve old-root patterns**

For README files under `skills/pipeline-auditor-references/references/fixtures/**/README.md` that describe `agents/superpipelines` or companion protocol skills, add:

```markdown
Legacy fixture: this file intentionally models old-root behavior for auditor discrimination. It is not new-pipeline authoring guidance.
```

- [ ] **Step 6: Verify fixture stale hits are labelled or absent**

Run:

```powershell
rg -n "zero-body|companion protocol|-protocol skill|agents/superpipelines|skills/superpipelines" skills/*/fixtures skills/pipeline-auditor-references/references/fixtures
```

Expected: remaining hits are in legacy-labelled fixture files, migration fixtures, or materialization expected-output paths.

- [ ] **Step 7: Commit fixture updates**

```powershell
git add skills/sk-platform-dispatch/fixtures skills/migrating-a-pipeline/fixtures skills/pipeline-auditor-references/references/fixtures
git commit -m "docs: align CAD fixtures with hygiene contract"
```

Expected: commit succeeds.

---

### Task 6: Add Executable Hygiene Validator

**Files:**
- Create or modify: `scripts/check-cad-hygiene.js`
- Modify: `scripts/package-codex-plugin.js` only if the existing package check can cleanly call the validator
- Read: `skills/sk-platform-dispatch/fixtures/**/input/*.cad.md`
- Read: `skills/**`
- Read: `plugins/superpipelines/skills/**`

- [ ] **Step 1: Inspect existing Node validation style**

Run:

```powershell
Get-Content -Raw scripts\package-codex-plugin.js
Get-ChildItem scripts
```

Expected: identify whether to extend `package-codex-plugin.js --check` directly or add a companion script called from the package check.

- [ ] **Step 2: Add objective CAD hygiene checks**

Implement a Node-based validator that scans repo-owned authoring sources and fixtures only. It MUST NOT scan runtime user pipeline roots such as `.superpipelines/`, `.codex/`, `.agents/`, `.claude/`, or home-directory stores.

Required checks:

- CAD fixture/template files ending in `.cad.md` under repo-owned fixture or template paths must not contain `disable-model-invocation` or `user-invocable`.
- CAD fixture/template bodies must contain `## Required Sources`, `## Protocol`, `## Completion Criterion`, and `<invariants>`.
- Stale phrases such as `zero-body`, `companion protocol`, `-protocol skill`, `agents/superpipelines`, and `skills/superpipelines` must fail in active authoring paths unless the containing file or nearby heading clearly labels the material as legacy, legacy-only, migration, old-root, or fixture-discrimination content.
- Packaged plugin mirror parity remains covered by `node scripts/package-codex-plugin.js --check`.

Do not hard-fail subjective skill-description quality. Keep description review in the evidence file and BUNDLE audit checklist.

- [ ] **Step 3: Wire the validator into the package check**

Prefer one final command:

```powershell
node scripts/package-codex-plugin.js --check
```

If direct wiring would make the package script unclear, keep a companion command:

```powershell
node scripts/check-cad-hygiene.js
node scripts/package-codex-plugin.js --check
```

Expected: the plan and evidence file record whichever command shape is implemented.

- [ ] **Step 4: Run the validator before package sync**

Run the implemented hygiene validation command.

Expected: it fails only for real remaining issues, not for clearly labelled legacy/migration/old-root fixtures.

- [ ] **Step 5: Commit validator**

```powershell
git add scripts
git commit -m "test: add CAD hygiene validation"
```

Expected: commit succeeds.

---

### Task 7: Package Sync and Final Verification

**Files:**
- Modify generated: `plugins/superpipelines/skills/**`
- Modify: `docs/superpowers/evidence/2026-06-19-cad-context-hygiene.md`

- [ ] **Step 1: Regenerate packaged plugin skills**

Run:

```powershell
node scripts/package-codex-plugin.js
```

Expected: `codex package ok: <N> skill files`.

- [ ] **Step 2: Check packaged plugin mirror**

Run:

```powershell
node scripts/package-codex-plugin.js --check
```

Expected: `codex package ok: <N> skill files`.

- [ ] **Step 3: Run final stale active-path scan**

Run:

```powershell
rg -n "Every agent file is zero-body|Move all content to the companion|Place the companion skill|new data-only.*companion|generated.*skills/superpipelines|generated.*agents/superpipelines" skills plugins/superpipelines/skills
```

Expected: no active-path instruction tells new data-only pipeline creation to use zero-body agents, companion protocol skills, or generated tool-dir source artifacts. Legacy-only hits are acceptable only when the surrounding heading says legacy.

- [ ] **Step 4: Run final invocation metadata scan**

Run:

```powershell
rg -n "^description:|^disable-model-invocation:|^user-invocable:" skills/*/SKILL.md
```

Expected: router and method skills remain discoverable where intended; internal protocol skills are loader-facing; generated CAD fixtures do not contain skill invocation flags.

- [ ] **Step 5: Update evidence file after measurements**

Append:

```markdown
### After Summary

- Description cleanup completed for workflow and loader-facing skills.
- Stale active-path hits after cleanup: recorded from final `rg`.
- Remaining hits are intentionally legacy-only, migration fixtures, materialization paths, or historical specs/plans.
- Executable hygiene validation: record exact command and pass/fail result.
- Package mirror check: `node scripts/package-codex-plugin.js --check` passed.
```

- [ ] **Step 6: Commit package sync and evidence**

```powershell
git add plugins/superpipelines/skills docs/superpowers/evidence/2026-06-19-cad-context-hygiene.md
git commit -m "chore: sync packaged skills after CAD hygiene update"
```

Expected: commit succeeds.

---

### Task 8: Final Self-Review

**Files:**
- Read: `docs/superpowers/specs/2026-06-19-cad-context-hygiene-design.md`
- Read: `docs/superpowers/evidence/2026-06-19-cad-context-hygiene.md`
- Read: changed files from `git diff HEAD~7..HEAD --name-only`

- [ ] **Step 1: Verify spec coverage**

Run:

```powershell
git diff --name-only HEAD~7..HEAD
```

Expected: changed files cover router/metadata, creation/architect CAD contract, auditor rules, fixtures, executable hygiene validation, packaged copies, and evidence.

- [ ] **Step 2: Verify no CAD skill metadata leakage**

Run:

```powershell
rg -n "disable-model-invocation|user-invocable" skills/sk-platform-dispatch/fixtures/**/*.cad.md
```

Expected: no matches. If PowerShell glob expansion does not work, run:

```powershell
Get-ChildItem skills\\sk-platform-dispatch\\fixtures -Recurse -Filter *.cad.md | Select-String -Pattern "disable-model-invocation|user-invocable"
```

Expected: no matches.

- [ ] **Step 3: Verify executable hygiene validation one more time**

Run the implemented validation command, preferably:

```powershell
node scripts/package-codex-plugin.js --check
```

If the validator is a companion script, also run:

```powershell
node scripts/check-cad-hygiene.js
```

Expected: objective CAD/BUNDLE hygiene validation passes without scanning user-created runtime pipelines.

- [ ] **Step 4: Verify packaged source parity one more time**

Run:

```powershell
node scripts/package-codex-plugin.js --check
```

Expected: `codex package ok: <N> skill files`.

- [ ] **Step 5: Commit any self-review fixes**

If Task 8 reveals fixes, make them and commit:

```powershell
git add skills plugins docs
git commit -m "fix: address CAD hygiene self-review"
```

Expected: commit succeeds only if fixes were needed. If no fixes were needed, do not create an empty commit.

## Self-Review Notes

- Spec coverage: Each spec area maps to at least one task: compatibility/evidence in Task 1, router/invocation in Task 2, CAD generation in Task 3, audit rules in Task 4, fixtures/tests in Task 5, executable hygiene validation in Task 6, packaging and measurements in Task 7, final verification in Task 8.
- Placeholder scan: This plan uses concrete edits, commands, and expected outcomes instead of deferred work markers.
- Type consistency: The plan consistently uses CAD fields from the existing canonical schema and keeps skill invocation fields out of CAD frontmatter.
