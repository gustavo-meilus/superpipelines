---
name: optimizing-a-pipeline
description: Optimize an existing named Superpipelines workflow for topology, model tiers, cost, latency, and reliability.
user-invocable: false
---

# Optimizing a Pipeline — On-Demand Optimization Workflow

<overview>
Top-level orchestrator for optimizing an existing pipeline. A read-only `pipeline-optimizer` analyst surveys the selected bundle across four axes (topology structure, model-tier cost, past-run signals, protocol/prompt quality); a discovery session (4D → brainstorm → grill) converges the findings into an `optimization_plan` with the user; the approved plan is batch-applied atomically through the existing mutation and `change-models` engines, gated by a `pipeline-auditor` DELTA pass and proven by a mandatory full audit. Orchestration lives only here (`SUB_AGENT_SPAWNING: FALSE`); the optimizer never mutates (render-inline, #33).
</overview>

<glossary>
  <term name="Opportunity">A single proposed improvement rendered by the optimizer, carrying an axis, impact, affected steps, and a suggested engine.</term>
  <term name="optimization_plan">The reconciled set of accepted/rejected/modified opportunities returned by `sk-pipeline-grilling MODE=optimization`.</term>
  <term name="Batch apply">Staging ALL approved changes in one `edit-{ts}/` and promoting them all-or-nothing — a multi-change optimization is one semantic change.</term>
  <term name="Snapshot">A pre-mutation copy of the bundle in `edit-{ts}/backup/` plus a git checkpoint, used for rollback.</term>
</glossary>

## Workflow Phases

<protocol>
### PHASE 0 — SELECTION
- Reuse the `running-a-pipeline` Phase 0 multi-scope discovery pattern: call `sk-pipeline-paths.ENUMERATE_ALL_SCOPE_ROOTS(workspace)`, merge every `<root>/superpipelines/registry.json`, annotate each entry with `source_tier` and `scope`.
- Present the pipelines; capture the selection `{ROOT, P, pattern, source_tier}`.
- Load `sk-platform-dispatch` → `DETECT()` → `platform_profile` (cache once; same probe/fallback rules as `running-a-pipeline` Phase 0.25). Emit every `platform_profile.degradation_warnings` entry.
- IF `$ARGUMENTS` named a pipeline, pre-select it; still confirm before proceeding.

### PHASE 0.5 — NO-ACTIVE-RUN SOFT GATE
- Scan `<ROOT>/superpipelines/temp/{P}/*` for run directories; read each `pipeline-state.json` top-level `status`.
- IF any run is `running` or `escalated` (non-terminal):
  - `AskUserQuestion`: **(a) discard those run states** and proceed (delete the non-terminal run dirs), or **(b) abort** and let the user finish/handle them manually.
- <HARD-GATE>NEVER stage or mutate the bundle while a `running`/`escalated` run exists unless the user explicitly chose discard. `escalated`/`failed` run dirs are never deleted silently.</HARD-GATE>

### PHASE 1 — SURVEY
- Dispatch the read-only `pipeline-optimizer` via profile-driven dispatch — the SAME `platform_profile.capabilities.dispatch_mechanism` branching used by `creating-a-pipeline` Phase 4 (`native_task` → `Task()`; `native_subagent` / `model_driven` → platform-native; `inline` → Tier 2 inline loop). Hand it absolute paths (resolved via `sk-pipeline-paths`) to `topology.json`, the bundle `agents/` dir, the `temp/{P}/*/pipeline-state.json` history, any `run-telemetry.jsonl`, and the `platform_profile`.
- The optimizer renders an opportunity report as terminal output and NEVER writes a file.
- <HARD-GATE>Persistence is the orchestrator's job (#33): write the rendered report to `<ROOT>/superpipelines/temp/{P}/optimize-{ts}/findings.md` (ensure the dir exists first).</HARD-GATE>
- IF the optimizer returns `DONE_WITH_CONCERNS` (telemetry-blind axes), surface the advisory on enabling the opt-in telemetry hook (`CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1` + register `subagent-telemetry`). NEVER auto-edit settings.
- IF no opportunities were found: report that and exit cleanly — nothing to optimize.

### PHASE 2 — DISCOVERY
- `sk-4d-method` — frame what "better" means for this pipeline (cost? latency? reliability? clarity?). Produce the `hardened` constraints.
- `superpipelines:brainstorming` — divergent exploration of alternative redesigns and their trade-offs against the findings.
- `sk-pipeline-grilling GRILL(MODE=optimization, findings, hardened)` — convergent: walk each opportunity one at a time, capturing accept/reject/modify + rationale. Returns the `optimization_plan`.
- <HARD-GATE>The grilling reconciliation gate must close with ZERO unresolved opportunities before Phase 3.</HARD-GATE>

### PHASE 3 — PLAN GATE (single human approval)
- Present the `optimization_plan` concretely: the chosen opportunities, the resulting topology diff (steps merged/split/parallelized/removed), the model-tier diff, and the predicted effect against the `hardened` success criteria.
- ONE `AskUserQuestion` approval for the whole plan (plan-gate + batch-apply: the changes interact and must be approved/audited/promoted together).
- <HARD-GATE>No staging, snapshot, or mutation before this approval returns yes. Rejection ends the workflow with the findings preserved.</HARD-GATE>

### PHASE 4 — BATCH APPLY (atomic)
- **Snapshot:** copy the bundle to `<ROOT>/superpipelines/temp/{P}/edit-{ts}/backup/` AND create a git checkpoint commit. This is the rollback source.
- **Stage ALL changes in one `edit-{ts}/`** (never promote partials):
  - Topology changes (merge/split/parallelize/reorder/remove) route through the existing mutation engines — `updating-a-pipeline-step` / `adding-a-pipeline-step` / `deleting-a-pipeline-step` (architect STEP-* modes), staging into the shared `edit-{ts}/`.
  - Model-tier changes route through `change-models` **Mode C** (per-agent `model_tier:` override) — recommend a tier direction only; concrete model IDs stay in profile JSON (`DEPENDENCY_INVERSION`).
  - Advisory-only (Axis-4) opportunities are NOT auto-applied; surface them for manual follow-up.
- **DELTA audit:** run ONE combined `pipeline-auditor` DELTA pass over the whole staged delta.
- <HARD-GATE>SEV-0/1 == 0 is required to promote. Any SEV-0/1 → roll back from the snapshot, restore the git checkpoint, and surface the findings. Do NOT promote a partial set.</HARD-GATE>
- **Promote all-or-nothing:** on a clean DELTA audit, promote the entire `edit-{ts}/` atomically.
- **Stamp:** bump `plugin_version` on `topology.json`, the `registry.json` entry, and every touched agent; set `topology.metadata.optimization = { ts, opportunities_applied: [...], baseline_ref }` (`baseline_ref` = the git checkpoint).

### PHASE 5 — POST-APPLY PROOF
- <HARD-GATE>MANDATORY full `pipeline-auditor` pass over the promoted bundle. Any SEV-0/1 → auto-rollback from the snapshot + git checkpoint.</HARD-GATE>
- **Graph-integrity check:** every `depends_on` resolves to an existing step; no orphan edges; no unreachable non-entry step; I/O contracts chain (each consumed input is produced upstream). Any failure → auto-rollback.
- Persist the auditor report per the `commands/audit-steps.md` REPORTING contract (orchestrator owns persistence; ensure `audit/` exists; write `audit/latest.md`; update `registry.json last_audit`).
- **Offer** an optional live smoke-run via `running-a-pipeline` (not mandatory — `PARITY_TESTING: MANUAL_PHASE1`).
- Write the durable provenance report to `<ROOT>/superpipelines/pipelines/{P}/optimization-report-{ts}.md` (opportunities applied/rejected, diffs, audit verdict, baseline_ref).
</protocol>

<invariants>
- No mutation under a live run — Phase 0.5 soft gate with explicit discard-or-abort; `escalated`/`failed` runs are never deleted silently.
- Snapshot (`edit-{ts}/backup/`) + git checkpoint precede any production write.
- All-or-nothing promotion; roll back from the snapshot on any DELTA-audit, full-audit, graph-integrity, or promotion failure.
- SEV-0/1 == 0 gates BOTH the DELTA (pre-promote) and full (post-promote) audits.
- `plugin_version` is re-stamped on `topology.json`, the registry entry, and every touched agent on promotion.
- The optimizer is read-only and renders inline; the orchestrator persists (#33). Orchestration is top-level only (`SUB_AGENT_SPAWNING: FALSE`).
- Isolation-correctness and frontmatter-compliance are delegated to `pipeline-auditor` — never re-checked here (`DEPENDENCY_INVERSION`).
- No concrete model IDs in this body; model-tier changes name a tier direction only and route through `change-models` Mode C.
- One plan gate (Phase 3); batch-apply is one semantic change.
</invariants>

## Red Flags — STOP
- "The optimizer can write `findings.md` itself to save a step." → **STOP**. Read-only render-inline; the orchestrator persists (#33).
- "Promote the topology changes now; apply the tier changes after." → **STOP**. Batch-apply is all-or-nothing; partial promotion leaves the bundle in an unaudited interleaved state.
- "The DELTA audit found a SEV-1, but it's minor — promote anyway." → **STOP**. SEV-0/1 == 0 gates promotion. Roll back.
- "A run is escalated, but optimizing won't touch it." → **STOP**. Phase 0.5 gate: mutating the definition under a live run corrupts resume. Discard explicitly or abort.
- "Skip the snapshot — the git checkpoint is enough." → **STOP**. Both are required; the snapshot is the staging-local rollback source, the checkpoint the version baseline.
- "Re-check the isolation defect while surveying." → **STOP**. That is `pipeline-auditor`'s job (`DEPENDENCY_INVERSION`); the optimizer delegates.
- "Apply the advisory (Axis-4) quality fixes automatically." → **STOP**. Advisory-only opportunities are surfaced for manual decision, never auto-applied.

## Rationalization Table

<rationalization_table>
| Excuse | Reality |
| :--- | :--- |
| "One plan gate is too slow — approve each change inline." | The changes interact; piecemeal approval can promote a half-coherent topology. One plan, one gate, one atomic promote. |
| "The optimizer already audited the bundle." | It did not — it surveys opportunities. Compliance/isolation is the auditor's DELTA + full passes (`DEPENDENCY_INVERSION`). |
| "Skip the post-apply full audit; the DELTA passed." | The DELTA only saw the changed delta. The full pass + graph-integrity prove the whole bundle still chains. |
| "No telemetry, so skip past-run analysis silently." | Degrade and SAY SO — surface the opt-in hook advisory so the next run can ground cost/latency signals. |
| "Down-tier this step to `fast` and name the model." | Name a tier direction only; route through `change-models` Mode C. Concrete IDs live in profile JSON. |
| "Rolling back is wasteful after staging so much." | A failed audit/graph check means the staged set is unsafe. Rollback is the contract, not a failure of effort. |
</rationalization_table>

## Reference Files
- `agents/pipeline-optimizer.md` + `skills/pipeline-optimizer-protocol/SKILL.md` — the read-only survey worker.
- `skills/pipeline-optimizer-references/references/opportunity-taxonomy.md` — opportunity classes + heuristics.
- `sk-pipeline-grilling/SKILL.md` — `MODE=optimization` reconciliation (returns `optimization_plan`).
- `sk-4d-method/SKILL.md` · `superpipelines:brainstorming` — the discovery session.
- `updating-a-pipeline-step` · `adding-a-pipeline-step` · `deleting-a-pipeline-step` — topology mutation engines (`edit-{ts}/` staging).
- `change-models/SKILL.md` — Mode C per-agent `model_tier:` override.
- `pipeline-auditor` + `commands/audit-steps.md` — DELTA + full audit and report persistence.
- `running-a-pipeline/SKILL.md` — Phase 0 discovery pattern reused here; optional Phase 5 smoke-run.
- `sk-pipeline-paths/SKILL.md` — scope-root and path resolution.
