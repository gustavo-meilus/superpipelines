# optimizing-a-pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the on-demand `optimizing-a-pipeline` workflow: a read-only `pipeline-optimizer` analyst surveys an existing pipeline across four axes (topology / model-tier cost / past-run signals / protocol quality), a 4D→brainstorm→grill discovery session locks an optimization plan with the user, and the approved plan is batch-applied atomically through the existing mutation + `change-models` engines with a mandatory post-apply audit. Plus an opt-in `SubagentStop` telemetry hook feeding cost/latency signals.

**Architecture:** One new orchestration skill + one new read-only worker agent (+ protocol) + one command + one new grilling MODE + one opt-in hook script. Reuses existing engines (architect STEP-* via update/add/delete-step, `pipeline-auditor` DELTA + full, `change-models` Mode C). No new model-resolution or compliance logic (`DEPENDENCY_INVERSION`). Spec: `docs/superpowers/specs/2026-06-03-optimizing-a-pipeline-design.md`.

**Tech Stack:** Markdown skills + zero-body agent frontmatter (Claude Code plugin), JSON topology/state, polyglot extensionless hook script (cmd+bash), `python3` for atomic JSON ops, PowerShell/Bash on Win11. No build, no test runner — verification is by `rg`/Read assertions + fixture traces.

**Current plugin version:** 2.1.3 → target **2.2.0** (release-time bump, Task 8).

---

## Conventions (READ FIRST)

1. **Voice:** third-person impersonal throughout (authoring rule). Agent bodies are EMPTY (frontmatter only). Skill bodies ≤500 lines. Skill `description` ≤1536 chars, triggering-conditions only.
2. **No hardcoded model IDs** in skill/agent bodies (`DEPENDENCY_INVERSION`). Agents declare `model_tier:`, never `model:`.
3. **No BOM on JSON** ever written by tooling (`encoding="utf-8"`, never PS `Set-Content -Encoding UTF8`).
4. Every same-file task anchors on quoted strings, not line numbers.
5. Each task is independently committable. Use `git add <files>` + a conventional-commit message.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `agents/pipeline-optimizer.md` | Read-only analyst worker (zero-body) | Create |
| `skills/pipeline-optimizer-protocol/SKILL.md` | Full survey protocol (4 axes, render-inline) | Create |
| `skills/pipeline-optimizer-references/references/opportunity-taxonomy.md` | Heuristics catalog + opportunity taxonomy (ToC) | Create |
| `skills/optimizing-a-pipeline/SKILL.md` | Orchestration workflow (Phases 0–5) | Create |
| `commands/optimize-pipeline.md` | Slash-command wrapper | Create |
| `skills/sk-pipeline-grilling/SKILL.md` | Add `MODE=optimization` | Modify |
| `skills/using-superpipelines/SKILL.md` | Routing-table row | Modify |
| `hooks/subagent-telemetry` | Opt-in `SubagentStop` capture script | Create |
| `hooks/README-telemetry.md` | How to enable the telemetry hook | Create |
| `README.md` | Document `/optimize-pipeline` | Modify |
| `.claude-plugin/plugin.json`, `marketplace.json`, `package.json`, `.version-bump.json`, `CLAUDE.md` | Version bump 2.2.0 | Modify (Task 8) |

---

## Task 1: `pipeline-optimizer` worker agent + protocol skill

**Files:**
- Create: `agents/pipeline-optimizer.md`
- Create: `skills/pipeline-optimizer-protocol/SKILL.md`

- [ ] **Step 1: Confirm the gap (red).**

Run: `rg -n "pipeline-optimizer" agents/ skills/` — expected **no matches** (nothing exists yet).

- [ ] **Step 2: Create the zero-body agent.** Mirror `agents/pipeline-auditor.md` exactly except name/skills. Body MUST be empty (frontmatter only):

