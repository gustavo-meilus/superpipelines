---
name: sk-pipeline-grilling
description: Loaded by pipeline creation and optimization workflows to harden briefs, confirm architecture, or reconcile optimization choices.
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
  IF MODE == "optimization":  run PASS C (findings, hardened), return optimization_plan
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

## PASS C — Optimization Reconciliation (MODE=optimization)

<protocol>
- Invoked by `optimizing-a-pipeline` Phase 2 AFTER the `pipeline-optimizer` survey. No new crawl.
- **Inputs:** the analyst's opportunity report (`findings`) and the `hardened` constraints distilled by `sk-4d-method` (what "better" means for this pipeline).
- **Behavior — convergent, one opportunity at a time:** walk the rendered opportunities individually. NEVER batch. For each, confront the user against the finding (e.g. "the analyst found steps B and C are redundant — merge them, or is the split intentional?"). Capture a per-opportunity verdict: accept / reject / modify, each WITH a rationale.
- Challenge vague verdicts the same way Pass A challenges vague answers: push until the decision is concrete and grounded in the hardened constraints.
- <HARD-GATE>RECONCILIATION: do not exit until ZERO opportunities remain unresolved — every opportunity carries an explicit accept/reject/modify verdict. Mirrors the A3 reconciliation gate.</HARD-GATE>

### OUTPUT — optimization_plan
Return a structured object:
```
{
  accepted:      [ {id, axis, proposed_change, suggested_engine}, ... ],
  rejected:      [ {id, reason}, ... ],
  modifications: [ {id, original, modified_change}, ... ],
  success_criteria: <how the optimization will be judged better>
}
```
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
