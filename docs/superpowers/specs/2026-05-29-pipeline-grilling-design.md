# Pipeline-Creation Grilling Protocol — Design

> Status: approved (2026-05-29) · Target: superpipelines v2.0.x
> Adapts the grilling protocol from `aiboarding/create-aiboarding` (itself an
> adaptation of Matt Pocock's `grill-me`) into pipeline creation, to harden a
> brief and fill knowledge gaps before the architect designs the topology.

## 1. Problem

`creating-a-pipeline` Phase 2 (Brief Refinement / 4D) is **slot-filling**, not
grilling. The 4D Deconstruct/Diagnose passes run *internally* and only stop to
ask the user when ≥3 critical slots are empty. There is no adversarial,
contradiction-hunting interrogation of the user before the architect designs the
topology. Weak briefs therefore reach the architect, where misunderstandings are
expensive to unwind.

## 2. What grilling is (reference: create-aiboarding)

The distinctive value is not "ask more questions." It is:

1. **Two tracks, deliberately sequenced.** Track A is a *silent automated crawl*
   whose findings are **held, not revealed**. Track B is the live grilling. A
   single agent cannot truly parallelize, so it crawls first, holds, then grills.
2. **Grilling discipline** (Track B): one question at a time, never batched;
   walk a conceptual tree per micro-topic; **challenge vague answers** and push
   for a targeted brain-dump rather than accepting hand-waving.
3. **Steering toward danger:** drive questions toward constraints and failure
   modes a future agent must not trip over, with an explicit completeness bar.
4. **Reconciliation HARD GATE:** cross-examine the *held crawl findings* against
   the *user's answers* and grill **only on the discrepancies**. This is the
   actual gap-filler.

## 3. Decisions (locked)

| Dimension | Decision |
|---|---|
| Grill target | **Both, in sequence** — harden the brief first, then a lighter pass confirming architectural understanding. |
| Mechanism | **Full**: crawl + grill + reconcile. |
| Packaging | **New dedicated skill** `sk-pipeline-grilling`. |
| Exit bar | **Pipeline-level essentials + an explicit pipeline-level I/O contract.** Per-step contracts left to the architect. |
| Gate rigor | **Mandatory, self-scaling.** No skip flag; a complete brief yields a short session. |
| Pipeline type | **Two types, user-confirmed:** *project-embedded* (operates on this repo's code/artifacts) vs *self-contained/generative* (e.g. an article builder). The codebase crawl is **conditional** on this; the registry + capability scans always run. |

## 4. Skill shape & conventions

- **Path:** `skills/sk-pipeline-grilling/SKILL.md`
- **Frontmatter:** `disable-model-invocation: true`, `user-invocable: false` —
  orchestrator-loaded only, exactly like `sk-4d-method` / `sk-pipeline-patterns`.
- **Constraints:** third-person impersonal voice; body ≤500 lines; description
  ≤1536 chars, triggering-conditions only.
- **Two modes** via an input parameter: `MODE=brief` (Pass A) and
  `MODE=architectural` (Pass B).

## 5. Pass A — Brief Hardening (core)

### A0 · Context Determination (pipeline type)
Before any crawl, determine whether the pipeline is **project-embedded** (it
operates on this repository's code/artifacts — e.g. "white-box exploratory tests
for the API endpoints") or **self-contained / generative** (it does not consume
the repo — e.g. "an article builder"). The skill may infer a suggested default
from the raw brief (keywords like "endpoints", "this codebase", "the API" lean
project-embedded; "build/create an X generator" leans self-contained) but
**MUST prompt the user to confirm** the type. The result drives A1's crawl scope
and is recorded for the architect (see §7).

### A1 · Silent Crawl (Track A) — partly conditional
Using already-available inputs (`platform_profile` from Phase 0, scope/name from
Phase 1, the raw brief), silently scan and **hold** findings — never revealed
until A3:
- **Always (context-independent):** existing pipelines via `sk-pipeline-paths`
  enumeration (overlap / reuse / name-collision) and `platform_profile`
  capabilities (which patterns / isolation / parallelism are possible).
- **Only when project-embedded:** the target workspace the pipeline will operate
  on (manifests, dir structure, key docs — **bounded**, not a full read).

For a self-contained pipeline the codebase crawl is skipped entirely; the
always-on scans still run.

### A2 · Grill (Track B)
One question at a time, never batched. Challenge vague answers; push for a
targeted brain-dump per micro-topic. Conceptual tree:
goal → success criteria → **pipeline I/O contract** → rough step decomposition →
failure modes.

### A3 · Reconciliation HARD GATE
Confront held crawl findings against the user's answers; grill **only on
discrepancies**. Scope of the confrontation depends on what was crawled:
- **Project-embedded:** includes codebase contradictions (e.g. "you said the
  pipeline reads test results, but the repo has no test runner — where do
  results come from?") plus registry/capability ones.
- **Self-contained:** registry/capability contradictions only (e.g. "a pipeline
  named X already exists in user scope doing Y — how does this differ?"). No
  "the repo lacks X" challenges.

### Exit bar — gate opens only when ALL true
- measurable goal
- explicit success criteria
- pipeline-level I/O contract
- rough step decomposition
- ≥1 pipeline-level failure mode
- zero unresolved crawl discrepancies *(scoped to whatever crawl ran)*

**Output:** a structured *hardened brief* returned to the orchestrator, including
the pipeline type and the captured failure modes.

## 6. Pass B — Architectural Confirmation (lighter)

Invoked after the pattern is chosen. No new crawl (uses `platform_profile` +
selected pattern). A short *confirmation* grill — challenge only when the user's
expectation contradicts what the pattern/tier actually delivers:
- selected pattern's tradeoffs (e.g. iterative cap-3, parallel needs worktrees)
- isolation reality on this tier (structural vs. convention-only — surfaces
  `platform_profile.degradation_warnings`)
- model-tier implications

Gate: user acknowledges the key tradeoff(s).

## 7. Integration into `creating-a-pipeline`

- **Phase 2:** opens by invoking `sk-pipeline-grilling` `MODE=brief` via the
  Skill tool. The existing 4D / model-preference / output-format steps then
  consume the hardened brief. The current "≥3 critical slots missing" hard-gate
  is subsumed by the stronger grilling exit bar.
- **Phase 3:** after pattern selection, invoke `MODE=architectural`.
- **Phase 4 hand-off:** captured failure modes flow into the architect's prompt
  so they inform build-time guardrails (ties into 4D Diagnose's "top 2–3 failure
  modes"). Stamp `topology.json metadata.grilling = { completed: true,
  pipeline_type: "project_embedded" | "self_contained",
  captured_failure_modes: [...] }`. The architect uses `pipeline_type` to decide
  whether generated steps may assume repo access.
- **Discoverability:** add `sk-pipeline-grilling` to `creating-a-pipeline`'s
  Reference Files and the `using-superpipelines` reference list.

## 8. Discipline invariants (what makes it grilling, not Q&A)

- Crawl findings are **held silently** until A2 — no leaking before reconciliation.
- **One question at a time**, always.
- Vague answers are **challenged**, not accepted.
- The reconciliation gate is a **HARD GATE** — zero unresolved discrepancies.
- Mandatory, **self-scaling**: a complete brief yields a short A1 and an empty A2.

## 9. Edge handling

- **Bounded crawl** on large repos (manifests + structure + targeted greps),
  per create-aiboarding — never read everything.
- **Profile-driven**: reconciliation references `platform_profile.<field>`
  abstractly, never hardcoded platform names/values (respects
  `DEPENDENCY_INVERSION: PROFILE_DRIVEN`).

## 10. Out of scope (YAGNI)

No references / question-bank dir, no escape flag, no automated parity test.

## 11. Affected files

- **New:** `skills/sk-pipeline-grilling/SKILL.md`
- **Edit:** `skills/creating-a-pipeline/SKILL.md` (Phase 2, Phase 3, Phase 4
  hand-off, Reference Files)
- **Edit:** `skills/using-superpipelines/SKILL.md` (reference list)
- **No change** to `CLAUDE.md` / `AGENTS.md`: the grilling gate is an
  enhancement to one skill's workflow, not a new architecture invariant, so the
  canonical invariant set stays untouched.
