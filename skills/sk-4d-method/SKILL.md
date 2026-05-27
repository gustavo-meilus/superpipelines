---
name: sk-4d-method
description: Provides a per-invocation four-phase processing wrapper (Deconstruct, Diagnose, Develop, Deliver) for structured request resolution. Use when an agent faces an ambiguous request, missing required slots, or feedback that requires re-entry into a specific processing phase.
disable-model-invocation: true
user-invocable: false
---

# 4D Method — Per-Invocation Processing Wrapper

<glossary>
  <term name="4D">Deconstruct → Diagnose → Develop → Deliver.</term>
  <term name="Hard-Gate">A mandatory stop point when critical information (audience, format, goal, constraints, scope) is missing.</term>
  <term name="Re-entry">Returning to a specific 4D phase based on the type of feedback received.</term>
</glossary>

<protocol>
### 1. DECONSTRUCT (Intent & Entities)
- **Goal**: Strip the request to its core intent.
- Identify noun-level entities, explicit constraints, and target audience.
- Surface implicit assumptions and missing context.
- **HARD-GATE**: If ≥3 critical slots are missing, stop and emit targeted clarifying questions.

### 2. DIAGNOSE (Specs & Guardrails)
- **Goal**: Transform vague terms into concrete specifications.
- Replace subjective language (e.g., "clean," "professional") with measurable metrics (e.g., "≤80 chars/line," "no passive voice").
- Separate overloaded asks into a numbered sub-task list.
- Anticipate the top 2–3 failure modes and design build-time guardrails.

### 3. DEVELOP (Tactics & Strategy)
- **Goal**: Match the task type to the optimal execution strategy.
- Select the appropriate model tier and effort level per project model-resolution rules.
- Define output format precisely (schemas, bullet counts, code languages).
- Layer constraints using primacy and recency (critical rules first and last).

### 4. DELIVER (Formatting & Scannability)
- **Goal**: Ensure the response is optimized for the consumer's environment.
- Use an inverted pyramid structure (conclusion first).
- Match the medium (e.g., Slack-tight vs. report-structured).
- Provide an actionable next step.
</protocol>

## 4D Feedback Routing

<routing_table>
| Feedback Signal | Re-entry Phase | Rationale |
| :--- | :--- | :--- |
| "Not what I asked" | **Deconstruct** | Misaligned intent or goal. |
| "This is incorrect" | **Diagnose** | Technical failure or missed edge case. |
| "Use a different approach" | **Develop** | Correct intent, wrong implementation strategy. |
| "Format/style change" | **Deliver** | Cosmetic or presentation refinement. |
</routing_table>

## Quick Reference

<quick_reference>
| Phase | Core Question | Key Action |
| :--- | :--- | :--- |
| **Deconstruct** | "What is actually being asked?" | Separate intent from output; surface gaps. |
| **Diagnose** | "Where will this break?" | Replace vague terms; resolve conflicts. |
| **Develop** | "What's the best approach?" | Match strategy to task; define format. |
| **Deliver** | "Is this ready for the consumer?" | Organize for scannability; match context. |
</quick_reference>

<invariants>
- All four phases run internally; phases surface only on explicit request ("show 4D").
- The HARD-GATE in Phase 1 is non-negotiable for high-stakes tasks.
- Model selection and effort level follow project model-resolution rules (sk-model-resolver).
</invariants>

## Cross-References

- `sk-pipeline-patterns/SKILL.md` — Pattern 6 definition.
- `sk-spec-driven-development/SKILL.md` — SDD handoff rules.
- `sk-claude-code-conventions/SKILL.md` — Scaling and model selection.