```yaml
---
name: pipeline-optimizer
description: Use when surveying an existing pipeline bundle for optimization opportunities — topology merge/split/parallelize/reorder, model-tier right-sizing, past-run pain signals, and protocol-quality advisories. Dispatched read-only by optimizing-a-pipeline; renders an opportunity report for the orchestrator to persist. Never mutates.
tools: Read, Glob, Grep
disallowedTools: Write, Edit, Bash
model_tier: deep
effort_tier: high
maxTurns: 30
version: "1.0"
plugin_version: "2.2.0"
permissionMode: plan
skills:
  - sk-4d-method
  - sk-pipeline-paths
  - pipeline-optimizer-protocol
---
```
NOTE: NO `isolation` field (data/analysis agent, issue #31). Read-only render-inline (issue #33).

- [ ] **Step 3: Create the protocol skill** `skills/pipeline-optimizer-protocol/SKILL.md`. Frontmatter:
```yaml
---
name: pipeline-optimizer-protocol
description: Full operational protocol for the pipeline-optimizer agent — read-only four-axis optimization survey.
disable-model-invocation: true
user-invocable: false
---
```
Body (third-person, ≤500 lines) MUST specify:
- **Inputs:** absolute paths to `topology.json`, agent frontmatter dir, `temp/{P}/*/pipeline-state.json` history, and `run-telemetry.jsonl` (when present), handed in by the orchestrator.
- **Four axes** (per spec §Analysis axes): topology structure; model-tier cost; past-run signals; protocol/prompt quality (advisory only).
- **Graceful telemetry degradation** (three tiers: no run dirs / state-only / full telemetry).
- **Delegation boundary:** MUST NOT re-check isolation/frontmatter compliance (#23/#24) — note that `pipeline-auditor` owns it; reference, do not duplicate (`DEPENDENCY_INVERSION`).
- **Output contract:** render a structured opportunity report as TERMINAL OUTPUT (never write a file). Each opportunity carries: `{id, axis, severity/impact, affected_steps, proposed_change, rationale, suggested_engine}` where `suggested_engine ∈ {update-step, add-step, delete-step, change-models, advisory-only}`.
- **Terminal status:** exactly one of `DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED`.
- Red Flags + a short rationalization table (mirror auditor-protocol style).

- [ ] **Step 4: Verify (green).**

Run: `rg -n "pipeline-optimizer-protocol|disallowedTools: Write, Edit, Bash|model_tier: deep" agents/pipeline-optimizer.md skills/pipeline-optimizer-protocol/SKILL.md` — expected ≥3 matches.
Run: `rg -n "isolation" agents/pipeline-optimizer.md` — expected **no matches** (confirms #31 compliance).

- [ ] **Step 5: Commit.**
```bash
git add agents/pipeline-optimizer.md skills/pipeline-optimizer-protocol/
git commit -m "feat(optimizer): add read-only pipeline-optimizer agent + protocol skill"
```

---

## Task 2: Opportunity taxonomy reference

**Files:**
- Create: `skills/pipeline-optimizer-references/references/opportunity-taxonomy.md`

> Companion reference dir omits SKILL.md (file-layout rule: prevents preloading). References >100 lines MUST include a ToC (authoring rule).

- [ ] **Step 1: Write the taxonomy** with a ToC, cataloguing each opportunity class and its detection heuristic + the engine that applies it:
  - Topology: redundant-sequential-merge, overloaded-step-split, parallelizable-independent (Pattern 1→2), reorder-for-shorter-critical-path, dead/unreachable-step → `update/add/delete-step`.
  - Cost: over-provisioned-tier, under-provisioned-tier, effort-mismatch → `change-models` Mode C.
  - Past-run: repeated-escalation-step, loop-cap-hit, failure-hotspot, token/latency-hotspot (telemetry) → varies.
  - Quality (advisory): vague-description, missing-io-contract, untyped-output.
  - Each entry: symptom · discriminator · false-positive guard · suggested_engine.

- [ ] **Step 2: Verify (green).**

Run: `rg -n "Table of Contents|suggested_engine|Pattern 1.*2|over-provisioned" skills/pipeline-optimizer-references/references/opportunity-taxonomy.md` — expected ≥3 matches.

- [ ] **Step 3: Commit.**
```bash
git add skills/pipeline-optimizer-references/
git commit -m "docs(optimizer): add opportunity taxonomy + heuristics reference"
```

---

## Task 3: `sk-pipeline-grilling` — add `MODE=optimization`

**Files:**
- Modify: `skills/sk-pipeline-grilling/SKILL.md`

> Read the file first to locate the MODE dispatch structure (existing MODE=brief / MODE=architectural). Stay ≤500 lines; if near the cap, push detail into a `sk-pipeline-grilling`-references entry instead.

- [ ] **Step 1: Confirm existing modes (red).**

Run: `rg -n "MODE=brief|MODE=architectural|MODE *==|GRILL\(MODE" skills/sk-pipeline-grilling/SKILL.md` — record the dispatch pattern to mirror.

- [ ] **Step 2: Add `MODE=optimization`.** Mirror the structure of the existing modes. Contract:
  - **Input:** the analyst's opportunity report + the `hardened` constraints from 4D.
  - **Behavior:** interrogate the user **one opportunity at a time** ("analyst found steps B+C are redundant — merge, or is the split intentional?"), capturing accept/reject/modify + rationale per opportunity.
  - **Reconciliation HARD GATE:** zero unresolved opportunities before returning (mirrors MODE=brief's A3 reconciliation gate).
  - **Output:** an `optimization_plan` object: `{ accepted:[opportunity...], rejected:[...with reason], modifications:[...], success_criteria }`.

- [ ] **Step 3: Verify (green).**

Run: `rg -n "MODE=optimization|optimization_plan|one opportunity at a time" skills/sk-pipeline-grilling/SKILL.md` — expected ≥2 matches.
Run: line-count guard — `(Get-Content skills/sk-pipeline-grilling/SKILL.md | Measure-Object -Line).Lines` ≤ 500.

- [ ] **Step 4: Commit.**
```bash
git add skills/sk-pipeline-grilling/
git commit -m "feat(grilling): add MODE=optimization for opportunity reconciliation"
```

---

## Task 4: `optimizing-a-pipeline` orchestration skill

**Files:**
- Create: `skills/optimizing-a-pipeline/SKILL.md`

> The core workflow. Model structure on `creating-a-pipeline`/`running-a-pipeline` (Phases, `<protocol>`, `<invariants>`, Red Flags, Rationalization Table, Reference Files). ≤500 lines.

- [ ] **Step 1: Frontmatter.**
```yaml
---
name: optimizing-a-pipeline
description: Orchestrates on-demand optimization of an existing named pipeline — surveys topology, model-tier cost, and past-run signals, runs a discovery session to lock an optimization plan, then batch-applies it atomically with a mandatory post-apply audit. Use when the user asks to optimize a pipeline, find topology/cost improvements, merge or split steps, or invokes /superpipelines:optimize-pipeline.
user-invocable: false
---
```

- [ ] **Step 2: Author the six phases** (per spec §Workflow). Each phase as `### PHASE N` with explicit HARD-GATEs:
  - **Phase 0 — Selection:** reuse `running-a-pipeline` Phase 0 multi-scope discovery pattern; `sk-platform-dispatch` DETECT; capture `{ROOT, P, pattern, source_tier}`.
  - **Phase 0.5 — No-active-run soft gate:** scan `temp/{P}/*` for non-terminal state; if `running`/`escalated` exists → `AskUserQuestion`: **(a) discard run states + proceed** or **(b) abort**. HARD-GATE: never mutate under a live run without explicit discard.
  - **Phase 1 — Survey:** profile-driven dispatch of `pipeline-optimizer` (same dispatch-mechanism branching table as creating-a-pipeline Phase 4; include `platform_profile` in payload). Persist its rendered report to `temp/{P}/optimize-{ts}/findings.md` (orchestrator owns persistence — #33).
  - **Phase 2 — Discovery:** `sk-4d-method` → `superpipelines:brainstorming` → `sk-pipeline-grilling GRILL(MODE=optimization, findings, hardened)` → returns `optimization_plan`.
  - **Phase 3 — Plan gate:** present topology diff + model-tier diff + predicted effect; ONE `AskUserQuestion` approval. HARD-GATE: no staging before approval.
  - **Phase 4 — Batch apply:** snapshot bundle → `edit-{ts}/backup/` + `git` checkpoint commit; stage ALL changes in one `edit-{ts}/`; topology changes via architect STEP-* (update/add/delete-step engine); model-tier changes via `change-models` Mode C; ONE combined `pipeline-auditor` DELTA pass (SEV-0/1==0 gate); all-or-nothing atomic promotion; rollback from snapshot on any failure; bump `plugin_version`; stamp `topology.metadata.optimization`.
  - **Phase 5 — Post-apply proof:** MANDATORY full `pipeline-auditor` pass + graph-integrity check (depends_on resolve, no orphan edges, I/O chain); auto-rollback on failure; OFFER live smoke-run via `running-a-pipeline`; write durable `superpipelines/pipelines/{P}/optimization-report-{ts}.md`.

- [ ] **Step 3: Add `<invariants>`, Red Flags, Rationalization Table** capturing the safety invariants (spec §Safety): no-live-run, snapshot+checkpoint, all-or-nothing, SEV-0/1 gates on both audits, version re-stamp, read-only optimizer, top-level-orchestration-only. Reference Files section pointing to the engines reused.

- [ ] **Step 4: Verify (green).**

Run: `rg -n "PHASE 0.5|No-active-run|optimization_plan|change-models. Mode C|all-or-nothing|metadata.optimization|snapshot" skills/optimizing-a-pipeline/SKILL.md` — expected ≥6 matches.
Run: line-count guard ≤ 500. Run a voice check: `rg -ni "\b(I|we|let's|you should)\b" skills/optimizing-a-pipeline/SKILL.md` — review hits for first-/second-person leaks.

- [ ] **Step 5: Commit.**
```bash
git add skills/optimizing-a-pipeline/
git commit -m "feat(optimize): add optimizing-a-pipeline orchestration skill"
```

---

## Task 5: `/optimize-pipeline` command wrapper

**Files:**
- Create: `commands/optimize-pipeline.md`

> Model on `commands/audit-steps.md` / `commands/update-step.md` — thin wrapper, frontmatter `description` + `argument-hint`, body routes to the skill.

- [ ] **Step 1: Write the command.** Frontmatter `description` (≤ the command-menu norm) + `argument-hint: [pipeline-name]`. Body: `<args>` ($ARGUMENTS optional pipeline name → Phase 0 pre-selection), then instruct invocation of `optimizing-a-pipeline`.

- [ ] **Step 2: Verify (green).**

Run: `rg -n "optimizing-a-pipeline|argument-hint" commands/optimize-pipeline.md` — expected 2 matches.

- [ ] **Step 3: Commit.**
```bash
git add commands/optimize-pipeline.md
git commit -m "feat(optimize): add /superpipelines:optimize-pipeline command wrapper"
```

---

## Task 6: Router-table entry in `using-superpipelines`

**Files:**
- Modify: `skills/using-superpipelines/SKILL.md`

- [ ] **Step 1: Add the routing row.** Anchor on the `/change-models` routing-table row (`| \`/change-models\` or "Change models" | \`change-models\` |`). Insert immediately after it:
```markdown
| `/optimize-pipeline` or "Optimize [P]" | `optimizing-a-pipeline` | On-demand topology/cost optimization. |
```

- [ ] **Step 2: Verify (green).**

Run: `rg -n "optimizing-a-pipeline" skills/using-superpipelines/SKILL.md` — expected 1 match.

- [ ] **Step 3: Commit.**
```bash
git add skills/using-superpipelines/
git commit -m "feat(routing): route /optimize-pipeline to optimizing-a-pipeline"
```

---

## Task 7: Opt-in `SubagentStop` telemetry hook

**Files:**
- Create: `hooks/subagent-telemetry` (extensionless polyglot script)
- Create: `hooks/README-telemetry.md`

> SHIPS DISABLED. Do NOT add a `SubagentStop` entry to `hooks/hooks.json` — opt-in means the user registers it themselves. The model cannot see token counts (#21837); the hook is the only capture path.

- [ ] **Step 1: Write the hook script.** Mirror the `hooks/run-hook.cmd` polyglot pattern OR a pure-bash script invoked via `run-hook.cmd subagent-telemetry`. The script MUST, on `SubagentStop`:
  - Read the hook JSON on stdin (`session_id`, `transcript_path`, `agent_id`, `agent_type`).
  - Locate the active pipeline run dir (env `SUPERPIPELINES_RUN_DIR` or derive from cwd); if absent → exit 0 silently (no-op outside a pipeline run).
  - Read the latest matching record from `~/.claude/agent-metrics.jsonl` for token counts; derive `ctx_size` from the transcript when available.
  - Append one JSON line to `<run-dir>/run-telemetry.jsonl`: `{ts, step_id, agent, model, input_tok, output_tok, cache_read, cache_creation, ctx_size, duration_ms, status}` using a `python3` atomic-ish append (open `a`, `encoding="utf-8"`, no BOM).
  - NEVER fail the run: any error → write nothing, exit 0.

- [ ] **Step 2: Write `hooks/README-telemetry.md`** documenting: what it captures, why it's opt-in (model-can't-see-tokens rationale + #21837 link), and the two enablement steps: (1) set `CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1`, (2) add the `SubagentStop` block to settings (`"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd" subagent-telemetry`). State that `optimizing-a-pipeline` degrades gracefully when absent.

- [ ] **Step 3: Verify (green).**

Run: `rg -n "run-telemetry.jsonl|SubagentStop|exit 0" hooks/subagent-telemetry` — expected ≥2 matches.
Run: `rg -n "SubagentStop" hooks/hooks.json` — expected **no matches** (confirms ships-disabled).

- [ ] **Step 4: Commit.**
```bash
git add hooks/subagent-telemetry hooks/README-telemetry.md
git commit -m "feat(telemetry): add opt-in SubagentStop run-telemetry capture hook"
```

---

## Task 8: Version bump + docs + final integration check

**Files:**
- Modify: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `package.json`, `.cursor-plugin/plugin.json`, `.version-bump.json`, `CLAUDE.md` (Project Version), `README.md`

- [ ] **Step 1: Bump version to 2.2.0** across all manifests via the `.version-bump.json` sync targets (confirm with user before release — `PLUGIN_VERSION_STAMPING`). Update `CLAUDE.md` Metadata "Project Version: v2.2.0". Confirm every new agent/topology artifact stamps `plugin_version: "2.2.0"`.

- [ ] **Step 2: Document `/optimize-pipeline` in `README.md`** alongside the other commands.

- [ ] **Step 3: Run the auditor on the new bundle (smoke).** Run `/superpipelines:audit-steps` against the repo's own skill/agent set (or a fixture pipeline) and confirm `pipeline-optimizer` + `optimizing-a-pipeline` raise no SEV-0/1 (read-only agent w/ `disallowedTools`, no `isolation`, `model_tier` present, protocol flags correct).

- [ ] **Step 4: Cross-reference consistency scan.**

Run: `rg -n "optimizing-a-pipeline|pipeline-optimizer|optimize-pipeline|MODE=optimization|run-telemetry" skills/ agents/ commands/ hooks/ README.md` — confirm every component cross-references and nothing is orphaned.

- [ ] **Step 5: CI JSON validation.** Confirm all touched JSON manifests parse (the CI gate validates manifests). `python3 -c "import json,glob; [json.load(open(f,encoding='utf-8')) for f in ['.claude-plugin/plugin.json','.claude-plugin/marketplace.json','package.json']]"` — expected no error.

- [ ] **Step 6: Commit.**
```bash
git add .claude-plugin/ package.json .cursor-plugin/ .version-bump.json CLAUDE.md README.md
git commit -m "chore(release): bump to 2.2.0 + document /optimize-pipeline"
```

---

## Self-review notes (author)

- **Spec coverage:** worker+protocol → T1; taxonomy → T2; grilling MODE=optimization → T3; orchestration skill (Phases 0–5, all safety invariants) → T4; command → T5; router → T6; opt-in telemetry hook (model-can't-see-tokens constraint) → T7; version/docs/audit/integration → T8. All spec sections mapped.
- **Invariant compliance:** optimizer is read-only render-inline (#33); omits `isolation` (#31); `model_tier:` not `model:` (`MODEL_SELECTION`); orchestration top-level only (`SUB_AGENT_SPAWNING: FALSE`); no per-platform values hardcoded (`DEPENDENCY_INVERSION`); isolation-compliance delegated to auditor; telemetry opt-in (no settings auto-edit).
- **Safety:** no-live-run soft gate, snapshot+git checkpoint, all-or-nothing promotion w/ rollback, SEV-0/1 gate on DELTA + full audits, version re-stamp, durable provenance report.
- **Dependency order:** T1→T2 (worker before its reference is harmless either order); T3 (grilling) and T6/T7 independent; T4 depends on T1+T3 (dispatches worker, calls grilling mode); T5 depends on T4; T8 last.
- **Adaptation:** no test runner — red/green steps are `rg`/Read assertions + auditor smoke run, the faithful analog in a markdown-skill repo. Line-count + voice guards substitute for lint.
- **Open release gate:** Task 8 version bump requires user confirmation (per `PLUGIN_VERSION_STAMPING`) before merge.
