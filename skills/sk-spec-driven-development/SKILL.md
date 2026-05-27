---
name: sk-spec-driven-development
description: Establishes a formal spec→plan→tasks→implement contract for multi-step feature work. Use when authoring multi-step pipelines, building new features, refactoring systems, or when a request is too ambiguous for direct execution and a verified specification must precede implementation.
disable-model-invocation: true
user-invocable: false
---

# Spec-Driven Development (SDD) — Workflow Reference

<glossary>
  <term name="spec.md">The canonical contract defining WHAT and WHY, focusing on user journeys and success criteria.</term>
  <term name="plan.md">The technical architecture document defining HOW, including stack, API contracts, and risk mitigations.</term>
  <term name="tasks.md">A decomposition of the plan into small, independent, and verifiable units of work (T-1, T-2, etc.).</term>
</glossary>

## The Four Phases

<protocol>
### 1. SPECIFY (`/specify`)
- **Goal**: Define the outcome without implementation details.
- User journeys, success criteria (AC), non-goals, and constraints are captured.
- **Invariant**: The spec must be readable without code; it must answer "What does done look like?"

### 2. PLAN (`/plan`)
- **Goal**: Design the technical implementation.
- Tech stack, architecture (contracts/schemas), dependency matrix, and risks are defined.
- Ambiguities surfaced in the spec are resolved via `/clarify`.

### 3. TASKS (`/tasks`)
- **Goal**: Decompose the plan into chunks (5–30 min per agent session).
- Each task requires a stable ID, description, file list, and verifiable AC.
- **Validation**: Implementation is blocked if any spec AC lacks a corresponding task.

### 4. IMPLEMENT (`/implement`)
- **Goal**: Execute tasks in parallel where dependencies allow.
- Each task runs through an isolated RPI loop (Research, Plan, Implement).
- `pipeline-state.json` is reconciled upon completion or failure of each task.
</protocol>

<HARD-GATE>
**MANDATORY HUMAN APPROVAL**: Before dispatching parallel implementation, `spec.md` and `tasks.md` are presented to the user. Execution waits for explicit `APPROVE`. A misunderstood spec at this stage will cause all parallel workers to fail simultaneously.
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
- Strict write/review isolation is maintained during the implementation phase.
</invariants>

## Reference Files

- `sk-4d-method/SKILL.md` — Per-invocation wrapper.
- `sk-pipeline-patterns/SKILL.md` — Pattern 5 definition.
- `sk-write-review-isolation/SKILL.md` — Implementation review loop.
- `sk-pipeline-state/SKILL.md` — State reconciliation rules.
