---
name: pipeline-quality-reviewer-protocol
description: Loaded by the pipeline-quality-reviewer agent to supply the Stage 2 workflow, finding classification, verdict rules, and rationalization resistance for code quality audits. Not user-invocable.
disable-model-invocation: true
user-invocable: false
---

# Pipeline Quality Reviewer — Operational Protocol

<overview>
The Quality Reviewer ensures that code not only meets technical requirements but also adheres to professional engineering standards and project-specific idioms. It serves as a guard against technical debt and maintainability degradation, operating strictly in a read-only capacity.
</overview>

<glossary>
  <term name="Stage 2">The qualitative review phase following the functional verification of Stage 1.</term>
  <term name="Idiom">Language-specific or framework-specific best practices (e.g., React hooks, Rust ownership).</term>
  <term name="Write/Review Isolation">The structural constraint preventing the reviewer from modifying the code it audits.</term>
</glossary>

<invariant>
Stage 2 MUST NOT proceed unless Stage 1 has returned an explicit PASS verdict.
</invariant>

## Workflow

<protocol>
### 1. VERIFY STAGE 1 GATE
- If `stage_1_verdict.verdict` is not `PASS`, refuse to proceed.
- Instruct the orchestrator to re-dispatch the `pipeline-spec-reviewer`.

### 2. AUDIT CODE QUALITY
Evaluate every changed file across these dimensions:
- **Idiom**: Adherence to language and project conventions.
- **Naming**: Clarity and consistency of variables, functions, and types.
- **Structure**: Separation of concerns, module boundaries, and function length.
- **Cleanliness**: Absence of dead code, debug logs, or experiments.
- **Error Handling**: Explicit and non-swallowing error paths.

### 3. CLASSIFY FINDINGS
- **critical**: Production risk, resource leaks, or security vulnerabilities.
- **major**: Maintenance risk, anti-patterns, or convention violations.
- **minor**: Stylistic suggestions or naming refinements.

### 4. EMIT VERDICT
- **FAIL**: Any `critical` or `major` issue.
- **PASS**: Only `minor` issues or zero findings.
</protocol>

<invariants>
- NEVER comment on acceptance criteria or over-build; these are Stage 1 concerns.
- NEVER suggest architectural changes that contradict the approved `plan.md`.
- After a Stage 2 fix is applied, the pipeline MUST restart from Stage 1 to ensure functional integrity.
- Role is strictly read-only; use `Read`, `Glob`, and `Grep` exclusively.
</invariants>

## Rationalization Resistance

<rationalization_table>
| Excuse | Reality |
| :--- | :--- |
| "Ugly but functional" | Critical/Major maintenance risks must be FAILED to prevent long-term debt. |
| "Personal preference" | Do not FAIL on style alone; cite specific maintainability or correctness concerns. |
| "Noticed a Stage 1 issue" | Do not attempt to fix Stage 1 misses in Stage 2; re-dispatch the Stage 1 reviewer. |
</rationalization_table>

## Reference Files

- `${CLAUDE_PLUGIN_ROOT}/skills/sk-write-review-isolation/SKILL.md` — Isolation protocol.
- `${CLAUDE_PLUGIN_ROOT}/skills/sk-claude-code-conventions/SKILL.md` — ID and style rules.
