# Universal Skill Architecture — Skill-Architect Reference

Every well-designed SKILL.md follows the same five-layer architecture. Use this when designing or auditing a skill.

## Table of contents

1. The five layers
2. Standard SKILL.md template
3. Layer-by-layer rules
4. Compression vs. progressive disclosure
5. Cross-references

---

## The five layers

1. **Metadata** — `name` + `description` (the routing contract).
2. **Overview** — 1–2 sentences stating the core principle.
3. **When to use** — concrete triggers and contexts; when NOT to use.
4. **Core pattern or process** — the step-by-step / cycle / decision tree.
5. **Quick reference + Common mistakes + (for discipline skills) Red Flags + Rationalization Table**.

Skills under 100 lines may compress layers 3–5; skills over 300 lines should split into SKILL.md + `references/*.md`.

---

## Standard SKILL.md template

```markdown
---
name: skill-name-with-hyphens
description: Use when [triggering conditions only — NO workflow summary]
---

# Skill Name

## Overview
Core principle in 1–2 sentences. What problem this solves.

## When to Use
Bullet list: symptoms and contexts where this applies.
When NOT to use.

## Core Pattern or Process
[Step-by-step OR cycle OR decision tree]
[Before/after comparison if a "bad vs good" pattern exists]

## Quick Reference
Table or short bullet list — optimized for scanning.

## Common Mistakes
What goes wrong + specific fix for each.

## Red Flags — STOP   (discipline skills only)
List of exact thoughts/behaviors → single corrective action.

## Rationalization Table   (discipline skills only)
| Excuse | Reality |

## Cross-references
Other skills, references, canonical sources.
```

---

## Layer-by-layer rules

### Layer 1 — Metadata

- `name`: lowercase + hyphens. ≤64 chars. Matches directory name.
- `description`: triggering conditions only. Third person. ≤1024 chars.
- Optional: `disable-model-invocation: true` for reference-only skills; `user-invocable: false` for skills only invoked by other skills.

### Layer 2 — Overview

- 1–2 sentences. State the problem the skill solves.
- No preamble ("This skill helps you...").
- No version / changelog / metadata in body.

### Layer 3 — When to use

- Symptoms-based triggers, not feature-based ("when tests fail intermittently" beats "for testing").
- Counter under-triggering: enumerate non-obvious cases.
- "When NOT to use" prevents over-application.

### Layer 4 — Core pattern

- Numbered list for linear processes.
- Decision tree (mermaid or ASCII) for non-obvious choices.
- Before/after code blocks for "bad vs good" patterns.
- ONE excellent example, not multi-language.

### Layer 5 — Quick reference + mistakes + Red Flags

- Quick reference: optimized for scanning, not reading.
- Common mistakes: paired with specific fix per mistake.
- Red Flags + Rationalization Table: required for discipline-enforcing skills.

---

## Compression vs. progressive disclosure

| Skill body length | Strategy |
|-------------------|----------|
| < 100 lines | Single SKILL.md, all layers compressed |
| 100–500 lines | Single SKILL.md, full layers |
| > 500 lines | SKILL.md as navigation index + `references/*.md` for depth |

Reference files >100 lines must include a Table of Contents at the top.

---

## Cross-references

- `description-engineering.md` — how to write a description that triggers correctly.
- `claude-code-skill-spec.md` — full frontmatter field reference.
- `anti-patterns.md` — common authoring mistakes and fixes.
