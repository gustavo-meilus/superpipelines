---
name: sk-spec-driven-development
description: Use when authoring multi-step pipelines or features that need a spec contract before execution — the spec→plan→tasks→implement workflow aligned with GitHub Spec Kit. Reference-only; preload via agent skills frontmatter.
disable-model-invocation: true
user-invocable: false
---

# Spec-Driven Development (SDD) — Workflow Reference

> Establishes a formal spec→plan→tasks→implement contract for multi-step feature work and pipeline authoring. Trigger when building new features, refactoring systems, or whenever a request is too ambiguous for direct execution.

<overview>
Spec-Driven Development (SDD) minimizes hallucinations and misaligned outputs by front-loading requirements analysis. It ensures that every task is rooted in a verified specification and that parallel execution is protected by a mandatory human gate and precise acceptance criteria.
</overview>

<glossary>
  <term name="spec.md">The canonical contract defining WHAT and WHY, focusing on user journeys and success criteria.</term>
  <term name="plan.md">The technical architecture document defining HOW, including stack, API contracts, and risk mitigations.</term>
  <term name="tasks.md">A decomposition of the plan into small, independent, and verifiable units of work (T-1, T-2, etc.).</term>
</glossary>

## The Four Phases

<protocol>
### 1. SPECIFY (`/specify`)
- **Goal**: Define the outcome without implementation details.
- Capture user journeys, success criteria (AC), non-goals, and constraints.
- **Invariant**: The spec must be readable without code; it must answer "What does done look like?"

### 2. PLAN (`/plan`)
- **Goal**: Design the technical implementation.
- Define the tech stack, architecture (contracts/schemas), dependency matrix, and risks.
- Resolve ambiguities surfaced in the spec via `/clarify`.

### 3. TASKS (`/tasks`)
- **Goal**: Decompose the plan into chunks (5–30 min per agent session).
- Each task requires a stable ID, description, file list, and verifiable AC.
- **Validation**: BLOCK implementation if any spec AC lacks a corresponding task.

### 4. IMPLEMENT (`/implement`)
- **Goal**: Execute tasks in parallel where dependencies allow.
- Each task runs through an isolated RPI loop (Research, Plan, Implement).
- Reconcile `pipeline-state.json` upon completion or failure of each task.
</protocol>

<HARD-GATE>
**MANDATORY HUMAN APPROVAL**: Before dispatching parallel implementation, present `spec.md` and `tasks.md` to the user. Wait for explicit `APPROVE`. A misunderstood spec at this stage will cause all parallel workers to fail simultaneously.
</HARD-GATE>

## Artifact Skeletons

<artifacts>
### `spec.md`
- **Context**: Motivation for the change.
- **User Journeys**: Scenarios and expected outcomes.
- **Success Criteria**: Numbered list of verifiable ACs.
- **Non-Goals**: Explicit out-of-scope items.

### `plan.md`
- **Architecture**: Layer diagrams and data flow.
- **API Contracts**: Schemas and signatures.
- **Dependency Matrix**: Upstream/downstream component mapping.

### `tasks.md`
- **ID**: `T-1`, `T-2`, etc.
- **Acceptance**: A concrete command or check that returns pass/fail.
- **Depends On**: Upstream task IDs.
</artifacts>

## Pattern Mapping

<mapping_table>
| SDD Command | Pattern 5 Phase | Outcome |
| :--- | :--- | :--- |
| `/specify` | Phase 1 | `spec.md` |
| `/plan` | Phase 2 | `plan.md` |
| `/tasks` | Phase 3 | `tasks.md` |
| `/analyze` | Phase 4 | Pre-gate validation |
| **Approval** | Phase 4b | Human authorization |
| `/implement` | Phase 5 | Parallel execution |
</mapping_table>

<invariants>
- Every acceptance criterion in `spec.md` MUST be mapped to at least one task in `tasks.md`.
- Tasks must be small enough for a single agent session (avoiding context bloat).
- Maintain strict write/review isolation during the implementation phase.
</invariants>

## Reference Files

- `sk-4d-method/SKILL.md` — Per-invocation wrapper.
- `sk-pipeline-patterns/SKILL.md` — Pattern 5 definition.
- `sk-write-review-isolation/SKILL.md` — Implementation review loop.
- `sk-pipeline-state/SKILL.md` — State reconciliation rules.
