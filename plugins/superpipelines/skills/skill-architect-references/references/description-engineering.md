# Description Engineering — Skill-Architect Reference

The description field is the most important text in any skill — it determines whether the skill is ever invoked. Get it wrong and the skill becomes documentation that's never read (silent failure, no error).

## The rule

**Description = ONLY triggering conditions. NEVER summarize the skill's process or workflow.**

Pattern: `Use when [specific triggering conditions and symptoms]`

## Why this matters

Claude reads the description to decide whether to load the skill body. If the description summarizes the workflow, Claude treats the description as a shortcut and skips the body. The skill becomes documentation Claude never reads.

A real failure: a description saying "dispatches subagent per task with code review between tasks" caused Claude to perform ONE review instead of the two-stage review specified in the skill body. Changing the description to triggering conditions only fixed the behavior without changing any skill content.

## Patterns

### ❌ WRONG — Summarizes workflow

```yaml
description: Processes Excel files by reading sheets, cleaning data, and generating charts. Use when working with spreadsheets.
```

### ❌ WRONG — Process detail in description

```yaml
description: Use for commit messages — analyze diff, extract intent, write conventional commit.
```

### ✅ CORRECT — Triggering conditions only

```yaml
description: Use when working with Excel files, spreadsheets, or .xlsx data extraction.
```

### ✅ CORRECT — Problem-symptom triggers

```yaml
description: Use when tests have race conditions, timing dependencies, or fail inconsistently.
```

## Authoring checklist

- [ ] Starts with "Use when" or equivalent triggering verb.
- [ ] Third person only ("Generates...", NOT "I generate" / "You can use").
- [ ] No verbs describing the skill's internal process ("by reading", "after analyzing").
- [ ] Includes the symptoms / contexts the user would describe.
- [ ] Front-loads the most discriminating trigger.
- [ ] ≤1024 chars (truncation at 1536 if `when_to_use` extends).
- [ ] Trigger keywords match what users naturally say.

## Counter under-triggering

The most common failure is descriptions that are too narrow. Enumerate non-obvious triggers:

```yaml
# Narrow — only triggers on the obvious case
description: Use when reviewing a PR.

# Wider — covers obvious + non-obvious cases
description: Use when reviewing a PR, auditing changed files, checking diffs against acceptance criteria, or before merging a feature branch.
```

## Test the description

Before shipping, simulate routing:

1. Take 3 task descriptions a user might give.
2. For each, ask: would this description trigger on that task?
3. Take 3 unrelated tasks. Ask: would this description NOT trigger? (False positives are as bad as false negatives.)

## Red Flags — STOP

- "I'll add the workflow steps so the user knows what the skill does" → STOP. The description is for routing, not user docs. Workflow goes in body.
- "The description sounds vague, let me add detail" → distinguish detail-as-triggers (good) from detail-as-process (bad).
- "I'll write it in second person so it feels more direct" → STOP. Third person only. Inconsistent POV breaks discovery.
