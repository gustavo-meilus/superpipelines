# Claude Code Skill Spec — Frontmatter Reference

Full frontmatter field reference for SKILL.md files. Subset of `sk-claude-code-conventions` Section 5, expanded with usage notes.

## Table of contents

1. All supported fields
2. Field reference
3. Common patterns
---

## All supported fields

```yaml
---
name: skill-name-with-hyphens
description: Use when [triggering conditions only — NO workflow summary]
when_to_use: |
  Optional extended trigger description.
  Counts toward the 1536-char metadata cap.
argument-hint: "[issue-number]"
disable-model-invocation: true
user-invocable: false
allowed-tools: Read, Write, Edit, Bash
model: sonnet
effort: medium
context: fork
agent: Explore
hooks:
  PreToolUse:
    - matcher: Bash
      hooks:
        - type: command
          command: '...'
paths:
  - "src/**/*.ts"
shell: bash
---
```

## Field reference

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | Lowercase + hyphens. ≤64 chars. Matches dir name. Required. |
| `description` | string | ≤1024 chars. Triggering conditions only. Third person. Required. |
| `when_to_use` | string | Optional extended description. Total `description + when_to_use` ≤1536. |
| `argument-hint` | string | Hint shown in slash-command UI (e.g., `"[issue-number]"`). |
| `disable-model-invocation` | boolean | If `true`, only user can trigger. Reference-only skills always set `true`. |
| `user-invocable` | boolean | If `false`, skill is invoked only by other skills/agents. Default `true`. |
| `allowed-tools` | list | Tools allowed without permission prompt when this skill is active. |
| `model` | string | Override model for this skill's body invocation. Rarely used in pipelines. |
| `effort` | string | `low / medium / high / xhigh / max`. |
| `context` | string | `fork` runs the body as a forked subagent prompt. |
| `agent` | string | Subagent type when `context: fork` (e.g., `Explore`). |
| `hooks` | object | Lifecycle hooks. Generally avoided in skills. |
| `paths` | list | Glob patterns. Skill activates only when matching files in context. |
| `shell` | string | `bash` or `powershell` for skills that emit shell snippets. |

## Common patterns

### Reference-only skill

```yaml
---
name: sk-example
description: Use when [triggers]
disable-model-invocation: true
user-invocable: false
---
```

### User-only skill (logger, deploy, destructive ops)

```yaml
---
name: deploy
description: Use when deploying to production
disable-model-invocation: true
user-invocable: true
---
```

### Auto-invoked workflow skill

```yaml
---
name: creating-a-pipeline
description: Use when [triggers]
---
```

(Default behavior: auto-invocation enabled, user-invocation enabled.)

### Path-scoped skill

```yaml
---
name: typescript-helpers
description: Use when editing TypeScript files
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---
```

Skill activates only when context includes a file matching the glob.

When in doubt, ship the minimal set — `name`, `description`, optional `disable-model-invocation` and `user-invocable`.
