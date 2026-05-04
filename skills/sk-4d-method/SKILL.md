---
name: sk-4d-method
description: Use when an AI pipeline orchestrator or worker faces an ambiguous request, missing slots, or feedback that requires re-entry — the per-invocation Deconstruct/Diagnose/Develop/Deliver wrapper. Reference-only; preload via agent skills frontmatter.
disable-model-invocation: true
user-invocable: false
---

# 4D Method — Per-Invocation Processing Wrapper

> A systematic four-phase framework for processing ambiguous requests, resolving missing context, and handling iterative feedback. Trigger when an agent receives a vague brief or requires precise task deconstruction.

<overview>
The 4D Method (Deconstruct, Diagnose, Develop, Deliver) ensures that every agent invocation begins with a rigorous analysis of intent and constraints. It prevents hallucinations and misaligned outputs by enforcing a "hard gate" on missing information and providing a structured path for re-entry based on feedback.
</overview>

<glossary>
  <term name="4D">Deconstruct → Diagnose → Develop → Deliver.</term>
  <term name="Hard-Gate">A mandatory stop point if critical information (audience, format, goal, constraints, scope) is missing.</term>
  <term name="Re-entry">Returning to a specific 4D phase based on the type of user feedback received.</term>
</glossary>

<protocol>
### 1. DECONSTRUCT (Intent & Entities)
- **Goal**: Strip the request to its core intent.
- Identify noun-level entities, explicit constraints, and target audience.
- Surface implicit assumptions and missing context.
- **HARD-GATE**: If ≥3 critical slots are missing, STOP and ask the user targeted questions.

### 2. DIAGNOSE (Specs & Guardrails)
- **Goal**: Transform vague terms into concrete specifications.
- Replace subjective language ("clean," "professional") with measurable metrics.
- Separate overloaded asks into a numbered sub-task list.
- Anticipate the top 2–3 failure modes and design build-time guardrails.

### 3. DEVELOP (Tactics & Strategy)
- **Goal**: Match the task type to the optimal execution strategy.
- Select the appropriate model (Sonnet/Opus) and effort level.
- Define output format precisely (schemas, bullet counts, code languages).
- Layer constraints using primacy and recency (critical rules first and last).

### 4. DELIVER (Formatting & Scannability)
- **Goal**: Ensure the response is optimized for the user's environment.
- Use an inverted pyramid structure (conclusion first).
- Match the medium (Slack-tight vs. report-structured).
- Provide an actionable next step for the user.
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
| **Deliver** | "Is this ready for the user?" | Organize for scannability; match context. |
</quick_reference>

<invariants>
- Run all four phases internally; show them only on explicit request ("show 4D").
- The HARD-GATE in Phase 1 is non-negotiable for high-stakes tasks.
- Match model selection and effort level to the phase requirements per project standards.
</invariants>

## Reference Files

- `sk-pipeline-patterns/SKILL.md` — Pattern 6 definition.
- `sk-spec-driven-development/SKILL.md` — SDD handoff rules.
- `sk-claude-code-conventions/SKILL.md` — Scaling and model selection.
