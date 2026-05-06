---
name: sk-rationalization-resistance
description: Use when authoring a discipline-enforcing skill or agent body that must hold up under time pressure, sunk cost, or "obvious answer" rationalization — defines HARD-GATE / EXTREMELY-IMPORTANT tag conventions, Red Flags lists, and Rationalization Tables. Reference-only; preload via agent skills frontmatter.
disable-model-invocation: true
user-invocable: false
---

# Rationalization Resistance — Conventions for Discipline-Enforcing Content

Pipeline agents shortcut discipline rules under three pressures: time ("we need to ship"), sunk cost ("3 hours spent already"), and obvious-answer bias ("clearly the fix is X"). This skill defines three mechanisms that hold the line against rationalization.

Use these in any skill or agent body whose correctness depends on NOT taking shortcuts.

---

## Mechanism 1 — `<HARD-GATE>` tag

Wrap any non-negotiable checkpoint. The agent must complete the gate condition before proceeding.

```markdown
<HARD-GATE>
After 3 failed iterations without measurable progress: STOP. Do NOT attempt iteration 4.
</HARD-GATE>
```

Conventions:

- One sentence per gate. No multi-paragraph gates.
- The gate states the STOP condition AND the action ("STOP. Do NOT...").
- Place gates at decision points the agent will reach naturally — not buried in a reference file.
- Test by adversarial pressure: can the agent find an excuse to skip the gate? If yes, tighten the wording.

---

## Mechanism 2 — `<EXTREMELY-IMPORTANT>` tag

Wrap rules that are frequently rationalized away. Signals maximum priority.

```markdown
<EXTREMELY-IMPORTANT>
Stage 1 spec compliance review MUST pass before Stage 2 code quality review begins.
This order is not optional.
</EXTREMELY-IMPORTANT>
```

Conventions:

- Use sparingly — every `<EXTREMELY-IMPORTANT>` tag dilutes the others. Reserve for rules the agent will be tempted to break.
- State the rule positively (what to do), then add the non-optional clause.
- Pair with a Red Flags list when possible (see Mechanism 3).

---

## Mechanism 3 — Red Flags list + Rationalization Table

Every discipline-enforcing skill MUST include both at the bottom.

### Red Flags — STOP

List of exact thoughts or behaviors that signal the agent is rationalizing. Format: bullet list → single corrective action.

```markdown
## Red Flags — STOP

- "One more fix should do it" (after 2+ failures) → STOP. Escalate per Pattern 3.
- "The fix is almost working" → STOP. Question the architecture.
- Each new fix reveals a failure in a new location → STOP. Architectural problem, not a bug.
```

Conventions:

- Use exact rationalization phrasing — copy from real test transcripts where the agent failed.
- One bullet per phrase; do not group.
- Corrective action is concrete and immediate.

### Rationalization Table

Capture specific rationalizations seen in testing. Format: `| Excuse | Reality |`.

```markdown
| Excuse | Reality |
|--------|---------|
| "The reviewer is the same model — separate instances are pointless" | Same model, fresh context = different reasoning. Isolation is about context, not architecture. |
| "Stage 1 is just a quick sanity check" | Stage 1 catches the most expensive class of bugs. It IS the primary gate. |
```

Conventions:

- One row per excuse. Multiple rows per excuse class is fine.
- "Reality" sentence states why the excuse is wrong AND what to do instead.
- Update with new rationalizations as they surface in production.

---

## Where to use these mechanisms

| Skill type | HARD-GATE | EXTREMELY-IMPORTANT | Red Flags + Rationalization Table |
|------------|:---------:|:-------------------:|:---------------------------------:|
| Reference-only (`sk-*`) | yes, where appropriate | yes, where appropriate | not required — these are reference, not discipline |
| Discipline-enforcing (`sk-write-review-isolation`, `sk-worktree-safety`, `sk-pipeline-patterns` Pattern 3) | required at decision points | required for non-negotiable rules | required at the bottom |
| Workflow (`creating-a-pipeline`, `running-a-pipeline`) | required at human gates | required for write/review isolation | required at the bottom |
| Agent bodies | required at decision points | required for non-negotiable rules | optional if companion `*-references` carries them |

---

## Anti-patterns

- Wrapping every other paragraph in `<EXTREMELY-IMPORTANT>` — dilutes the signal until the agent treats them as decoration.
- Soft-pedaling gate conditions ("you might want to consider stopping…") — the agent will rationalize through softness. Use STOP / DO NOT.
- Red Flags written from the user's perspective ("the user might think…") — write them from the agent's internal monologue ("'one more fix should do it' →").
- Rationalization Table with abstract reasons ("this is bad because correctness matters") — use specific, concrete realities.

## Cross-references

- `sk-pipeline-patterns` `references/ai-pipelines-trimmed.md` — full conventions reference.
- `sk-pipeline-patterns` Pattern 3 escalation — example HARD-GATE usage.
- `sk-write-review-isolation` — example EXTREMELY-IMPORTANT + Red Flags + Rationalization Table.
