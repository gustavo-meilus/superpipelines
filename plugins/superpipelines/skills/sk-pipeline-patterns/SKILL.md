---
name: sk-pipeline-patterns
description: Defines the six canonical pipeline topologies (Sequential, Parallel Fan-Out, Iterative Loop, Human-Gated, Spec-Driven, 4D Wrapper) and their capability requirements. Use when an orchestrator is selecting an execution pattern for a new pipeline, matching a task's information flow to a topology, or checking Q7 capability gates before pattern traversal.
disable-model-invocation: true
user-invocable: false
---

# Pipeline Patterns — Selection Reference

> Distills Patterns 1–6 for pipeline topology selection. Load via agent `skills:` frontmatter; not user-invocable.

<glossary>
  <term name="Pattern 3 (Iterative Loop)">A fix/heal cycle bounded by max iterations and an escalation protocol.</term>
  <term name="Pattern 5 (Spec-Driven Development)">A multi-phase workflow where a specification acts as a formal contract for parallel implementation.</term>
  <term name="Pattern 6 (4D Wrapper)">A per-invocation processing framework that runs inside all other patterns.</term>
</glossary>

## Pattern Selection Matrix

<pattern_matrix>
| Pattern | Information Flow | Worktree | Capability Requirements (Q7) | Best Applied To |
| :--- | :--- | :--- | :--- | :--- |
| **1. Sequential** | Linear (A → B → C) | Optional | none | Strictly dependent sequential phases. |
| **2. Parallel** | Fan-Out / Merge | Conditional | `parallel_subagents: true`; `worktrees: true` only for tracked-source writers | Independent analyses or reviews. |
| **3. Iterative** | Loop (Test → Fix) | Conditional | `worktrees: true` only for tracked-source writers | Fix/heal cycles with defined exit criteria. |
| **4. Gated** | Phase → GATE → User | Selective | none | Destructive or irreversible operations. |
| **5. Spec-Driven** | Spec → Plan → Implement | Conditional | `parallel_subagents: true`; `worktrees: true` only for tracked-source writers | Large feature work or complex migrations. |
| **6. 4D Method** | Wrapper (Internal) | N/A | none | Every agent turn within any other pattern. |
</pattern_matrix>

**Q7 capability gating:** A worktree requirement is about tracked-source writer isolation, not topology alone. "Degrades to sequential" hides this — degrading scope is fine; degrading tracked-source isolation is not. Pattern 2, 3, or 5 on a platform with `worktrees: false` is valid for artifact-only data pipelines, but invalid when any step edits tracked source across parallel, iterative, or spec-driven branches. The worktree requirement binds **code-writer** steps only: data-retrieval/generation steps within a worktree pattern still OMIT `isolation` (a no-tracked-change worktree is auto-cleaned, losing gitignored artifacts — issue #31).

## Pattern 3 — Iterative Loop Protocol

<protocol>
### 1. LOOP EXECUTION
- **Cycle**: Tester (identifies failures) → Analyzer (diagnoses RCA) → Fixer (applies fix) → Restart.
- **Iteration Cap**: Maximum 3 iterations by default.

### 2. ESCALATION (HARD-GATE)
<HARD-GATE>
**STOP** immediately and escalate to the user if:
- Iteration count ≥ 3.
- Failure count does not decrease for 2 consecutive cycles.
- A fix reveals a new failure in a different architectural location (regression).
</HARD-GATE>

### 3. EARLY TERMINATION SIGNALS
- "One more fix should do it" (after 2+ failures).
- "The fix is almost working" (indicates lack of convergence).
</protocol>

## Pattern 5 — Spec-Driven Development (SDD)

<sdd_workflow>
1. **Specify**: Generate `spec.md` (WHAT + WHY).
2. **Plan**: Generate `plan.md` (HOW).
3. **Tasks**: Decompose into `tasks.md`.
4. **Gate**: Mandatory human review of spec and tasks.
5. **Implement**: Parallel execution of tasks with two-stage review.
</sdd_workflow>

## Decision Tree

<decision_tree>
**Q7 capability preflight (consult before traversal):**
- IF `workflow_requires_tracked_source_isolation == true` AND `platform_profile.capabilities.worktrees == false`: available patterns = {1, 4, 6}. Skip the Pattern 2 / 3 / 5 branches below and emit advisory: "This workflow requires tracked-source writer isolation, but this platform has worktrees:false. Limited to Patterns 1 and 4."
- IF `platform_profile.capabilities.parallel_subagents == false`: Patterns 2 and 5 are unavailable (their parallel fan-out cannot execute safely). Allow Pattern 3 when either `worktrees: true` OR `workflow_requires_tracked_source_isolation == false`.

Is the task multi-step with dependencies?
- **NO**: Apply 4D Method and execute directly.
- **YES**:
  - Independent/Mergeable tasks? → **Pattern 2** (requires `worktrees + parallel_subagents`).
  - Fix/Heal cycle? → **Pattern 3** (requires `worktrees`).
  - Irreversible action? → **Pattern 4** (Human Gate).
  - Feature work? → **Pattern 5** (SDD; requires `worktrees + parallel_subagents`).
  - Linear dependency? → **Pattern 1**.
</decision_tree>

<invariants>
- Disk-based handoffs (file paths) must be used instead of pasting content between agents.
- Pattern 6 (4D) must execute within every agent turn across all patterns.
- Escalation state must be explicitly written to `pipeline-state.json` on failure.
</invariants>

## Reference Files

- `sk-4d-method/SKILL.md` — Per-invocation wrapper.
- `sk-spec-driven-development/SKILL.md` — SDD implementation details.
- `sk-write-review-isolation/SKILL.md` — Review loop protocol.
- `sk-worktree-safety/SKILL.md` — Parallel isolation rules.
- `references/ai-pipelines-trimmed.md` — Full conventions trimmed for runtime.
