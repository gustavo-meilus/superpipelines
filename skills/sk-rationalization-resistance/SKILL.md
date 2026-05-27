---
name: sk-rationalization-resistance
description: Defines HARD-GATE and EXTREMELY-IMPORTANT tag conventions, Red Flags lists, and Rationalization Tables for discipline-enforcing skills and protocol skills. Use when authoring a skill or agent protocol that must hold under time pressure, sunk cost, or "obvious answer" rationalization bias.
disable-model-invocation: true
user-invocable: false
---

# Rationalization Resistance — Discipline-Enforcement Conventions

<overview>
Rationalization Resistance provides semantic tags and tables that force an agent to confront its own internal monologue and adhere to non-negotiable architectural gates — preventing shortcuts under time pressure, sunk cost, or cognitive bias.
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
