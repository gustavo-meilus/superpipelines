---
name: sk-pipeline-patterns
description: Use when selecting an execution pattern for a pipeline (Sequential, Parallel Fan-Out, Iterative Loop, Human-Gated, Spec-Driven) or matching a task's information flow to a topology — distillation of Patterns 1–6. Reference-only; preload via agent skills frontmatter.
disable-model-invocation: true
user-invocable: false
---

# Pipeline Patterns — Selection Reference

> Distills Patterns 1–6 for pipeline topology selection. Trigger when designing the execution flow of a multi-agent system or matching a task's information flow to a canonical architecture.

<overview>
Pipeline Patterns provide standardized architectures for diverse agentic workloads. By selecting the appropriate pattern (Sequential, Parallel, Iterative, Gated, or Spec-Driven), orchestrators ensure deterministic handoffs, manageable context windows, and robust failure recovery.
</overview>

<glossary>
  <term name="Pattern 3 (Iterative Loop)">A fix/heal cycle bounded by max iterations and an escalation protocol.</term>
  <term name="Pattern 5 (Spec-Driven Development)">A multi-phase workflow where a specification acts as a formal contract for parallel implementation.</term>
  <term name="Pattern 6 (4D Wrapper)">A per-invocation processing framework that runs inside all other patterns.</term>
</glossary>

## Pattern Selection Matrix

<pattern_matrix>
| Pattern | Information Flow | Worktree | Best Applied To |
| :--- | :--- | :--- | :--- |
| **1. Sequential** | Linear (A → B → C) | Optional | Strictly dependent sequential phases. |
| **2. Parallel** | Fan-Out / Merge | **Required** | Independent analyses or reviews. |
| **3. Iterative** | Loop (Test → Fix) | **Required** | Fix/heal cycles with defined exit criteria. |
| **4. Gated** | Phase → GATE → User | Selective | Destructive or irreversible operations. |
| **5. Spec-Driven** | Spec → Plan → Implement | **Required** | Large feature work or complex migrations. |
| **6. 4D Method** | Wrapper (Internal) | N/A | Every agent turn within any other pattern. |
</pattern_matrix>

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
Is the task multi-step with dependencies?
- **NO**: Apply 4D Method and execute directly.
- **YES**:
  - Independent/Mergeable tasks? → **Pattern 2**.
  - Fix/Heal cycle? → **Pattern 3**.
  - Irreversible action? → **Pattern 4** (Human Gate).
  - Feature work? → **Pattern 5** (SDD).
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
