---
name: sk-rationalization-resistance
description: Use when authoring a discipline-enforcing skill or agent body that must hold up under time pressure, sunk cost, or "obvious answer" rationalization — defines HARD-GATE / EXTREMELY-IMPORTANT tag conventions, Red Flags lists, and Rationalization Tables. Reference-only; preload via agent skills frontmatter.
disable-model-invocation: true
user-invocable: false
---

# Rationalization Resistance — Discipline-Enforcement Conventions

> Establishes mechanisms (HARD-GATE, EXTREMELY-IMPORTANT, Red Flags) to prevent agents from taking shortcuts under time pressure, sunk cost, or cognitive bias. Trigger when authoring discipline-enforcing skills or agent bodies that require strict adherence to protocols.

<overview>
Rationalization Resistance ensures that critical safety and quality rules hold the line even when an agent is tempted to shortcut them. It utilizes specific semantic tags and tables to force the model to confront its own internal monologue and adhere to non-negotiable architectural gates.
</overview>

<glossary>
  <term name="HARD-GATE">A semantic tag wrapping non-negotiable checkpoints that requires a STOP condition before proceeding.</term>
  <term name="Red Flag">An exact thought or behavior that signals an agent is attempting to rationalize a shortcut.</term>
  <term name="Rationalization Table">A tabular comparison of common model excuses against project reality.</term>
</glossary>

## Resistance Mechanisms

<protocol>
### 1. THE `<HARD-GATE>` TAG
- **Usage**: Wrap non-negotiable checkpoints at decision points.
- **Convention**: Use one sentence stating the STOP condition and the required action (e.g., "STOP. Do NOT attempt iteration 4.").
- **Goal**: Force a terminal break in execution if safety or quality thresholds are breached.

### 2. THE `<EXTREMELY-IMPORTANT>` TAG
- **Usage**: Wrap rules that are frequently rationalized away or ignored.
- **Convention**: State the rule positively, then append the "non-optional" clause.
- **Invariant**: Use sparingly to maintain high semantic weight.

### 3. RED FLAGS & RATIONALIZATION TABLES
- **Red Flags**: Bulleted list of specific internal monologues that trigger a STOP.
- **Rationalization Table**: Mapping of `| Excuse | Reality |` to debunk common model justifications with concrete corrective actions.
</protocol>

## Applicability Matrix

<applicability_table>
| Skill Type | HARD-GATE | EXTREMELY-IMPORTANT | Red Flags / Tables |
| :--- | :---: | :---: | :---: |
| **Reference-only** (`sk-*`) | Optional | Optional | Not required |
| **Discipline-enforcing** | Required | Required | Required |
| **Workflow** | Required | Required | Required |
| **Agent Bodies** | Required | Required | Optional |
</applicability_table>

## Anti-Patterns

<anti_patterns>
- **Soft-pedaling**: Using phrases like "you might want to consider" instead of "STOP" or "DO NOT."
- **User-perspective Red Flags**: Writing flags from the user's view instead of the agent's internal monologue.
- **Abstract Realities**: Using vague reasons like "correctness matters" instead of concrete technical consequences.
- **Tag Bloat**: Wrapping excessive amounts of text, which dilutes the semantic signal.
</anti_patterns>

<invariants>
- Every discipline-enforcing skill MUST include both a Red Flags list and a Rationalization Table at the bottom.
- Corrective actions in Red Flags MUST be concrete and immediate.
- Place mechanisms at the exact decision points the agent will reach naturally.
</invariants>

## Reference Files

- `sk-pipeline-patterns/SKILL.md` — Example Pattern 3 escalation gate.
- `sk-write-review-isolation/SKILL.md` — Example EXTREMELY-IMPORTANT usage.
- `references/ai-pipelines-trimmed.md` — Full conventions reference.
