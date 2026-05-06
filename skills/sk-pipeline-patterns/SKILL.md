---
name: sk-pipeline-patterns
description: Use when selecting an execution pattern for a pipeline (Sequential, Parallel Fan-Out, Iterative Loop, Human-Gated, Spec-Driven) or matching a task's information flow to a topology — distillation of Patterns 1–6. Reference-only; preload via agent skills frontmatter.
disable-model-invocation: true
user-invocable: false
---

# Pipeline Patterns — Selection Reference

Distillation of Patterns 1–6 for pipeline topology selection. Use this skill to pick a topology before authoring a pipeline.

For full conventions (write/review isolation, status protocol, worktree safety, strict conventions), see `references/ai-pipelines-trimmed.md` in this skill.

---

## Pattern selection matrix

| Pattern | Information flow | Worktree | Use when |
|---------|------------------|----------|----------|
| **1. Sequential** | A → file_a → B → file_b → C | OPT-IN (default OFF) | Each phase strictly depends on the prior. Linear data transforms. |
| **2. Parallel Fan-Out / Merge** | [A, B, C] parallel → D merges | REQUIRED per branch | Independent analyses or reviews on the same input; results converge. |
| **2b. Parallel with QA** | [QA(prev), Worker_A, Worker_B] parallel; QA purifies each output | REQUIRED per branch | Concurrent QA validation alongside production workers. |
| **3. Iterative Loop** | Loop(N): Tester → Analyzer → Fixer → restart | REQUIRED for loop scope | Fix/heal cycles. Always bound with max iterations + escalation protocol. |
| **4. Human-Gated** | Phase 1 → GATE(user) → [APPROVE / REVISE] | NEVER (read-only analysis) or REQUIRED (modification) | Destructive or irreversible actions. Gate between analysis and modification. |
| **5. Spec-Driven Development** | spec → plan → tasks → GATE → parallel implement | REQUIRED per task | Multi-step feature work. Spec is the contract. Aligned with GitHub Spec Kit. |
| **6. 4D Wrapper** | Per-invocation: Deconstruct → Diagnose → Develop → Deliver | n/a | Runs INSIDE Patterns 1–5 on every agent turn. Never replaces them. |

---

## Pattern 1 — Sequential

```
Agent_A → writes(file_a) → Agent_B(reads file_a) → writes(file_b) → Agent_C(reads file_b)
```

Disk-based handoffs (file paths, not pasted content). Each agent receives only the files it needs.

---

## Pattern 2 — Parallel Fan-Out / Merge

```
Phase 1: [Agent_A, Agent_B, Agent_C] PARALLEL → writes([file_a, file_b, file_c])
Phase 2: Agent_D(reads [file_a, file_b, file_c]) → writes(merged_file)
```

All Phase-1 agents dispatched in a single message block. Phase 2 starts only after all complete. Merge agent receives file paths, not content.

### 2b — Parallel with QA

```
Phase 1: [QA_Agent(validates Phase_0_output), Worker_A, Worker_B] PARALLEL
Phase N: [QA_Agent(purifies Output_A), QA_Agent(purifies Output_B)] PARALLEL
```

---

## Pattern 3 — Iterative Loop

```
Loop(MAX_ITERATIONS: N):
  Tester(tests) → Analyzer(diagnoses) → Fixer(applies) → RESTART
```

### Escalation protocol

<HARD-GATE>
After 3 failed iterations without measurable progress: STOP. Do NOT attempt iteration 4.
</HARD-GATE>

- **Signal for early stop:** Each fix reveals a new failure in a different location (not the same failure improving). This is architectural, not fixable. Applying more fixes will corrupt the codebase further.
- **Action on early stop:** Escalate to human or invoke Pattern 4. Write current state to `pipeline-state.json`.
- **Progress detection:** Compare test failure count between iterations. If failures don't decrease for 2 consecutive iterations, treat as architectural signal.
- **On MAX_ITERATIONS reached:** Write `{ "status": "escalated", "iterations": N, "last_failure": "...", "attempted_fixes": [...] }`. Do NOT silently exit.

### Red Flags — STOP iterating

- "One more fix should do it" (after 2+ failures).
- "The fix is almost working."
- Each new fix reveals a failure in a new location.

All three mean: stop, question the architecture, escalate before another fix.

---

## Pattern 4 — Human-Gated

```
Phase 1: Agent_A → writes(output)
Phase 2: GATE(AskUserQuestion) → wait for [APPROVE | REJECT | REVISE]
Phase 3: IF REVISE → re-invoke Agent_A(prompt: "REVISION: {feedback} + read {original_files}")
```

Gates are mandatory before destructive or irreversible operations.

---

## Pattern 5 — Spec-Driven Development

Aligned with GitHub Spec Kit. See `sk-spec-driven-development` for the full workflow.

```
Phase 1: /specify  → spec.md (WHAT + WHY)
Phase 2: /clarify (optional) + /plan → plan.md (HOW)
Phase 3: /tasks    → tasks.md
Phase 4: /analyze + /checklist (BLOCK if missing AC)
Phase 4b: HARD-GATE — human review of spec.md + tasks.md
Phase 5: /implement → [RPI_Loop(Task_1), RPI_Loop(Task_2), ...] PARALLEL
Phase 6: Reconcile pipeline-state.json
```

---

## Pattern 6 — 4D Processing Wrapper

Per-invocation processing. Runs INSIDE Patterns 1–5 on every agent turn. See `sk-4d-method` for the full workflow.

```
Deconstruct → extract intent, entities, missing slots; restate task; GATE if ≥3 critical slots missing.
Diagnose → replace vague terms; resolve constraint conflicts; anticipate failure modes.
Develop → match task type to strategy; assign role; define output format; layer constraints.
Deliver → lead with conclusion; match user context; emit actionable next step; self-review.
```

---

## Decision tree — which pattern?

```
Is the task multi-step with dependencies between phases?
├── No → trivial, no pattern; apply 4D and execute directly.
└── Yes
    ├── Are sub-tasks independent and mergeable? → Pattern 2 / 2b
    ├── Is it a fix/heal cycle (test → analyze → fix)? → Pattern 3
    ├── Is there a destructive or irreversible action? → Pattern 4 (gate it)
    ├── Is it a feature requiring spec/plan/tasks? → Pattern 5
    └── Strictly linear, each phase depends on prior? → Pattern 1
```

Pattern 6 always runs on top.

## Cross-references

- `references/ai-pipelines-trimmed.md` — full conventions trimmed for runtime.
- `sk-4d-method`, `sk-spec-driven-development`, `sk-write-review-isolation`, `sk-pipeline-state`, `sk-worktree-safety`.
