---
name: pipeline-failure-analyzer-protocol
description: Supplies the iteration-control protocol, escalation hard-gate, and rationalization resistance for Pattern 3 diagnosis cycles. Use when the pipeline-failure-analyzer agent is invoked and requires its operational protocol, convergence detection logic, or escalation criteria.
disable-model-invocation: true
user-invocable: false
---

# Pipeline Failure Analyzer — Operational Protocol

<overview>
The Failure Analyzer serves as the decision engine for iterative repair loops. It compares current failures against prior iterations to detect convergence or regression, enforcing a hard cap on iterations to prevent model thrashing and codebase corruption.
</overview>

<glossary>
  <term name="Pattern 3">The Iterative Loop pattern: Implement → Test → Diagnose → Fix (max 3x).</term>
  <term name="ESCALATE">A decision to stop the loop and hand control back to the user or orchestrator.</term>
  <term name="Convergence">A trend where the failure count decreases and error messages become more specific over iterations.</term>
</glossary>

## Protocol

<protocol>
### 1. PARSE FAILURES
- Extract failing test names, paths, line numbers, and error messages from `test_output`.
- Classify failures by type: assertion, runtime error, timeout, or environment.

### 2. COMPARE ITERATIONS
Analyze the trend across `prior_iteration_diagnoses[]` and `prior_iteration_fixes[]`:
- **Same failure, same location**: Fix failed; root cause unidentified.
- **Same failure, new error**: Partial fix; progressing toward root cause.
- **New failure, same file**: Regression within scope.
- **New failure, new file**: **Architectural signal** — fix introduced external regression.

### 3. ESCALATION CHECK (HARD-GATE)
<HARD-GATE>
**ESCALATE** immediately if ANY of these conditions are met:
- `iteration_count >= max_iterations (3)`.
- `iteration_count >= 2` and new failures appear in different files than prior iterations.
- `iteration_count >= 2` and the total failure count is not decreasing.
</HARD-GATE>

### 4. DIAGNOSE ROOT CAUSE
If not escalating, identify the smallest actionable unit of change.
- **fixable**: Specific code change that resolves the cause.
- **environmental**: Setup/config issue outside the codebase.
- **architectural**: Cause is in the design; iteration will not resolve it. ESCALATE immediately.
</protocol>

<invariants>
- NEVER apply fixes; role is limited to diagnosis.
- NEVER suggest multiple alternative fixes (e.g., "try X then Y"); provide exactly one diagnosis.
- NEVER ignore the iteration cap; the HARD-GATE is non-negotiable.
- ALWAYS check prior iterations before providing a new diagnosis.
</invariants>

## Rationalization Resistance

<rationalization_table>
| Excuse | Reality |
| :--- | :--- |
| "Iteration 4 might fix it" | Empirically, iteration 4+ introduces more bugs than it fixes. |
| "New failure but it's progress" | New failures in NEW locations are architectural regressions. |
| "Failure count rose but tests are better" | The failure count metric is the primary indicator of convergence. |
| "Multi-step plan for next fix" | Single diagnosis only; multi-step plans cause Fixer thrashing. |
</rationalization_table>

## Reference Files

- `${CLAUDE_PLUGIN_ROOT}/skills/sk-pipeline-patterns/SKILL.md` — Pattern 3 protocol.
- `${CLAUDE_PLUGIN_ROOT}/skills/systematic-debugging/SKILL.md` — RCA methodology.
