---
name: sk-spec-driven-development
description: Use when authoring multi-step pipelines or features that need a spec contract before execution — the spec→plan→tasks→implement workflow aligned with GitHub Spec Kit. Reference-only; preload via agent skills frontmatter.
disable-model-invocation: true
user-invocable: false
---

# Spec-Driven Development (SDD) — Reference

Reference template for the SDD workflow used by `creating-a-pipeline` and `pipeline-architect`. Maps directly to Pattern 5 in `sk-pipeline-patterns`.

Trigger SDD when: building a new feature, refactoring a system, authoring a multi-step pipeline, or when the request is ambiguous and needs a contract before execution.

When NOT to use: typo fixes, config flag flips, renames, exploratory research where the spec IS the deliverable, interactive pair-programming where each step is negotiated live. For those, use Pattern 1 / 3 or plain RPI.

---

## The Four Phases

### Phase 1 — SPECIFY (`/specify`)

Generate `spec.md` capturing WHAT and WHY. No implementation details.

- User journeys / user stories
- Success criteria / acceptance criteria
- Non-goals
- Constraints (regulatory, performance, compatibility, timeline)
- Open questions (defer to `/clarify`)

**Gate:** `spec.md` must be readable without looking at code. If a reader can't answer "what does done look like?" the spec is incomplete.

### Phase 1.5 — CLARIFY (`/clarify`, optional)

Resolve ambiguities surfaced in `spec.md`. Ask targeted questions; do NOT move forward with hidden assumptions.

### Phase 2 — PLAN (`/plan`)

Generate `plan.md` — the HOW.

- Tech stack, libraries, versions
- Architecture (layer diagram, data flow, contracts)
- API contracts (schemas, signatures, I/O)
- Dependency matrix
- Risks + mitigations
- Rollout strategy
- Explicit design decisions (not "we'll figure it out")

### Phase 3 — TASKS (`/tasks`)

Generate `tasks.md` — break `plan.md` into small, reviewable chunks.

Each task MUST have:

- `id` — stable identifier (T-1, T-2, …)
- `description` — one sentence
- `files` — list of files touched
- `acceptance_criteria` — verifiable outcomes (a command that returns pass/fail)
- `dependencies` — upstream task IDs
- `granularity` — 1 Agent Session / Task (5–30 min of work)

### Phase 3.5 — ANALYZE / CHECKLIST (`/analyze`, `/checklist`, optional)

Validate `tasks.md` for:

- All spec acceptance criteria covered by tasks
- No orphan tasks
- Dependency graph has no cycles
- Each task has acceptance criteria

**BLOCK `/implement` if any acceptance criterion lacks a task.**

### Phase 4 — HUMAN APPROVAL GATE

<HARD-GATE>
Before dispatching parallel implementation, present `spec.md` and `tasks.md` to the user with:

"Spec and tasks written. Review before I begin parallel implementation. [APPROVE | REVISE]"

Wait for APPROVE. If REVISE, return to Phase 1 or 2 based on the feedback type.

Rationale: Phase 5 dispatches N parallel agents. A misunderstood spec means N agents produce wrong output simultaneously. Gate cost: ~1 minute. Ungated mistake cost: discard all parallel work and restart from spec.
</HARD-GATE>

### Phase 5 — IMPLEMENT (`/implement`)

Execute tasks in parallel where dependencies allow, each through its own RPI loop:

- **Research**: fill context with discovery (Read, Glob, Grep, search).
- **Plan**: compress findings into the task's mini-spec.
- **Implement**: fresh context window, only the plan artifacts loaded.

Each task: write → verify (typecheck, lint, tests) → report pass/fail → reconcile `pipeline-state.json`.

### Phase 6 — RECONCILE

Update `pipeline-state.json` with completion status per task. Re-run `/analyze` if tasks drifted.

---

## Artifact Templates

### `spec.md` skeleton

```markdown
# Feature: {name}

## Context & motivation
{why now, what prompted this}

## User journeys
{scenario → outcome}

## Success criteria (AC)
- [ ] AC-1: {verifiable outcome}
- [ ] AC-2: …

## Non-goals
{out-of-scope}

## Constraints
{regulatory, perf, compat, timeline}

## Open questions
{for /clarify}
```

### `plan.md` skeleton

```markdown
# Plan: {feature name}

## Tech stack
{libs, versions, runtimes}

## Architecture
{layer diagram, sequence diagram, data flow}

## API contracts
{schemas, signatures, I/O}

## Dependency matrix
| Component | Depends on | Owned by |

## Risks & mitigations
{risk → mitigation}

## Rollout plan
{staged, flags, canary}
```

### `tasks.md` skeleton

```markdown
# Tasks

## T-1: {short name}
- Description: {one sentence}
- Files: {list}
- Acceptance: {verifiable command}
- Depends on: {T-0 or none}

## T-2: …
```

---

## Pattern 5 mapping

| Spec Kit command | Pattern 5 phase |
|------------------|-----------------|
| `/specify` | Phase 1 |
| `/clarify` + `/plan` | Phase 2 |
| `/tasks` | Phase 3 |
| `/analyze` + `/checklist` | Phase 4 (preflight) |
| (human gate) | Phase 4b |
| `/implement` | Phase 5 |
| (automatic) | Phase 6 |

## Cross-references

- `sk-4d-method` — every SDD phase runs through the 4D wrapper.
- `sk-pipeline-state` — `pipeline-state.json` schema.
- `sk-write-review-isolation` — how Stage 1/2 review applies inside `/implement`.
- `sk-pipeline-patterns` `references/ai-pipelines-trimmed.md` — Pattern 5 full conventions.
- GitHub Spec Kit — https://github.com/github/spec-kit
