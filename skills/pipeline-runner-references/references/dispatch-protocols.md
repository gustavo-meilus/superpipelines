# Dispatch Protocols — Pipeline-Runner Reference

How `running-a-pipeline` dispatches workers and reviewers per pattern. Maps the canonical patterns from `sk-pipeline-patterns` to concrete `Task` calls.

## Table of contents

1. Common dispatch shape (Claude Code)
2. Pattern 1 — Sequential
3. Pattern 2 / 2b — Parallel Fan-Out
4. Pattern 3 — Iterative Loop
5. Pattern 4 — Human-Gated
6. Pattern 5 — Spec-Driven Development
7. Tier 2 — Single-Agent Inline Dispatch
8. Status protocol handling

---

## Common dispatch shape (Claude Code)

```
Task(
  subagent_type="pipeline-task-executor",
  description="Implement T-1: {short_name}",
  prompt="""
    Inputs:
      - task_text: <extracted from tasks.md>
      - spec_path: {ROOT}/superpipelines/pipelines/{P}/spec.md
      - plan_path: {ROOT}/superpipelines/pipelines/{P}/plan.md
      - project_context: <relevant files / commands>

    Output: emit one of DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED with the agent's output schema.
  """
)
```

## Pattern 1 — Sequential

```
state.current_phase = 0
for phase in [Agent_A, Agent_B, Agent_C]:
  result = Task(phase, prompt with prior phase's output paths)
  if result.status != "DONE": handle per status protocol
  state.update(phase done, outputs=result.outputs)
```

## Pattern 2 / 2b — Parallel Fan-Out

Dispatch all branch workers in a SINGLE message block (true parallelism).

```
# Single message:
Task(Agent_A, ...)
Task(Agent_B, ...)
Task(Agent_C, ...)
# Wait for all results.
results = await all
if any(r.status != "DONE"): handle per status protocol per branch
Task(Merger, prompt with [out_a_path, out_b_path, out_c_path])
```

## Pattern 3 — Iterative Loop

```
for iteration in 1..MAX_ITERATIONS (3):
  test_result = Task(Tester, ...)
  if test_result.status == "DONE" and tests passed: break
  diagnosis = Task(Analyzer, prompt with test_result.outputs)
  if diagnosis says architectural: HARD-GATE escalate
  fix = Task(Fixer, prompt with diagnosis.outputs)
  if fix.status != "DONE": handle per status protocol
  if iteration >= 2 and failure_count_not_decreasing: HARD-GATE escalate
else:
  state.status = "escalated"
  surface to user
```

## Pattern 4 — Human-Gated

```
result = Task(Agent_A, ...)
write outputs
gate_response = AskUserQuestion("Phase 1 complete. APPROVE / REJECT / REVISE?")
match gate_response:
  APPROVE → continue
  REJECT  → state.status = "failed", surface to user
  REVISE  → Task(Agent_A, prompt = "REVISION: {feedback} + read {original_files}")
```

## Pattern 5 — Spec-Driven Development

```
# Phase 1-3
Task(pipeline-architect, ...) → spec.md, plan.md, tasks.md

# Phase 4 — preflight validation
analyze tasks.md: every AC covered? no orphans? no cycles?
if validation fails: BLOCK; ask architect to revise

# Phase 4b — HARD-GATE human approval
gate = AskUserQuestion("Spec and tasks written. Review before parallel implement. APPROVE / REVISE?")
if REVISE: route per 4D feedback table → re-spec or re-plan

# Phase 5 — parallel implement (per task)
for each task in tasks.md (respecting dependencies):
  worktree = create worktree per sk-worktree-safety
  exec_result = Task(pipeline-task-executor, prompt with extracted task text + worktree path)
  if exec_result.status != "DONE": handle per status protocol
  
  # Stage 1
  spec_result = Task(pipeline-spec-reviewer, prompt with spec.md path + exec_result.outputs)
  if spec_result.verdict == "FAIL":
    Task(pipeline-task-executor, prompt = "FIX: {spec_result.under_build + over_build}")
    re-Stage-1
  
  # Stage 2 (only if Stage 1 PASSed)
  qual_result = Task(pipeline-quality-reviewer, prompt with spec_result.verdict + exec_result.outputs)
  if qual_result.verdict == "FAIL" with critical/major:
    Task(pipeline-task-executor, prompt = "FIX: {qual_result.issues}")
    re-Stage-1 (full re-review, not just Stage 2)
  
  # Commit
  commit changes; merge to integration branch

# Phase 6 — reconcile
update pipeline state (via sk-pipeline-state) with all task outcomes
# Temp dirs are deleted on DONE; preserved on escalation/failure
```

## Tier 2 — Single-Agent Inline Dispatch

On Tier 2 (Cursor, Windsurf, Cline), the orchestrator has no `Task()` primitive. Every step is executed inline by the orchestrator's own session using `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep`. Pattern-specific behavior:

```
# Pattern 1 (Sequential):
for step in topology.steps_in_order():
  Skill(step.protocol_skill)
  execute inline → write step.output_paths
  update pipeline-state.json (atomic)
  branch on status per status protocol

# Pattern 2 / 2b (Parallel Fan-Out → degrades to Sequential):
for branch in topology.branches:    # processed serially, not in a single message
  Skill(branch.protocol_skill)
  execute inline → write branch.output_paths
Skill(merger.protocol_skill)
execute inline → write merger.output_paths

# Pattern 3 (Iterative Loop):
for iteration in 1..MAX_ITERATIONS (3):
  Skill(tester.protocol_skill); execute inline
  if tests passed: break
  Skill(analyzer.protocol_skill); execute inline
  if architectural: escalate
  Skill(fixer.protocol_skill); execute inline
  if iteration >= 2 and failure_count_not_decreasing: escalate

# Pattern 4 (Human-Gated):
Skill(agent.protocol_skill); execute inline
AskUserQuestion("APPROVE / REJECT / REVISE?")
match → continue / fail / re-execute inline with revision feedback

# Pattern 5 (SDD):
Phases 1-4 (architect, validate, gate) executed inline.
Phase 5 per task:
  Skill(executor.protocol_skill); execute inline
  Skill(spec-reviewer.protocol_skill); execute inline      ← convention-only isolation
  if FAIL: re-execute executor with fix prompt
  Skill(quality-reviewer.protocol_skill); execute inline   ← convention-only isolation
  commit
```

**Critical Tier 2 caveats:**
- **No worktree isolation.** Orchestrator works in the user's active workspace. Verify clean state before destructive steps; commit between steps to enable rollback.
- **Reviewer isolation is convention-only.** The orchestrator runs both writer and reviewer protocols with full tools. Surface this degradation in every user-facing report. Treat reviews as advisory.
- **No true parallelism.** Pattern 2/2b degrade to sequential. Inform the user when degrading.
- **Bounded retry on NEEDS_CONTEXT.** Max 2 retries per step before escalating.

## Status protocol handling

| Worker status | Orchestrator action |
|---------------|---------------------|
| `DONE` | Proceed to next phase. |
| `DONE_WITH_CONCERNS` | Read concerns. If correctness/scope: address before review. If observational: proceed. |
| `NEEDS_CONTEXT` | Identify missing context; re-dispatch with same model + added context. |
| `BLOCKED` | (1) provide more context; (2) higher effort/model; (3) decompose; (4) escalate. NEVER retry same approach. |

NEVER ignore a non-`DONE` status. NEVER force a re-dispatch without addressing the root cause.
