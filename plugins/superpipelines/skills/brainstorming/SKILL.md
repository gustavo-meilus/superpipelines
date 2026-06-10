---
name: brainstorming
description: Brainstorming refines vague or exploratory requests into a validated design document through structured clarifying dialogue and trade-off analysis before any implementation begins. Use when a user's request is under-specified, involves new feature or component design, describes new pipeline behavior, or lacks an existing spec — including when loaded by creating-a-pipeline Phase 0 for exploratory briefs.
---

# Brainstorming — Idea Refinement

<overview>
Brainstorming is the mandatory pre-flight phase for creative and design work. It enforces a strict "no-code-before-design" policy, guiding the orchestrator through context exploration, clarifying questions, and trade-off analysis to produce a validated design document (spec) that serves as the foundation for subsequent pipeline execution.
</overview>

<glossary>
  <term name="Design Doc (Spec)">A persistent markdown file (e.g., `docs/specs/FEATURE-design.md`) capturing validated requirements.</term>
  <term name="Visual Companion">A browser-based tool for presenting mockups and diagrams during the design phase.</term>
  <term name="The Design Gate">The non-negotiable requirement for user approval of a design before any implementation begins.</term>
</glossary>

## The Brainstorming Process

<protocol>
### 1. CONTEXT & DECOMPOSITION
- Existing project structure, documentation, and recent commits are explored first.
- **Large-Scale Requests**: Requests describing multiple subsystems are decomposed into independent sub-projects before detail refinement.

### 2. CLARIFYING DIALOGUE
- Clarifying questions focus on purpose, constraints, and success criteria.
- <invariant>Exactly one question is asked per message to avoid overwhelming the user.</invariant>
- Multiple-choice options (A/B/C) are preferred for faster decision-making. Example: "Which data store fits the scale requirement? A) SQLite (embedded, single-node), B) PostgreSQL (shared, multi-writer), C) Redis (ephemeral cache)."

### 3. APPROACH & RECOMMENDATION
- Two to three architectural approaches are proposed with explicit trade-offs.
- A specific recommendation leads, with reasoning grounded in project context. Example: "Approach B is recommended because the existing service layer already exposes a PostgreSQL connection pool — adding SQLite would introduce a second persistence mechanism with no clear boundary."

### 4. DESIGN PRESENTATION (THE GATE)
- The refined design is presented in logical sections: Architecture, Data Flow, Error Handling, Testing.
- <HARD-GATE>Code writing and project scaffolding are prohibited until the user has explicitly approved the presented design sections.</HARD-GATE>

### 5. SPECIFICATION & REVIEW
- The design document is authored to `docs/specs/`.
- A **Spec Self-Review** is performed: placeholders, internal contradictions, and ambiguity are resolved before handoff.
- <HARD-GATE>The user is asked to review the final written spec file. Brainstorming is complete only upon user approval of the spec.</HARD-GATE>
</protocol>

<invariants>
- NEVER combine the "Visual Companion" offer with other questions; it must be a standalone message.
- NEVER skip the design gate for "simple" projects; simplicity is often a mask for unexamined assumptions.
- ALWAYS design for isolation, breaking systems into smaller units with well-defined interfaces.
</invariants>

## The Visual Companion Protocol

<visual_companion_rules>
- **Offering**: When upcoming questions are visual in nature (layouts, diagrams), the companion is offered once in a standalone message.
- **Decision**: For each subsequent question, visual treatment (browser) or text treatment (terminal) is selected based on content type.
- **Browser**: Used for mockups, wireframes, and architecture diagrams.
- **Terminal**: Used for requirements, conceptual choices, and tradeoff lists.
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
