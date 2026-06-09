# Opportunity Taxonomy & Detection Heuristics

> Reference catalogue for the `pipeline-optimizer` agent. Each opportunity class lists its symptom, the discriminator that distinguishes it from a false positive, a false-positive guard, and the `suggested_engine` that would apply it. The optimizer renders opportunities read-only; the orchestrator applies them.

## Table of Contents

1. [Axis 1 — Topology structure](#axis-1--topology-structure)
   - 1.1 [redundant-sequential-merge](#11-redundant-sequential-merge)
   - 1.2 [overloaded-step-split](#12-overloaded-step-split)
   - 1.3 [parallelizable-independent (Pattern 1 → 2)](#13-parallelizable-independent-pattern-1--2)
   - 1.4 [reorder-for-shorter-critical-path](#14-reorder-for-shorter-critical-path)
   - 1.5 [dead-or-unreachable-step](#15-dead-or-unreachable-step)
2. [Axis 2 — Model-tier cost](#axis-2--model-tier-cost)
   - 2.1 [over-provisioned-tier](#21-over-provisioned-tier)
   - 2.2 [under-provisioned-tier](#22-under-provisioned-tier)
   - 2.3 [effort-mismatch](#23-effort-mismatch)
3. [Axis 3 — Past-run signals](#axis-3--past-run-signals)
   - 3.1 [repeated-escalation-step](#31-repeated-escalation-step)
   - 3.2 [loop-cap-hit](#32-loop-cap-hit)
   - 3.3 [failure-hotspot](#33-failure-hotspot)
   - 3.4 [token-or-latency-hotspot](#34-token-or-latency-hotspot)
4. [Axis 4 — Protocol/prompt quality (advisory)](#axis-4--protocolprompt-quality-advisory)
   - 4.1 [vague-description](#41-vague-description)
   - 4.2 [missing-io-contract](#42-missing-io-contract)
   - 4.3 [untyped-output](#43-untyped-output)
5. [Engine routing summary](#engine-routing-summary)

---

## Axis 1 — Topology structure

Source of truth for the graph: the bundle `topology.json` (`steps[]` with `step_id`, `agent`, `depends_on`, `inputs`, `outputs`).

### 1.1 redundant-sequential-merge
- **Symptom:** two adjacent steps run the same `agent` with overlapping I/O and no branch/gate between them.
- **Discriminator:** the second step's `inputs` are fully produced by the first, and nothing else consumes the first's intermediate output.
- **False-positive guard:** keep separate if a human gate, a different `permissionMode`, or a deliberate iteration boundary sits between them.
- **suggested_engine:** `update-step` (collapse into one) + `delete-step` (remove the absorbed step).

### 1.2 overloaded-step-split
- **Symptom:** one step's protocol spans multiple unrelated responsibilities (e.g., "read AND analyze AND render AND validate").
- **Discriminator:** the responsibilities have distinct I/O contracts and could run under different model tiers.
- **False-positive guard:** do NOT split if the sub-tasks share tight state that would cost more to pass between agents than to keep co-located (multi-agent token tax).
- **suggested_engine:** `add-step` (extract the new step) + `update-step` (slim the original).

### 1.3 parallelizable-independent (Pattern 1 → 2)
- **Symptom:** two or more sequential steps have no `depends_on` edge between them and disjoint `inputs`.
- **Discriminator:** neither step consumes the other's `outputs`; both feed a common downstream consumer.
- **False-positive guard:** confirm the platform tier supports fan-out (`platform_profile` dispatch); Tier 2 is single-agent inline — parallelization is advisory only there.
- **suggested_engine:** `update-step` (re-wire `depends_on` to a fan-out join).

### 1.4 reorder-for-shorter-critical-path
- **Symptom:** an independent fast step sits on the critical path behind a slow one it does not depend on.
- **Discriminator:** moving it does not violate any `depends_on` edge.
- **False-positive guard:** reorder only when it measurably shortens the longest dependency chain; cosmetic reorders add churn for no gain.
- **suggested_engine:** `update-step` (adjust ordering / `depends_on`).

### 1.5 dead-or-unreachable-step
- **Symptom:** a step has no inbound edge and is not the entry step, OR its `outputs` are consumed by no downstream step.
- **Discriminator:** confirm against the full graph, not a DELTA view.
- **False-positive guard:** a step may be intentionally terminal (side-effect/report sink) — confirm with the user before flagging removal.
- **suggested_engine:** `delete-step`.

---

## Axis 2 — Model-tier cost

Tiers are named, not numbered: `triage | fast | medium | deep`. Concrete model IDs live in profile JSON — never name them here (`DEPENDENCY_INVERSION`). All cost opportunities route to `change-models` Mode C.

### 2.1 over-provisioned-tier
- **Symptom:** a `deep` (or `medium`) step performs mechanical, deterministic, or pure-formatting work.
- **Discriminator:** the step's protocol involves no planning/architecture/review reasoning.
- **False-positive guard:** keep the higher tier if past-run signals show this step is a failure hotspot (cost is buying reliability).
- **suggested_engine:** `change-models` (down-tier).

### 2.2 under-provisioned-tier
- **Symptom:** a `fast`/`triage` step performs planning, architecture, or review work.
- **Discriminator:** the step's protocol requires multi-constraint reasoning or judgement.
- **False-positive guard:** do not up-tier a step that already meets its success criteria reliably across runs.
- **suggested_engine:** `change-models` (up-tier).

### 2.3 effort-mismatch
- **Symptom:** `effort_tier` is inconsistent with the step's reasoning load (e.g., `high` effort on a triage formatter).
- **Discriminator:** effort and tier point in opposite directions.
- **False-positive guard:** `effort_tier` is a silent no-op on platforms with `effort_field_name == null` — flag advisory only there.
- **suggested_engine:** `change-models` (adjust `effort_tier`).

---

## Axis 3 — Past-run signals

Grounded in `superpipelines/temp/{P}/*/pipeline-state.json` and, when present, `run-telemetry.jsonl`. Absent run history → these opportunities cannot be raised; degrade and label static.

### 3.1 repeated-escalation-step
- **Symptom:** the same `step_id` escalates (Pattern 3) across multiple runs.
- **Discriminator:** escalation recurs at one step, not spread evenly.
- **False-positive guard:** a single escalation is noise; require ≥2 runs.
- **suggested_engine:** `update-step` (tighten protocol/I-O) or `change-models` (up-tier) — depends on the escalation cause.

### 3.2 loop-cap-hit
- **Symptom:** an iterative-pattern step reaches the 3-iteration cap without measurable progress.
- **Discriminator:** state shows iteration count maxed with no success-criteria delta.
- **False-positive guard:** distinguish "hard problem" from "wrong decomposition" — only the latter is a topology opportunity.
- **suggested_engine:** `update-step` / `add-step` (re-decompose) — or advisory if the task is inherently iterative.

### 3.3 failure-hotspot
- **Symptom:** one step disproportionately produces `BLOCKED` / non-terminal state.
- **Discriminator:** failure concentrates at one `step_id` relative to the rest.
- **False-positive guard:** rule out upstream input starvation before blaming the step itself.
- **suggested_engine:** `update-step` or `change-models`.

### 3.4 token-or-latency-hotspot
- **Symptom:** `run-telemetry.jsonl` shows one step dominating `input_tok`/`output_tok`/`duration_ms`/`ctx_size`.
- **Discriminator:** the hotspot is structural (every run), not a one-off large input.
- **False-positive guard:** requires full-telemetry tier; never fabricate the metric when telemetry is absent.
- **suggested_engine:** `change-models` (down-tier) or `update-step` (trim context handed in).

---

## Axis 4 — Protocol/prompt quality (advisory)

ADVISORY ONLY. Every Axis-4 opportunity carries `suggested_engine: advisory-only`; the human decides whether to act.

### 4.1 vague-description
- **Symptom:** a step/agent `description` states a workflow summary or is too vague to trigger reliably.
- **Discriminator:** description lacks concrete triggering conditions (authoring rule).
- **suggested_engine:** `advisory-only`.

### 4.2 missing-io-contract
- **Symptom:** a step declares no explicit `inputs`/`outputs` contract.
- **Discriminator:** downstream steps depend on an undocumented output shape.
- **suggested_engine:** `advisory-only`.

### 4.3 untyped-output
- **Symptom:** an `outputs` entry has no shape/type/path hint.
- **Discriminator:** the consumer must guess the artifact format.
- **suggested_engine:** `advisory-only`.

---

## Engine routing summary

| Axis | Classes | Typical engine |
| :--- | :--- | :--- |
| Topology | merge / split / parallelize / reorder / dead-step | `update-step`, `add-step`, `delete-step` |
| Cost | over/under-provisioned, effort-mismatch | `change-models` (Mode C) |
| Past-run | escalation, loop-cap, failure, token/latency | varies (`update-step` / `change-models`) |
| Quality | vague-desc, missing-io, untyped-output | `advisory-only` |

Isolation-correctness and frontmatter-compliance are NOT in this taxonomy — they belong to `pipeline-auditor` (`DEPENDENCY_INVERSION`).
