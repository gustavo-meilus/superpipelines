---
name: sk-4d-method
description: Use when an AI pipeline orchestrator or worker faces an ambiguous request, missing slots, or feedback that requires re-entry — the per-invocation Deconstruct/Diagnose/Develop/Deliver wrapper. Reference-only; preload via agent skills frontmatter.
disable-model-invocation: true
user-invocable: false
---

# 4D Method — Per-Invocation Processing Wrapper

Reference template embedded in pipeline agent skills frontmatter. Runs INSIDE every Pattern (1–5) on each agent turn; never replaces them.

The 4D Method: **Deconstruct → Diagnose → Develop → Deliver**.

Compatibility: Claude 4.6 (Sonnet/Opus/Haiku), Claude 4.7 Opus. Aligned with `sk-pipeline-patterns` Pattern 6.

---

## When this fires

- A pipeline agent receives a vague or ambiguous brief.
- The orchestrator passes a brief that's missing audience, format, scope, or success criteria.
- Feedback arrives from a downstream reviewer and the worker must re-enter at the right phase.
- The user explicitly says "show 4D" or "walk me through it."

When NOT to use: trivial single-step requests (rename, typo, config flip), pure read-only Q&A.

---

## Phase 1 — DECONSTRUCT (strip it down)

Goal: never assume the request was understood on first read.

1. Identify the core intent. Separate goal from output format.
2. Extract all explicit entities (every noun, constraint, audience, platform, product, proper name).
3. Surface implicit assumptions. Common gaps: target audience, tone, length, platform/format, success criteria, scope.
4. Map intent to output. Restate the request as a precise task definition.

**Decision point (HARD-GATE):** If three or more critical slots are missing (audience, format, goal, constraints, scope), STOP and ask 3–5 targeted questions framed as options. Otherwise state assumptions explicitly and proceed.

---

## Phase 2 — DIAGNOSE (break what's vague)

Goal: turn gaps into concrete specifications.

1. Flag subjective terms ("compelling," "clean," "professional"). Replace with measurable specs.
2. Identify overloaded asks. If the brief contains multiple deliverables, separate into a numbered sub-task list.
3. Resolve conflicting constraints ("short but comprehensive"). Name the tension; ask the user to prioritize OR make and state a reasoned tradeoff.
4. Anticipate top 2–3 failure modes and build guardrails.

---

## Phase 3 — DEVELOP (choose the right tactics)

Goal: design the response based on task type, output logic, and model strengths.

1. Match task type to strategy:
   - Creative: tone cues, style refs, audience empathy, exemplar patterns.
   - Technical: constraint logic, schemas, validation rules, precision language.
   - Analytical: structured reasoning, evidence requirements, explicit chain-of-thought.
   - Multi-step: decomposition into stages with explicit handoffs.
2. Assign a role only if domain expertise sharpens output (e.g. "senior security reviewer").
3. Define output format precisely (headings, bullet count, code-block language, table structure).
4. Layer constraints with primacy + recency — critical rules first AND last, never buried.

---

## Phase 4 — DELIVER (format the ask, guide the output)

Goal: a well-designed response can still fail if it's messy or ignores the user's environment.

1. Inverted pyramid: conclusion first, supporting detail second, context third.
2. Match the user's medium (Slack-tight vs. report-structured vs. runnable code).
3. End with an actionable next step.
4. Self-review: does this answer the actual question? Anything unnecessary? Anything inaccurate?

---

## Behavioral rules

- Run all four phases internally. Show them only on "show 4D" / "walk me through it."
- Compress to a single mental pass for trivially simple requests; the full method exists for complex / ambiguous / high-stakes outputs.
- On feedback: re-enter at the matching phase using the routing table below.

## 4D Feedback Routing

| Feedback signal | Re-entry |
|-----------------|----------|
| "That's not what I asked" / response addressed a different problem | re-Deconstruct |
| "This is incorrect" / wrong values, formats, technically right but misses point | re-Diagnose |
| "Use a different approach" / strategy critique, not output critique | re-Develop |
| "Make it shorter / change format / cosmetic only" | re-Deliver |

## Quick Reference

| Phase | Question | Key action |
|-------|----------|------------|
| Deconstruct | "What is actually being asked?" | Separate intent from output; surface missing info |
| Diagnose | "Where will this break?" | Replace vague terms; resolve conflicts; anticipate failures |
| Develop | "What's the best approach?" | Match task type to strategy; assign role; define format |
| Deliver | "Is this ready for the user?" | Organize for scannability; match context; add next steps |

## Cross-references

- **Pattern 6** in `sk-pipeline-patterns` — canonical definition.
- `sk-spec-driven-development` — when 4D surfaces a multi-step feature, hand off to SDD.
- `sk-claude-code-conventions` — model selection and effort scaling per phase.
