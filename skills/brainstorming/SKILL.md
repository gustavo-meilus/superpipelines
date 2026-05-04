---
name: brainstorming
description: Use before creative or design work — features, components, new behaviors, or pipeline briefs that need refinement before a spec exists. Loaded by creating-a-pipeline Phase 0 when the user's request is exploratory or under-specified.
---

# Brainstorming — Idea Refinement Workflow

> Orchestrates the transition from vague ideas to fully formed designs and specifications through collaborative dialogue. Trigger when the user's request is exploratory, under-specified, or involves new feature design before a pipeline exists.

<overview>
Brainstorming acts as the mandatory pre-flight phase for creative and design work. It enforces a strict "no-code-before-design" policy, guiding the orchestrator through context exploration, clarifying questions, and trade-off analysis to produce a validated design document (spec) that serves as the foundation for subsequent pipeline execution.
</overview>

<glossary>
  <term name="Design Doc (Spec)">A persistent markdown file (e.g., `docs/specs/YYYY-MM-DD-topic-design.md`) capturing validated requirements.</term>
  <term name="Visual Companion">A browser-based tool for presenting mockups and diagrams during the design phase.</term>
  <term name="The Design Gate">The non-negotiable requirement for user approval of a design before any implementation begins.</term>
</glossary>

## The Brainstorming Process

<protocol>
### 1. CONTEXT & DECOMPOSITION
- Explore existing project structure, documentation, and recent commits.
- **Large-Scale Requests**: If the request describes multiple subsystems, decompose them into independent sub-projects before refining details.

### 2. CLARIFYING DIALOGUE
- Ask clarifying questions focused on purpose, constraints, and success criteria.
- <invariant>Ask exactly one question per message to avoid overwhelming the user.</invariant>
- Prefer multiple-choice options (A/B/C) for faster decision-making.

### 3. APPROACH & RECOMMENDATION
- Propose 2-3 different architectural approaches with clear trade-offs.
- Lead with a specific recommendation and provide reasoning grounded in project context.

### 4. DESIGN PRESENTATION (THE GATE)
- Present the refined design in logical sections (Architecture, Data Flow, Error Handling, Testing).
- <HARD-GATE>Do NOT write code or scaffold projects until the user has explicitly approved the presented design sections.</HARD-GATE>

### 5. SPECIFICATION & REVIEW
- Author the design document to `docs/specs/`.
- Perform a **Spec Self-Review**: scan for placeholders, internal contradictions, or ambiguity.
- <HARD-GATE>Ask the user to review the final written spec file. Brainstorming is complete only upon user approval of the spec.</HARD-GATE>
</protocol>

<invariants>
- NEVER combine the "Visual Companion" offer with other questions; it must be a standalone message.
- NEVER skip the design gate for "simple" projects; simplicity is often a mask for unexamined assumptions.
- ALWAYS design for isolation, breaking systems into smaller units with well-defined interfaces.
</invariants>

## The Visual Companion Protocol

<visual_companion_rules>
- **Offering**: If upcoming questions are visual (layouts, diagrams), offer the companion once in a standalone message.
- **Decision**: For every subsequent question, determine if visual treatment (browser) or text treatment (terminal) is superior.
- **Browser**: Use for mockups, wireframes, and architecture diagrams.
- **Terminal**: Use for requirements, conceptual choices, and tradeoff lists.
</visual_companion_rules>

## Red Flags — STOP
- "This is too simple to need a design." → **STOP**. Every project requires a validated design gate.
- "I'll ask 5 questions at once to save time." → **STOP**. One-question-per-message is mandatory for cognitive clarity.
- "I'll start scaffolding while we brainstorm." → **STOP**. Design must be approved before implementation begins.

## Rationalization Table

<rationalization_table>
| Excuse | Reality |
| :--- | :--- |
| "I'll fix the spec later." | A vague spec leads to divergent parallel workers. Fix all ambiguity during the design phase. |
| "Visuals take too many tokens." | Visuals prevent multi-turn misunderstandings that cost far more tokens in rework. |
| "The user already knows what they want." | Brainstorming surfaces implicit assumptions the user hasn't documented. |
</rationalization_table>

## Reference Files
- `creating-a-pipeline/SKILL.md` — Implementation workflow.
- `sk-4d-method/SKILL.md` — Brief deconstruction.
- `sk-claude-code-conventions/SKILL.md` — Design patterns.
- `visual-companion.md` — Detailed browser usage guide.
